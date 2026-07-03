package com.petpattern.trials;

import com.petpattern.api.dto.FoodTrialResponse;
import com.petpattern.domain.DailyCheckIn;
import com.petpattern.domain.FoodTrial;
import com.petpattern.domain.Pet;
import com.petpattern.domain.StoolState;
import com.petpattern.domain.TrialStatus;
import com.petpattern.repository.DailyCheckInRepository;
import com.petpattern.repository.FoodLogRepository;
import org.junit.jupiter.api.Test;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class FoodTrialServiceTest {

    private final DailyCheckInRepository checkIns = mock(DailyCheckInRepository.class);
    private final FoodLogRepository foods = mock(FoodLogRepository.class);
    private final FoodTrialService service = new FoodTrialService(checkIns, foods);

    private DailyCheckIn checkIn(LocalDate date, Integer itching) {
        DailyCheckIn c = new DailyCheckIn();
        c.setCheckInDate(date);
        c.setItchingScore(itching);
        c.setStoolState(StoolState.NORMAL);
        return c;
    }

    private FoodTrial trial(LocalDate start, TrialStatus status) {
        FoodTrial trial = new FoodTrial();
        trial.setPet(new Pet());
        trial.setProtein("CHICKEN");
        trial.setStartDate(start);
        trial.setTargetEndDate(start.plusDays(20));
        trial.setStatus(status);
        return trial;
    }

    @Test
    void computesImprovementWhenScratchingDropsDuringElimination() {
        LocalDate start = LocalDate.now().minusDays(30);
        FoodTrial trial = trial(start, TrialStatus.COMPLETED);
        trial.setCompletedDate(LocalDate.now());

        List<DailyCheckIn> series = new ArrayList<>();
        for (int i = 14; i >= 1; i--) series.add(checkIn(start.minusDays(i), 8)); // baseline: itchy
        for (int i = 0; i <= 20; i++) series.add(checkIn(start.plusDays(i), 2));   // elimination: calm
        when(checkIns.findByPetAndCheckInDateGreaterThanEqualOrderByCheckInDateAsc(any(), any())).thenReturn(series);
        when(foods.findByPetAndDateStartedGreaterThanEqualOrderByDateStartedAsc(any(), any())).thenReturn(List.of());

        FoodTrialResponse res = service.toResponse(trial, "Bella");

        assertTrue(res.result().hasEnoughData());
        assertNotNull(res.result().baseline().avgItching());
        assertNotNull(res.result().elimination().avgItching());
        assertTrue(res.result().baseline().avgItching() > res.result().elimination().avgItching());
        assertTrue(res.result().cleanRun());
    }

    @Test
    void doesNotThrowWhenCheckInsHaveNoItchingScores() {
        // Regression: a run of check-ins that never recorded itching once NPE'd the verdict.
        LocalDate start = LocalDate.now().minusDays(30);
        FoodTrial trial = trial(start, TrialStatus.ACTIVE);

        List<DailyCheckIn> series = new ArrayList<>();
        for (int i = 14; i >= 1; i--) series.add(checkIn(start.minusDays(i), null));
        for (int i = 0; i <= 20; i++) series.add(checkIn(start.plusDays(i), null));
        when(checkIns.findByPetAndCheckInDateGreaterThanEqualOrderByCheckInDateAsc(any(), any())).thenReturn(series);
        when(foods.findByPetAndDateStartedGreaterThanEqualOrderByDateStartedAsc(any(), any())).thenReturn(List.of());

        FoodTrialResponse res = service.toResponse(trial, "Bella");
        assertFalse(res.result().hasEnoughData());
    }
}
