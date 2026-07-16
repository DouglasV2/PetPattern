package com.petpattern.api.dto;

import com.petpattern.patterns.PatternCandidate;
import com.petpattern.patterns.PatternConfidence;
import com.petpattern.patterns.PatternType;
import com.petpattern.patterns.Severity;
import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;

/**
 * The urgent tier threads cleanly through the DTO, and the backward-compatible 10-arg
 * PatternCandidate constructor keeps every pre-existing candidate a non-urgent WATCH.
 */
class PatternResponseSeverityTest {

    @Test
    void urgentCandidateMapsToUrgentSeverityAndNote() {
        PatternCandidate urgent = new PatternCandidate(
                "pet:RABBIT_GI_STASIS_RISK", null, PatternType.STARTER_URGENT_SIGN, PatternConfidence.MEDIUM,
                "Eating less and changed droppings on the same day", "summary", List.of(),
                Instant.now(), null, List.of(), Severity.URGENT, "please contact your vet promptly");

        PatternResponse response = PatternResponse.from(urgent, null);
        assertEquals("urgent", response.severity());
        assertEquals("please contact your vet promptly", response.urgentNote());
    }

    @Test
    void legacyTenArgConstructorStaysWatchWithNoUrgentNote() {
        // Every pre-existing analyzer builds candidates with the original 10-arg signature.
        PatternCandidate legacy = new PatternCandidate(
                "pet:REPEATED_OBSERVATION:water", null, PatternType.REPEATED_OBSERVATION, PatternConfidence.LOW,
                "Recurring change: Water", "summary", List.of(), Instant.now(), null, List.of());

        assertEquals(Severity.WATCH, legacy.severity(), "the convenience constructor defaults to WATCH");
        assertNull(legacy.urgentNote(), "the convenience constructor carries no urgent note");

        PatternResponse response = PatternResponse.from(legacy, null);
        assertEquals("watch", response.severity());
        assertNull(response.urgentNote());
    }
}
