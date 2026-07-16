package com.petpattern.patterns;

import com.petpattern.domain.Species;
import com.petpattern.i18n.Copy;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Set;

/**
 * Hamster rules, built only from the signals a hamster check-in collects
 * (speciesProfiles.js HAMSTER: appetite, water, activity, hiding, fur_skin, teeth, weight,
 * droppings). The one URGENT rule is a same-day co-occurrence — watery droppings together
 * with being less active or eating less — which never names a condition or infers a cause.
 */
@Component
public class HamsterRuleSet implements SpeciesRuleSet {

    private static final Set<String> DROPPINGS_WATERY = SignalWindow.values("Watery");
    private static final Set<String> APPETITE_REDUCED = SignalWindow.values("Eating less", "Refused food");
    private static final Set<String> ACTIVITY_LOW = SignalWindow.values("Less active");
    private static final Set<String> WEIGHT_CHANGED = SignalWindow.values("Noticed change");

    private final StarterRuleEngine engine;
    private final List<StarterRule> rules;

    public HamsterRuleSet(StarterRuleEngine engine) {
        this.engine = engine;
        this.rules = buildRules();
    }

    @Override
    public Species species() {
        return Species.HAMSTER;
    }

    @Override
    public List<PatternCandidate> evaluate(RuleContext ctx) {
        return engine.run(ctx, rules);
    }

    private static List<StarterRule> buildRules() {
        return List.of(
                new StarterRule(
                        "HAMSTER_WET_TAIL_RISK",
                        RuleTag.URGENT_SIGN,
                        Severity.URGENT,
                        Set.of(),
                        1,
                        window -> window.within(7).coOccurDays(
                                day -> day.has("droppings", DROPPINGS_WATERY),
                                day -> day.has("activity", ACTIVITY_LOW) || day.has("appetite", APPETITE_REDUCED)),
                        StarterRule.URGENT_CONFIDENCE,
                        (pet, days) -> StarterRule.RuleCopy.urgent(
                                Copy.t("Watery droppings with low energy on the same day"),
                                Copy.t("You recorded {0} with watery droppings and being less active or eating less "
                                        + "on the same day. In hamsters, watery droppings together with low energy is "
                                        + "a well-known warning sign that can worsen quickly. ", pet.getName())
                                        + UrgentCopy.boundary(),
                                Copy.t("In hamsters, watery droppings with low energy is the kind of change many "
                                        + "exotic vets say not to wait on. ")
                                        + UrgentCopy.vetHandoff(pet.getName()))),

                new StarterRule(
                        "HAMSTER_LOW_ACTIVITY_APPETITE",
                        RuleTag.BEHAVIOR_CHANGE,
                        Severity.WATCH,
                        Set.of(),
                        2,
                        window -> window.within(7).coOccurDays(
                                day -> day.has("activity", ACTIVITY_LOW),
                                day -> day.has("appetite", APPETITE_REDUCED)),
                        StarterRule.WATCH_CONFIDENCE,
                        (pet, days) -> StarterRule.RuleCopy.of(
                                Copy.t("Less active and eating less on the same day"),
                                Copy.t("{0} was logged as less active and eating less on the same day, on more than "
                                        + "one day. Hamsters tend to hide when they feel off, so this is worth keeping an eye on. ",
                                        pet.getName()) + UrgentCopy.watchBoundary())),

                new StarterRule(
                        "HAMSTER_WEIGHT_LOSS",
                        RuleTag.BODY_CONDITION,
                        Severity.WATCH,
                        Set.of("weight"),
                        2,
                        window -> window.within(21).daysMatching("weight", WEIGHT_CHANGED),
                        StarterRule.WATCH_CONFIDENCE,
                        (pet, days) -> StarterRule.RuleCopy.of(
                                Copy.t("Weight change logged on more than one day"),
                                Copy.t("You logged a change in {0}'s weight on more than one day. Hamsters hide "
                                        + "weight loss well, so this is worth keeping an eye on. ", pet.getName())
                                        + UrgentCopy.watchBoundary())),

                new StarterRule(
                        "HAMSTER_LUMP_SWELLING",
                        RuleTag.BODY_CONDITION,
                        Severity.WATCH,
                        Set.of(),
                        1,
                        // A logged swelling (the universal visible-change SWELLING flow). Plain
                        // fur/skin "change noticed" days stay with the generic REPEATED_OBSERVATION
                        // pass so one signal is never reported as two cards.
                        window -> window.within(21).visibleChangeDays("SWELLING", Set.of()),
                        StarterRule.WATCH_CONFIDENCE,
                        (pet, days) -> StarterRule.RuleCopy.of(
                                Copy.t("A lump or skin change you noticed"),
                                Copy.t("You logged a swelling or skin change on {0}. Lumps are common in hamsters and "
                                        + "many are harmless, but if it is growing or changing it is worth having your "
                                        + "vet look. ", pet.getName()) + UrgentCopy.watchBoundary())));
    }
}
