package com.petpattern.patterns;

import com.petpattern.domain.Species;
import org.springframework.stereotype.Component;

import java.util.List;

/**
 * The generic fallback rule set: no species-specific rules, just the preserved
 * REPEATED_OBSERVATION pass over every changed signal. Used for any species that has no
 * dedicated {@link SpeciesRuleSet} — {@link #species()} is {@code null} so it is never put in
 * the engine's species map, only used as the default.
 *
 * <p>All ten current species have a dedicated set, so this is defensive: it guarantees a new
 * {@code Species} enum value still gets honest starter behaviour with zero engine edits.
 */
@Component
public class GenericStarterRuleSet implements SpeciesRuleSet {

    private final StarterRuleEngine engine;

    public GenericStarterRuleSet(StarterRuleEngine engine) {
        this.engine = engine;
    }

    @Override
    public Species species() {
        return null;
    }

    @Override
    public List<PatternCandidate> evaluate(RuleContext ctx) {
        return engine.run(ctx, List.of());
    }
}
