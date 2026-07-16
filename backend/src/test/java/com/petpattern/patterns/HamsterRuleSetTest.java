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
import static org.junit.jupiter.api.Assertions.assertTrue;

class HamsterRuleSetTest {

    private final ObjectMapper mapper = new ObjectMapper();
    private final BaselineCalculator baseline = new BaselineCalculator();
    private final HamsterRuleSet hamster = new HamsterRuleSet(
            new StarterRuleEngine(baseline, mapper, new ObservationPatternAnalyzer(baseline, mapper)));

    private final Pet pet = pet();

    private static Pet pet() {
        Pet p = new Pet();
        p.setName("Nib");
        p.setSpecies(Species.HAMSTER);
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

    private List<PatternCandidate> evaluate(DailyCheckIn... checkIns) {
        return hamster.evaluate(new RuleContext(pet, List.of(checkIns), List.of()));
    }

    private static Optional<PatternCandidate> rule(List<PatternCandidate> candidates, String ruleId) {
        return candidates.stream().filter(c -> c.id().endsWith(":" + ruleId)).findFirst();
    }

    @Test
    void wetTailFiresUrgentWhenWateryDroppingsMeetLowEnergySameDay() {
        List<PatternCandidate> found = evaluate(
                day(2, sig("droppings", "Watery") + "," + sig("activity", "Less active")));
        Optional<PatternCandidate> wet = rule(found, "HAMSTER_WET_TAIL_RISK");
        assertTrue(wet.isPresent(), "watery droppings + less active on the same day is the urgent co-occurrence");
        assertEquals(Severity.URGENT, wet.get().severity());
        assertNotNull(wet.get().urgentNote());
    }

    @Test
    void wetTailAlsoFiresWhenWateryDroppingsMeetEatingLess() {
        List<PatternCandidate> found = evaluate(
                day(1, sig("droppings", "Watery") + "," + sig("appetite", "Eating less")));
        assertTrue(rule(found, "HAMSTER_WET_TAIL_RISK").isPresent(),
                "watery droppings + eating less on the same day also qualifies");
    }

    @Test
    void wetTailDoesNotFireWhenSignalsAreOnDifferentDays() {
        List<PatternCandidate> found = evaluate(
                day(3, sig("droppings", "Watery")),
                day(1, sig("activity", "Less active")));
        assertTrue(rule(found, "HAMSTER_WET_TAIL_RISK").isEmpty(),
                "watery droppings and low energy on different days is not the urgent co-occurrence");
    }

    @Test
    void lumpSwellingFiresFromASingleVisibleChange() {
        // fix #4: a single logged swelling is enough to surface (minDays=1), with cautious copy.
        List<PatternCandidate> found = evaluate(
                day(2, "{\"key\":\"visible_change\",\"area\":\"SWELLING\",\"status\":\"same\",\"value\":\"Swelling noticed\"}"));
        Optional<PatternCandidate> lump = rule(found, "HAMSTER_LUMP_SWELLING");
        assertTrue(lump.isPresent(), "a single logged swelling surfaces as a body-condition watch");
        assertEquals(Severity.WATCH, lump.get().severity(), "a lump is a WATCH, not urgent");
    }

    @Test
    void weightLossNeedsTwoLoggedDays() {
        assertTrue(rule(evaluate(day(2, sig("weight", "Noticed change"))), "HAMSTER_WEIGHT_LOSS").isEmpty(),
                "one weight-change day is below threshold");
        List<PatternCandidate> two = evaluate(
                day(6, sig("weight", "Noticed change")),
                day(2, sig("weight", "Noticed change")));
        assertTrue(rule(two, "HAMSTER_WEIGHT_LOSS").isPresent(), "two weight-change days fire the watch");
    }
}
