package com.petpattern.patterns;

import com.petpattern.domain.Species;
import com.petpattern.i18n.Copy;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Set;

/**
 * Rules for OTHER_SMALL_PET, built only from its check-in signals
 * (speciesProfiles.js OTHER_SMALL_PET: appetite, water, activity, hiding, droppings, weight,
 * behavior).
 *
 * <p>The species is unknown, so nothing here is URGENT — the two rules are cautious WATCH-level
 * combinations, and every other changed signal still surfaces via the preserved generic
 * REPEATED_OBSERVATION pass (appended by {@link StarterRuleEngine}) with its ids unchanged.
 */
@Component
public class OtherSmallPetRuleSet implements SpeciesRuleSet {

    private static final Set<String> APPETITE_REDUCED = SignalWindow.values("Eating less", "Refused food");
    private static final Set<String> ACTIVITY_LOW = SignalWindow.values("Less active");
    private static final Set<String> DROPPINGS_CHANGED = SignalWindow.values("Changed", "Watery", "Less");

    private final StarterRuleEngine engine;
    private final List<StarterRule> rules;

    public OtherSmallPetRuleSet(StarterRuleEngine engine) {
        this.engine = engine;
        this.rules = buildRules();
    }

    @Override
    public Species species() {
        return Species.OTHER_SMALL_PET;
    }

    @Override
    public List<PatternCandidate> evaluate(RuleContext ctx) {
        return engine.run(ctx, rules);
    }

    private static List<StarterRule> buildRules() {
        return List.of(
                new StarterRule(
                        "SMALL_PET_ANOREXIA_LETHARGY",
                        RuleTag.BEHAVIOR_CHANGE,
                        Severity.WATCH,
                        Set.of(),
                        2,
                        window -> window.within(7).coOccurDays(
                                day -> day.has("appetite", APPETITE_REDUCED),
                                day -> day.has("activity", ACTIVITY_LOW)),
                        StarterRule.WATCH_CONFIDENCE,
                        (pet, days) -> StarterRule.RuleCopy.of(
                                Copy.t("Eating less and less active on the same day"),
                                Copy.t("{0} was logged as eating less and being less active on the same day, on more "
                                        + "than one day. In a small pet this is worth keeping an eye on. ", pet.getName())
                                        + UrgentCopy.watchBoundary())),

                new StarterRule(
                        "SMALL_PET_GI_CHANGE",
                        RuleTag.OUTPUT_CHANGE,
                        Severity.WATCH,
                        Set.of("droppings"),
                        2,
                        window -> window.within(7).daysMatching("droppings", DROPPINGS_CHANGED),
                        StarterRule.WATCH_CONFIDENCE,
                        (pet, days) -> StarterRule.RuleCopy.of(
                                Copy.t("Droppings changed on more than one day"),
                                Copy.t("You logged changed, watery or fewer droppings for {0} on more than one day. "
                                        + "This is worth watching, especially if it continues or appears with eating "
                                        + "changes. ", pet.getName()) + UrgentCopy.watchBoundary())));
    }
}
