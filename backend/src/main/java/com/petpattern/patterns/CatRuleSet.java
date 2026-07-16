package com.petpattern.patterns;

import com.petpattern.domain.Species;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;

/**
 * Cat rules — a thin adapter over the existing {@link CatSymptomAnalyzer}. The calls, order
 * and outputs are identical to the old inline {@code PatternEngine} cat branch, so cat pattern
 * ids and behaviour are unchanged.
 */
@Component
public class CatRuleSet implements SpeciesRuleSet {

    private final CatSymptomAnalyzer catSymptomAnalyzer;

    public CatRuleSet(CatSymptomAnalyzer catSymptomAnalyzer) {
        this.catSymptomAnalyzer = catSymptomAnalyzer;
    }

    @Override
    public Species species() {
        return Species.CAT;
    }

    @Override
    public List<PatternCandidate> evaluate(RuleContext ctx) {
        List<PatternCandidate> out = new ArrayList<>();
        catSymptomAnalyzer.appetiteLow(ctx.pet(), ctx.checkIns()).ifPresent(out::add);
        catSymptomAnalyzer.waterChange(ctx.pet(), ctx.checkIns()).ifPresent(out::add);
        catSymptomAnalyzer.litterBoxChange(ctx.pet(), ctx.checkIns()).ifPresent(out::add);
        catSymptomAnalyzer.hidingIncreased(ctx.pet(), ctx.checkIns()).ifPresent(out::add);
        catSymptomAnalyzer.repeatedVomiting(ctx.pet(), ctx.checkIns()).ifPresent(out::add);
        return out;
    }
}
