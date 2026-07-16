package com.petpattern.patterns;

import com.petpattern.domain.Species;
import com.petpattern.i18n.Copy;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Set;

/**
 * Turtle rules, built only from the signals a turtle check-in collects
 * (speciesProfiles.js TURTLE: feeding, basking, activity, shell, shedding_skin,
 * water_enclosure, stool, eyes).
 *
 * <p>Note: turtles do <em>not</em> collect a temperature or humidity signal (only reptiles do).
 * A turtle's environment is logged as {@code water_enclosure}, so the context rule here is a
 * water/enclosure-context rule, not a thermal one.
 */
@Component
public class TurtleRuleSet implements SpeciesRuleSet {

    private static final Set<String> FEEDING_REDUCED = SignalWindow.values("Ate less", "Refused food");
    private static final Set<String> BASKING_AVOID = SignalWindow.values("Avoiding basking", "Less");
    private static final Set<String> ACTIVITY_LOW = SignalWindow.values("Less active");
    private static final Set<String> ENCLOSURE_CHANGE = SignalWindow.values("Water changed", "Cloudy", "Setup changed");
    private static final Set<String> SHELL_CONCERN = SignalWindow.values("Mark noticed", "Soft spot concern");

    private final StarterRuleEngine engine;
    private final List<StarterRule> rules;

    public TurtleRuleSet(StarterRuleEngine engine) {
        this.engine = engine;
        this.rules = buildRules();
    }

    @Override
    public Species species() {
        return Species.TURTLE;
    }

    @Override
    public List<PatternCandidate> evaluate(RuleContext ctx) {
        return engine.run(ctx, rules);
    }

    private static List<StarterRule> buildRules() {
        return List.of(
                new StarterRule(
                        "TURTLE_FEEDING_REFUSAL",
                        RuleTag.INTAKE_CHANGE,
                        Severity.WATCH,
                        Set.of("feeding"),
                        3,
                        window -> window.within(21).daysMatching("feeding", FEEDING_REDUCED),
                        StarterRule.WATCH_CONFIDENCE,
                        (pet, days) -> StarterRule.RuleCopy.of(
                                Copy.t("Eating less on several days"),
                                Copy.t("{0} has eaten less or refused food on several days. In turtles this can shift "
                                        + "with season and water temperature, but a longer stretch is worth watching, "
                                        + "and checking the enclosure first. ", pet.getName())
                                        + UrgentCopy.watchBoundary())),

                new StarterRule(
                        "TURTLE_SHELL_CONCERN",
                        RuleTag.BODY_CONDITION,
                        Severity.WATCH,
                        Set.of(),
                        1,
                        window -> window.within(21).daysMatching("shell", SHELL_CONCERN)
                                .union(window.within(21).visibleChangeDays("SHELL", Set.of())),
                        StarterRule.WATCH_CONFIDENCE,
                        (pet, days) -> StarterRule.RuleCopy.of(
                                Copy.t("A shell change you noticed"),
                                Copy.t("You logged a mark or soft spot on {0}'s shell. Shell changes can develop "
                                        + "slowly, so if it is changing or feels soft it is worth having your vet "
                                        + "look. ", pet.getName()) + UrgentCopy.watchBoundary())),

                new StarterRule(
                        "TURTLE_BASKING_AVOIDANCE",
                        RuleTag.BEHAVIOR_CHANGE,
                        Severity.WATCH,
                        Set.of(),
                        2,
                        window -> window.within(14).coOccurDays(
                                day -> day.has("basking", BASKING_AVOID),
                                day -> day.has("activity", ACTIVITY_LOW)),
                        StarterRule.WATCH_CONFIDENCE,
                        (pet, days) -> StarterRule.RuleCopy.of(
                                Copy.t("Avoiding basking and less active on the same day"),
                                Copy.t("{0} was logged avoiding basking and being less active on the same day, on "
                                        + "more than one day. It is worth checking the enclosure and water, and "
                                        + "watching this. ", pet.getName()) + UrgentCopy.watchBoundary())),

                new StarterRule(
                        "TURTLE_ENCLOSURE_CONTEXT",
                        RuleTag.ENV_CONTEXT,
                        Severity.INFO,
                        Set.of(),
                        1,
                        TurtleRuleSet::enclosureContext,
                        StarterRule.CONTEXT_CONFIDENCE,
                        (pet, days) -> StarterRule.RuleCopy.of(
                                Copy.t("A water or enclosure change around a behaviour change"),
                                Copy.t("A change in {0}'s water or enclosure was logged around the same time as a "
                                        + "change in feeding or basking. Turtle behaviour is very sensitive to water "
                                        + "and habitat, so this is useful context to check first. ", pet.getName())
                                        + UrgentCopy.watchBoundary())));
    }

    /** Fires only when BOTH a water/enclosure change AND a feeding/basking change appear recently. */
    private static RuleHit enclosureContext(SignalWindow window) {
        SignalWindow recent = window.within(10);
        RuleHit enclosure = recent.daysMatching("water_enclosure", ENCLOSURE_CHANGE);
        RuleHit behaviour = recent.daysMatching("feeding", FEEDING_REDUCED)
                .union(recent.daysMatching("basking", BASKING_AVOID));
        if (enclosure.days() >= 1 && behaviour.days() >= 1) {
            return enclosure.union(behaviour);
        }
        return new RuleHit();
    }
}
