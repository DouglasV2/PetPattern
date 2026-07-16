package com.petpattern.api.dto;

/**
 * Honest first-week "pattern memory progress". Raw counts + a stage key computed
 * against the REAL engine gates (7-log global gate, 14-log dog baseline, 21-log +
 * 2-food dog food-trigger). The frontend maps `stage` to localized copy; this
 * never claims a capability the engine will not actually provide for the species.
 */
public record PatternMemoryProgress(
        int usefulLogs,            // check-ins in trailing 120 days (engine window)
        int foodLogsRecorded,      // food logs in trailing 120 days
        int patternsActive,        // currently-active remembered patterns (NOT dismissed/faded)
        boolean weeklyOverviewReady, // usefulLogs >= 7
        String stage,              // baseline_start|baseline_building|first_overview|trend_baseline|food_trigger_ready
        int nextStageAt,           // useful-log count of the next stage; 0 when terminal
        int logsToNextStage        // max(0, nextStageAt - usefulLogs); 0 when terminal
) {
}
