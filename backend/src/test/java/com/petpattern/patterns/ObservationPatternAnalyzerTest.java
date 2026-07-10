package com.petpattern.patterns;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.petpattern.domain.DailyCheckIn;
import com.petpattern.domain.Pet;
import com.petpattern.domain.Species;
import org.junit.jupiter.api.Test;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Starter-species pattern rule: a signal logged as "changed" on more than one day
 * in the recent window becomes a REPEATED_OBSERVATION candidate. Normal values,
 * single-day changes, and malformed JSON must never produce a pattern (or crash).
 */
class ObservationPatternAnalyzerTest {

    private final ObservationPatternAnalyzer analyzer =
            new ObservationPatternAnalyzer(new BaselineCalculator(), new ObjectMapper());

    private DailyCheckIn checkIn(LocalDate date, String observationsJson) {
        DailyCheckIn c = new DailyCheckIn();
        c.setCheckInDate(date);
        c.setObservationsJson(observationsJson);
        return c;
    }

    @Test
    void flagsSignalChangedOnMoreThanOneDay() {
        Pet pet = new Pet();
        pet.setSpecies(Species.RABBIT);
        LocalDate today = LocalDate.now();
        List<DailyCheckIn> checkIns = new ArrayList<>();
        checkIns.add(checkIn(today.minusDays(3), "{\"signals\":[{\"key\":\"appetite_hay\",\"label\":\"Appetite / hay\",\"value\":\"less\"}]}"));
        checkIns.add(checkIn(today.minusDays(2), "{\"signals\":[{\"key\":\"appetite_hay\",\"value\":\"less\"}]}"));
        checkIns.add(checkIn(today.minusDays(1), "{\"signals\":[{\"key\":\"poop\",\"value\":\"normal\"}]}"));
        checkIns.add(checkIn(today, "{\"signals\":[{\"key\":\"appetite_hay\",\"value\":\"refused\"}]}"));

        List<PatternCandidate> candidates = analyzer.analyze(pet, checkIns);

        assertEquals(1, candidates.size(), "only the repeated appetite_hay change should flag");
        PatternCandidate c = candidates.get(0);
        assertEquals(PatternType.REPEATED_OBSERVATION, c.type());
        assertTrue(c.id().endsWith(":REPEATED_OBSERVATION:appetite_hay"), "id keys by signal");
    }

    @Test
    void ignoresNormalValuesAndSingleDayChanges() {
        Pet pet = new Pet();
        LocalDate today = LocalDate.now();
        List<DailyCheckIn> checkIns = new ArrayList<>();
        checkIns.add(checkIn(today.minusDays(1), "{\"signals\":[{\"key\":\"poop\",\"value\":\"normal\"}]}"));
        checkIns.add(checkIn(today, "{\"signals\":[{\"key\":\"poop\",\"value\":\"softer\"}]}"));

        assertTrue(analyzer.analyze(pet, checkIns).isEmpty(), "one changed day is not a pattern");
    }

    @Test
    void toleratesMalformedOrMissingJson() {
        Pet pet = new Pet();
        LocalDate today = LocalDate.now();
        List<DailyCheckIn> checkIns = new ArrayList<>();
        checkIns.add(checkIn(today.minusDays(1), "not valid json"));
        checkIns.add(checkIn(today, null));

        assertTrue(analyzer.analyze(pet, checkIns).isEmpty(), "bad JSON must not crash or flag");
    }
}
