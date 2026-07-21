package com.petpattern.recap;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.petpattern.api.dto.RecapResponse;
import com.petpattern.domain.DailyCheckIn;
import com.petpattern.domain.Pet;
import com.petpattern.domain.PhotoArea;
import com.petpattern.patterns.PatternMemoryService;
import com.petpattern.repository.DailyCheckInRepository;
import com.petpattern.repository.FoodLogRepository;
import com.petpattern.repository.FoodTrialRepository;
import com.petpattern.repository.PetPhotoRepository;
import org.junit.jupiter.api.Test;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

/**
 * The weekly recap is valuable even when no pattern exists (spec Part 5): it
 * reports species-neutral factual counts, one vet-ready paragraph and one neutral
 * tracking suggestion, and it states missing days without shaming.
 */
class RecapServiceTest {

    private final DailyCheckInRepository checkInRepo = mock(DailyCheckInRepository.class);
    private final FoodLogRepository foodLogRepo = mock(FoodLogRepository.class);
    private final PetPhotoRepository photoRepo = mock(PetPhotoRepository.class);
    private final FoodTrialRepository trialRepo = mock(FoodTrialRepository.class);
    private final PatternMemoryService patternMemory = mock(PatternMemoryService.class);

    private final RecapService service = new RecapService(
            checkInRepo, foodLogRepo, photoRepo, trialRepo, patternMemory, new ObjectMapper());

    private DailyCheckIn day(LocalDate date, int itching) {
        DailyCheckIn c = new DailyCheckIn();
        c.setCheckInDate(date);
        c.setItchingScore(itching);
        return c;
    }

    private void stubEmptyExtras(Pet pet, List<DailyCheckIn> checkIns, long total) {
        when(checkInRepo.findByPetAndCheckInDateGreaterThanEqualOrderByCheckInDateAsc(any(), any())).thenReturn(checkIns);
        when(foodLogRepo.findByPetAndDateStartedGreaterThanEqualOrderByDateStartedAsc(any(), any())).thenReturn(List.of());
        when(photoRepo.countByPetAndAreaNotAndCapturedDateGreaterThanEqual(any(), any(PhotoArea.class), any())).thenReturn(0L);
        when(trialRepo.findByPetOrderByStartDateDesc(any())).thenReturn(List.of());
        when(patternMemory.activePatterns(any())).thenReturn(List.of());
        when(checkInRepo.countByPet(any())).thenReturn(total);
        when(checkInRepo.findFirstByPetOrderByCheckInDateAsc(any()))
                .thenReturn(checkIns.isEmpty() ? Optional.empty() : Optional.of(checkIns.get(0)));
    }

    @Test
    void recapWithoutAPatternStillGivesFactualCountsAndAVetParagraph() {
        Pet pet = new Pet();
        pet.setName("Bella");
        LocalDate today = LocalDate.now();
        List<DailyCheckIn> checkIns = List.of(
                day(today.minusDays(2), 1), day(today.minusDays(1), 8), day(today, 1));
        stubEmptyExtras(pet, checkIns, 3L);

        RecapResponse recap = service.recap(pet, 7);

        assertThat(recap.daysLogged()).isEqualTo(3);
        assertThat(recap.changedDays()).isEqualTo(1);       // the 8/10 day
        assertThat(recap.unchangedDays()).isEqualTo(2);
        assertThat(recap.patternsActive()).isZero();
        assertThat(recap.factualSummary()).isNotBlank();
        assertThat(recap.factualSummary().toLowerCase()).doesNotContain("not enough data");
        assertThat(recap.vetParagraph()).contains("No repeating relationship is visible yet");
        assertThat(recap.trackingSuggestion()).isNotBlank();
    }

    @Test
    void recapReportsMissingDaysNeutrallyWithoutShaming() {
        Pet pet = new Pet();
        pet.setName("Bella");
        LocalDate today = LocalDate.now();
        List<DailyCheckIn> checkIns = List.of(day(today, 1)); // 1 of 7 days logged
        stubEmptyExtras(pet, checkIns, 1L);

        RecapResponse recap = service.recap(pet, 7);

        assertThat(recap.missingDays()).isEqualTo(6);
        String allCopy = (recap.factualSummary() + " " + recap.vetParagraph() + " "
                + recap.trackingSuggestion() + " " + recap.headline()).toLowerCase();
        assertThat(allCopy).doesNotContain("streak");
        assertThat(allCopy).doesNotContain("missed");
        assertThat(allCopy).doesNotContain("should have");
    }
}
