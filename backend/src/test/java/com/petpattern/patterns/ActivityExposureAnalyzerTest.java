package com.petpattern.patterns;

import com.petpattern.domain.ActivityLog;
import com.petpattern.domain.ActivityType;
import com.petpattern.domain.DailyCheckIn;
import com.petpattern.domain.Pet;
import org.junit.jupiter.api.Test;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

class ActivityExposureAnalyzerTest {

    private final ActivityExposureAnalyzer analyzer = new ActivityExposureAnalyzer();

    private DailyCheckIn scratch(int daysAgo, int itch) {
        DailyCheckIn c = new DailyCheckIn();
        c.setCheckInDate(LocalDate.now().minusDays(daysAgo));
        c.setItchingScore(itch);
        return c;
    }

    private ActivityLog walk(int daysAgo) {
        ActivityLog a = new ActivityLog();
        a.setType(ActivityType.WALK);
        a.setOccurredDate(LocalDate.now().minusDays(daysAgo));
        return a;
    }

    @Test
    void firesWhenScratchingOnThreeDistinctWalkDays() {
        List<DailyCheckIn> checkIns = new ArrayList<>(List.of(scratch(2, 6), scratch(4, 6), scratch(6, 6)));
        List<ActivityLog> walks = new ArrayList<>(List.of(walk(2), walk(4), walk(6), walk(8)));
        Optional<ActivityExposureAnalyzer.ActivityCoOccurrence> result =
                analyzer.scratchingAroundActivity(new Pet(), checkIns, walks);
        assertTrue(result.isPresent());
        assertEquals(ActivityType.WALK, result.get().type());
        assertEquals(3, result.get().coOccurrenceDays());
    }

    @Test
    void doesNotFireOnTwoDistinctDays() {
        List<DailyCheckIn> checkIns = new ArrayList<>(List.of(scratch(2, 6), scratch(4, 6)));
        List<ActivityLog> walks = new ArrayList<>(List.of(walk(2), walk(4)));
        assertTrue(analyzer.scratchingAroundActivity(new Pet(), checkIns, walks).isEmpty());
    }

    @Test
    void collapsesTwoWalksOnSameDateToOneExposureDay() {
        // 2 distinct dates, but 2 walks on one of them -> still only 2 exposure days -> no fire.
        List<DailyCheckIn> checkIns = new ArrayList<>(List.of(scratch(2, 6), scratch(4, 6)));
        List<ActivityLog> walks = new ArrayList<>(List.of(walk(2), walk(2), walk(2), walk(4)));
        assertTrue(analyzer.scratchingAroundActivity(new Pet(), checkIns, walks).isEmpty());
    }

    @Test
    void doesNotDoubleCountASharedNextDaySymptom() {
        // Walks on days 2 and 3; scratching only on day 2. Day-3 walk's next-day (day 2)
        // is already consumed by day-2 walk's same-day match -> only k=1.
        List<DailyCheckIn> checkIns = new ArrayList<>(List.of(scratch(2, 6)));
        List<ActivityLog> walks = new ArrayList<>(List.of(walk(2), walk(3)));
        assertTrue(analyzer.scratchingAroundActivity(new Pet(), checkIns, walks).isEmpty());
    }

    @Test
    void doesNotDoubleCountWhenTwoWalkDaysShareOneSymptomDay() {
        // 3 distinct walk days (today-4/-3/-2); scratching only on today-3 and today-2.
        // Correct dedup: today-3 and today-2 walks match same-day (k=2); the today-4 walk's
        // next-day (today-3) is already consumed, so it must NOT count -> k=2 < 3 -> no fire.
        // A double-counting impl would also credit the today-4 walk via today-3 -> k=3 -> fires.
        List<DailyCheckIn> checkIns = new ArrayList<>(List.of(scratch(3, 6), scratch(2, 6)));
        List<ActivityLog> walks = new ArrayList<>(List.of(walk(4), walk(3), walk(2)));
        assertTrue(analyzer.scratchingAroundActivity(new Pet(), checkIns, walks).isEmpty(),
                "a symptom day shared by two walk days must count once, not fire the pattern");
    }

    @Test
    void distinctDayCollapsePreventsRawRowCountFromInflatingTheFireDecision() {
        // 3 distinct walk days, but today-1 has 5 rows (7 raw rows total); scratching on all 3 days.
        // With .distinct(): n=3 distinct days, k=3 -> 6>=3 -> fires, exposureDays()==3.
        // Without .distinct(): n=7 raw rows -> 6>=7 is false -> would NOT fire.
        // So this pins "count DISTINCT exposure days, not raw ActivityLog rows".
        List<DailyCheckIn> checkIns = new ArrayList<>(List.of(scratch(1, 6), scratch(2, 6), scratch(3, 6)));
        List<ActivityLog> walks = new ArrayList<>(List.of(
                walk(1), walk(1), walk(1), walk(1), walk(1), walk(2), walk(3)));
        Optional<ActivityExposureAnalyzer.ActivityCoOccurrence> result =
                analyzer.scratchingAroundActivity(new Pet(), checkIns, walks);
        assertTrue(result.isPresent(), "3 distinct scratched walk days should fire regardless of duplicate rows");
        assertEquals(3, result.get().exposureDays(), "exposure days must count DISTINCT dates, not raw rows");
    }
}
