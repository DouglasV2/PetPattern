package com.petpattern.patterns;

import com.petpattern.api.dto.PatternMemoryProgress;
import com.petpattern.domain.Species;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

class MilestoneCalculatorTest {

    @Test
    void zeroLogsIsBaselineStart() {
        PatternMemoryProgress progress = MilestoneCalculator.buildStage(Species.DOG, 0, 0, 0);
        assertEquals("baseline_start", progress.stage());
        assertEquals(1, progress.nextStageAt());
        assertEquals(1, progress.logsToNextStage());
        assertFalse(progress.weeklyOverviewReady());
    }

    @Test
    void oneLogIsBaselineBuildingWithSixToGo() {
        PatternMemoryProgress progress = MilestoneCalculator.buildStage(Species.DOG, 1, 0, 0);
        assertEquals("baseline_building", progress.stage());
        assertEquals(7, progress.nextStageAt());
        assertEquals(6, progress.logsToNextStage());
        assertFalse(progress.weeklyOverviewReady());
    }

    @Test
    void sixLogsIsBaselineBuildingWithOneToGo() {
        PatternMemoryProgress progress = MilestoneCalculator.buildStage(Species.DOG, 6, 0, 0);
        assertEquals("baseline_building", progress.stage());
        assertEquals(7, progress.nextStageAt());
        assertEquals(1, progress.logsToNextStage());
        assertFalse(progress.weeklyOverviewReady());
    }

    @Test
    void sevenLogsDogIsFirstOverviewHeadingToDogBaseline() {
        PatternMemoryProgress progress = MilestoneCalculator.buildStage(Species.DOG, 7, 0, 0);
        assertEquals("first_overview", progress.stage());
        assertEquals(14, progress.nextStageAt());
        assertEquals(7, progress.logsToNextStage());
        assertTrue(progress.weeklyOverviewReady());
    }

    @Test
    void sevenLogsCatIsFirstOverviewAndTerminal() {
        PatternMemoryProgress progress = MilestoneCalculator.buildStage(Species.CAT, 7, 0, 0);
        assertEquals("first_overview", progress.stage());
        assertEquals(0, progress.nextStageAt());
        assertEquals(0, progress.logsToNextStage());
        assertTrue(progress.weeklyOverviewReady());
    }

    @Test
    void sevenLogsRabbitIsFirstOverviewAndTerminal() {
        PatternMemoryProgress progress = MilestoneCalculator.buildStage(Species.RABBIT, 7, 0, 0);
        assertEquals("first_overview", progress.stage());
        assertEquals(0, progress.nextStageAt());
        assertEquals(0, progress.logsToNextStage());
        assertTrue(progress.weeklyOverviewReady());
    }

    @Test
    void thirteenLogsDogIsFirstOverviewWithOneToGo() {
        PatternMemoryProgress progress = MilestoneCalculator.buildStage(Species.DOG, 13, 0, 0);
        assertEquals("first_overview", progress.stage());
        assertEquals(14, progress.nextStageAt());
        assertEquals(1, progress.logsToNextStage());
    }

    @Test
    void fourteenLogsDogWithTwoFoodLogsIsTrendBaseline() {
        PatternMemoryProgress progress = MilestoneCalculator.buildStage(Species.DOG, 14, 2, 0);
        assertEquals("trend_baseline", progress.stage());
        assertEquals(21, progress.nextStageAt());
        assertEquals(7, progress.logsToNextStage());
    }

    @Test
    void twentyLogsDogWithTwoFoodLogsIsTrendBaselineWithOneToGo() {
        PatternMemoryProgress progress = MilestoneCalculator.buildStage(Species.DOG, 20, 2, 0);
        assertEquals("trend_baseline", progress.stage());
        assertEquals(21, progress.nextStageAt());
        assertEquals(1, progress.logsToNextStage());
    }

    @Test
    void twentyOneLogsDogWithTwoFoodLogsIsFoodTriggerReady() {
        PatternMemoryProgress progress = MilestoneCalculator.buildStage(Species.DOG, 21, 2, 0);
        assertEquals("food_trigger_ready", progress.stage());
        assertEquals(0, progress.nextStageAt());
        assertEquals(0, progress.logsToNextStage());
    }

    @Test
    void twentyOneLogsDogWithZeroFoodLogsStaysTrendBaseline() {
        PatternMemoryProgress progress = MilestoneCalculator.buildStage(Species.DOG, 21, 0, 0);
        assertEquals("trend_baseline", progress.stage());
    }

    @Test
    void twentyOneLogsDogWithOneFoodLogStaysTrendBaseline() {
        PatternMemoryProgress progress = MilestoneCalculator.buildStage(Species.DOG, 21, 1, 0);
        assertEquals("trend_baseline", progress.stage());
    }

    @Test
    void thirtyLogsCatIsFirstOverviewTerminalRegardlessOfCount() {
        PatternMemoryProgress progress = MilestoneCalculator.buildStage(Species.CAT, 30, 5, 0);
        assertEquals("first_overview", progress.stage());
        assertEquals(0, progress.nextStageAt());
        assertEquals(0, progress.logsToNextStage());
    }

    @Test
    void patternsActivePassesThroughUnchanged() {
        assertEquals(0, MilestoneCalculator.buildStage(Species.DOG, 0, 0, 0).patternsActive());
        assertEquals(3, MilestoneCalculator.buildStage(Species.DOG, 10, 1, 3).patternsActive());
        assertEquals(5, MilestoneCalculator.buildStage(Species.CAT, 20, 0, 5).patternsActive());
    }
}
