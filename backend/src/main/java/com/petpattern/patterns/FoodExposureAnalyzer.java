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
        int bestRepeatedWindows = 0;
        double bestAverageLift = 0;
        List<DailyCheckIn> bestRelatedCheckIns = List.of();

        for (Map.Entry<Protein, List<FoodLog>> entry : byProtein.entrySet()) {
            if (entry.getValue().size() < 2) {
                continue;
            }

            int repeatedWindows = 0;
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

                double comparisonAverage = beforeAverage.orElse(globalAverage.getAsDouble());
                double lift = postAverage.getAsDouble() - comparisonAverage;
                long unstableStoolDays = postWindow.stream().filter(symptomTrendAnalyzer::hasUnstableStool).count();
                boolean worsened = (lift >= 1.5 && postAverage.getAsDouble() >= 5.0) || unstableStoolDays >= 2;

                if (worsened) {
                    repeatedWindows++;
                    liftTotal += Math.max(lift, 0);
                    relatedCheckIns.addAll(postWindow);
                }
            }

            if (repeatedWindows > bestRepeatedWindows) {
                bestProtein = entry.getKey();
                bestFoodLog = relatedFoodLog;
                bestRepeatedWindows = repeatedWindows;
                bestAverageLift = repeatedWindows == 0 ? 0 : liftTotal / repeatedWindows;
                bestRelatedCheckIns = relatedCheckIns.stream().distinct().toList();
            }
        }

        if (bestProtein == null || bestRepeatedWindows < 2) {
            return Optional.empty();
        }

        PatternConfidence confidence = bestAverageLift >= 2.2 ? PatternConfidence.HIGH : PatternConfidence.MEDIUM;
        return Optional.of(explanationBuilder.possibleFoodTrigger(
                pet,
                bestProtein,
                confidence,
                bestRepeatedWindows,
                bestAverageLift,
                bestFoodLog,
                bestRelatedCheckIns
        ));
    }
}
