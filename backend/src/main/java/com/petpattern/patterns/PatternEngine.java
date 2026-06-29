package com.petpattern.patterns;

import com.petpattern.domain.DailyCheckIn;
import com.petpattern.domain.FoodLog;
import com.petpattern.domain.Pet;
import com.petpattern.repository.DailyCheckInRepository;
import com.petpattern.repository.FoodLogRepository;
import com.petpattern.repository.PetRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.UUID;

@Service
public class PatternEngine {

    private final PetRepository petRepository;
    private final DailyCheckInRepository checkInRepository;
    private final FoodLogRepository foodLogRepository;
    private final SymptomTrendAnalyzer symptomTrendAnalyzer;
    private final FoodExposureAnalyzer foodExposureAnalyzer;

    public PatternEngine(PetRepository petRepository,
                         DailyCheckInRepository checkInRepository,
                         FoodLogRepository foodLogRepository,
                         SymptomTrendAnalyzer symptomTrendAnalyzer,
                         FoodExposureAnalyzer foodExposureAnalyzer) {
        this.petRepository = petRepository;
        this.checkInRepository = checkInRepository;
        this.foodLogRepository = foodLogRepository;
        this.symptomTrendAnalyzer = symptomTrendAnalyzer;
        this.foodExposureAnalyzer = foodExposureAnalyzer;
    }

    public List<PatternCandidate> analyze(UUID petId) {
        Pet pet = petRepository.findById(petId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Pet not found"));

        LocalDate from = LocalDate.now().minusDays(120);
        List<DailyCheckIn> checkIns = checkInRepository.findByPetAndCheckInDateGreaterThanEqualOrderByCheckInDateAsc(pet, from);
        List<FoodLog> foodLogs = foodLogRepository.findByPetAndDateStartedGreaterThanEqualOrderByDateStartedAsc(pet, from);

        if (checkIns.size() < 7) {
            return List.of();
        }

        List<PatternCandidate> candidates = new ArrayList<>();
        symptomTrendAnalyzer.itchingAboveBaseline(pet, checkIns).ifPresent(candidates::add);
        symptomTrendAnalyzer.stoolInstability(pet, checkIns).ifPresent(candidates::add);
        symptomTrendAnalyzer.waterDrop(pet, checkIns).ifPresent(candidates::add);
        foodExposureAnalyzer.possibleFoodTrigger(pet, checkIns, foodLogs).ifPresent(candidates::add);

        candidates.sort(Comparator
                .comparing((PatternCandidate candidate) -> confidenceRank(candidate.confidence())).reversed()
                .thenComparing(candidate -> candidate.type().name()));
        return candidates;
    }

    private int confidenceRank(PatternConfidence confidence) {
        return switch (confidence) {
            case HIGH -> 3;
            case MEDIUM -> 2;
            case LOW -> 1;
        };
    }
}
