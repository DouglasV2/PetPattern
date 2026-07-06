package com.petpattern.recap;

import com.petpattern.api.dto.PetResponse;
import com.petpattern.api.dto.RecapResponse;
import com.petpattern.api.dto.RecapResponse.ItchingTrend;
import com.petpattern.api.dto.RecapResponse.Milestone;
import com.petpattern.domain.DailyCheckIn;
import com.petpattern.domain.FoodLog;
import com.petpattern.domain.FoodTrial;
import com.petpattern.domain.Pet;
import com.petpattern.domain.PhotoArea;
import com.petpattern.i18n.Copy;
import com.petpattern.patterns.PatternMemoryService;
import com.petpattern.repository.DailyCheckInRepository;
import com.petpattern.repository.FoodLogRepository;
import com.petpattern.repository.FoodTrialRepository;
import com.petpattern.repository.PetPhotoRepository;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.OptionalDouble;

/**
 * A periodic, personal look-back. Deterministic, warm, non-diagnostic — it
 * reflects what was logged and what changed, so an owner feels their effort
 * added up.
 */
@Service
public class RecapService {

    private static final int CALM_ITCHING = 3;

    /** Month + year in the active locale ("May 2026" / "svibnja 2026."). */
    private static DateTimeFormatter monthYear() {
        return DateTimeFormatter.ofPattern("MMMM yyyy", Copy.locale());
    }

    private final DailyCheckInRepository checkInRepository;
    private final FoodLogRepository foodLogRepository;
    private final PetPhotoRepository photoRepository;
    private final FoodTrialRepository trialRepository;
    private final PatternMemoryService patternMemoryService;

    public RecapService(DailyCheckInRepository checkInRepository,
                        FoodLogRepository foodLogRepository,
                        PetPhotoRepository photoRepository,
                        FoodTrialRepository trialRepository,
                        PatternMemoryService patternMemoryService) {
        this.checkInRepository = checkInRepository;
        this.foodLogRepository = foodLogRepository;
        this.photoRepository = photoRepository;
        this.trialRepository = trialRepository;
        this.patternMemoryService = patternMemoryService;
    }

    public RecapResponse recap(Pet pet, int requestedDays) {
        int span = Math.max(7, Math.min(120, requestedDays));
        LocalDate today = LocalDate.now();
        LocalDate rangeStart = today.minusDays(span - 1L);
        LocalDate priorStart = rangeStart.minusDays(span);
        LocalDate priorEnd = rangeStart.minusDays(1);

        List<DailyCheckIn> sincePrior =
                checkInRepository.findByPetAndCheckInDateGreaterThanEqualOrderByCheckInDateAsc(pet, priorStart);
        List<DailyCheckIn> window = between(sincePrior, rangeStart, today);
        List<DailyCheckIn> prior = between(sincePrior, priorStart, priorEnd);

        int daysLogged = window.size();
        Double recentAvg = avgItching(window);
        Double priorAvg = avgItching(prior);
        // Conventional delta: recent minus prior, so a positive number means
        // itching went UP (matches the "itchier" label an API reader expects).
        Double delta = (recentAvg != null && priorAvg != null) ? round1(recentAvg - priorAvg) : null;
        String trendLabel = trendLabel(delta);
        ItchingTrend itching = new ItchingTrend(recentAvg, priorAvg, delta, trendLabel);

        int calmestStreak = longestCalmStreak(window, rangeStart, today);

        int foodChanges = (int) foodLogRepository
                .findByPetAndDateStartedGreaterThanEqualOrderByDateStartedAsc(pet, rangeStart).stream()
                .filter(food -> food.getDateStarted() != null && !food.getDateStarted().isAfter(today))
                .count();
        int photosAdded = (int) photoRepository.countByPetAndAreaNotAndCapturedDateGreaterThanEqual(pet, PhotoArea.PROFILE, rangeStart);
        int trialsRun = (int) trialRepository.findByPetOrderByStartDateDesc(pet).stream()
                .filter(trial -> overlapsWindow(trial, rangeStart, today))
                .count();
        int patternsActive = patternMemoryService.activePatterns(pet.getId()).size();
        int totalLoggedDays = (int) checkInRepository.countByPet(pet);

        String headline = headline(pet.getName(), trendLabel, daysLogged);
        List<Milestone> milestones = milestones(pet, totalLoggedDays, trialsRun > 0, photosAdded > 0, patternsActive > 0);

        return new RecapResponse(
                PetResponse.from(pet), rangeStart, today, span, daysLogged, headline, itching,
                calmestStreak, foodChanges, photosAdded, trialsRun, patternsActive, totalLoggedDays, milestones);
    }

