package com.petpattern.patterns;

import com.petpattern.domain.DailyCheckIn;
import com.petpattern.domain.FoodLog;
import com.petpattern.domain.Pet;

import java.util.List;

/**
 * Everything a {@link SpeciesRuleSet} needs to evaluate one pet's recent history:
 * the pet, its recent check-ins (loaded over the 120-day window, ascending by date),
 * and its recent food logs. Immutable; the engine builds one per analysis.
 */
public record RuleContext(Pet pet, List<DailyCheckIn> checkIns, List<FoodLog> foodLogs) {
}
