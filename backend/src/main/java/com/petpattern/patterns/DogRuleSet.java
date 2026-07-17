package com.petpattern.patterns;

import com.petpattern.domain.AppetiteLevel;
import com.petpattern.domain.DailyCheckIn;
import com.petpattern.domain.EnergyLevel;
import com.petpattern.domain.Species;
import com.petpattern.domain.StoolState;
import com.petpattern.i18n.Copy;
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

    /**
     * The immediate safety pass for dogs: "several serious signs on the same day" — three or more
     * of vomiting, loose stool, refusing food, or low energy logged together. Several of these at
     * once is the kind of combination many vets say not to wait on. It is a plain count of
     * owner-logged facts, never a diagnosis, and one or two mild signals never reach it — so it
     * raises no false urgency. Evaluated with no seven-check-in gate and never persisted.
     */
    @Override
    public List<PatternCandidate> immediateObservations(RuleContext ctx) {
        return ImmediateObservations.structuredUrgent(
                ctx.pet(),
                ctx.checkIns(),
                DogRuleSet::acuteMultiSignal,
                "DOG_ACUTE_DISTRESS",
                Copy.t("Several serious signs on the same day"),
                Copy.t("You logged several serious signs for {0} on the same day — such as vomiting, "
                        + "loose stool, not eating, or low energy. When several of these happen together "
                        + "in a dog, many vets say not to wait. ", ctx.pet().getName())
                        + UrgentCopy.boundary(),
                Copy.t("Several serious signs logged together is the kind of change many vets say not "
                        + "to wait on. ") + UrgentCopy.vetHandoff(ctx.pet().getName()));
    }

    private static boolean acuteMultiSignal(DailyCheckIn checkIn) {
        int serious = 0;
        if (checkIn.isVomiting()) {
            serious++;
        }
        if (checkIn.isDiarrhea() || checkIn.getStoolState() == StoolState.DIARRHEA) {
            serious++;
        }
        if (checkIn.getAppetiteLevel() == AppetiteLevel.REFUSED) {
            serious++;
        }
        if (checkIn.getEnergyLevel() == EnergyLevel.LOW) {
            serious++;
        }
        return serious >= 3;
    }
}
