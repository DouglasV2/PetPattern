package com.petpattern.patterns;

import com.petpattern.domain.Species;
import com.petpattern.i18n.Copy;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Set;

/**
 * Reptile rules, built only from the signals a reptile check-in collects
 * (speciesProfiles.js REPTILE: feeding, basking, shedding, activity, stool_urate,
 * temperature, humidity, skin).
 *
 * <p>Reptile behaviour is environment-driven, so feeding refusal is a WATCH (never urgent —
 * fasting and brumation are normal) and enclosure temperature/humidity changes around a
 * behaviour change are surfaced only as INFO context to check first.
 */
@Component
public class ReptileRuleSet implements SpeciesRuleSet {

    private static final Set<String> FEEDING_REDUCED = SignalWindow.values("Ate less", "Refused food");
    private static final Set<String> BASKING_AVOID = SignalWindow.values("Avoiding basking", "Less");
    private static final Set<String> ACTIVITY_LOW = SignalWindow.values("Less active");

    private final StarterRuleEngine engine;
    private final List<StarterRule> rules;

    public ReptileRuleSet(StarterRuleEngine engine) {
        this.engine = engine;
        this.rules = buildRules();
    }

    @Override
    public Species species() {
        return Species.REPTILE;
    }

    @Override
    public List<PatternCandidate> evaluate(RuleContext ctx) {
        return engine.run(ctx, rules);
    }

    private static List<StarterRule> buildRules() {
        return List.of(
                new StarterRule(
                        "REPTILE_FEEDING_REFUSAL",
                        RuleTag.INTAKE_CHANGE,
                        Severity.WATCH,
                        Set.of("feeding"),
                        3,
                        window -> window.within(21).daysMatching("feeding", FEEDING_REDUCED),
                        StarterRule.WATCH_CONFIDENCE,
                        (pet, days) -> StarterRule.RuleCopy.of(
                                Copy.t("Eating less on several days"),
                                Copy.t("{0} has eaten less or refused food on several days. In reptiles this can be "
                                        + "normal — with season, temperature or brumation — but a longer stretch is "
                                        + "worth watching, and checking the enclosure first. ", pet.getName())
                                        + UrgentCopy.watchBoundary())),

                new StarterRule(
                        "REPTILE_BASKING_AVOIDANCE",
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
                                        + "more than one day. It is worth checking enclosure temperatures and "
                                        + "watching this. ", pet.getName()) + UrgentCopy.watchBoundary())),

                new StarterRule(
                        "REPTILE_THERMAL_CONTEXT",
                        RuleTag.ENV_CONTEXT,
                        Severity.INFO,
                        Set.of(),
                        1,
                        ReptileRuleSet::thermalContext,
                        StarterRule.CONTEXT_CONFIDENCE,
                        (pet, days) -> StarterRule.RuleCopy.of(
                                Copy.t("An enclosure change around a behaviour change"),
                                Copy.t("A change in enclosure temperature or humidity was logged around the same time "
                                        + "as a change in {0}'s feeding or basking. Reptile behaviour is very sensitive "
                                        + "to the environment, so this is useful context to check first. ", pet.getName())
                                        + UrgentCopy.watchBoundary())));
    }

    /** Fires only when BOTH an enclosure temp/humidity change AND a feeding/basking change appear recently. */
    private static RuleHit thermalContext(SignalWindow window) {
        SignalWindow recent = window.within(10);
        RuleHit environment = recent.changedDays("temperature").union(recent.changedDays("humidity"));
        RuleHit behaviour = recent.daysMatching("feeding", FEEDING_REDUCED)
                .union(recent.daysMatching("basking", BASKING_AVOID));
        if (environment.days() >= 1 && behaviour.days() >= 1) {
            return environment.union(behaviour);
        }
        return new RuleHit();
    }
}
