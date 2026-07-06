package com.petpattern.patterns;

import com.petpattern.domain.DailyCheckIn;
import com.petpattern.domain.FoodLog;
import com.petpattern.domain.Pet;
import com.petpattern.domain.Protein;
import com.petpattern.i18n.Copy;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

/**
 * All pattern-card copy lives here, localized via {@link Copy} (English is the
 * key; Croatian overrides live in one map). The language stays cautious and
 * non-diagnostic on purpose: "possible pattern", "worth discussing with your
 * vet" — never a cause, an allergy, or a conclusion.
 */
@Component
public class PatternExplanationBuilder {

    public PatternCandidate itchingAboveBaseline(Pet pet,
                                                 PatternConfidence confidence,
                                                 double recentAverage,
                                                 double baselineAverage,
                                                 List<DailyCheckIn> relatedCheckIns) {
        return new PatternCandidate(
                stableId(pet.getId(), PatternType.ITCHING_ABOVE_BASELINE.name()),
                pet.getId(),
                PatternType.ITCHING_ABOVE_BASELINE,
                confidence,
                Copy.t("Scratching is higher than usual"),
                Copy.t("{0} has been scratching more than usual the last few days.", pet.getName()),
                List.of(
                        Copy.t("Scratching was logged higher the last few days"),
                        Copy.t("Higher than what was usual for {0} lately", pet.getName()),
                        Copy.t("PetPattern reviewed the recent notes")
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
                Copy.t("Stool has been less stable this week"),
                Copy.t("{0} had softer stool or diarrhea more than once this week.", pet.getName()),
                List.of(
                        Copy.t("Recent days reviewed: {0}", relatedCheckIns.size()),
                        Copy.t("Soft stool or diarrhea days: {0}", unstableDays),
                        Copy.t("Worth comparing with recent food changes")
                ),
                Instant.now(),
                null,
                ids(relatedCheckIns)
        );
    }

    public PatternCandidate recurringEarRedness(Pet pet, long earRednessDays, List<DailyCheckIn> relatedCheckIns) {
        return new PatternCandidate(
                stableId(pet.getId(), PatternType.RECURRING_EAR_REDNESS.name()),
                pet.getId(),
                PatternType.RECURRING_EAR_REDNESS,
                earRednessDays >= 5 ? PatternConfidence.HIGH : PatternConfidence.MEDIUM,
                Copy.t("Ear redness keeps coming back"),
                Copy.t("Redness around {0}'s ears was logged on several recent days. "
                        + "Worth keeping track of and mentioning to your vet.", pet.getName()),
                List.of(
                        Copy.t("Days reviewed: {0}", relatedCheckIns.size()),
                        Copy.t("Days with red or irritated ears: {0}", earRednessDays),
                        Copy.t("Sometimes lines up with food or seasonal changes")
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
                Copy.t("Water looks lower than usual"),
                Copy.t("{0}'s water intake was logged lower than usual recently.", pet.getName()),
                List.of(
                        Copy.t("Recent days reviewed: {0}", relatedCheckIns.size()),
                        Copy.t("Lower water days: {0}", lowerDays),
                        Copy.t("Bring this context to your vet if it continues or appears with other changes")
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
        String proteinName = Copy.protein(protein);
        return new PatternCandidate(
                stableId(pet.getId(), PatternType.POSSIBLE_FOOD_TRIGGER.name() + "_" + protein.name()),
                pet.getId(),
                PatternType.POSSIBLE_FOOD_TRIGGER,
                confidence,
                Copy.t("Possible {0}-related pattern", proteinName),
                Copy.t("More scratching or stool changes were logged after {0}-based food or treats "
                        + "more than once. Not a diagnosis — could be worth raising with your vet.", proteinName),
                List.of(
                        Copy.t("{0} was logged more than once", Copy.proteinLabel(protein)),
                        Copy.t("A related change appeared {0} times afterwards", repeatedWindows),
                        Copy.t("PetPattern reviewed the recent notes")
                ),
                Instant.now(),
                relatedFoodLog == null ? null : relatedFoodLog.getId(),
                ids(relatedCheckIns)
        );
    }

    // --- Cat patterns (cautious, never diagnostic) ---

    private String catBoundary() {
        return Copy.t("This is not a diagnosis, but it may be worth discussing with your vet.");
    }

    public PatternCandidate catAppetiteLow(Pet pet, PatternConfidence confidence, long lowerDays, List<DailyCheckIn> relatedCheckIns) {
        return new PatternCandidate(
                stableId(pet.getId(), PatternType.APPETITE_LOW.name()),
                pet.getId(),
                PatternType.APPETITE_LOW,
                confidence,
                Copy.t("Appetite lower than usual"),
                Copy.t("{0}'s appetite has been lower than usual on more than one recent day.", pet.getName())
                        + " " + catBoundary(),
                List.of(
                        Copy.t("Recent days reviewed: {0}", relatedCheckIns.size()),
                        Copy.t("Days appetite was lower or refused: {0}", lowerDays),
                        Copy.t("A lower appetite in cats is worth watching")
                ),
                Instant.now(),
                null,
                ids(relatedCheckIns)
        );
    }

    public PatternCandidate catWaterChange(Pet pet, PatternConfidence confidence, boolean lower, long changedDays, List<DailyCheckIn> relatedCheckIns) {
        String direction = lower ? Copy.t("lower") : Copy.t("higher");
        return new PatternCandidate(
                stableId(pet.getId(), PatternType.WATER_CHANGE.name()),
                pet.getId(),
                PatternType.WATER_CHANGE,
                confidence,
                Copy.t("Water intake changed from usual"),
                Copy.t("Water intake changed from {0}'s recent normal ({1} than usual).", pet.getName(), direction)
                        + " " + catBoundary(),
                List.of(
                        Copy.t("Recent days reviewed: {0}", relatedCheckIns.size()),
                        Copy.t("Days water was {0} than usual: {1}", direction, changedDays),
                        Copy.t("Changes in a cat's water intake are worth keeping an eye on")
                ),
                Instant.now(),
                null,
                ids(relatedCheckIns)
        );
    }

    public PatternCandidate catLitterBoxChange(Pet pet, PatternConfidence confidence, long changedDays, boolean straining, List<DailyCheckIn> relatedCheckIns) {
        String strainNote = straining ? Copy.t(" Straining was also noted on at least one day.") : "";
        return new PatternCandidate(
                stableId(pet.getId(), PatternType.LITTER_BOX_CHANGE.name()),
                pet.getId(),
                PatternType.LITTER_BOX_CHANGE,
                confidence,
                Copy.t("Litter box behavior changed recently"),
                Copy.t("{0}'s litter box behavior changed recently.", pet.getName()) + strainNote + " " + catBoundary(),
                List.of(
                        Copy.t("Recent days reviewed: {0}", relatedCheckIns.size()),
                        Copy.t("Days with a litter box or urination change: {0}", changedDays),
                        Copy.t("Litter box changes are worth mentioning to your vet")
                ),
                Instant.now(),
                null,
                ids(relatedCheckIns)
        );
    }

    public PatternCandidate catHidingIncreased(Pet pet, PatternConfidence confidence, long moreDays, List<DailyCheckIn> relatedCheckIns) {
        return new PatternCandidate(
                stableId(pet.getId(), PatternType.HIDING_INCREASED.name()),
                pet.getId(),
                PatternType.HIDING_INCREASED,
                confidence,
                Copy.t("Hiding logged more than usual"),
                Copy.t("Hiding was logged more than usual for {0} recently. More hiding in cats is worth watching.", pet.getName())
                        + " " + catBoundary(),
                List.of(
                        Copy.t("Recent days reviewed: {0}", relatedCheckIns.size()),
                        Copy.t("Days hiding was logged: {0}", moreDays),
                        Copy.t("Worth watching alongside appetite and litter box")
                ),
                Instant.now(),
                null,
                ids(relatedCheckIns)
        );
    }

    public PatternCandidate catRepeatedVomiting(Pet pet, PatternConfidence confidence, long vomitDays, List<DailyCheckIn> relatedCheckIns) {
        return new PatternCandidate(
                stableId(pet.getId(), PatternType.REPEATED_VOMITING.name()),
                pet.getId(),
                PatternType.REPEATED_VOMITING,
                confidence,
                Copy.t("Vomiting logged more than once"),
                Copy.t("{0} vomited on more than one recent day.", pet.getName()) + " " + catBoundary(),
                List.of(
                        Copy.t("Recent days reviewed: {0}", relatedCheckIns.size()),
                        Copy.t("Days vomiting was logged: {0}", vomitDays),
                        Copy.t("Worth bringing to your vet if it continues")
                ),
                Instant.now(),
                null,
                ids(relatedCheckIns)
        );
    }

    private List<UUID> ids(List<DailyCheckIn> checkIns) {
        return checkIns.stream().map(DailyCheckIn::getId).toList();
    }

    private String stableId(UUID petId, String suffix) {
        return petId + ":" + suffix;
    }
}
