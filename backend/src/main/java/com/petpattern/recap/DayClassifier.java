package com.petpattern.recap;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.petpattern.domain.DailyCheckIn;
import com.petpattern.observations.ObservationSignal;
import com.petpattern.observations.ObservationSignals;

/**
 * Classifies a single check-in as a "changed" day or a quiet/unchanged day from
 * the saved VALUES relative to normal (spec Part 2/5), species-neutral. There is
 * no intent flag: a day that carried an 8/10 forward reads as changed; a
 * back-to-usual day reads as unchanged — exactly because the values say so.
 */
public final class DayClassifier {

    // Scratching at or above the "worth watching" mark counts the day as changed.
    private static final int ITCHING_WATCH = 4;

    private DayClassifier() {
    }

    public static boolean isChangedDay(DailyCheckIn c, ObjectMapper mapper) {
        if (c == null) {
            return false;
        }
        // Starter-species flexible observations.
        for (ObservationSignal signal : ObservationSignals.parse(c.getObservationsJson(), mapper)) {
            if (signal.isChanged()) {
                return true;
            }
        }
        // Dog/cat explicit columns.
        Integer itch = c.getItchingScore();
        if (itch != null && itch >= ITCHING_WATCH) {
            return true;
        }
        if (c.isVomiting() || c.isDiarrhea() || c.isEarRedness() || c.isPawLicking()
                || c.isStraining() || c.isWeightConcern()) {
            return true;
        }
        return off(c.getStoolState()) || off(c.getAppetiteLevel()) || off(c.getWaterLevel())
                || off(c.getEnergyLevel()) || off(c.getLitterBoxUse()) || off(c.getUrinationChange())
                || off(c.getHidingBehavior());
    }

    /** A level enum reads as "off" when it is set to something other than NORMAL/UNKNOWN. */
    private static boolean off(Enum<?> level) {
        if (level == null) {
            return false;
        }
        String name = level.name();
        return !"NORMAL".equals(name) && !"UNKNOWN".equals(name);
    }
}
