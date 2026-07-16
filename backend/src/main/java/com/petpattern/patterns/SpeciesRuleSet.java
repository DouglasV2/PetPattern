package com.petpattern.patterns;

import com.petpattern.domain.Species;

import java.util.List;

/**
 * One species' pattern rules. Every implementation is a Spring {@code @Component}
 * and is auto-collected by {@link PatternEngine}, so adding a species is a new
 * component with <em>zero</em> engine edits.
 *
 * <p>{@link #species()} returns the species this set handles, or {@code null} if it
 * is the generic fallback used for any species without a dedicated set.
 */
public interface SpeciesRuleSet {

    /** The species this set handles, or {@code null} for the generic fallback. */
    Species species();

    /** Evaluate this pet's recent history into zero or more candidate patterns. */
    List<PatternCandidate> evaluate(RuleContext ctx);
}
