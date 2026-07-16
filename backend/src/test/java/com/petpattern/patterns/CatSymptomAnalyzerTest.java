package com.petpattern.patterns;

import com.petpattern.domain.AppetiteLevel;
import com.petpattern.domain.DailyCheckIn;
import com.petpattern.domain.HidingBehavior;
import com.petpattern.domain.LitterBoxUse;
import com.petpattern.domain.Pet;
import com.petpattern.domain.Species;
import com.petpattern.domain.UrinationChange;
import com.petpattern.domain.WaterLevel;
import org.junit.jupiter.api.Test;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Cautious cat rules: a change on more than one recent day surfaces a
 * (non-diagnostic) pattern; steady, normal days must never flag. Each firing
 * case here uses clearly-over-threshold data (leaving a margin), and each
 * negative uses steady-normal data, so no test rides a brittle boundary.
 */
class CatSymptomAnalyzerTest {

    private final CatSymptomAnalyzer analyzer =
            new CatSymptomAnalyzer(new BaselineCalculator(), new PatternExplanationBuilder());

    private Pet catPet() {
        Pet pet = new Pet();
        pet.setSpecies(Species.CAT);
        return pet;
    }

    /** One daily check-in dated `daysAgo` days before today (nothing else set). */
    private DailyCheckIn day(int daysAgo) {
        DailyCheckIn c = new DailyCheckIn();
        c.setCheckInDate(LocalDate.now().minusDays(daysAgo));
        return c;
    }

    /** `count` consecutive daily check-ins ending today (ascending), unconfigured. */
    private List<DailyCheckIn> recentBlank(int count) {
        List<DailyCheckIn> list = new ArrayList<>();
        for (int daysAgo = count - 1; daysAgo >= 0; daysAgo--) {
            list.add(day(daysAgo));
        }
        return list;
    }

    // --- appetiteLow (looks at the last 3 days; fires at >= 2 lower/refused) ---

    @Test
    void flagsAppetiteLowerOnMultipleRecentDays() {
        List<DailyCheckIn> checkIns = recentBlank(3);
        checkIns.forEach(c -> c.setAppetiteLevel(AppetiteLevel.LOWER));

        Optional<PatternCandidate> result = analyzer.appetiteLow(catPet(), checkIns);

        assertTrue(result.isPresent(), "appetite lower on 3 of the last 3 days should flag");
        assertEquals(PatternType.APPETITE_LOW, result.get().type());
    }

    @Test
    void doesNotFlagSteadyNormalAppetite() {
        List<DailyCheckIn> checkIns = recentBlank(3);
        checkIns.forEach(c -> c.setAppetiteLevel(AppetiteLevel.NORMAL));

        assertTrue(analyzer.appetiteLow(catPet(), checkIns).isEmpty(),
                "steady normal appetite should not flag");
    }

    // --- waterChange (last 3 days; fires at >= 2 lower OR >= 2 higher) ---

    @Test
    void flagsWaterLowerOnMultipleRecentDays() {
        List<DailyCheckIn> checkIns = recentBlank(3);
        checkIns.forEach(c -> c.setWaterLevel(WaterLevel.LOWER));

        Optional<PatternCandidate> result = analyzer.waterChange(catPet(), checkIns);

        assertTrue(result.isPresent(), "water lower on 3 of the last 3 days should flag");
        assertEquals(PatternType.WATER_CHANGE, result.get().type());
    }

    @Test
    void doesNotFlagSteadyNormalWater() {
        List<DailyCheckIn> checkIns = recentBlank(3);
        checkIns.forEach(c -> c.setWaterLevel(WaterLevel.NORMAL));

        assertTrue(analyzer.waterChange(catPet(), checkIns).isEmpty(),
                "steady normal water intake should not flag");
    }

    // --- litterBoxChange (last 3 days; fires at >= 2 changed days, or straining, or >= 2 not-used) ---

    @Test
    void flagsRepeatedLitterBoxChange() {
        List<DailyCheckIn> checkIns = recentBlank(3);
        // LESS counts as a litter-box change; three changed days clears the >= 2 bar.
        checkIns.forEach(c -> c.setLitterBoxUse(LitterBoxUse.LESS));

        Optional<PatternCandidate> result = analyzer.litterBoxChange(catPet(), checkIns);

        assertTrue(result.isPresent(), "a litter box change on multiple days should flag");
        assertEquals(PatternType.LITTER_BOX_CHANGE, result.get().type());
    }

    @Test
    void doesNotFlagNormalLitterBoxUse() {
        List<DailyCheckIn> checkIns = recentBlank(3);
        checkIns.forEach(c -> {
            c.setLitterBoxUse(LitterBoxUse.NORMAL);
            c.setUrinationChange(UrinationChange.NORMAL);
            // no straining, not the NONE state -> nothing notable
        });

        assertTrue(analyzer.litterBoxChange(catPet(), checkIns).isEmpty(),
                "normal litter box use with no straining should not flag");
    }

    // --- hidingIncreased (last 5 days; fires at >= 2 "more hiding" days) ---

    @Test
    void flagsHidingMoreThanUsual() {
        List<DailyCheckIn> checkIns = recentBlank(5);
        checkIns.forEach(c -> c.setHidingBehavior(HidingBehavior.MORE));

        Optional<PatternCandidate> result = analyzer.hidingIncreased(catPet(), checkIns);

        assertTrue(result.isPresent(), "more hiding across several recent days should flag");
        assertEquals(PatternType.HIDING_INCREASED, result.get().type());
    }

    @Test
    void doesNotFlagNormalHiding() {
        List<DailyCheckIn> checkIns = recentBlank(5);
        checkIns.forEach(c -> c.setHidingBehavior(HidingBehavior.NORMAL));

        assertTrue(analyzer.hidingIncreased(catPet(), checkIns).isEmpty(),
                "normal hiding should not flag");
    }

    // --- repeatedVomiting (last 7 days; fires at >= 2 vomiting days) ---

    @Test
    void flagsVomitingOnMultipleRecentDays() {
        List<DailyCheckIn> checkIns = recentBlank(7);
        checkIns.forEach(c -> c.setVomiting(true));

        Optional<PatternCandidate> result = analyzer.repeatedVomiting(catPet(), checkIns);

        assertTrue(result.isPresent(), "vomiting on more than one recent day should flag");
        assertEquals(PatternType.REPEATED_VOMITING, result.get().type());
    }

    @Test
    void doesNotFlagWhenNoVomiting() {
        List<DailyCheckIn> checkIns = recentBlank(7);
        // vomiting defaults to false; leave it unset

        assertTrue(analyzer.repeatedVomiting(catPet(), checkIns).isEmpty(),
                "no vomiting should not flag");
    }
}
