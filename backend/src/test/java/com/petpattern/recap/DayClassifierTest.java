package com.petpattern.recap;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.petpattern.domain.AppetiteLevel;
import com.petpattern.domain.DailyCheckIn;
import com.petpattern.domain.StoolState;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * A day is "changed" or "unchanged/quiet" based on the saved VALUES relative to
 * normal (spec Part 2/5) — species-neutral, never an intent flag. This is what
 * lets the weekly recap report unchanged vs changed days honestly.
 */
class DayClassifierTest {

    private final ObjectMapper mapper = new ObjectMapper();

    private DailyCheckIn dog() {
        DailyCheckIn c = new DailyCheckIn();
        c.setItchingScore(1);
        c.setStoolState(StoolState.NORMAL);
        c.setAppetiteLevel(AppetiteLevel.NORMAL);
        return c;
    }

    @Test
    void aNormalDogDayIsUnchanged() {
        assertThat(DayClassifier.isChangedDay(dog(), mapper)).isFalse();
    }

    @Test
    void aStillUnwellCarriedForwardDayCountsAsChanged() {
        // A "No change since last check-in" day that carried an 8/10 forward is
        // still an unwell day — it must NOT be counted as a quiet/unchanged day.
        DailyCheckIn c = dog();
        c.setItchingScore(8);
        assertThat(DayClassifier.isChangedDay(c, mapper)).isTrue();
    }

    @Test
    void aSoftStoolDayCountsAsChanged() {
        DailyCheckIn c = dog();
        c.setStoolState(StoolState.DIARRHEA);
        assertThat(DayClassifier.isChangedDay(c, mapper)).isTrue();
    }

    @Test
    void aBackToUsualDayIsUnchanged() {
        // Back-to-usual writes normal values, so it reads as a quiet/unchanged day.
        assertThat(DayClassifier.isChangedDay(dog(), mapper)).isFalse();
    }

    @Test
    void aStarterSpeciesChangedObservationCountsAsChanged() {
        DailyCheckIn c = new DailyCheckIn();
        c.setObservationsJson("{\"species\":\"RABBIT\",\"signals\":[{\"key\":\"appetite_hay\",\"label\":\"Appetite\",\"value\":\"less\"}]}");
        assertThat(DayClassifier.isChangedDay(c, mapper)).isTrue();
    }

    @Test
    void aStarterSpeciesWithNoNotableObservationIsUnchanged() {
        DailyCheckIn c = new DailyCheckIn();
        c.setObservationsJson(null);
        assertThat(DayClassifier.isChangedDay(c, mapper)).isFalse();
    }
}
