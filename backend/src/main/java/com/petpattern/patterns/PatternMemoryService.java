package com.petpattern.patterns;

import com.petpattern.api.dto.PatternResponse;
import com.petpattern.domain.DailyCheckIn;
import com.petpattern.domain.PatternObservation;
import com.petpattern.domain.PatternStatus;
import com.petpattern.domain.Pet;
import com.petpattern.repository.DailyCheckInRepository;
import com.petpattern.repository.PatternObservationRepository;
import com.petpattern.repository.PetRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.UUID;

/**
 * The longitudinal memory around the deterministic engine.
 *
 * <p>The engine recomputes candidates on every request; this service remembers
 * them between requests: how long each possible pattern has been seen, how many
 * distinct days it has recurred, and the owner's standing decision about it
 * (acknowledged, resolved, not relevant, told the vet). That recurrence and
 * judgement is what turns a one-shot card into "PetPattern remembers your dog".
 *
 * <p>The engine stays the source of truth — this layer never invents a pattern,
 * it only annotates and remembers what the engine already found.
 */
@Service
public class PatternMemoryService {

    private static final Logger log = LoggerFactory.getLogger(PatternMemoryService.class);

    /** How long a no-longer-detected pattern is still shown as "settled" before it drops off. */
    private static final int FADE_WINDOW_DAYS = 30;

    private final PatternEngine patternEngine;
    private final PetRepository petRepository;
    private final PatternObservationRepository observationRepository;
    private final DailyCheckInRepository checkInRepository;

    public PatternMemoryService(PatternEngine patternEngine,
                                PetRepository petRepository,
                                PatternObservationRepository observationRepository,
                                DailyCheckInRepository checkInRepository) {
        this.patternEngine = patternEngine;
        this.petRepository = petRepository;
        this.observationRepository = observationRepository;
        this.checkInRepository = checkInRepository;
    }

    /**
     * Full pattern list for the Patterns screen. Records today's detection
     * (once per calendar day) and returns every current candidate enriched with
     * its status and history, dismissed ones demoted to the bottom.
     *
     * <p>Intentionally not wrapped in a single transaction: each observation
     * upsert is its own unit of work (via Spring Data's per-call transactions),
     * so a concurrent-insert race on one pattern can be retried as an update
     * without poisoning the writes for the others.
     */
    public List<PatternResponse> listPatterns(UUID petId) {
        Pet pet = findPet(petId);
        LocalDate today = LocalDate.now();
        List<PatternResponse> responses = new ArrayList<>();
        Set<String> detectedKeys = new HashSet<>();

        for (PatternCandidate candidate : patternEngine.analyze(petId)) {
            PatternObservation observation = upsertDetection(pet, candidate, today);
            detectedKeys.add(candidate.id());
            responses.add(PatternResponse.from(candidate, observation));
        }

        // Auto-fade: a pattern seen before but no longer detected shows as
        // "settled" for a while, then drops off. Owner-dismissed ones stay hidden.
        for (PatternObservation observation : observationRepository.findByPet(pet)) {
            if (detectedKeys.contains(observation.getPatternKey()) || observation.getStatus().isDismissed()) {
                continue;
            }
            LocalDate last = observation.getLastDetectedDate();
            if (last == null) {
                continue;
            }
            long daysSince = ChronoUnit.DAYS.between(last, today);
            if (daysSince < 0 || daysSince > FADE_WINDOW_DAYS) {
                continue;
            }
            responses.add(PatternResponse.fromObservation(petId, observation, today));
        }

        sort(responses);
        return responses;
    }

    /**
     * Read-only, active-only view for Bella today. Dismissed patterns are left
     * out entirely so they never drive the status or nag the owner.
     */
    @Transactional(readOnly = true)
    public List<PatternResponse> activePatterns(UUID petId) {
        Pet pet = findPet(petId);
        List<PatternResponse> responses = new ArrayList<>();
        for (PatternCandidate candidate : patternEngine.analyze(petId)) {
            PatternObservation observation =
                    observationRepository.findByPetAndPatternKey(pet, candidate.id()).orElse(null);
            PatternStatus status = observation == null ? PatternStatus.NEW : observation.getStatus();
            if (status.isDismissed()) {
                continue;
            }
            responses.add(PatternResponse.from(candidate, observation));
        }
        sort(responses);
        return responses;
    }

    /** Owner sets their decision about a pattern. Idempotent on the pattern key. */
    public PatternResponse setStatus(UUID petId, String patternKey, PatternStatus status) {
        Pet pet = findPet(petId);
        PatternCandidate candidate = patternEngine.analyze(petId).stream()
                .filter(c -> c.id().equals(patternKey))
                .findFirst()
                .orElse(null);

        PatternObservation observation = upsertStatus(pet, patternKey, candidate, status);
        return candidate != null
                ? PatternResponse.from(candidate, observation)
                : PatternResponse.fromObservation(petId, observation, LocalDate.now());
    }

