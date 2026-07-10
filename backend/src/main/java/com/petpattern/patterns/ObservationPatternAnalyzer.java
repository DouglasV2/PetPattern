package com.petpattern.patterns;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.petpattern.domain.DailyCheckIn;
import com.petpattern.domain.Pet;
import com.petpattern.i18n.Copy;
import com.petpattern.observations.ObservationSignal;
import com.petpattern.observations.ObservationSignals;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Species-neutral starter analyzer for the flexible observations model.
 *
 * <p>It flags any owner-observed signal (from {@code DailyCheckIn.observationsJson})
 * that was logged as "changed" on more than one day in the recent window. This is
 * the deliberately simple starter-species equivalent of the dog/cat analyzers:
 * "repeated same signal key within a time window". It never infers a cause, never
 * names a condition — it only surfaces "this keeps coming up, worth mentioning".
 *
 * <p>Candidate ids are {@code petId:REPEATED_OBSERVATION:<key>} so each signal is a
 * distinct, stable pattern that merges with its remembered observation.
 */
@Component
public class ObservationPatternAnalyzer {

    private static final int WINDOW_DAYS = 21;
    private static final int MIN_CHANGED_DAYS = 2;

    private final BaselineCalculator baselineCalculator;
    private final ObjectMapper mapper;

    public ObservationPatternAnalyzer(BaselineCalculator baselineCalculator, ObjectMapper mapper) {
        this.baselineCalculator = baselineCalculator;
        this.mapper = mapper;
    }

    public List<PatternCandidate> analyze(Pet pet, List<DailyCheckIn> checkIns) {
        List<DailyCheckIn> recent = baselineCalculator.recentDays(checkIns, WINDOW_DAYS);
        Map<String, Integer> changedDays = new LinkedHashMap<>();
        Map<String, String> labels = new LinkedHashMap<>();

        for (DailyCheckIn checkIn : recent) {
            for (ObservationSignal signal : ObservationSignals.parse(checkIn.getObservationsJson(), mapper)) {
                String key = signal.key();
                if (key == null || key.isBlank() || !signal.isChanged()) {
                    continue;
                }
                changedDays.merge(key, 1, Integer::sum);
                labels.putIfAbsent(key, signal.displayLabel());
            }
        }

        List<PatternCandidate> out = new ArrayList<>();
        for (Map.Entry<String, Integer> entry : changedDays.entrySet()) {
            if (entry.getValue() >= MIN_CHANGED_DAYS) {
                out.add(build(pet, entry.getKey(), labels.get(entry.getKey()), entry.getValue()));
            }
        }
        return out;
    }

    private PatternCandidate build(Pet pet, String key, String label, int changedDays) {
        PatternConfidence confidence = changedDays >= 3 ? PatternConfidence.MEDIUM : PatternConfidence.LOW;
        String id = pet.getId() + ":REPEATED_OBSERVATION:" + key;
        String title = Copy.t("Recurring change: {0}", label);
        String summary = Copy.t(
                "You logged a change in {0} on more than one day. This is not a diagnosis, "
                        + "but it may be worth mentioning to your vet if it continues.", label);
        List<String> evidence = List.of(Copy.t("Days with a logged change: {0}", changedDays));
        return new PatternCandidate(id, pet.getId(), PatternType.REPEATED_OBSERVATION, confidence,
                title, summary, evidence, Instant.now(), null, List.of());
    }
}
