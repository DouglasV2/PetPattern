package com.petpattern.patterns;

import com.petpattern.domain.DailyCheckIn;
import org.junit.jupiter.api.Test;

import java.time.LocalDate;
import java.util.List;
import java.util.OptionalDouble;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

class BaselineCalculatorTest {

    private final BaselineCalculator calc = new BaselineCalculator();

    private DailyCheckIn checkIn(LocalDate date, Integer itching) {
        DailyCheckIn c = new DailyCheckIn();
        c.setCheckInDate(date);
        c.setItchingScore(itching);
        return c;
    }

    @Test
    void averageItchingIgnoresNullScores() {
        LocalDate today = LocalDate.now();
        List<DailyCheckIn> list = List.of(
                checkIn(today.minusDays(2), 2),
                checkIn(today.minusDays(1), 4),
                checkIn(today, null));
        OptionalDouble avg = calc.averageItching(list);
        assertTrue(avg.isPresent());
        assertEquals(3.0, avg.getAsDouble(), 0.0001);
    }

    @Test
    void averageItchingEmptyWhenNoScores() {
        OptionalDouble avg = calc.averageItching(List.of(checkIn(LocalDate.now(), null)));
        assertTrue(avg.isEmpty());
    }
}
