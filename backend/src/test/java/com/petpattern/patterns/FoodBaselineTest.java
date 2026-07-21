package com.petpattern.patterns;

import com.petpattern.domain.FoodKind;
import com.petpattern.domain.FoodLog;
import org.junit.jupiter.api.Test;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * The persistent baseline (spec Part 1): the active MAIN_FOOD is a real period,
 * a new main food closes the previous one, and treats/supplements never become
 * the displayed main food. These are pure functions over food logs so the rules
 * are testable without a database.
 */
class FoodBaselineTest {

    private static final LocalDate BASE = LocalDate.of(2026, 3, 1);

    private LocalDate d(int day) {
        return BASE.plusDays(day);
    }

    private FoodLog food(LocalDate start, FoodKind kind) {
        FoodLog log = new FoodLog();
        log.setFoodKind(kind);
        log.setDateStarted(start);
        return log;
    }

    @Test
    void relinkClosesEachMainFoodPeriodWhenTheNextBegins() {
        FoodLog a = food(d(1), FoodKind.MAIN_FOOD);
        FoodLog b = food(d(10), FoodKind.MAIN_FOOD);
        FoodLog c = food(d(20), FoodKind.MAIN_FOOD);

        FoodBaseline.relinkChain(new ArrayList<>(List.of(c, a, b))); // deliberately unsorted

        assertThat(a.getEndDate()).isEqualTo(d(10));
        assertThat(b.getEndDate()).isEqualTo(d(20));
        assertThat(c.getEndDate()).isNull(); // the latest main food stays active
    }

    @Test
    void changingMainFoodDoesNotDeleteThePreviousPeriodsHistory() {
        FoodLog a = food(d(1), FoodKind.MAIN_FOOD);
        FoodLog b = food(d(10), FoodKind.MAIN_FOOD);
        List<FoodLog> chain = new ArrayList<>(List.of(a, b));

        FoodBaseline.relinkChain(chain);

        assertThat(chain).containsExactlyInAnyOrder(a, b); // both survive
        assertThat(a.getEndDate()).isEqualTo(d(10));
    }

    @Test
    void theActiveMainFoodStaysActiveAcrossLaterDays() {
        FoodLog mainFood = food(d(1), FoodKind.MAIN_FOOD); // open, no end
        List<FoodLog> all = List.of(mainFood);

        assertThat(FoodBaseline.currentMainFood(all, d(1))).contains(mainFood);
        assertThat(FoodBaseline.currentMainFood(all, d(40))).contains(mainFood);
    }

    @Test
    void aTreatDoesNotReplaceTheDisplayedMainFood() {
        FoodLog mainFood = food(d(1), FoodKind.MAIN_FOOD);
        FoodLog treat = food(d(20), FoodKind.TREAT);

        assertThat(FoodBaseline.currentMainFood(List.of(treat, mainFood), d(25))).contains(mainFood);
    }

    @Test
    void aSupplementDoesNotReplaceTheDisplayedMainFood() {
        FoodLog mainFood = food(d(1), FoodKind.MAIN_FOOD);
        FoodLog supplement = food(d(20), FoodKind.SUPPLEMENT);

        assertThat(FoodBaseline.currentMainFood(List.of(supplement, mainFood), d(25))).contains(mainFood);
    }

    @Test
    void historicalPeriodsAreQueryableByDate() {
        FoodLog a = food(d(1), FoodKind.MAIN_FOOD);
        a.setEndDate(d(10));
        FoodLog b = food(d(10), FoodKind.MAIN_FOOD); // open
        List<FoodLog> mains = List.of(a, b);

        assertThat(FoodBaseline.activeOn(mains, d(5))).contains(a);
        assertThat(FoodBaseline.activeOn(mains, d(15))).contains(b);
        // the handover day belongs to the new food (end date is exclusive)
        assertThat(FoodBaseline.activeOn(mains, d(10))).contains(b);
    }
}
