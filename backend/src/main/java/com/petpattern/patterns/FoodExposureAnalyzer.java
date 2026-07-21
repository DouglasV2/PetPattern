package com.petpattern.patterns;

import com.petpattern.domain.DailyCheckIn;
import com.petpattern.domain.FoodLog;
import com.petpattern.domain.Pet;
import com.petpattern.domain.Protein;
import org.springframework.stereotype.Component;

import java.time.LocalDate;
import java.util.*;
import java.util.stream.Collectors;

@Component
public class FoodExposureAnalyzer {

    private final BaselineCalculator baselineCalculator;
    private final PatternExplanationBuilder explanationBuilder;
    private final SymptomTrendAnalyzer symptomTrendAnalyzer;

    public FoodExposureAnalyzer(BaselineCalculator baselineCalculator,
                                PatternExplanationBuilder explanationBuilder,
                                SymptomTrendAnalyzer symptomTrendAnalyzer) {
        this.baselineCalculator = baselineCalculator;
        this.explanationBuilder = explanationBuilder;
        this.symptomTrendAnalyzer = symptomTrendAnalyzer;
    }

    public Optional<PatternCandidate> possibleFoodTrigger(Pet pet, List<DailyCheckIn> checkIns, List<FoodLog> foodLogs) {
        if (checkIns.size() < 21 || foodLogs.size() < 2) {
            return Optional.empty();
        }

        Map<Protein, List<FoodLog>> byProtein = foodLogs.stream()
                .filter(foodLog -> foodLog.getPrimaryProtein() != null)
                .filter(foodLog -> foodLog.getPrimaryProtein() != Protein.UNKNOWN && foodLog.getPrimaryProtein() != Protein.OTHER)
                .collect(Collectors.groupingBy(FoodLog::getPrimaryProtein));

        OptionalDouble globalAverage = baselineCalculator.averageItching(checkIns);
        if (globalAverage.isEmpty()) {
            return Optional.empty();
        }

        Protein bestProtein = null;
        FoodLog bestFoodLog = null;
        int bestFollowed = 0;
        int bestAssessed = 0;
        double bestLiftTotal = 0;
        List<DailyCheckIn> bestRelatedCheckIns = List.of();
        List<FoodLog> bestProteinLogs = List.of();

        for (Map.Entry<Protein, List<FoodLog>> entry : byProtein.entrySet()) {
            if (entry.getValue().size() < 2) {
                continue;
            }

            int followed = 0;      // exposures followed by the outcome
            int assessed = 0;      // exposures we could evaluate (the denominator)
            double liftTotal = 0;
            List<DailyCheckIn> relatedCheckIns = new ArrayList<>();
            FoodLog relatedFoodLog = entry.getValue().get(entry.getValue().size() - 1);

            for (FoodLog foodLog : entry.getValue()) {
                LocalDate exposureStart = foodLog.getDateStarted().plusDays(3);
                LocalDate exposureEnd = foodLog.getDateStarted().plusDays(10);
                List<DailyCheckIn> postWindow = baselineCalculator.between(checkIns, exposureStart, exposureEnd);
                if (postWindow.size() < 2) {
                    continue;
                }

                List<DailyCheckIn> beforeWindow = baselineCalculator.between(
                        checkIns,
                        foodLog.getDateStarted().minusDays(10),
                        foodLog.getDateStarted().minusDays(1)
                );
                OptionalDouble beforeAverage = baselineCalculator.averageItching(beforeWindow);
                OptionalDouble postAverage = baselineCalculator.averageItching(postWindow);

                if (postAverage.isEmpty()) {
                    continue;
                }

                assessed++;
                double comparisonAverage = beforeAverage.orElse(globalAverage.getAsDouble());
                double lift = postAverage.getAsDouble() - comparisonAverage;
                long unstableStoolDays = postWindow.stream().filter(symptomTrendAnalyzer::hasUnstableStool).count();
                boolean worsened = (lift >= 1.5 && postAverage.getAsDouble() >= 5.0) || unstableStoolDays >= 2;

                if (worsened) {
                    followed++;
                    liftTotal += Math.max(lift, 0);
                    relatedCheckIns.addAll(postWindow);
                }
            }

            if (followed > bestFollowed) {
                bestProtein = entry.getKey();
                bestFoodLog = relatedFoodLog;
                bestFollowed = followed;
                bestAssessed = assessed;
                bestLiftTotal = liftTotal;
                bestRelatedCheckIns = relatedCheckIns.stream().distinct().toList();
                bestProteinLogs = entry.getValue();
            }
        }

        if (bestProtein == null || bestFollowed < 2) {
            return Optional.empty();
        }

        int notFollowed = bestAssessed - bestFollowed;
        double averageLift = bestFollowed == 0 ? 0 : bestLiftTotal / bestFollowed;
        int symptomWithoutExposure = symptomDaysOutsideExposureWindows(checkIns, bestProteinLogs);
        int concurrentOther = concurrentOtherProteinChanges(foodLogs, bestProtein, bestProteinLogs);
        EvidenceStage stage = EvidenceStage.forFoodExposure(bestFollowed, notFollowed, bestAssessed);

        // Confidence stays internal (ranking only); it is not user-facing (Part 12).
        PatternConfidence confidence = averageLift >= 2.2 ? PatternConfidence.HIGH : PatternConfidence.MEDIUM;
        FoodTriggerEvidence evidence = new FoodTriggerEvidence(
                bestAssessed, bestFollowed, notFollowed, symptomWithoutExposure,
                concurrentOther, 3, 10, averageLift);

        return Optional.of(explanationBuilder.possibleFoodTrigger(
                pet, bestProtein, confidence, stage, evidence, bestFoodLog, bestRelatedCheckIns));
    }

    /** Days the symptom was logged high with no exposure window of this protein nearby. */
    private int symptomDaysOutsideExposureWindows(List<DailyCheckIn> checkIns, List<FoodLog> proteinLogs) {
        return (int) checkIns.stream()
                .filter(checkIn -> checkIn.getItchingScore() != null && checkIn.getItchingScore() >= 5)
                .filter(checkIn -> proteinLogs.stream().noneMatch(foodLog -> {
                    LocalDate start = foodLog.getDateStarted().plusDays(3);
                    LocalDate end = foodLog.getDateStarted().plusDays(10);
                    LocalDate day = checkIn.getCheckInDate();
                    return !day.isBefore(start) && !day.isAfter(end);
                }))
                .count();
    }

    /** Other-protein food changes started during the same overall span (a limitation). */
    private int concurrentOtherProteinChanges(List<FoodLog> allFoodLogs, Protein winner, List<FoodLog> winnerLogs) {
        LocalDate firstStart = winnerLogs.stream().map(FoodLog::getDateStarted).min(LocalDate::compareTo).orElse(null);
        LocalDate lastStart = winnerLogs.stream().map(FoodLog::getDateStarted).max(LocalDate::compareTo).orElse(null);
        if (firstStart == null) {
            return 0;
        }
        LocalDate spanEnd = lastStart.plusDays(10);
        return (int) allFoodLogs.stream()
                .filter(foodLog -> foodLog.getPrimaryProtein() != winner)
                .filter(foodLog -> !foodLog.getDateStarted().isBefore(firstStart)
                        && !foodLog.getDateStarted().isAfter(spanEnd))
                .count();
    }
}
