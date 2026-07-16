package com.petpattern.patterns;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.petpattern.domain.DailyCheckIn;
import org.junit.jupiter.api.Test;

import java.time.LocalDate;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

/** Unit tests for the per-day signal index the starter rules compose. */
class SignalWindowTest {

    private final ObjectMapper mapper = new ObjectMapper();

    private DailyCheckIn day(int daysAgo, String signalsInner) {
        DailyCheckIn c = new DailyCheckIn();
        c.setCheckInDate(LocalDate.now().minusDays(daysAgo));
        c.setObservationsJson("{\"signals\":[" + signalsInner + "]}");
        return c;
    }

    private static String sig(String key, String value) {
        return "{\"key\":\"" + key + "\",\"value\":\"" + value + "\"}";
    }

    @Test
    void daysMatchingCountsOnlyTheGivenValues() {
        SignalWindow window = SignalWindow.build(List.of(
                day(3, sig("appetite_hay", "Eating less")),
                day(2, sig("appetite_hay", "Normal")),
                day(1, sig("appetite_hay", "Refused food"))), mapper);

        RuleHit hit = window.daysMatching("appetite_hay", SignalWindow.values("Eating less", "Refused food"));
        assertEquals(2, hit.days(), "only the two reduced-intake days count, not the Normal day");
    }

    @Test
    void coOccurRequiresBothOnTheSameDay() {
        SignalWindow sameDay = SignalWindow.build(List.of(
                day(2, sig("appetite_hay", "Eating less") + "," + sig("poop", "Less"))), mapper);
        RuleHit both = sameDay.coOccurDays(
                d -> d.has("appetite_hay", SignalWindow.values("Eating less")),
                d -> d.has("poop", SignalWindow.values("Less")));
        assertEquals(1, both.days(), "both signals on the same day co-occur");

        SignalWindow differentDays = SignalWindow.build(List.of(
                day(3, sig("appetite_hay", "Eating less")),
                day(1, sig("poop", "Less"))), mapper);
        RuleHit apart = differentDays.coOccurDays(
                d -> d.has("appetite_hay", SignalWindow.values("Eating less")),
                d -> d.has("poop", SignalWindow.values("Less")));
        assertEquals(0, apart.days(), "signals on different days do NOT co-occur");
    }

    @Test
    void withinRestrictsToTheRecentDays() {
        SignalWindow window = SignalWindow.build(List.of(
                day(20, sig("breathing", "Noticed change")),
                day(2, sig("breathing", "Noticed change"))), mapper);
        assertEquals(2, window.changedDays("breathing").days(), "full window sees both days");
        assertEquals(1, window.within(7).changedDays("breathing").days(), "within(7) drops the 20-day-old day");
    }

    @Test
    void visibleChangeMatchesAreaAndStatus() {
        SignalWindow window = SignalWindow.build(List.of(
                day(2, "{\"key\":\"visible_change\",\"area\":\"SWELLING\",\"status\":\"worse\",\"value\":\"Swelling noticed\"}")),
                mapper);
        assertEquals(1, window.visibleChangeDays("SWELLING", java.util.Set.of()).days(), "matches the SWELLING area");
        assertEquals(0, window.visibleChangeDays("SHELL", java.util.Set.of()).days(), "does not match a different area");
        assertEquals(1, window.visibleChangeDays("SWELLING", SignalWindow.values("worse")).days(), "matches the worse status");
        assertEquals(0, window.visibleChangeDays("SWELLING", SignalWindow.values("better")).days(), "does not match a different status");
    }

    @Test
    void changedValueIsCaseInsensitiveAndIgnoresNormal() {
        SignalWindow window = SignalWindow.build(List.of(
                day(2, sig("water", "normal")),
                day(1, sig("water", "Less"))), mapper);
        assertEquals(1, window.changedDays("water").days(), "only the 'Less' day is a change, 'normal' is not");
        assertFalse(window.changedKeys().contains("normal"), "the normal-only value never becomes a changed key");
        assertTrue(window.changedKeys().contains("water"), "the water key that changed once is a changed key");
    }
}
