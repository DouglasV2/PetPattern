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

    /**
     * The immediate safety pass (Layer A): zero or more {@link Severity#URGENT} observations
     * for the pet's <em>latest relevant entry</em>, evaluated with NO seven-check-in gate so an
     * urgent combination on the very first check-in is still surfaced.
     *
     * <p>Default is empty, so a species with no urgent tier (e.g. fish and reptiles, where a
     * feeding change is deliberately never urgent) contributes nothing here. A species that
     * declares urgent rules MUST override this — for starter species that is a one-line delegate
     * to {@link StarterRuleEngine#runImmediate}; dog and cat build theirs from structured fields.
     * Whatever this returns is ephemeral and is never persisted as a recurring pattern.
     */
    default List<PatternCandidate> immediateObservations(RuleContext ctx) {
        return List.of();
    }
}
