package com.petpattern.patterns;

import com.petpattern.domain.DailyCheckIn;
import com.petpattern.domain.FoodLog;
import com.petpattern.domain.Pet;
import com.petpattern.domain.Protein;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.util.List;
import java.util.Locale;
import java.util.UUID;

@Component
public class PatternExplanationBuilder {

    public PatternCandidate itchingAboveBaseline(Pet pet,
                                                 PatternConfidence confidence,
                                                 double recentAverage,
                                                 double baselineAverage,
                                                 List<DailyCheckIn> relatedCheckIns) {
        double lift = recentAverage - baselineAverage;
        return new PatternCandidate(
                stableId(pet.getId(), PatternType.ITCHING_ABOVE_BASELINE.name()),
                pet.getId(),
                PatternType.ITCHING_ABOVE_BASELINE,
                confidence,
                "Scratching is higher than usual",
                pet.getName() + "'s scratching has been higher than her usual baseline for the last few days.",
                List.of(
                        "Last 3 days average itching: " + oneDecimal(recentAverage) + "/10",
                        "Previous 30-day baseline: " + oneDecimal(baselineAverage) + "/10",
                        "Change above baseline: +" + oneDecimal(lift)
                ),
                Instant.now(),
                null,
                ids(relatedCheckIns)
        );
    }

    public PatternCandidate stoolInstability(Pet pet, long unstableDays, List<DailyCheckIn> relatedCheckIns) {
        return new PatternCandidate(
                stableId(pet.getId(), PatternType.STOOL_INSTABILITY.name()),
                pet.getId(),
                PatternType.STOOL_INSTABILITY,
                unstableDays >= 3 ? PatternConfidence.HIGH : PatternConfidence.MEDIUM,
                "Stool has been less stable this week",
                pet.getName() + " had softer stool or diarrhea more than once this week.",
                List.of(
                        "Recent days reviewed: " + relatedCheckIns.size(),
                        "Soft stool or diarrhea days: " + unstableDays,
                        "Worth comparing with recent food changes"
                ),
                Instant.now(),
                null,
                ids(relatedCheckIns)
        );
    }

    public PatternCandidate waterDrop(Pet pet, long lowerDays, List<DailyCheckIn> relatedCheckIns) {
        return new PatternCandidate(
                stableId(pet.getId(), PatternType.WATER_DROP.name()),
                pet.getId(),
                PatternType.WATER_DROP,
                lowerDays >= 3 ? PatternConfidence.HIGH : PatternConfidence.MEDIUM,
                "Water looks lower than usual",
                pet.getName() + "'s water intake was logged lower than usual recently.",
                List.of(
                        "Recent days reviewed: " + relatedCheckIns.size(),
                        "Lower water days: " + lowerDays,
                        "Bring this context to your vet if it continues or appears with other changes"
                ),
                Instant.now(),
                null,
                ids(relatedCheckIns)
        );
    }

    public PatternCandidate possibleFoodTrigger(Pet pet,
                                                Protein protein,
                                                PatternConfidence confidence,
                                                int repeatedWindows,
                                                double averageLift,
                                                FoodLog relatedFoodLog,
                                                List<DailyCheckIn> relatedCheckIns) {
        String proteinName = protein.displayName();
        return new PatternCandidate(
                stableId(pet.getId(), PatternType.POSSIBLE_FOOD_TRIGGER.name() + "_" + protein.name()),
                pet.getId(),
                PatternType.POSSIBLE_FOOD_TRIGGER,
                confidence,
                "Possible " + proteinName.toLowerCase(Locale.ROOT) + "-related pattern",
                pet.getName() + "'s symptoms increased after " + proteinName.toLowerCase(Locale.ROOT) + "-based food or treats in more than one tracked period. This is not a medical conclusion, but it may be worth discussing with your vet.",
                List.of(
                        "Protein reviewed: " + proteinName,
                        "Repeated post-food windows: " + repeatedWindows,
                        "Average itching lift in those windows: +" + oneDecimal(averageLift) + "/10",
                        "Window checked: days 3-10 after food exposure"
                ),
                Instant.now(),
                relatedFoodLog == null ? null : relatedFoodLog.getId(),
                ids(relatedCheckIns)
        );
    }

    private List<UUID> ids(List<DailyCheckIn> checkIns) {
        return checkIns.stream().map(DailyCheckIn::getId).toList();
    }

    private String stableId(UUID petId, String suffix) {
        return petId + ":" + suffix;
    }

    private String oneDecimal(double value) {
        return String.format(Locale.US, "%.1f", value);
    }
}
