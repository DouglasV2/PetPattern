package com.petpattern.patterns;

import com.petpattern.domain.DailyCheckIn;
import com.petpattern.domain.FoodLog;
import com.petpattern.domain.Pet;
import com.petpattern.domain.Protein;
import com.petpattern.domain.Species;
import org.junit.jupiter.api.Test;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.function.IntFunction;
import java.util.function.IntPredicate;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Repeated-exposure food rule: it only fires when the SAME protein was fed at
 * least twice and each time the days 3–10 afterwards worsened (a real itching
 * rise over baseline, or repeated unstable stool) — and never below its size
 * gate (< 21 check-ins or < 2 food logs). The historical null-itching NPE is
 * pinned by {@link #nullItchingScoresDoNotThrow()}.
 *
 * <p>Two chicken logs are placed far enough apart that their 3–10 day exposure
 * windows and their 10-day "before" windows never overlap:
 * <ul>
 *   <li>log A started 45 days ago  -> exposure days-ago 35..42, before days-ago 46..55</li>
 *   <li>log B started 20 days ago  -> exposure days-ago 10..17, before days-ago 21..30</li>
 * </ul>
 */
class FoodExposureAnalyzerTest {

    private final FoodExposureAnalyzer analyzer = new FoodExposureAnalyzer(
            new BaselineCalculator(),
            new PatternExplanationBuilder(),
            new SymptomTrendAnalyzer(new BaselineCalculator(), new PatternExplanationBuilder()));

    private Pet dogPet() {
        Pet pet = new Pet();
        pet.setSpecies(Species.DOG);
        return pet;
    }

    /** True when `daysAgo` falls inside either chicken log's 3–10 day exposure window. */
    private boolean inExposureWindow(int daysAgo) {
        return (daysAgo >= 35 && daysAgo <= 42) || (daysAgo >= 10 && daysAgo <= 17);
    }

    /**
     * `totalDays` consecutive daily check-ins ending today. `itchByDaysAgo` may
     * return null (an unlogged itching score); `diarrheaByDaysAgo` toggles loose
     * stool, which drives the "unstable stool" side of the worsened test.
     */
    private List<DailyCheckIn> series(int totalDays,
                                      IntFunction<Integer> itchByDaysAgo,
                                      IntPredicate diarrheaByDaysAgo) {
        LocalDate today = LocalDate.now();
        List<DailyCheckIn> list = new ArrayList<>();
        for (int daysAgo = totalDays - 1; daysAgo >= 0; daysAgo--) {
            DailyCheckIn c = new DailyCheckIn();
            c.setCheckInDate(today.minusDays(daysAgo));
            c.setItchingScore(itchByDaysAgo.apply(daysAgo));
            c.setDiarrhea(diarrheaByDaysAgo.test(daysAgo));
            list.add(c);
        }
        return list;
    }

    private FoodLog chickenLog(int startDaysAgo) {
        FoodLog log = new FoodLog();
        log.setDateStarted(LocalDate.now().minusDays(startDaysAgo));
        log.setPrimaryProtein(Protein.CHICKEN);
        return log;
    }

    @Test
    void flagsProteinWhenItchingRisesAfterEachExposure() {
        // Calm baseline itch of 1, jumping to 8 inside both exposure windows:
        // each window's post-average (8) is a +7 lift over its before-average (1),
        // clearing lift >= 1.5 and post >= 5.0. Two such windows -> fires.
        List<DailyCheckIn> checkIns = series(61,
                daysAgo -> inExposureWindow(daysAgo) ? 8 : 1,
                daysAgo -> false);
        List<FoodLog> foodLogs = List.of(chickenLog(45), chickenLog(20));

        Optional<PatternCandidate> result = analyzer.possibleFoodTrigger(dogPet(), checkIns, foodLogs);

        assertTrue(result.isPresent(), "a repeated itching rise after the same protein should fire");
        assertEquals(PatternType.POSSIBLE_FOOD_TRIGGER, result.get().type());
    }

    @Test
    void foodTriggerHeadlineIsFactualNotCausal() {
        // Part 7: the headline must not use the forbidden "X-related pattern"
        // construction or claim a trigger — only that things were logged together.
        List<DailyCheckIn> checkIns = series(61,
                daysAgo -> inExposureWindow(daysAgo) ? 8 : 1,
                daysAgo -> false);
        List<FoodLog> foodLogs = List.of(chickenLog(45), chickenLog(20));

        PatternCandidate candidate = analyzer.possibleFoodTrigger(dogPet(), checkIns, foodLogs).orElseThrow();
        String title = candidate.title().toLowerCase();

        assertTrue(title.contains("chicken"), "headline should still name the protein factually");
        assertTrue(!title.contains("related pattern"), "headline must not use 'X-related pattern'");
        assertTrue(!title.contains("trigger"), "headline must not claim a trigger");
    }

    @Test
    void doesNotFlagSteadyItchingWithNoStoolChange() {
        // Flat itch of 3 everywhere and no loose stool: no window worsens.
        List<DailyCheckIn> checkIns = series(61, daysAgo -> 3, daysAgo -> false);
        List<FoodLog> foodLogs = List.of(chickenLog(45), chickenLog(20));

        assertTrue(analyzer.possibleFoodTrigger(dogPet(), checkIns, foodLogs).isEmpty(),
                "steady itching with stable stool is not a food trigger");
    }

    @Test
    void returnsEmptyBelowSizeGate() {
        // Fewer than 21 check-ins -> empty regardless of food logs.
        List<DailyCheckIn> tooFewCheckIns = series(10, daysAgo -> 3, daysAgo -> false);
        assertTrue(analyzer.possibleFoodTrigger(dogPet(), tooFewCheckIns,
                        List.of(chickenLog(6), chickenLog(3))).isEmpty(),
                "fewer than 21 check-ins should return empty");

        // Enough check-ins but fewer than 2 food logs -> empty.
        List<DailyCheckIn> enoughCheckIns = series(25, daysAgo -> 3, daysAgo -> false);
        assertTrue(analyzer.possibleFoodTrigger(dogPet(), enoughCheckIns,
                        List.of(chickenLog(20))).isEmpty(),
                "fewer than 2 food logs should return empty");
    }

    @Test
    void nullItchingScoresDoNotThrow() {
        // Regression: null itching scores must never NPE. Itching is null on every
        // day except one sentinel inside each exposure window (so the post-average
        // is present, as the analyzer requires), and the worsening is driven purely
        // by repeated loose stool inside the two windows.
        IntFunction<Integer> itch = daysAgo -> (daysAgo == 42 || daysAgo == 17) ? 5 : null;
        IntPredicate diarrhea = this::inExposureWindow;
        List<DailyCheckIn> checkIns = series(61, itch, diarrhea);
        List<FoodLog> foodLogs = List.of(chickenLog(45), chickenLog(20));

        Optional<PatternCandidate> result = assertDoesNotThrow(
                () -> analyzer.possibleFoodTrigger(dogPet(), checkIns, foodLogs),
                "null itching scores must not throw");
        assertTrue(result.isPresent(),
                "a stool-driven trigger should still surface despite null itching scores");
        assertEquals(PatternType.POSSIBLE_FOOD_TRIGGER, result.get().type());
    }
}
