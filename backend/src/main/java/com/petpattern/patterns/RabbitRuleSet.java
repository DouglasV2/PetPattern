package com.petpattern.patterns;

import com.petpattern.domain.Species;
import com.petpattern.i18n.Copy;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Set;

/**
 * Rabbit rules, built only from the signals a rabbit check-in actually collects
 * (speciesProfiles.js RABBIT: appetite_hay, poop, water, energy, hiding, teeth, weight).
 *
 * <p>The one URGENT rule is a plain, countable same-day co-occurrence the owner logged —
 * eating less together with fewer/changed droppings — which in rabbits is a well-known
 * warning sign. It never names a condition and never infers a cause.
 */
@Component
public class RabbitRuleSet implements SpeciesRuleSet {

    private static final Set<String> APPETITE_REDUCED = SignalWindow.values("Eating less", "Refused food", "Hay intake changed");
    private static final Set<String> POOP_REDUCED = SignalWindow.values("Less", "Smaller", "Softer", "Noticed change");
    private static final Set<String> ENERGY_LOWER = SignalWindow.values("Lower");
    private static final Set<String> HIDING_MORE = SignalWindow.values("More");
    private static final Set<String> TEETH_CHANGED = SignalWindow.values("Chewing less", "Drooling noticed");

    private final StarterRuleEngine engine;
    private final List<StarterRule> rules;

    public RabbitRuleSet(StarterRuleEngine engine) {
        this.engine = engine;
        this.rules = buildRules();
    }

    @Override
    public Species species() {
        return Species.RABBIT;
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
                        "RABBIT_GI_STASIS_RISK",
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
                                        + "droppings on the same day. In rabbits, eating less together with fewer "
                                        + "droppings is a well-known warning sign. ", pet.getName())
                                        + UrgentCopy.boundary(),
                                Copy.t("In rabbits, eating less together with fewer or changed droppings is the "
                                        + "kind of change many rabbit vets say not to wait on. ")
                                        + UrgentCopy.vetHandoff(pet.getName()))),

                new StarterRule(
                        "RABBIT_INTAKE_DROP",
                        RuleTag.INTAKE_CHANGE,
                        Severity.WATCH,
                        Set.of("appetite_hay"),
                        2,
                        window -> window.within(14).daysMatching("appetite_hay", APPETITE_REDUCED),
                        StarterRule.WATCH_CONFIDENCE,
                        (pet, days) -> StarterRule.RuleCopy.of(
                                Copy.t("Eating less on more than one day"),
                                Copy.t("{0} has been eating less or refusing hay on more than one day recently. "
                                        + "In rabbits, keeping food and hay moving matters, so this is worth watching. ",
                                        pet.getName()) + UrgentCopy.watchBoundary())),

                new StarterRule(
                        "RABBIT_DENTAL_INTAKE",
                        RuleTag.INTAKE_CHANGE,
                        Severity.WATCH,
                        Set.of("teeth"),
                        2,
                        window -> window.within(21).daysMatching("teeth", TEETH_CHANGED),
                        StarterRule.WATCH_CONFIDENCE,
                        (pet, days) -> StarterRule.RuleCopy.of(
                                Copy.t("Chewing changes on more than one day"),
                                Copy.t("{0} was logged with chewing changes or drooling on more than one day. "
                                        + "In rabbits, dental comfort affects eating, so this is worth watching. ",
                                        pet.getName()) + UrgentCopy.watchBoundary())),

                new StarterRule(
                        "RABBIT_LOW_ENERGY_HIDING",
                        RuleTag.BEHAVIOR_CHANGE,
                        Severity.WATCH,
                        Set.of(),
                        2,
                        window -> window.within(5).coOccurDays(
                                day -> day.has("energy", ENERGY_LOWER),
                                day -> day.has("hiding", HIDING_MORE)),
                        StarterRule.WATCH_CONFIDENCE,
                        (pet, days) -> StarterRule.RuleCopy.of(
                                Copy.t("Lower energy and hiding more on the same day"),
                                Copy.t("{0} was logged as lower energy and hiding more on the same day, on more "
                                        + "than one day. This is worth keeping an eye on. ", pet.getName())
                                        + UrgentCopy.watchBoundary())));
    }
}
