package com.petpattern.patterns;

import com.petpattern.domain.*;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Optional;
import java.util.OptionalDouble;

@Component
public class SymptomTrendAnalyzer {

    private final BaselineCalculator baselineCalculator;
    private final PatternExplanationBuilder explanationBuilder;

    public SymptomTrendAnalyzer(BaselineCalculator baselineCalculator, PatternExplanationBuilder explanationBuilder) {
        this.baselineCalculator = baselineCalculator;
        this.explanationBuilder = explanationBuilder;
    }

    public Optional<PatternCandidate> itchingAboveBaseline(Pet pet, List<DailyCheckIn> checkIns) {
        List<DailyCheckIn> recent = baselineCalculator.recentDays(checkIns, 3);
        List<DailyCheckIn> baseline = baselineCalculator.baselineBeforeRecentDays(checkIns, 30, 3);

        OptionalDouble recentAverage = baselineCalculator.averageItching(recent);
        OptionalDouble baselineAverage = baselineCalculator.averageItching(baseline);

        if (recentAverage.isEmpty() || baselineAverage.isEmpty() || baseline.size() < 14) {
            return Optional.empty();
        }

        double lift = recentAverage.getAsDouble() - baselineAverage.getAsDouble();
        if (lift < 1.8 || recentAverage.getAsDouble() < 5.0) {
            return Optional.empty();
        }

        PatternConfidence confidence = lift >= 3.0 ? PatternConfidence.HIGH : PatternConfidence.MEDIUM;
        return Optional.of(explanationBuilder.itchingAboveBaseline(
                pet,
                confidence,
                recentAverage.getAsDouble(),
                baselineAverage.getAsDouble(),
                recent
        ));
    }

    public Optional<PatternCandidate> stoolInstability(Pet pet, List<DailyCheckIn> checkIns) {
        List<DailyCheckIn> recent = baselineCalculator.recentDays(checkIns, 7);
        long unstableDays = recent.stream().filter(this::hasUnstableStool).count();

        if (recent.size() < 4 || unstableDays < 2) {
            return Optional.empty();
        }

        return Optional.of(explanationBuilder.stoolInstability(pet, unstableDays, recent));
    }

    public Optional<PatternCandidate> waterDrop(Pet pet, List<DailyCheckIn> checkIns) {
        List<DailyCheckIn> recent = baselineCalculator.recentDays(checkIns, 3);
        long lowerDays = recent.stream()
                .filter(checkIn -> checkIn.getWaterLevel() == WaterLevel.LOWER)
                .count();

        if (lowerDays >= 2) {
            return Optional.of(explanationBuilder.waterDrop(pet, lowerDays, recent));
        }

        List<DailyCheckIn> baseline = baselineCalculator.baselineBeforeRecentDays(checkIns, 30, 3);
        OptionalDouble recentAverage = baselineCalculator.averageWaterMl(recent);
        OptionalDouble baselineAverage = baselineCalculator.averageWaterMl(baseline);
        if (recentAverage.isEmpty() || baselineAverage.isEmpty() || baselineAverage.getAsDouble() <= 0 || baseline.size() < 14) {
            return Optional.empty();
        }

        double dropPercent = (baselineAverage.getAsDouble() - recentAverage.getAsDouble()) / baselineAverage.getAsDouble();
        if (dropPercent < 0.2) {
            return Optional.empty();
        }

        return Optional.of(explanationBuilder.waterDrop(pet, Math.max(lowerDays, 2), recent));
    }

    public boolean hasUnstableStool(DailyCheckIn checkIn) {
        if (checkIn.isDiarrhea()) {
            return true;
        }
        if (checkIn.getStoolState() == StoolState.SOFT || checkIn.getStoolState() == StoolState.DIARRHEA) {
            return true;
        }
        Integer stoolScore = checkIn.getStoolScore();
        return stoolScore != null && stoolScore <= 2;
    }
}
