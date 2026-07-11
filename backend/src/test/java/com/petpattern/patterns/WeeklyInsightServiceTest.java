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
}
