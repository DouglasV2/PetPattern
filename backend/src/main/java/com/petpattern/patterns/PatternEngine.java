package com.petpattern.patterns;

import com.petpattern.domain.DailyCheckIn;
import com.petpattern.domain.FoodLog;
import com.petpattern.domain.Pet;
import com.petpattern.domain.Species;
import com.petpattern.repository.DailyCheckInRepository;
import com.petpattern.repository.FoodLogRepository;
import com.petpattern.repository.PetRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.EnumMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Detects patterns for one pet by dispatching to that species' {@link SpeciesRuleSet}.
 *
 * <p>Rule sets are Spring components auto-collected here into a {@code Species -> rule set}
 * map, so adding a species is a new {@code @Component} with no edits to this class. The
 * {@code < 7} check-in gate and the ordering are kept from the original engine; the ordering
 * now leads with {@link Severity} (an urgent sign surfaces as "the most important possible
 * pattern") before confidence and a stable type tie-break.
 */
@Service
public class PatternEngine {

    private final PetRepository petRepository;
    private final DailyCheckInRepository checkInRepository;
    private final FoodLogRepository foodLogRepository;
    private final Map<Species, SpeciesRuleSet> ruleSetsBySpecies;
    private final SpeciesRuleSet genericRuleSet;

    public PatternEngine(PetRepository petRepository,
                         DailyCheckInRepository checkInRepository,
                         FoodLogRepository foodLogRepository,
                         List<SpeciesRuleSet> ruleSets,
                         GenericStarterRuleSet genericRuleSet) {
        this.petRepository = petRepository;
        this.checkInRepository = checkInRepository;
        this.foodLogRepository = foodLogRepository;
        Map<Species, SpeciesRuleSet> map = new EnumMap<>(Species.class);
        for (SpeciesRuleSet ruleSet : ruleSets) {
            Species species = ruleSet.species();
            if (species != null) {
                map.put(species, ruleSet);
            }
        }
        this.ruleSetsBySpecies = map;
        this.genericRuleSet = genericRuleSet;
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

        RuleContext ctx = new RuleContext(pet, checkIns, foodLogs);
        SpeciesRuleSet ruleSet = ruleSetsBySpecies.getOrDefault(pet.getSpecies(), genericRuleSet);
        List<PatternCandidate> candidates = new ArrayList<>(ruleSet.evaluate(ctx));

        Comparator<PatternCandidate> bySeverity =
                Comparator.comparingInt(candidate -> severityRank(candidate.severity()));
        Comparator<PatternCandidate> byConfidence =
                Comparator.comparingInt(candidate -> confidenceRank(candidate.confidence()));
        candidates.sort(bySeverity.reversed()
                .thenComparing(byConfidence.reversed())
                .thenComparing(candidate -> candidate.type().name()));
        return candidates;
    }

    private int severityRank(Severity severity) {
        return switch (severity) {
            case URGENT -> 3;
            case WATCH -> 2;
            case INFO -> 1;
        };
    }

    private int confidenceRank(PatternConfidence confidence) {
        return switch (confidence) {
            case HIGH -> 3;
            case MEDIUM -> 2;
            case LOW -> 1;
        };
    }
}
