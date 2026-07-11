package com.petpattern.patterns;

import com.petpattern.api.dto.WeeklyInsight;
import com.petpattern.domain.DailyCheckIn;
import com.petpattern.domain.Pet;
import com.petpattern.i18n.Copy;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.stereotype.Component;

import java.time.LocalDate;
import java.util.List;

/**
 * Builds the Today dashboard's compact "this week" card from existing check-ins.
 * Windows are today-anchored (calendar last-7 vs the 7 before it), NOT anchored on
 * the last logged day — a gap in logging must read as "still learning", not as a
 * fresh week. Repository-free: callers pass the check-ins so it unit-tests with new.
 */
@Component
public class WeeklyInsightService {

    static final int WINDOW = 7;
    static final int MIN_LOGS = 3;

    private final BaselineCalculator baseline;
    private final ObjectMapper mapper;

    public WeeklyInsightService(BaselineCalculator baseline, ObjectMapper mapper) {
        this.baseline = baseline;
        this.mapper = mapper;
    }

    public WeeklyInsight generate(Pet pet, List<DailyCheckIn> checkIns) {
        LocalDate today = LocalDate.now();
        List<DailyCheckIn> recent = baseline.between(checkIns, today.minusDays(WINDOW - 1L), today);
        List<DailyCheckIn> prior =
                baseline.between(checkIns, today.minusDays(2L * WINDOW - 1L), today.minusDays(WINDOW));

        if (recent.size() < MIN_LOGS) {
            return learning(pet);
        }
        // Task A3 inserts INSIGHT detection here.
        return stable();
    }

    private WeeklyInsight learning(Pet pet) {
        return new WeeklyInsight(
                "LEARNING",
                "calm",
                null,
                Copy.t("Still getting to know {0}'s rhythm", pet.getName()),
                Copy.t("A few short notes will help useful patterns start to show."),
                null);
    }

    private WeeklyInsight stable() {
        return new WeeklyInsight(
                "STABLE",
                "calm",
                Copy.t("THIS WEEK"),
                Copy.t("This week looks fairly steady"),
                Copy.t("We didn't spot a big change in the logged routines and behaviour."),
                null);
    }
}
