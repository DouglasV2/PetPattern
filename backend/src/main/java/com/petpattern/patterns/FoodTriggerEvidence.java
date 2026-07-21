package com.petpattern.patterns;

/**
 * The comparison evidence behind a possible food association (spec Part 10). It
 * carries both sides of the picture so the card can show what supports AND what
 * limits the observation — never a one-sided case.
 *
 * @param assessedExposures        exposures of this protein we could evaluate
 * @param followedExposures        of those, how many were followed by the outcome
 * @param notFollowedExposures     of those, how many were NOT (counter-evidence)
 * @param symptomDaysWithoutExposure days the symptom was logged with no such food nearby
 * @param concurrentOtherFoodChanges other-protein food changes in the same span
 * @param windowStartDay           first day after a change that we looked at
 * @param windowEndDay             last day after a change that we looked at
 * @param averageLift              average rise over baseline on the followed windows
 */
public record FoodTriggerEvidence(
        int assessedExposures,
        int followedExposures,
        int notFollowedExposures,
        int symptomDaysWithoutExposure,
        int concurrentOtherFoodChanges,
        int windowStartDay,
        int windowEndDay,
        double averageLift) {
}
