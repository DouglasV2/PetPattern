package com.petpattern.patterns;

import com.petpattern.domain.Species;
import com.petpattern.i18n.Copy;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Set;

/**
 * Fish (aquarium) rules, built only from the signals a fish check-in collects
 * (speciesProfiles.js FISH_AQUARIUM: feeding, swimming, appetite, water_change,
 * water_clarity, spots_fins, temperature, behavior).
 *
 * <p>Aquarium fish health is dominated by water quality, so a water-quality change around a
 * swimming/eating change is surfaced as INFO context to check first; nothing here is urgent.
 */
@Component
public class FishRuleSet implements SpeciesRuleSet {

    private static final Set<String> FEEDING_REDUCED = SignalWindow.values("Ate less", "Refused food");
    private static final Set<String> APPETITE_REDUCED = SignalWindow.values("Lower", "Refused");
    private static final Set<String> SWIMMING_ABNORMAL = SignalWindow.values("Less active", "Hiding", "Unusual swimming");
    private static final Set<String> SPOTS_FINS = SignalWindow.values("Spot noticed", "Fin concern", "Scale concern");
    private static final Set<String> WATER_CHANGED = SignalWindow.values("Partial change", "Full change");
    private static final Set<String> CLARITY_CHANGED = SignalWindow.values("Cloudy", "Changed");
    private static final Set<String> TEMP_CHANGED = SignalWindow.values("Lower", "Higher", "Changed");

    private final StarterRuleEngine engine;
    private final List<StarterRule> rules;

    public FishRuleSet(StarterRuleEngine engine) {
        this.engine = engine;
        this.rules = buildRules();
    }

    @Override
    public Species species() {
        return Species.FISH_AQUARIUM;
    }

    @Override
    public List<PatternCandidate> evaluate(RuleContext ctx) {
        return engine.run(ctx, rules);
    }

    private static List<StarterRule> buildRules() {
        return List.of(
                new StarterRule(
                        "FISH_SPOT_FIN_WATCH",
                        RuleTag.BODY_CONDITION,
                        Severity.WATCH,
                        Set.of("spots_fins"),
                        2,
                        window -> window.within(14).daysMatching("spots_fins", SPOTS_FINS)
                                .union(window.within(14).visibleChangeDays("FIN_SCALE", Set.of())),
                        StarterRule.WATCH_CONFIDENCE,
                        (pet, days) -> StarterRule.RuleCopy.of(
                                Copy.t("Spots or fin changes on more than one day"),
                                Copy.t("You logged spots, fin or scale changes on {0} on more than one day. This is "
                                        + "worth watching, and checking water quality is a good first step. ",
                                        pet.getName()) + UrgentCopy.watchBoundary())),

                new StarterRule(
                        "FISH_ABNORMAL_SWIMMING",
                        RuleTag.BEHAVIOR_CHANGE,
                        Severity.WATCH,
                        Set.of("swimming"),
                        2,
                        window -> window.within(7).daysMatching("swimming", SWIMMING_ABNORMAL),
                        StarterRule.WATCH_CONFIDENCE,
                        (pet, days) -> StarterRule.RuleCopy.of(
                                Copy.t("Unusual swimming on more than one day"),
                                Copy.t("{0} was logged swimming unusually, hiding or being less active on more than "
                                        + "one day. This is worth watching, and checking water quality first. ",
                                        pet.getName()) + UrgentCopy.watchBoundary())),

                new StarterRule(
                        "FISH_APPETITE_DROP",
                        RuleTag.INTAKE_CHANGE,
                        Severity.WATCH,
                        Set.of(),
                        2,
                        window -> window.within(7).changedDays("feeding")
                                .union(window.within(7).daysMatching("appetite", APPETITE_REDUCED))
                                .union(window.within(7).daysMatching("feeding", FEEDING_REDUCED)),
                        StarterRule.WATCH_CONFIDENCE,
                        (pet, days) -> StarterRule.RuleCopy.of(
                                Copy.t("Eating less on more than one day"),
                                Copy.t("{0} has been eating less or refusing food on more than one day. This is worth "
                                        + "watching, and checking water quality is a good first step. ", pet.getName())
                                        + UrgentCopy.watchBoundary())),

                new StarterRule(
                        "FISH_WATER_QUALITY_CONTEXT",
                        RuleTag.ENV_CONTEXT,
                        Severity.INFO,
                        Set.of(),
                        1,
                        FishRuleSet::waterQualityContext,
                        StarterRule.CONTEXT_CONFIDENCE,
                        (pet, days) -> StarterRule.RuleCopy.of(
                                Copy.t("A water change around a behaviour change"),
                                Copy.t("A water or tank change was logged around the same time as a change in {0}'s "
                                        + "swimming or eating. Aquarium health is mostly water quality, so this is "
                                        + "useful context to check first. ", pet.getName())
                                        + UrgentCopy.watchBoundary())));
    }

    /** Fires only when BOTH a water-quality change AND a swimming/eating change appear recently. */
    private static RuleHit waterQualityContext(SignalWindow window) {
        SignalWindow recent = window.within(10);
        RuleHit water = recent.daysMatching("water_change", WATER_CHANGED)
                .union(recent.daysMatching("water_clarity", CLARITY_CHANGED))
                .union(recent.daysMatching("temperature", TEMP_CHANGED));
        RuleHit behaviour = recent.daysMatching("swimming", SWIMMING_ABNORMAL)
                .union(recent.changedDays("feeding"))
                .union(recent.daysMatching("appetite", APPETITE_REDUCED));
        if (water.days() >= 1 && behaviour.days() >= 1) {
            return water.union(behaviour);
        }
        return new RuleHit();
    }
}
