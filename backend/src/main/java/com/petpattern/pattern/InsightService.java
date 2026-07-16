package com.petpattern.pattern;

import com.petpattern.api.dto.InsightResponse;
import com.petpattern.domain.Pet;
import com.petpattern.i18n.Copy;
import com.petpattern.patterns.PatternCandidate;
import com.petpattern.patterns.PatternEngine;
import com.petpattern.patterns.Severity;
import com.petpattern.repository.DailyCheckInRepository;
import com.petpattern.repository.PetRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Locale;
import java.util.UUID;

@Service
public class InsightService {

    private static String medicalBoundary() {
        return Copy.t("This is not a medical conclusion. It is a pattern from stored history that may be useful to discuss with a veterinarian.");
    }

    private final PatternEngine patternEngine;
    private final PetRepository petRepository;
    private final DailyCheckInRepository checkInRepository;

    public InsightService(PatternEngine patternEngine,
                          PetRepository petRepository,
                          DailyCheckInRepository checkInRepository) {
        this.patternEngine = patternEngine;
        this.petRepository = petRepository;
        this.checkInRepository = checkInRepository;
    }

    public List<InsightResponse> generateInsights(UUID petId) {
        Pet pet = petRepository.findById(petId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Pet not found"));
        List<PatternCandidate> patterns = patternEngine.analyze(petId);

        if (patterns.isEmpty()) {
            int loggedDays = checkInRepository.findByPetOrderByCheckInDateDesc(pet).size();
            return List.of(new InsightResponse(
                    "BASELINE_BUILDING",
                    "calm",
                    Copy.t("PetPattern is still learning what normal looks like"),
                    Copy.t("{0} has {1} logged days. Keep tracking food and daily signals so changes become easier to compare.",
                            pet.getName(), loggedDays),
                    "low",
                    List.of(Copy.t("Logged days: {0}", loggedDays), Copy.t("Nothing outside the usual range yet")),
                    medicalBoundary()
            ));
        }

        return patterns.stream()
                .map(this::toInsight)
                .toList();
    }

    private InsightResponse toInsight(PatternCandidate candidate) {
        return new InsightResponse(
                candidate.type().name(),
                severity(candidate),
                candidate.title(),
                candidate.summary(),
                candidate.confidence().name().toLowerCase(Locale.ROOT),
                candidate.evidence(),
                medicalBoundary()
        );
    }

    private String severity(PatternCandidate candidate) {
        // An urgent sign leads regardless of type; otherwise the food-trigger keeps its
        // "pattern" token and everything else is "watch". The default arm keeps this
        // exhaustive-safe as new starter pattern types are added.
        if (candidate.severity() == Severity.URGENT) {
            return "urgent";
        }
        return switch (candidate.type()) {
            case POSSIBLE_FOOD_TRIGGER -> "pattern";
            default -> "watch";
        };
    }
}
