package com.petpattern.patterns;

import com.petpattern.domain.AppetiteLevel;
import com.petpattern.domain.DailyCheckIn;
import com.petpattern.domain.HidingBehavior;
import com.petpattern.domain.LitterBoxUse;
import com.petpattern.domain.Pet;
import com.petpattern.domain.UrinationChange;
import com.petpattern.domain.WaterLevel;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Optional;

/**
 * Deterministic, cautious cat pattern rules. These read a cat's own recent days
 * and surface simple changes worth watching — never a diagnosis. Cats hide
 * illness, so the bars are intentionally gentle (a change on more than one day).
 */
@Component
public class CatSymptomAnalyzer {

    private final BaselineCalculator baselineCalculator;
    private final PatternExplanationBuilder explanationBuilder;

    public CatSymptomAnalyzer(BaselineCalculator baselineCalculator, PatternExplanationBuilder explanationBuilder) {
        this.baselineCalculator = baselineCalculator;
        this.explanationBuilder = explanationBuilder;
    }

    public Optional<PatternCandidate> appetiteLow(Pet pet, List<DailyCheckIn> checkIns) {
        List<DailyCheckIn> recent = baselineCalculator.recentDays(checkIns, 3);
        long refusedDays = recent.stream().filter(c -> c.getAppetiteLevel() == AppetiteLevel.REFUSED).count();
        long lowerDays = recent.stream()
                .filter(c -> c.getAppetiteLevel() == AppetiteLevel.LOWER || c.getAppetiteLevel() == AppetiteLevel.REFUSED)
                .count();
        if (lowerDays < 2) {
            return Optional.empty();
        }
        PatternConfidence confidence = (lowerDays >= 3 || refusedDays >= 1) ? PatternConfidence.HIGH : PatternConfidence.MEDIUM;
        return Optional.of(explanationBuilder.catAppetiteLow(pet, confidence, lowerDays, recent));
    }

    public Optional<PatternCandidate> waterChange(Pet pet, List<DailyCheckIn> checkIns) {
        List<DailyCheckIn> recent = baselineCalculator.recentDays(checkIns, 3);
        long lowerDays = recent.stream().filter(c -> c.getWaterLevel() == WaterLevel.LOWER).count();
        long higherDays = recent.stream().filter(c -> c.getWaterLevel() == WaterLevel.HIGHER).count();
        if (lowerDays >= 2) {
            PatternConfidence confidence = lowerDays >= 3 ? PatternConfidence.HIGH : PatternConfidence.MEDIUM;
            return Optional.of(explanationBuilder.catWaterChange(pet, confidence, true, lowerDays, recent));
        }
        if (higherDays >= 2) {
            PatternConfidence confidence = higherDays >= 3 ? PatternConfidence.HIGH : PatternConfidence.MEDIUM;
            return Optional.of(explanationBuilder.catWaterChange(pet, confidence, false, higherDays, recent));
        }
        return Optional.empty();
    }

    public Optional<PatternCandidate> litterBoxChange(Pet pet, List<DailyCheckIn> checkIns) {
        List<DailyCheckIn> recent = baselineCalculator.recentDays(checkIns, 3);
        long changedDays = recent.stream().filter(this::litterOrUrinationChanged).count();
        long strainingDays = recent.stream().filter(DailyCheckIn::isStraining).count();
        // A single "not used" day is benign (cats skip a day); require it to repeat.
        long noneDays = recent.stream().filter(c -> c.getLitterBoxUse() == LitterBoxUse.NONE).count();

        if (changedDays < 2 && strainingDays == 0 && noneDays < 2) {
            return Optional.empty();
        }
        // Straining, or not using the box across multiple days, are the more notable signals.
        PatternConfidence confidence = (strainingDays >= 1 || noneDays >= 2) ? PatternConfidence.HIGH : PatternConfidence.MEDIUM;
        long reported = Math.max(changedDays, Math.max(strainingDays, noneDays));
        return Optional.of(explanationBuilder.catLitterBoxChange(pet, confidence, reported, strainingDays >= 1, recent));
    }

    public Optional<PatternCandidate> hidingIncreased(Pet pet, List<DailyCheckIn> checkIns) {
        List<DailyCheckIn> recent = baselineCalculator.recentDays(checkIns, 5);
        long moreDays = recent.stream().filter(c -> c.getHidingBehavior() == HidingBehavior.MORE).count();
        if (moreDays < 2) {
            return Optional.empty();
        }
        PatternConfidence confidence = moreDays >= 3 ? PatternConfidence.HIGH : PatternConfidence.MEDIUM;
        return Optional.of(explanationBuilder.catHidingIncreased(pet, confidence, moreDays, recent));
    }

    public Optional<PatternCandidate> repeatedVomiting(Pet pet, List<DailyCheckIn> checkIns) {
        List<DailyCheckIn> recent = baselineCalculator.recentDays(checkIns, 7);
        long vomitDays = recent.stream().filter(DailyCheckIn::isVomiting).count();
        if (vomitDays < 2) {
            return Optional.empty();
        }
        PatternConfidence confidence = vomitDays >= 3 ? PatternConfidence.HIGH : PatternConfidence.MEDIUM;
        return Optional.of(explanationBuilder.catRepeatedVomiting(pet, confidence, vomitDays, recent));
    }

    private boolean litterOrUrinationChanged(DailyCheckIn checkIn) {
        LitterBoxUse litter = checkIn.getLitterBoxUse();
        UrinationChange urination = checkIn.getUrinationChange();
        boolean litterChanged = litter == LitterBoxUse.LESS || litter == LitterBoxUse.MORE || litter == LitterBoxUse.NONE;
        boolean urinationChanged = urination == UrinationChange.LESS || urination == UrinationChange.MORE;
        return litterChanged || urinationChanged;
    }
}
