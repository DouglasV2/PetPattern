package com.petpattern.trials;

import com.petpattern.api.dto.FoodTrialResponse;
import com.petpattern.api.dto.FoodTrialResponse.TrialResult;
import com.petpattern.api.dto.FoodTrialResponse.WindowStats;
import com.petpattern.domain.DailyCheckIn;
import com.petpattern.domain.FoodLog;
import com.petpattern.domain.FoodTrial;
import com.petpattern.domain.Protein;
import com.petpattern.domain.StoolState;
import com.petpattern.domain.TrialStatus;
import com.petpattern.i18n.Copy;
import com.petpattern.repository.DailyCheckInRepository;
import com.petpattern.repository.FoodLogRepository;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.List;
import java.util.OptionalDouble;

/**
 * Turns a {@link FoodTrial} plus the pet's logged history into a plain
 * before / during / after comparison. Deterministic and non-diagnostic: it
 * reports what the numbers did, it never claims a cause or a cure.
 */
@Service
public class FoodTrialService {

    /** Short date in the active locale ("Jul 2" / "2. srp"). */
    private static DateTimeFormatter dayMonth() {
        return Copy.isHr()
                ? DateTimeFormatter.ofPattern("d. MMM", Copy.locale())
                : DateTimeFormatter.ofPattern("MMM d", Copy.locale());
    }

    private final DailyCheckInRepository checkInRepository;
    private final FoodLogRepository foodLogRepository;

    public FoodTrialService(DailyCheckInRepository checkInRepository, FoodLogRepository foodLogRepository) {
        this.checkInRepository = checkInRepository;
        this.foodLogRepository = foodLogRepository;
    }

    public FoodTrialResponse toResponse(FoodTrial trial, String petName) {
        LocalDate today = LocalDate.now();
        Protein target = Protein.from(trial.getProtein());
        String proteinLabel = Copy.proteinLabel(target);

        LocalDate startDate = trial.getStartDate();
        LocalDate targetEnd = trial.getTargetEndDate();
        LocalDate reintroduced = trial.getReintroducedDate();
        LocalDate completed = trial.getCompletedDate();
        TrialStatus status = trial.getStatus();

        LocalDate effectiveNow = completed != null ? completed : today;
        LocalDate eliminationEnd = reintroduced != null
                ? reintroduced.minusDays(1)
                : min(effectiveNow, targetEnd);

        // Pull all check-ins from the baseline window onward, once.
        LocalDate baselineStart = startDate.minusDays(14);
        List<DailyCheckIn> checkIns =
                checkInRepository.findByPetAndCheckInDateGreaterThanEqualOrderByCheckInDateAsc(trial.getPet(), baselineStart);

        WindowStats baseline = windowStats(checkIns, baselineStart, startDate.minusDays(1));
        WindowStats elimination = windowStats(checkIns, startDate, eliminationEnd);
        WindowStats reintroductionWindow = reintroduced == null
                ? null
                : windowStats(checkIns, reintroduced, min(effectiveNow, reintroduced.plusDays(14)));

        List<String> slips = slips(trial.getPet(), target, startDate, eliminationEnd);
        boolean cleanRun = slips.isEmpty();

        Double itchingDelta = (baseline.avgItching() != null && elimination.avgItching() != null)
                ? round1(baseline.avgItching() - elimination.avgItching())
                : null;

        // Needs enough logged days AND an itching average in both windows — a run
        // of check-ins that never recorded itching would otherwise NPE the verdict.
        boolean hasEnoughData = baseline.loggedDays() >= 3 && elimination.loggedDays() >= 3
                && baseline.avgItching() != null && elimination.avgItching() != null;
        String verdict = verdict(proteinLabel, petName, hasEnoughData, baseline, elimination, reintroductionWindow);

        int totalDays = (int) ChronoUnit.DAYS.between(startDate, targetEnd) + 1;
        int dayOfTrial = today.isBefore(startDate)
                ? 0
                : (int) Math.min(ChronoUnit.DAYS.between(startDate, min(today, targetEnd)) + 1, totalDays);
        Integer daysLeft = (status == TrialStatus.ACTIVE && !today.isAfter(targetEnd))
                ? (int) ChronoUnit.DAYS.between(today, targetEnd)
                : null;

        String phase = phase(status, proteinLabel, today, startDate, targetEnd, reintroduced, dayOfTrial, totalDays);

        TrialResult result = new TrialResult(
                hasEnoughData, baseline, elimination, reintroductionWindow,
                itchingDelta, cleanRun, slips.size(), slips, verdict);

        return new FoodTrialResponse(
                trial.getId(), target.name(), proteinLabel, status.name(), phase,
                startDate, targetEnd, reintroduced, completed, trial.getNotes(),
                dayOfTrial, totalDays, daysLeft, result, trial.getCreatedAt());
    }

