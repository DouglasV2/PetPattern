package com.petpattern.patterns;

import com.petpattern.domain.Species;
import com.petpattern.i18n.Copy;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Set;

/**
 * Guinea pig rules, built only from the signals a guinea pig check-in collects
 * (speciesProfiles.js GUINEA_PIG: appetite_hay, poop, water, energy, hiding, teeth, weight).
 * Guinea pigs collect no breathing signal, so — unlike birds — there is no breathing rule.
 */
@Component
public class GuineaPigRuleSet implements SpeciesRuleSet {

    private static final Set<String> APPETITE_REDUCED = SignalWindow.values("Eating less", "Refused food", "Hay intake changed");
    private static final Set<String> POOP_REDUCED = SignalWindow.values("Less", "Smaller", "Softer", "Noticed change");
    private static final Set<String> TEETH_CHANGED = SignalWindow.values("Chewing less", "Drooling noticed");
    private static final Set<String> WEIGHT_CHANGED = SignalWindow.values("Noticed change");

    private final StarterRuleEngine engine;
    private final List<StarterRule> rules;

    public GuineaPigRuleSet(StarterRuleEngine engine) {
        this.engine = engine;
        this.rules = buildRules();
    }

    @Override
    public Species species() {
        return Species.GUINEA_PIG;
    }

    @Override
    public List<PatternCandidate> evaluate(RuleContext ctx) {
        return engine.run(ctx, rules);
    }

    @Override
    public List<PatternCandidate> immediateObservations(RuleContext ctx) {
        return engine.runImmediate(ctx, rules);
    }

    private static List<StarterRule> buildRules() {
        return List.of(
                new StarterRule(
                        "GUINEA_PIG_GI_STASIS_RISK",
                        RuleTag.URGENT_SIGN,
                        Severity.URGENT,
                        Set.of(),
                        1,
                        window -> window.within(7).coOccurDays(
                                day -> day.has("appetite_hay", APPETITE_REDUCED),
                                day -> day.has("poop", POOP_REDUCED)),
                        StarterRule.URGENT_CONFIDENCE,
                        (pet, days) -> StarterRule.RuleCopy.urgent(
                                Copy.t("Eating less and changed droppings on the same day"),
                                Copy.t("You recorded {0} eating less and passing fewer, smaller, or changed "
                                        + "droppings on the same day. In guinea pigs, eating less together with fewer "
                                        + "droppings is a well-known warning sign. ", pet.getName())
                                        + UrgentCopy.boundary(),
                                Copy.t("In guinea pigs, eating less together with fewer or changed droppings is the "
                                        + "kind of change many exotic vets say not to wait on. ")
                                        + UrgentCopy.vetHandoff(pet.getName()))),

                new StarterRule(
                        "GUINEA_PIG_WEIGHT_AND_INTAKE",
                        RuleTag.BODY_CONDITION,
                        Severity.WATCH,
                        Set.of("weight"),
                        2,
                        window -> window.within(21).daysMatching("weight", WEIGHT_CHANGED),
                        StarterRule.WATCH_CONFIDENCE,
                        (pet, days) -> StarterRule.RuleCopy.of(
                                Copy.t("Weight change logged on more than one day"),
                                Copy.t("You logged a change in {0}'s weight on more than one day. Guinea pigs hide "
                                        + "weight loss well, so a regular weigh-in — especially alongside any eating "
                                        + "changes — is worth keeping up. ", pet.getName())
                                        + UrgentCopy.watchBoundary())),

                new StarterRule(
                        "GUINEA_PIG_DENTAL_INTAKE",
                        RuleTag.INTAKE_CHANGE,
                        Severity.WATCH,
                        Set.of("teeth"),
                        2,
                        window -> window.within(21).daysMatching("teeth", TEETH_CHANGED),
                        StarterRule.WATCH_CONFIDENCE,
                        (pet, days) -> StarterRule.RuleCopy.of(
                                Copy.t("Chewing changes on more than one day"),
                                Copy.t("{0} was logged with chewing changes or drooling on more than one day. "
                                        + "In guinea pigs, dental comfort affects eating, so this is worth watching. ",
                                        pet.getName()) + UrgentCopy.watchBoundary())));
    }
}