    private List<DailyCheckIn> between(List<DailyCheckIn> all, LocalDate start, LocalDate end) {
        return all.stream()
                .filter(c -> !c.getCheckInDate().isBefore(start) && !c.getCheckInDate().isAfter(end))
                .toList();
    }

    private Double avgItching(List<DailyCheckIn> checkIns) {
        OptionalDouble avg = checkIns.stream()
                .map(DailyCheckIn::getItchingScore)
                .filter(Objects::nonNull)
                .mapToInt(Integer::intValue)
                .average();
        return avg.isPresent() ? round1(avg.getAsDouble()) : null;
    }

    private int longestCalmStreak(List<DailyCheckIn> window, LocalDate start, LocalDate end) {
        Map<LocalDate, Integer> byDate = new HashMap<>();
        for (DailyCheckIn checkIn : window) {
            if (checkIn.getItchingScore() != null) {
                byDate.put(checkIn.getCheckInDate(), checkIn.getItchingScore());
            }
        }
        int best = 0;
        int run = 0;
        for (LocalDate day = start; !day.isAfter(end); day = day.plusDays(1)) {
            Integer itch = byDate.get(day);
            if (itch != null && itch <= CALM_ITCHING) {
                run++;
                best = Math.max(best, run);
            } else {
                run = 0;
            }
        }
        return best;
    }

    private boolean overlapsWindow(FoodTrial trial, LocalDate rangeStart, LocalDate today) {
        if (trial.getStartDate() == null || trial.getStartDate().isAfter(today)) {
            return false;
        }
        LocalDate trialEnd = trial.getCompletedDate() != null ? trial.getCompletedDate() : today;
        return !trialEnd.isBefore(rangeStart);
    }

    private String trendLabel(Double delta) {
        if (delta == null) {
            return null;
        }
        // delta = recent - prior: positive means itching rose.
        if (delta <= -1.0) {
            return "calmer";
        }
        if (delta >= 1.0) {
            return "itchier";
        }
        return "about the same";
    }

    private String headline(String name, String trendLabel, int daysLogged) {
        if (daysLogged < 5) {
            return Copy.t("Still early — a few more days logged and {0}'s picture fills in.", name);
        }
        if ("calmer".equals(trendLabel)) {
            return Copy.t("A calmer few weeks for {0}.", name);
        }
        if ("itchier".equals(trendLabel)) {
            return Copy.t("A rougher stretch for {0} — good that it's all written down.", name);
        }
        return Copy.t("A steady few weeks for {0}.", name);
    }

    private List<Milestone> milestones(Pet pet, int totalLoggedDays, boolean ranTrial,
                                       boolean hasPhotos, boolean hasPattern) {
        List<Milestone> milestones = new ArrayList<>();

        checkInRepository.findFirstByPetOrderByCheckInDateAsc(pet).ifPresent(first ->
                milestones.add(new Milestone(
                        Copy.t("Tracking since {0}", first.getCheckInDate().format(monthYear())),
                        Copy.t("The record goes back to your first check-in."))));

        if (totalLoggedDays >= 100) {
            milestones.add(new Milestone(Copy.t("100+ days logged"),
                    Copy.t("{0} days of {1}'s history.", totalLoggedDays, pet.getName())));
        } else if (totalLoggedDays >= 30) {
            milestones.add(new Milestone(Copy.t("A full month tracked"),
                    Copy.t("{0} days logged so far.", totalLoggedDays)));
        } else if (totalLoggedDays >= 7) {
            milestones.add(new Milestone(Copy.t("First week logged"),
                    Copy.t("{0} days logged so far.", totalLoggedDays)));
        }

        if (hasPattern) {
            milestones.add(new Milestone(Copy.t("Spotted a possible pattern"),
                    Copy.t("Worth keeping an eye on, and bringing to your vet.")));
        }
        if (ranTrial) {
            milestones.add(new Milestone(Copy.t("Ran a food trial"),
                    Copy.t("Took an ingredient out to see if it made a difference.")));
        }
        if (hasPhotos) {
            milestones.add(new Milestone(Copy.t("Started a photo record"),
                    Copy.t("A visual history to compare over time.")));
        }
        return milestones;
    }

    private Double round1(double value) {
        return Math.round(value * 10.0) / 10.0;
    }
}
