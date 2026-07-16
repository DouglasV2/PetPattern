package com.petpattern.patterns;

import com.petpattern.domain.Species;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;

/**
 * Dog rules — a thin adapter over the existing {@link SymptomTrendAnalyzer} and
 * {@link FoodExposureAnalyzer}. The calls, order and outputs are identical to the old
 * inline {@code PatternEngine} dog branch, so dog pattern ids and behaviour are unchanged.
 */
@Component
public class DogRuleSet implements SpeciesRuleSet {

    private final SymptomTrendAnalyzer symptomTrendAnalyzer;
    private final FoodExposureAnalyzer foodExposureAnalyzer;

    public DogRuleSet(SymptomTrendAnalyzer symptomTrendAnalyzer, FoodExposureAnalyzer foodExposureAnalyzer) {
        this.symptomTrendAnalyzer = symptomTrendAnalyzer;
        this.foodExposureAnalyzer = foodExposureAnalyzer;
    }

    @Override
    public Species species() {
        return Species.DOG;
    }

    @Override
    public List<PatternCandidate> evaluate(RuleContext ctx) {
        List<PatternCandidate> out = new ArrayList<>();
        symptomTrendAnalyzer.itchingAboveBaseline(ctx.pet(), ctx.checkIns()).ifPresent(out::add);
        symptomTrendAnalyzer.stoolInstability(ctx.pet(), ctx.checkIns()).ifPresent(out::add);
        symptomTrendAnalyzer.waterDrop(ctx.pet(), ctx.checkIns()).ifPresent(out::add);
        symptomTrendAnalyzer.recurringEarRedness(ctx.pet(), ctx.checkIns()).ifPresent(out::add);
        foodExposureAnalyzer.possibleFoodTrigger(ctx.pet(), ctx.checkIns(), ctx.foodLogs()).ifPresent(out::add);
        return out;
    }
}
