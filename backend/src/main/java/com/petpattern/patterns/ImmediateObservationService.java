package com.petpattern.patterns;

import com.petpattern.api.dto.ImmediateObservationDto;
import com.petpattern.domain.DailyCheckIn;
import com.petpattern.domain.FoodLog;
import com.petpattern.domain.Pet;
import com.petpattern.domain.Species;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.EnumMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

/**
 * The immediate safety layer (Layer A), kept deliberately separate from the historical
 * pattern-memory layer (Layer B, {@link PatternEngine} + {@link PatternMemoryService}).
 *
 * <p>Where the historical engine refuses to speak until a pet has enough history (its
 * {@code < 7} check-in gate), this service evaluates the pet's <em>latest relevant entry</em>
 * with no such gate, so an owner-logged urgent combination on the very first check-in is
 * surfaced. It dispatches to the same per-species {@link SpeciesRuleSet}s the engine uses, but
 * asks each only for its {@link SpeciesRuleSet#immediateObservations urgent-tier immediate
 * observations}.
 *
 * <p>The output is intentionally ephemeral — recomputed from current data on every read and
 * never written to {@code pattern_observations}. That is what guarantees the immediate/historical
 * separation the release requires: an immediate observation can never become a persisted
 * "recurring pattern" unless the independent historical criteria are separately met, and it
 * resolves the moment the current data no longer shows the urgent sign.
 */
@Service
public class ImmediateObservationService {

    private final Map<Species, SpeciesRuleSet> ruleSetsBySpecies;
    private final SpeciesRuleSet genericRuleSet;

    public ImmediateObservationService(List<SpeciesRuleSet> ruleSets,
                                       GenericStarterRuleSet genericRuleSet) {
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

    /**
     * Immediate urgent observations for a pet from already-loaded recent history. The overview
     * endpoint passes the check-ins/food logs it already holds, so this adds no extra query.
     *
     * <p>Callers are responsible for authorization (the overview endpoint resolves the pet via
     * {@code requireOwnedPet}), and this method only ever reads the check-ins it is handed, so it
     * cannot leak across pets or users.
     */
    public List<ImmediateObservationDto> evaluate(Pet pet,
                                                  List<DailyCheckIn> recentCheckIns,
                                                  List<FoodLog> recentFoodLogs) {
        if (pet == null || recentCheckIns == null || recentCheckIns.isEmpty()) {
            return List.of();
        }
        RuleContext ctx = new RuleContext(pet, recentCheckIns,
                recentFoodLogs == null ? List.of() : recentFoodLogs);
        SpeciesRuleSet ruleSet = ruleSetsBySpecies.getOrDefault(pet.getSpecies(), genericRuleSet);

        List<ImmediateObservationDto> out = new ArrayList<>();
        Set<String> seenIds = new HashSet<>();
        for (PatternCandidate candidate : ruleSet.immediateObservations(ctx)) {
            // Defensive: the immediate layer only ever surfaces the urgent tier, and a stable id
            // is emitted at most once so a single entry can never raise duplicate alerts.
            if (candidate.severity() != Severity.URGENT || !seenIds.add(candidate.id())) {
                continue;
            }
            out.add(toDto(candidate));
        }
        return out;
    }

    private ImmediateObservationDto toDto(PatternCandidate candidate) {
        List<String> ids = candidate.relatedCheckInIds() == null
                ? List.of()
                : candidate.relatedCheckInIds().stream().map(UUID::toString).toList();
        return new ImmediateObservationDto(
                candidate.id(),
                candidate.type().name(),
                "urgent",
                candidate.title(),
                candidate.summary(),
                candidate.urgentNote(),
                ids);
    }
}
