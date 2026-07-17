package com.petpattern.patterns;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.petpattern.domain.DailyCheckIn;
import com.petpattern.domain.Pet;
import com.petpattern.domain.Species;
import org.junit.jupiter.api.Test;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

/** Cross-species coverage: guinea pig, reptile, turtle, fish, other-small-pet + shared invariants. */
class StarterRulesTest {

    private final ObjectMapper mapper = new ObjectMapper();
    private final BaselineCalculator baseline = new BaselineCalculator();
    private final StarterRuleEngine engine =
            new StarterRuleEngine(baseline, mapper, new ObservationPatternAnalyzer(baseline, mapper));

    private final GuineaPigRuleSet guineaPig = new GuineaPigRuleSet(engine);
    private final ReptileRuleSet reptile = new ReptileRuleSet(engine);
    private final TurtleRuleSet turtle = new TurtleRuleSet(engine);
    private final FishRuleSet fish = new FishRuleSet(engine);
    private final OtherSmallPetRuleSet other = new OtherSmallPetRuleSet(engine);

    private static Pet pet(Species species) {
        Pet p = new Pet();
        p.setName("Pip");
        p.setSpecies(species);
        return p;
    }

    private DailyCheckIn day(int daysAgo, String signalsInner) {
        DailyCheckIn c = new DailyCheckIn();
        c.setCheckInDate(LocalDate.now().minusDays(daysAgo));
        c.setObservationsJson("{\"signals\":[" + signalsInner + "]}");
        return c;
    }

    private static String sig(String key, String value) {
        return "{\"key\":\"" + key + "\",\"value\":\"" + value + "\"}";
    }

    private static Optional<PatternCandidate> rule(List<PatternCandidate> candidates, String ruleId) {
        return candidates.stream().filter(c -> c.id().endsWith(":" + ruleId)).findFirst();
    }

    @Test
    void guineaPigGiStasisIsUrgentImmediateOnlyNeverPersisted() {
        RuleContext ctx = new RuleContext(pet(Species.GUINEA_PIG),
                List.of(day(0, sig("appetite_hay", "Eating less") + "," + sig("poop", "Softer"))), List.of());
        // Immediate layer: eating less + changed droppings the same day is urgent for a guinea pig.
        Optional<PatternCandidate> immediate = rule(guineaPig.immediateObservations(ctx), "GUINEA_PIG_GI_STASIS_RISK");
        assertTrue(immediate.isPresent(), "eating less + changed droppings same day is urgent for a guinea pig too");
        assertEquals(Severity.URGENT, immediate.get().severity());
        assertNotNull(immediate.get().urgentNote());
        // Historical layer: one urgent record is not a recurring pattern and must never be persisted.
        assertTrue(rule(guineaPig.evaluate(ctx), "GUINEA_PIG_GI_STASIS_RISK").isEmpty(),
                "a single urgent day must never become a persisted historical pattern");
    }

    @Test
    void reptileFeedingRefusalNeedsThreeDaysAndIsNeverUrgent() {
        assertTrue(rule(reptileEval(
                day(6, sig("feeding", "Ate less")),
                day(3, sig("feeding", "Ate less"))), "REPTILE_FEEDING_REFUSAL").isEmpty(),
                "two feeding-refusal days is below the reptile threshold (fasting is often normal)");
        Optional<PatternCandidate> refusal = rule(reptileEval(
                day(9, sig("feeding", "Refused food")),
                day(6, sig("feeding", "Ate less")),
                day(2, sig("feeding", "Refused food"))), "REPTILE_FEEDING_REFUSAL");
        assertTrue(refusal.isPresent(), "three feeding-refusal days fires the watch");
        assertEquals(Severity.WATCH, refusal.get().severity(), "reptile feeding refusal is never urgent");
        assertNull(refusal.get().urgentNote());
    }

    @Test
    void reptileThermalContextIsInfoAndNeedsBothAnEnvAndBehaviourChange() {
        List<PatternCandidate> found = reptileEval(
                day(4, sig("temperature", "Lower than usual")),
                day(2, sig("feeding", "Refused food")));
        Optional<PatternCandidate> ctx = rule(found, "REPTILE_THERMAL_CONTEXT");
        assertTrue(ctx.isPresent(), "an enclosure temp change around a feeding change is surfaced as context");
        assertEquals(Severity.INFO, ctx.get().severity(), "environment context is INFO, never urgent");
        assertEquals(PatternConfidence.LOW, ctx.get().confidence());

        assertTrue(rule(reptileEval(day(2, sig("temperature", "Lower than usual"))), "REPTILE_THERMAL_CONTEXT").isEmpty(),
                "an enclosure change alone (no behaviour change) is not surfaced");
    }

