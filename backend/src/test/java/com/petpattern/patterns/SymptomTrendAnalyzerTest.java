package com.petpattern.patterns;

import com.petpattern.domain.DailyCheckIn;
import com.petpattern.domain.Pet;
import org.junit.jupiter.api.Test;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.function.IntUnaryOperator;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

class SymptomTrendAnalyzerTest {

    private final SymptomTrendAnalyzer analyzer =
            new SymptomTrendAnalyzer(new BaselineCalculator(), new PatternExplanationBuilder());

    /** Builds `days` consecutive daily check-ins (ascending), itching per days-ago. */
    private List<DailyCheckIn> series(int days, IntUnaryOperator itchByDaysAgo) {
        LocalDate today = LocalDate.now();
        List<DailyCheckIn> list = new ArrayList<>();
        for (int daysAgo = days - 1; daysAgo >= 0; daysAgo--) {
            DailyCheckIn c = new DailyCheckIn();
            c.setCheckInDate(today.minusDays(daysAgo));
            c.setItchingScore(itchByDaysAgo.applyAsInt(daysAgo));
            list.add(c);
        }
        return list;
    }

    @Test
    void flagsItchingWhenRecentSpikesOverACalmBaseline() {
        // 40 calm days (itch 1), the last 3 days high (itch 10).
        List<DailyCheckIn> checkIns = series(40, daysAgo -> daysAgo <= 2 ? 10 : 1);
        Optional<PatternCandidate> result = analyzer.itchingAboveBaseline(new Pet(), checkIns);
        assertTrue(result.isPresent(), "a clear recent spike over a calm baseline should be flagged");
        assertEquals(PatternType.ITCHING_ABOVE_BASELINE, result.get().type());
    }

    @Test
    void doesNotFlagSteadyCalmItching() {
        List<DailyCheckIn> checkIns = series(40, daysAgo -> 1);
        assertTrue(analyzer.itchingAboveBaseline(new Pet(), checkIns).isEmpty(),
                "steady low itching is normal and should not be flagged");
    }

    @Test
    void stillFlagsWhenAnEarlierFlareSitsInTheBaseline() {
        // Mostly-calm baseline with ONE earlier flare day (itch 8, ~20 days ago),
        // and a moderate recent rise (itch 6). The earlier flare is dropped from
        // the calm-only variance window, so it must not suppress the new signal.
        List<DailyCheckIn> checkIns = series(40, daysAgo -> {
            if (daysAgo <= 2) return 6;
            if (daysAgo == 20) return 8;
            return 1;
        });
        assertTrue(analyzer.itchingAboveBaseline(new Pet(), checkIns).isPresent(),
                "a real recent rise should still be flagged despite an old flare in the baseline");
    }
}
