package com.petpattern.patterns;

import com.petpattern.api.dto.PatternMemoryProgress;
import com.petpattern.domain.Species;

/** Pure, DB-free milestone selection — the unit-test surface. */
public final class MilestoneCalculator {
    private MilestoneCalculator() {}

    public static PatternMemoryProgress buildStage(Species species, int usefulLogs,
                                                   int foodLogsRecorded, int patternsActive) {
        boolean overviewReady = usefulLogs >= 7;
        String stage;
        int nextAt;
        if (usefulLogs <= 0)                 { stage = "baseline_start";     nextAt = 1;  }
        else if (usefulLogs < 7)             { stage = "baseline_building";  nextAt = 7;  }
        else if (species != Species.DOG)     { stage = "first_overview";     nextAt = 0;  } // cats + starter species: no higher engine tier -> terminal at the 7-log gate
        else if (usefulLogs < 14)            { stage = "first_overview";     nextAt = 14; }
        else if (usefulLogs < 21 || foodLogsRecorded < 2) { stage = "trend_baseline"; nextAt = 21; } // dog with 21+ logs but <2 food logs honestly stays here
        else                                 { stage = "food_trigger_ready"; nextAt = 0;  }
        int toNext = nextAt == 0 ? 0 : Math.max(0, nextAt - usefulLogs);
        return new PatternMemoryProgress(usefulLogs, foodLogsRecorded, patternsActive, overviewReady, stage, nextAt, toNext);
    }
}