    @Test
    void turtleContextUsesWaterEnclosureNotTemperature() {
        // Regression for the design correction: turtles collect no temperature/humidity signal,
        // so their environment context rule keys off water_enclosure.
        List<PatternCandidate> found = turtle.evaluate(new RuleContext(pet(Species.TURTLE),
                List.of(day(4, sig("water_enclosure", "Cloudy")), day(2, sig("feeding", "Ate less"))), List.of()));
        Optional<PatternCandidate> ctx = rule(found, "TURTLE_ENCLOSURE_CONTEXT");
        assertTrue(ctx.isPresent(), "a water/enclosure change around a feeding change surfaces as turtle context");
        assertEquals(Severity.INFO, ctx.get().severity());

        List<PatternCandidate> temperatureOnly = turtle.evaluate(new RuleContext(pet(Species.TURTLE),
                List.of(day(4, sig("temperature", "Lower than usual")), day(2, sig("feeding", "Ate less"))), List.of()));
        assertTrue(rule(temperatureOnly, "TURTLE_ENCLOSURE_CONTEXT").isEmpty(),
                "turtles have no temperature signal, so a temperature key never drives the turtle context rule");
    }

    @Test
    void turtleShellConcernFiresFromASingleShellMark() {
        List<PatternCandidate> found = turtle.evaluate(new RuleContext(pet(Species.TURTLE),
                List.of(day(2, sig("shell", "Soft spot concern"))), List.of()));
        Optional<PatternCandidate> shell = rule(found, "TURTLE_SHELL_CONCERN");
        assertTrue(shell.isPresent(), "a single shell soft-spot surfaces as a body-condition watch");
        assertEquals(Severity.WATCH, shell.get().severity());
    }

    @Test
    void fishAbnormalSwimmingIsAWatch() {
        List<PatternCandidate> found = fish.evaluate(new RuleContext(pet(Species.FISH_AQUARIUM),
                List.of(day(5, sig("swimming", "Unusual swimming")), day(2, sig("swimming", "Hiding"))), List.of()));
        Optional<PatternCandidate> swim = rule(found, "FISH_ABNORMAL_SWIMMING");
        assertTrue(swim.isPresent(), "unusual swimming on two days is a watch");
        assertEquals(Severity.WATCH, swim.get().severity());
    }

    @Test
    void otherSmallPetKeepsGenericRepeatedObservationForUnclaimedKeys() {
        // OTHER_SMALL_PET preserves REPEATED_OBSERVATION for keys its two rules don't claim.
        List<PatternCandidate> found = other.evaluate(new RuleContext(pet(Species.OTHER_SMALL_PET),
                List.of(day(5, sig("water", "Less")), day(2, sig("water", "Less"))), List.of()));
        assertTrue(found.stream().anyMatch(c -> c.id().endsWith(":REPEATED_OBSERVATION:water")),
                "water is not claimed, so it still surfaces via the preserved generic pass");
    }

    @Test
    void everyUrgentCandidateHasANoteAndEveryNonUrgentHasNone() {
        List<PatternCandidate> found = other.evaluate(new RuleContext(pet(Species.OTHER_SMALL_PET),
                List.of(day(4, sig("appetite", "Eating less") + "," + sig("activity", "Less active")),
                        day(2, sig("appetite", "Eating less") + "," + sig("activity", "Less active")),
                        day(3, sig("droppings", "Watery")),
                        day(1, sig("droppings", "Watery"))), List.of()));
        assertTrue(found.size() >= 2, "the small-pet rules fired");
        for (PatternCandidate c : found) {
            if (c.severity() == Severity.URGENT) {
                assertNotNull(c.urgentNote(), "urgent candidates must carry a note: " + c.id());
            } else {
                assertNull(c.urgentNote(), "non-urgent candidates must not carry a note: " + c.id());
            }
        }
    }

    private List<PatternCandidate> reptileEval(DailyCheckIn... checkIns) {
        return reptile.evaluate(new RuleContext(pet(Species.REPTILE), List.of(checkIns), List.of()));
    }
}
