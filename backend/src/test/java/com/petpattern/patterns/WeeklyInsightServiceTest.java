package com.petpattern.patterns;

import com.petpattern.api.dto.WeeklyInsight;
import com.petpattern.domain.DailyCheckIn;
import com.petpattern.domain.Pet;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;

class WeeklyInsightServiceTest {

    private final WeeklyInsightService service =
            new WeeklyInsightService(new BaselineCalculator(), new ObjectMapper());

    private static Pet pet(String name) {
        Pet pet = new Pet();
        pet.setName(name);
        return pet;
    }

    private DailyCheckIn itch(int daysAgo, Integer itching) {
        DailyCheckIn c = new DailyCheckIn();
        c.setCheckInDate(LocalDate.now().minusDays(daysAgo));
        c.setItchingScore(itching);
        return c;
    }

    @Test
    void learningWhenFewerThanThreeRecentLogs() {
        List<DailyCheckIn> checkIns = new ArrayList<>(List.of(itch(0, 2), itch(1, 2)));
        WeeklyInsight insight = service.generate(pet("Milo"), checkIns);
        assertEquals("LEARNING", insight.state());
    }

    @Test
    void stableWhenEnoughLogsButNoMeaningfulChange() {
        // 3 days this week and 3 days last week, all itching == 2 -> nothing changed.
        List<DailyCheckIn> checkIns = new ArrayList<>(List.of(
                itch(0, 2), itch(1, 2), itch(2, 2),
                itch(7, 2), itch(8, 2), itch(9, 2)));
        WeeklyInsight insight = service.generate(pet("Milo"), checkIns);
        assertEquals("STABLE", insight.state());
    }

    @Test
    void insightWhenScratchingRoseThisWeek() {
        // last week calm (itch 1), this week itchy (itch 6) -> "itchier" INSIGHT, watch tone.
        List<DailyCheckIn> checkIns = new ArrayList<>(List.of(
                itch(0, 6), itch(1, 6), itch(2, 6),
                itch(7, 1), itch(8, 1), itch(9, 1)));
        WeeklyInsight insight = service.generate(pet("Milo"), checkIns);
        assertEquals("INSIGHT", insight.state());
        assertEquals("watch", insight.tone(), "a rising symptom is a watch-tone insight");
        org.junit.jupiter.api.Assertions.assertTrue(insight.headline().contains("Milo"));
    }

    private DailyCheckIn ear(int daysAgo, boolean earRedness) {
        DailyCheckIn c = new DailyCheckIn();
        c.setCheckInDate(LocalDate.now().minusDays(daysAgo));
        c.setEarRedness(earRedness);
        return c;
    }

    @Test
    void insightWhenEarRednessAppearedThisWeekAsDayCount() {
        // ear redness on 3 of this week's days, 0 last week -> day-count INSIGHT with support.
        List<DailyCheckIn> checkIns = new ArrayList<>(List.of(
                ear(0, true), ear(1, true), ear(2, true), ear(3, false),
                ear(7, false), ear(8, false), ear(9, false)));
        WeeklyInsight insight = service.generate(pet("Milo"), checkIns);
        assertEquals("INSIGHT", insight.state());
        org.junit.jupiter.api.Assertions.assertNotNull(insight.support(),
                "day-count insights carry a 'X of Y days' support line");
    }

    private DailyCheckIn obs(int daysAgo, String json) {
        DailyCheckIn c = new DailyCheckIn();
        c.setCheckInDate(LocalDate.now().minusDays(daysAgo));
        c.setObservationsJson(json);
        return c;
    }

    @Test
    void insightWhenAnObservationSignalClearedThisWeek() {
        // "hiding" changed on 2 days last week, 0 this week -> easing INSIGHT, good tone.
        String changed = "{\"signals\":[{\"key\":\"hiding\",\"label\":\"Hiding\",\"value\":\"more\"}]}";
        String normal = "{\"signals\":[{\"key\":\"hiding\",\"label\":\"Hiding\",\"value\":\"normal\"}]}";
        List<DailyCheckIn> checkIns = new ArrayList<>(List.of(
                obs(0, normal), obs(1, normal), obs(2, normal),
                obs(7, changed), obs(8, changed), obs(9, normal)));
        WeeklyInsight insight = service.generate(pet("Milo"), checkIns);
        assertEquals("INSIGHT", insight.state());
        assertEquals("good", insight.tone(), "a symptom that cleared is a good-tone insight");
    }
}
