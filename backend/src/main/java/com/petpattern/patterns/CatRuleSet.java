package com.petpattern.patterns;

import com.petpattern.domain.DailyCheckIn;
import com.petpattern.domain.LitterBoxUse;
import com.petpattern.domain.Species;
import com.petpattern.domain.UrinationChange;
import com.petpattern.i18n.Copy;
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

    /**
     * The immediate safety pass for cats: straining to urinate with little or nothing passing on
     * the same day. In cats — especially males — a urinary blockage is a genuine, time-critical
     * emergency, so this is the one feline urgent sign. It restates only what the owner logged
     * (straining together with little/no urine) and never names a condition. Evaluated with no
     * seven-check-in gate and never persisted.
     */
    @Override
    public List<PatternCandidate> immediateObservations(RuleContext ctx) {
        return ImmediateObservations.structuredUrgent(
                ctx.pet(),
                ctx.checkIns(),
                CatRuleSet::urinaryObstructionRisk,
                "CAT_URINARY_OBSTRUCTION_RISK",
                Copy.t("Straining with little or no urine"),
                Copy.t("You logged {0} straining with little or no urine passing on the same day. In "
                        + "cats, straining to urinate with little coming out is the kind of sign many "
                        + "vets say not to wait on. ", ctx.pet().getName()) + UrgentCopy.boundary(),
                Copy.t("In cats, straining with little or no urine is the kind of sign many vets say "
                        + "not to wait on. ") + UrgentCopy.vetHandoff(ctx.pet().getName()));
    }

    private static boolean urinaryObstructionRisk(DailyCheckIn checkIn) {
        return checkIn.isStraining()
                && (checkIn.getLitterBoxUse() == LitterBoxUse.NONE
                    || checkIn.getLitterBoxUse() == LitterBoxUse.LESS
                    || checkIn.getUrinationChange() == UrinationChange.LESS);
    }
}
