package com.petpattern.pattern;

import com.petpattern.api.dto.InsightResponse;
import com.petpattern.domain.DailyCheckIn;
import com.petpattern.domain.FoodLog;
import com.petpattern.domain.Pet;
import com.petpattern.repository.DailyCheckInRepository;
import com.petpattern.repository.FoodLogRepository;
import com.petpattern.repository.PetRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class InsightService {

    private static final String MEDICAL_BOUNDARY = "This is not a diagnosis. It is a pattern from the stored history that may be useful to discuss with a veterinarian.";

    private final PetRepository petRepository;
    private final DailyCheckInRepository checkInRepository;
    private final FoodLogRepository foodLogRepository;

    public InsightService(PetRepository petRepository, DailyCheckInRepository checkInRepository, FoodLogRepository foodLogRepository) {
        this.petRepository = petRepository;
        this.checkInRepository = checkInRepository;
        this.foodLogRepository = foodLogRepository;
    }

    public List<InsightResponse> generateInsights(UUID petId) {
        Pet pet = petRepository.findById(petId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Pet not found"));

        LocalDate from = LocalDate.now().minusDays(120);
        List<DailyCheckIn> checkIns = checkInRepository.findByPetAndCheckInDateGreaterThanEqualOrderByCheckInDateAsc(pet, from);
        List<FoodLog> foodLogs = foodLogRepository.findByPetAndDateGreaterThanEqualOrderByDateAsc(pet, from);

        if (checkIns.size() < 7) {
            return List.of(new InsightResponse(
                    "BASELINE_BUILDING",
                    "calm",
                    "PetPattern is still learning what normal looks like",
                    pet.getName() + " has " + checkIns.size() + " logged days. After about 14 consistent days, the first personal baseline becomes more useful.",
                    "low",
                    List.of("Logged days: " + checkIns.size(), "Target for first baseline: 14 days"),
                    MEDICAL_BOUNDARY
            ));
        }

        List<InsightResponse> insights = new ArrayList<>();
        detectItchingAboveBaseline(pet, checkIns).ifPresent(insights::add);
        detectWaterDrop(pet, checkIns).ifPresent(insights::add);
        detectStoolInstability(pet, checkIns).ifPresent(insights::add);
        detectFoodProteinPattern(pet, checkIns, foodLogs).ifPresent(insights::add);

        if (insights.isEmpty()) {
            insights.add(new InsightResponse(
                    "STEADY_BASELINE",
                    "calm",
                    "Nothing is clearly outside the recent baseline",
                    pet.getName() + " does not have a strong pattern signal in the latest logs. Keep tracking so changes are easier to see later.",
                    "medium",
                    List.of("Recent check-ins reviewed: " + checkIns.size(), "No threshold crossed in the current ruleset"),
                    MEDICAL_BOUNDARY
            ));
        }

        return insights;
    }

    private Optional<InsightResponse> detectItchingAboveBaseline(Pet pet, List<DailyCheckIn> checkIns) {
        List<DailyCheckIn> recent = lastDays(checkIns, 3);
        List<DailyCheckIn> baseline = beforeLastDays(checkIns, 30, 3);

        OptionalDouble recentAvg = avgInt(recent, DailyCheckIn::getItchingScore);
        OptionalDouble baselineAvg = avgInt(baseline, DailyCheckIn::getItchingScore);

        if (recentAvg.isEmpty() || baselineAvg.isEmpty() || baseline.size() < 7) {
            return Optional.empty();
        }

        double lift = recentAvg.getAsDouble() - baselineAvg.getAsDouble();
        if (lift < 2.0 || recentAvg.getAsDouble() < 5.0) {
            return Optional.empty();
        }

        return Optional.of(new InsightResponse(
                "ITCHING_BASELINE_SHIFT",
                "watch",
                "Itching is higher than usual",
                pet.getName() + "'s itching score has been above the recent baseline for the last few logs. This is worth watching, especially if it continues tomorrow.",
                lift >= 3.5 ? "high" : "medium",
                List.of(
                        "Last 3 logged days average itching: " + oneDecimal(recentAvg.getAsDouble()) + "/10",
                        "Previous baseline average: " + oneDecimal(baselineAvg.getAsDouble()) + "/10",
                        "Difference: +" + oneDecimal(lift)
                ),
                MEDICAL_BOUNDARY
        ));
    }

    private Optional<InsightResponse> detectWaterDrop(Pet pet, List<DailyCheckIn> checkIns) {
        List<DailyCheckIn> recent = lastDays(checkIns, 3);
        List<DailyCheckIn> baseline = beforeLastDays(checkIns, 30, 3);

        OptionalDouble recentAvg = avgInt(recent, DailyCheckIn::getWaterIntakeMl);
        OptionalDouble baselineAvg = avgInt(baseline, DailyCheckIn::getWaterIntakeMl);

        if (recentAvg.isEmpty() || baselineAvg.isEmpty() || baselineAvg.getAsDouble() <= 0 || baseline.size() < 7) {
            return Optional.empty();
        }

        double dropPct = (baselineAvg.getAsDouble() - recentAvg.getAsDouble()) / baselineAvg.getAsDouble();
        if (dropPct < 0.2) {
            return Optional.empty();
        }

        return Optional.of(new InsightResponse(
                "WATER_INTAKE_DROP",
                "watch",
                "Water intake is lower than Bella's usual range".replace("Bella", pet.getName()),
                pet.getName() + "'s recent water logs are lower than the previous baseline. If this continues or comes with low energy, vomiting or diarrhea, this is useful context for a vet.",
                dropPct >= 0.35 ? "high" : "medium",
                List.of(
                        "Recent average: " + Math.round(recentAvg.getAsDouble()) + " ml/day",
                        "Baseline average: " + Math.round(baselineAvg.getAsDouble()) + " ml/day",
                        "Change: -" + Math.round(dropPct * 100) + "%"
                ),
                MEDICAL_BOUNDARY
        ));
    }

    private Optional<InsightResponse> detectStoolInstability(Pet pet, List<DailyCheckIn> checkIns) {
        List<DailyCheckIn> recent = lastDays(checkIns, 5);
        long abnormal = recent.stream()
                .filter(c -> c.getStoolScore() != null)
                .filter(c -> c.getStoolScore() <= 2 || c.getStoolScore() >= 5 || c.isDiarrhea())
                .count();

        if (recent.size() < 4 || abnormal < 2) {
            return Optional.empty();
        }

        return Optional.of(new InsightResponse(
                "STOOL_INSTABILITY",
                "watch",
                "Stool has been inconsistent recently",
                pet.getName() + " has multiple recent stool logs outside the normal middle range. The next useful step is to compare this against recent food changes and treats.",
                abnormal >= 3 ? "high" : "medium",
                List.of(
                        "Recent days reviewed: " + recent.size(),
                        "Abnormal stool/diarrhea days: " + abnormal,
                        "Normal stool target in this pilot: score 3–4 without diarrhea"
                ),
                MEDICAL_BOUNDARY
        ));
    }

    private Optional<InsightResponse> detectFoodProteinPattern(Pet pet, List<DailyCheckIn> checkIns, List<FoodLog> foodLogs) {
        List<FoodLog> proteinLogs = foodLogs.stream()
                .filter(f -> f.getPrimaryProtein() != null && !f.getPrimaryProtein().isBlank())
                .toList();

        if (proteinLogs.size() < 2 || checkIns.size() < 14) {
            return Optional.empty();
        }

        Map<String, List<FoodLog>> byProtein = proteinLogs.stream()
                .collect(Collectors.groupingBy(f -> f.getPrimaryProtein().trim().toLowerCase(Locale.ROOT)));

        OptionalDouble globalItchAvg = avgInt(checkIns, DailyCheckIn::getItchingScore);
        if (globalItchAvg.isEmpty()) {
            return Optional.empty();
        }

        String bestProtein = null;
        double bestLift = 0;
        int bestExposureDays = 0;

        for (Map.Entry<String, List<FoodLog>> entry : byProtein.entrySet()) {
            List<DailyCheckIn> exposureWindow = new ArrayList<>();
            for (FoodLog log : entry.getValue()) {
                LocalDate start = log.getDate().plusDays(4);
                LocalDate end = log.getDate().plusDays(8);
                checkIns.stream()
                        .filter(c -> !c.getCheckInDate().isBefore(start) && !c.getCheckInDate().isAfter(end))
                        .forEach(exposureWindow::add);
            }

            OptionalDouble exposureAvg = avgInt(exposureWindow, DailyCheckIn::getItchingScore);
            if (exposureAvg.isEmpty() || exposureWindow.size() < 4) {
                continue;
            }

            double lift = exposureAvg.getAsDouble() - globalItchAvg.getAsDouble();
            if (lift > bestLift) {
                bestLift = lift;
                bestProtein = entry.getKey();
                bestExposureDays = exposureWindow.size();
            }
        }

        if (bestProtein == null || bestLift < 1.5) {
            return Optional.empty();
        }

        String displayProtein = Character.toUpperCase(bestProtein.charAt(0)) + bestProtein.substring(1);
        return Optional.of(new InsightResponse(
                "FOOD_PROTEIN_PATTERN_CANDIDATE",
                "pattern",
                "Possible pattern after " + displayProtein + " exposure",
                pet.getName() + "'s itching scores have been higher in the 4–8 day window after logged " + displayProtein + " food exposure. This is not proof of a food allergy, but it is exactly the kind of timeline a vet may want to see.",
                bestLift >= 2.5 ? "high" : "medium",
                List.of(
                        "Protein reviewed: " + displayProtein,
                        "Exposure-window days: " + bestExposureDays,
                        "Average lift vs overall baseline: +" + oneDecimal(bestLift) + "/10",
                        "Lag window tested: days 4–8 after food log"
                ),
                MEDICAL_BOUNDARY
        ));
    }

    private List<DailyCheckIn> lastDays(List<DailyCheckIn> checkIns, int days) {
        LocalDate latestDate = checkIns.stream()
                .map(DailyCheckIn::getCheckInDate)
                .max(LocalDate::compareTo)
                .orElse(LocalDate.now());
        LocalDate from = latestDate.minusDays(days - 1L);
        return checkIns.stream()
                .filter(c -> !c.getCheckInDate().isBefore(from))
                .toList();
    }

    private List<DailyCheckIn> beforeLastDays(List<DailyCheckIn> checkIns, int baselineDays, int skipRecentDays) {
        LocalDate latestDate = checkIns.stream()
                .map(DailyCheckIn::getCheckInDate)
                .max(LocalDate::compareTo)
                .orElse(LocalDate.now());
        LocalDate end = latestDate.minusDays(skipRecentDays);
        LocalDate start = end.minusDays(baselineDays - 1L);
        return checkIns.stream()
                .filter(c -> !c.getCheckInDate().isBefore(start) && !c.getCheckInDate().isAfter(end))
                .toList();
    }

    private OptionalDouble avgInt(List<DailyCheckIn> checkIns, IntField field) {
        return checkIns.stream()
                .map(field::value)
                .filter(Objects::nonNull)
                .mapToInt(Integer::intValue)
                .average();
    }

    private String oneDecimal(double value) {
        return String.format(Locale.US, "%.1f", value);
    }

    @FunctionalInterface
    private interface IntField {
        Integer value(DailyCheckIn checkIn);
    }
}
