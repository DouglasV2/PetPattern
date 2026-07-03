package com.petpattern.patterns;

import com.petpattern.domain.*;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Optional;
import java.util.OptionalDouble;

@Component
public class SymptomTrendAnalyzer {

    private static final int ITCHING_ELEVATED = 5;

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

        // Adaptive (engine v2): the rise must clear this dog's own normal
        // variability, with a floor so a very steady dog still needs a real jump.
        // Measure that variability from CALM days only — a baseline window that
        // already contains an earlier flare must not inflate the bar against the
        // recurring patterns we exist to surface. Cap it as a second guard.
        List<DailyCheckIn> calmBaseline = baseline.stream()
                .filter(checkIn -> checkIn.getItchingScore() == null
                        || checkIn.getItchingScore() < ITCHING_ELEVATED)
                .toList();
        double stdDev = baselineCalculator.itchingStandardDeviation(calmBaseline).orElse(0.0);
        double threshold = Math.max(1.8, Math.min(stdDev, 3.0));

        double lift = recentAverage.getAsDouble() - baselineAverage.getAsDouble();
        if (lift < threshold || recentAverage.getAsDouble() < 5.0) {
            return Optional.empty();
        }

        PatternConfidence confidence = lift >= threshold + 1.2 ? PatternConfidence.HIGH : PatternConfidence.MEDIUM;
        return Optional.of(explanationBuilder.itchingAboveBaseline(
                pet,
                confidence,
                recentAverage.getAsDouble(),
                baselineAverage.getAsDouble(),
                recent
        ));
    }

    public Optional<PatternCandidate> recurringEarRedness(Pet pet, List<DailyCheckIn> checkIns) {
        List<DailyCheckIn> recent = baselineCalculator.recentDays(checkIns, 14);
        long earRednessDays = recent.stream().filter(DailyCheckIn::isEarRedness).count();

        if (recent.size() < 7 || earRednessDays < 3) {
            return Optional.empty();
        }

        return Optional.of(explanationBuilder.recurringEarRedness(pet, earRednessDays, recent));
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
