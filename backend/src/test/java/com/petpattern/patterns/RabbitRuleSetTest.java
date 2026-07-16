package com.petpattern.patterns;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.petpattern.domain.DailyCheckIn;
import com.petpattern.domain.Pet;
import com.petpattern.domain.Species;
import org.junit.jupiter.api.Test;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

class RabbitRuleSetTest {

    private final ObjectMapper mapper = new ObjectMapper();
    private final BaselineCalculator baseline = new BaselineCalculator();
    private final RabbitRuleSet rabbit = new RabbitRuleSet(
            new StarterRuleEngine(baseline, mapper, new ObservationPatternAnalyzer(baseline, mapper)));

    private final Pet pet = pet();

    private static Pet pet() {
        Pet p = new Pet();
        p.setName("Bun");
        p.setSpecies(Species.RABBIT);
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
        List<DailyCheckIn> list = new ArrayList<>(List.of(checkIns));
        return rabbit.evaluate(new RuleContext(pet, list, List.of()));
    }

    private static Optional<PatternCandidate> rule(List<PatternCandidate> candidates, String ruleId) {
        return candidates.stream().filter(c -> c.id().endsWith(":" + ruleId)).findFirst();
    }

    @Test
    void giStasisFiresUrgentOnSameDayIntakeAndDroppingsDrop() {
        List<PatternCandidate> found = evaluate(
                day(2, sig("appetite_hay", "Eating less") + "," + sig("poop", "Less")));

        Optional<PatternCandidate> gi = rule(found, "RABBIT_GI_STASIS_RISK");
        assertTrue(gi.isPresent(), "eating less + fewer droppings on the same day is the urgent co-occurrence");
        assertEquals(Severity.URGENT, gi.get().severity(), "GI-stasis risk is URGENT");
        assertNotNull(gi.get().urgentNote(), "an urgent candidate always carries an urgent note");
        assertEquals(PatternType.STARTER_URGENT_SIGN, gi.get().type());
        assertEquals(PatternConfidence.MEDIUM, gi.get().confidence(), "a single co-occurrence is MEDIUM, not HIGH");
    }

    @Test
    void giStasisDoesNotFireWhenSignalsAreOnDifferentDays() {
        List<PatternCandidate> found = evaluate(
                day(4, sig("appetite_hay", "Eating less")),
                day(1, sig("poop", "Less")));
        assertTrue(rule(found, "RABBIT_GI_STASIS_RISK").isEmpty(),
                "intake drop and droppings drop on DIFFERENT days is not the urgent co-occurrence");
    }

    @Test
    void giStasisDoesNotFireForAnOldCoOccurrence() {
        // fix #2: URGENT cross-signal rules are pinned to the last ~7 days, so an old
        // same-day co-occurrence must NOT raise an urgent "is this happening now" sign.
        List<PatternCandidate> found = evaluate(
                day(20, sig("appetite_hay", "Eating less") + "," + sig("poop", "Less")));
        assertTrue(rule(found, "RABBIT_GI_STASIS_RISK").isEmpty(),
                "a 20-day-old co-occurrence is outside the urgent window");
    }

    @Test
    void intakeDropFiresWatchOnTwoDays() {
        List<PatternCandidate> found = evaluate(
                day(5, sig("appetite_hay", "Eating less")),
                day(2, sig("appetite_hay", "Hay intake changed")));

        Optional<PatternCandidate> intake = rule(found, "RABBIT_INTAKE_DROP");
        assertTrue(intake.isPresent(), "eating less on two days is a WATCH-level intake drop");
        assertEquals(Severity.WATCH, intake.get().severity());
        assertNull(intake.get().urgentNote(), "a non-urgent candidate carries no urgent note");
        assertEquals(PatternType.STARTER_INTAKE_CHANGE, intake.get().type());
    }

    @Test
    void intakeDropDoesNotFireOnASingleDay() {
        List<PatternCandidate> found = evaluate(day(2, sig("appetite_hay", "Eating less")));
        assertTrue(rule(found, "RABBIT_INTAKE_DROP").isEmpty(), "one day is below the two-day threshold");
    }

    @Test
    void claimedKeysAreNotAlsoReportedAsGenericRepeatedObservations() {
        List<PatternCandidate> found = evaluate(
                day(5, sig("appetite_hay", "Eating less")),
                day(2, sig("appetite_hay", "Eating less")));
        assertTrue(rule(found, "RABBIT_INTAKE_DROP").isPresent(), "the specific intake rule fires");
        assertFalse(found.stream().anyMatch(c -> c.id().endsWith(":REPEATED_OBSERVATION:appetite_hay")),
                "appetite_hay is claimed, so it is not also a generic REPEATED_OBSERVATION");
    }

    @Test
    void unclaimedKeysStillSurfaceAsGenericRepeatedObservations() {
        List<PatternCandidate> found = evaluate(
                day(5, sig("water", "Less")),
                day(2, sig("water", "Less")));
        assertTrue(found.stream().anyMatch(c -> c.id().endsWith(":REPEATED_OBSERVATION:water")),
                "water is not claimed by any rabbit rule, so the generic pass still surfaces it");
    }

    @Test
    void normalOnlyDataProducesNoPatterns() {
        List<PatternCandidate> found = evaluate(
                day(3, sig("appetite_hay", "Normal") + "," + sig("poop", "Normal")),
                day(1, sig("appetite_hay", "Normal")));
        assertTrue(found.isEmpty(), "steady normal data raises nothing");
    }

    @Test
    void anUnfiredRuleDoesNotClaimItsKeyFromTheGenericPass() {
        // RABBIT_INTAKE_DROP matches within(14) days; two "Eating less" days ~16-19 days ago are
        // outside its window (so it does NOT fire) but inside the generic 21-day pass. The key
        // must not be claimed by the unfired rule, so the recurrence still surfaces generically.
        List<PatternCandidate> found = evaluate(
                day(19, sig("appetite_hay", "Eating less")),
                day(16, sig("appetite_hay", "Eating less")));
        assertTrue(rule(found, "RABBIT_INTAKE_DROP").isEmpty(), "the intake rule is outside its 14-day window");
        assertTrue(found.stream().anyMatch(c -> c.id().endsWith(":REPEATED_OBSERVATION:appetite_hay")),
                "an unfired rule must not claim its key, so the generic pass still surfaces the recurrence");
    }

    @Test
    void malformedJsonIsToleratedWithoutCrashing() {
        DailyCheckIn broken = new DailyCheckIn();
        broken.setCheckInDate(LocalDate.now().minusDays(1));
        broken.setObservationsJson("not json at all");
        List<PatternCandidate> found = rabbit.evaluate(new RuleContext(pet, List.of(broken), List.of()));
        assertTrue(found.isEmpty(), "malformed observations JSON yields no patterns and no exception");
    }
}
