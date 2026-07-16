package com.petpattern.patterns;

import com.petpattern.domain.Species;
import com.petpattern.i18n.Copy;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Set;

/**
 * Bird rules, built only from the signals a bird check-in collects
 * (speciesProfiles.js BIRD: appetite, water, droppings, activity, vocalization, feathers,
 * perch, breathing).
 *
 * <p>Birds hide illness and show respiratory and posture signs late, so two rules are URGENT:
 * any logged change in breathing, and a "sitting lower" posture together with being less
 * active or eating less. Both are plain owner-logged facts — no condition is ever named.
 */
@Component
public class BirdRuleSet implements SpeciesRuleSet {

    private static final Set<String> BREATHING_CHANGE = SignalWindow.values("Noticed change");
    private static final Set<String> PERCH_LOWER = SignalWindow.values("Sitting lower");
    private static final Set<String> ACTIVITY_LOW = SignalWindow.values("Less active");
    private static final Set<String> APPETITE_REDUCED = SignalWindow.values("Eating less", "Refused food");
    private static final Set<String> FEATHER_CHANGE = SignalWindow.values("Change noticed", "Plucking noticed");
    private static final Set<String> VOCAL_QUIET = SignalWindow.values("Quieter", "Different sound");

    private final StarterRuleEngine engine;
    private final List<StarterRule> rules;

    public BirdRuleSet(StarterRuleEngine engine) {
        this.engine = engine;
        this.rules = buildRules();
    }

    @Override
    public Species species() {
        return Species.BIRD;
    }

    @Override
    public List<PatternCandidate> evaluate(RuleContext ctx) {
        return engine.run(ctx, rules);
    }

    private static List<StarterRule> buildRules() {
        return List.of(
                new StarterRule(
                        "BIRD_LABORED_BREATHING",
                        RuleTag.URGENT_SIGN,
                        Severity.URGENT,
                        Set.of("breathing"),
                        1,
                        window -> window.within(7).daysMatching("breathing", BREATHING_CHANGE),
                        StarterRule.URGENT_CONFIDENCE,
                        (pet, days) -> StarterRule.RuleCopy.urgent(
                                Copy.t("A change in breathing you noticed"),
                                Copy.t("You logged a change in {0}'s breathing. Birds tend to hide illness and show "
                                        + "breathing changes late, so any noticed change in breathing is worth taking "
                                        + "seriously. ", pet.getName()) + UrgentCopy.boundary(),
                                Copy.t("In birds, a change in breathing is the kind of sign many avian vets say not "
                                        + "to wait on. ") + UrgentCopy.vetHandoff(pet.getName()))),

                new StarterRule(
                        "BIRD_SICK_POSTURE",
                        RuleTag.URGENT_SIGN,
                        Severity.URGENT,
                        Set.of(),
                        1,
                        window -> window.within(7).coOccurDays(
                                day -> day.has("perch", PERCH_LOWER),
                                day -> day.has("activity", ACTIVITY_LOW) || day.has("appetite", APPETITE_REDUCED)),
                        StarterRule.URGENT_CONFIDENCE,
                        (pet, days) -> StarterRule.RuleCopy.urgent(
                                Copy.t("Sitting low and quiet or eating less on the same day"),
                                Copy.t("You recorded {0} sitting lower on the perch and being less active or eating "
                                        + "less on the same day. Birds tend to hide illness and show it late, so this "
                                        + "combination is worth taking seriously. ", pet.getName())
                                        + UrgentCopy.boundary(),
                                Copy.t("In birds, sitting low together with being quiet or off food is the kind of "
                                        + "sign many avian vets say not to wait on. ")
                                        + UrgentCopy.vetHandoff(pet.getName()))),

                new StarterRule(
                        "BIRD_FEATHER_PLUCKING",
                        RuleTag.BODY_CONDITION,
                        Severity.WATCH,
                        Set.of("feathers"),
                        2,
                        window -> window.within(21).daysMatching("feathers", FEATHER_CHANGE)
                                .union(window.within(21).visibleChangeDays("FEATHER", Set.of())),
                        StarterRule.WATCH_CONFIDENCE,
                        (pet, days) -> StarterRule.RuleCopy.of(
                                Copy.t("Feather changes on more than one day"),
                                Copy.t("You logged feather changes or plucking on {0} on more than one day. This can "
                                        + "have many causes, from skin to stress, so it is worth watching and "
                                        + "mentioning to your vet. ", pet.getName()) + UrgentCopy.watchBoundary())),

                new StarterRule(
                        "BIRD_QUIET_WITH_CHANGE",
                        RuleTag.BEHAVIOR_CHANGE,
                        Severity.WATCH,
                        Set.of(),
                        2,
                        window -> window.within(7).coOccurDays(
                                day -> day.has("vocalization", VOCAL_QUIET),
                                day -> day.has("activity", ACTIVITY_LOW) || day.has("appetite", APPETITE_REDUCED)),
                        StarterRule.WATCH_CONFIDENCE,
                        (pet, days) -> StarterRule.RuleCopy.of(
                                Copy.t("Quieter and less active or eating less on the same day"),
                                Copy.t("{0} was logged as quieter and less active or eating less on the same day, on "
                                        + "more than one day. In birds a change in voice can be an early sign, so this "
                                        + "is worth keeping an eye on. ", pet.getName()) + UrgentCopy.watchBoundary())));
    }
}