    private WindowStats windowStats(List<DailyCheckIn> all, LocalDate start, LocalDate end) {
        if (end.isBefore(start)) {
            return new WindowStats(start, end, 0, null, 0);
        }
        List<DailyCheckIn> inWindow = all.stream()
                .filter(c -> !c.getCheckInDate().isBefore(start) && !c.getCheckInDate().isAfter(end))
                .toList();
        OptionalDouble avg = inWindow.stream()
                .map(DailyCheckIn::getItchingScore)
                .filter(java.util.Objects::nonNull)
                .mapToInt(Integer::intValue)
                .average();
        int unstable = (int) inWindow.stream().filter(this::isUnstableStool).count();
        return new WindowStats(start, end, inWindow.size(),
                avg.isPresent() ? round1(avg.getAsDouble()) : null, unstable);
    }

    private List<String> slips(com.petpattern.domain.Pet pet, Protein target, LocalDate start, LocalDate end) {
        List<String> result = new ArrayList<>();
        if (end.isBefore(start)) {
            return result;
        }
        List<FoodLog> foods =
                foodLogRepository.findByPetAndDateStartedGreaterThanEqualOrderByDateStartedAsc(pet, start);
        for (FoodLog food : foods) {
            LocalDate started = food.getDateStarted();
            if (started == null || started.isBefore(start) || started.isAfter(end)) {
                continue;
            }
            boolean matches = food.getPrimaryProtein() == target
                    || (food.getSecondaryProteins() != null && food.getSecondaryProteins().contains(target));
            if (matches) {
                String label = food.getProductName() != null && !food.getProductName().isBlank()
                        ? food.getProductName()
                        : Copy.proteinLabel(target);
                result.add(label + " (" + started.format(dayMonth()) + ")");
            }
        }
        return result;
    }

    private String verdict(String protein, String petName, boolean hasEnoughData,
                           WindowStats baseline, WindowStats elimination, WindowStats reintroduction) {
        if (!hasEnoughData) {
            return Copy.t("Not enough logged days yet to compare — keep logging through the trial.");
        }
        String food = protein.toLowerCase(java.util.Locale.ROOT);
        double drop = baseline.avgItching() - elimination.avgItching();

        if (drop >= 2.0) {
            if (reintroduction != null && reintroduction.avgItching() != null
                    && reintroduction.avgItching() - elimination.avgItching() >= 2.0) {
                return Copy.t("Scratching eased while {0} was out, and was logged higher again after it came back. "
                        + "Worth raising with your vet.", food);
            }
            return Copy.t("Scratching was noticeably lower while {0} was out of the bowl.", food);
        }
        if (drop <= -2.0) {
            return Copy.t("Scratching was logged a bit higher while {0} was out — worth mentioning to your vet "
                    + "when you talk this through.", food);
        }
        return Copy.t("No clear change while {0} was out — good context to bring to your vet.", food);
    }

    private String phase(TrialStatus status, String protein, LocalDate today, LocalDate startDate,
                         LocalDate targetEnd, LocalDate reintroduced, int dayOfTrial, int totalDays) {
        String food = protein.toLowerCase(java.util.Locale.ROOT);
        switch (status) {
            case ABANDONED:
                return Copy.t("Stopped early");
            case COMPLETED:
                return Copy.t("Wrapped up");
            case REINTRODUCED:
                return Copy.t("Watching after bringing {0} back", food);
            default:
                break;
        }
        if (today.isBefore(startDate)) {
            return Copy.t("Starts {0}", startDate.format(dayMonth()));
        }
        if (!today.isAfter(targetEnd)) {
            return Copy.t("Day {0} of {1} — {2} out of the bowl", dayOfTrial, totalDays, food);
        }
        return Copy.t("Elimination window done — bring {0} back, or wrap up", food);
    }

    private boolean isUnstableStool(DailyCheckIn checkIn) {
        if (checkIn.isDiarrhea()) {
            return true;
        }
        StoolState state = checkIn.getStoolState();
        if (state == StoolState.SOFT || state == StoolState.DIARRHEA) {
            return true;
        }
        Integer stoolScore = checkIn.getStoolScore();
        return stoolScore != null && stoolScore <= 2;
    }

    private LocalDate min(LocalDate a, LocalDate b) {
        return a.isBefore(b) ? a : b;
    }

    private Double round1(double value) {
        return Math.round(value * 10.0) / 10.0;
    }
}
