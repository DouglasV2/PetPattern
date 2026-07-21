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
import com.fasterxml.jackson.databind.ObjectMapper;
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
    private final ObjectMapper objectMapper;

    public RecapService(DailyCheckInRepository checkInRepository,
                        FoodLogRepository foodLogRepository,
                        PetPhotoRepository photoRepository,
                        FoodTrialRepository trialRepository,
                        PatternMemoryService patternMemoryService,
                        ObjectMapper objectMapper) {
        this.checkInRepository = checkInRepository;
        this.foodLogRepository = foodLogRepository;
        this.photoRepository = photoRepository;
        this.trialRepository = trialRepository;
        this.patternMemoryService = patternMemoryService;
        this.objectMapper = objectMapper;
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

        // Species-neutral factual counts (Part 5) — valuable even with no pattern.
        int changedDays = (int) window.stream().filter(c -> DayClassifier.isChangedDay(c, objectMapper)).count();
        int unchangedDays = Math.max(0, daysLogged - changedDays);
        int missingDays = Math.max(0, span - daysLogged);

        String headline = headline(pet.getName(), trendLabel, daysLogged);
        String factualSummary = factualSummary(daysLogged, unchangedDays, changedDays, foodChanges);
        String vetParagraph = vetParagraph(pet.getName(), span, daysLogged, changedDays, unchangedDays, foodChanges, patternsActive);
        String trackingSuggestion = trackingSuggestion(foodChanges, changedDays, missingDays);
        List<Milestone> milestones = milestones(pet, totalLoggedDays, trialsRun > 0, photosAdded > 0, patternsActive > 0);

        return new RecapResponse(
                PetResponse.from(pet), rangeStart, today, span, daysLogged,
                changedDays, unchangedDays, missingDays, headline,
                factualSummary, vetParagraph, trackingSuggestion, itching,
                calmestStreak, foodChanges, photosAdded, trialsRun, patternsActive, totalLoggedDays, milestones);
    }

    /** A plain "what the data holds" sentence — never "not enough data yet". */
    private String factualSummary(int daysLogged, int unchangedDays, int changedDays, int foodChanges) {
        String base = Copy.t("This period included {0} check-ins, {1} unchanged days and {2} with a change.",
                daysLogged, unchangedDays, changedDays);
        if (foodChanges > 0) {
            base += " " + Copy.t("{0} food change(s) were logged.", foodChanges);
        }
        return base;
    }

    /** One factual, vet-ready paragraph, present even when no pattern exists. */
    private String vetParagraph(String name, int span, int daysLogged, int changedDays,
                                int unchangedDays, int foodChanges, int patternsActive) {
        StringBuilder sb = new StringBuilder();
        sb.append(Copy.t("Over the last {0} days, {1} was checked in on {2} of them: {3} with a logged change and {4} steady.",
                span, name, daysLogged, changedDays, unchangedDays));
        if (foodChanges > 0) {
            sb.append(" ").append(Copy.t("{0} food change(s) were recorded in this period.", foodChanges));
        }
        if (patternsActive == 0) {
            sb.append(" ").append(Copy.t("No repeating relationship is visible yet."));
        }
        sb.append(" ").append(Copy.t("This is an owner-kept record to review together, not a diagnosis."));
        return sb.toString();
    }

    /** One neutral, always-present suggestion for useful continued tracking. */
    private String trackingSuggestion(int foodChanges, int changedDays, int missingDays) {
        if (foodChanges == 0) {
            return Copy.t("Logging food changes when they happen makes the timeline easier to compare later.");
        }
        if (changedDays == 0) {
            return Copy.t("Keep noting the days that feel off — that is what makes a real change stand out.");
        }
        if (missingDays > 0) {
            return Copy.t("A quick check-in on the quiet days too helps show what is normal.");
        }
        return Copy.t("Adding a dated photo on a change day gives your vet more to compare.");
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