    // --- internals --------------------------------------------------------

    /**
     * Find-or-create the observation and record today's detection. A concurrent
     * first-time insert of the same key surfaces as a constraint violation; we
     * swallow it and retry, which now finds the row and applies an update.
     */
    private PatternObservation upsertDetection(Pet pet, PatternCandidate candidate, LocalDate today) {
        try {
            return saveDetection(pet, candidate, today);
        } catch (DataIntegrityViolationException race) {
            log.debug("Detection insert raced for {}, retrying as update", candidate.id());
            return saveDetection(pet, candidate, today);
        }
    }

    private PatternObservation saveDetection(Pet pet, PatternCandidate candidate, LocalDate today) {
        LocalDate[] observed = observedRange(candidate);
        PatternObservation observation =
                observationRepository.findByPetAndPatternKey(pet, candidate.id()).orElse(null);
        if (observation == null) {
            observation = newObservation(pet, candidate, today, observed[1]);
        } else {
            observation.recordDetection(today, observed[0], observed[1], candidate.confidence().name(),
                    candidate.title(), candidate.summary());
        }
        return observationRepository.save(observation);
    }

    /**
     * The earliest and latest DATA dates this candidate is evidenced by, as
     * {@code [from, to]} (nulls when the candidate carries no related check-ins).
     * This is what episode counting compares against, so recurrence reflects the
     * data — not how often the patterns view is opened.
     */
    private LocalDate[] observedRange(PatternCandidate candidate) {
        java.util.List<java.util.UUID> ids = candidate.relatedCheckInIds();
        if (ids == null || ids.isEmpty()) {
            return new LocalDate[] { null, null };
        }
        LocalDate from = null;
        LocalDate to = null;
        for (DailyCheckIn checkIn : checkInRepository.findAllById(ids)) {
            LocalDate date = checkIn.getCheckInDate();
            if (date == null) {
                continue;
            }
            if (from == null || date.isBefore(from)) {
                from = date;
            }
            if (to == null || date.isAfter(to)) {
                to = date;
            }
        }
        return new LocalDate[] { from, to };
    }

    private PatternObservation upsertStatus(Pet pet, String patternKey,
                                            PatternCandidate candidate, PatternStatus status) {
        try {
            return saveStatus(pet, patternKey, candidate, status);
        } catch (DataIntegrityViolationException race) {
            log.debug("Status insert raced for {}, retrying as update", patternKey);
            return saveStatus(pet, patternKey, candidate, status);
        }
    }

    private PatternObservation saveStatus(Pet pet, String patternKey,
                                          PatternCandidate candidate, PatternStatus status) {
        PatternObservation observation =
                observationRepository.findByPetAndPatternKey(pet, patternKey).orElse(null);
        if (observation == null) {
            if (candidate == null) {
                throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Pattern not found");
            }
            observation = newObservation(pet, candidate, LocalDate.now(), observedRange(candidate)[1]);
        }
        observation.setStatus(status);
        return observationRepository.save(observation);
    }

    private PatternObservation newObservation(Pet pet, PatternCandidate candidate, LocalDate today, LocalDate observedTo) {
        PatternObservation observation =
                new PatternObservation(pet, candidate.id(), candidate.type(), today);
        observation.setLastObservedDate(observedTo != null ? observedTo : today);
        observation.setLastConfidence(candidate.confidence().name());
        observation.setLastTitle(candidate.title());
        observation.setLastSummary(candidate.summary());
        return observation;
    }

    private void sort(List<PatternResponse> responses) {
        responses.sort(Comparator
                .comparingInt(this::groupRank)
                .thenComparing(r -> -confidenceRank(r.confidence()))
                .thenComparing(PatternResponse::type));
    }

    /** Active detected first, then settled (no longer detected), then dismissed. */
    private int groupRank(PatternResponse response) {
        if (isDismissed(response.status())) {
            return 2;
        }
        return response.currentlyDetected() ? 0 : 1;
    }

    private boolean isDismissed(String status) {
        try {
            return PatternStatus.valueOf(status).isDismissed();
        } catch (IllegalArgumentException | NullPointerException ex) {
            return false;
        }
    }

    private int confidenceRank(String confidence) {
        if (confidence == null) {
            return 0;
        }
        return switch (confidence) {
            case "HIGH" -> 3;
            case "MEDIUM" -> 2;
            case "LOW" -> 1;
            default -> 0;
        };
    }

    private Pet findPet(UUID petId) {
        return petRepository.findById(petId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Pet not found"));
    }
}
