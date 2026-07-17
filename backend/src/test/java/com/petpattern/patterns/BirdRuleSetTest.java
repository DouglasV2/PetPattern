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

class BirdRuleSetTest {

    private final ObjectMapper mapper = new ObjectMapper();
    private final BaselineCalculator baseline = new BaselineCalculator();
    private final BirdRuleSet bird = new BirdRuleSet(
            new StarterRuleEngine(baseline, mapper, new ObservationPatternAnalyzer(baseline, mapper)));

    private final Pet pet = pet();

    private static Pet pet() {
        Pet p = new Pet();
        p.setName("Kiwi");
        p.setSpecies(Species.BIRD);
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
        return bird.evaluate(new RuleContext(pet, List.of(checkIns), List.of()));
    }

    // Urgent starter rules belong to the IMMEDIATE layer, not the persisted historical evaluate().
    private List<PatternCandidate> immediate(DailyCheckIn... checkIns) {
        return bird.immediateObservations(new RuleContext(pet, List.of(checkIns), List.of()));
    }

    private static Optional<PatternCandidate> rule(List<PatternCandidate> candidates, String ruleId) {
        return candidates.stream().filter(c -> c.id().endsWith(":" + ruleId)).findFirst();
    }

    @Test
    void breathingChangeIsUrgentFromASingleLoggedDay() {
        // Birds hide illness and show breathing changes late, so the binary breathing signal
        // is urgent from one logged day.
        List<PatternCandidate> found = immediate(day(1, sig("breathing", "Noticed change")));
        Optional<PatternCandidate> breathing = rule(found, "BIRD_LABORED_BREATHING");
        assertTrue(breathing.isPresent(), "a single logged breathing change is urgent for a bird");
        assertEquals(Severity.URGENT, breathing.get().severity());
        assertNotNull(breathing.get().urgentNote());
        assertEquals(PatternConfidence.MEDIUM, breathing.get().confidence(), "one day is MEDIUM confidence");
    }

    @Test
    void breathingChangeGoesToHighConfidenceWhenItRepeats() {
        List<PatternCandidate> found = immediate(
                day(4, sig("breathing", "Noticed change")),
                day(1, sig("breathing", "Noticed change")));
        assertEquals(PatternConfidence.HIGH, rule(found, "BIRD_LABORED_BREATHING").orElseThrow().confidence());
    }

    @Test
    void sickPostureFiresUrgentWhenSittingLowMeetsLowEnergySameDay() {
        List<PatternCandidate> found = immediate(
                day(2, sig("perch", "Sitting lower") + "," + sig("activity", "Less active")));
        Optional<PatternCandidate> posture = rule(found, "BIRD_SICK_POSTURE");
        assertTrue(posture.isPresent(), "sitting low + less active on the same day is the urgent sick-posture sign");
        assertEquals(Severity.URGENT, posture.get().severity());
        assertNotNull(posture.get().urgentNote());
    }

    @Test
    void featherChangesAreAWatchNotUrgent() {
        List<PatternCandidate> found = evaluate(
                day(6, sig("feathers", "Plucking noticed")),
                day(2, sig("feathers", "Plucking noticed")));
        Optional<PatternCandidate> feathers = rule(found, "BIRD_FEATHER_PLUCKING");
        assertTrue(feathers.isPresent(), "feather plucking on two days is a WATCH");
        assertEquals(Severity.WATCH, feathers.get().severity());
    }
}
