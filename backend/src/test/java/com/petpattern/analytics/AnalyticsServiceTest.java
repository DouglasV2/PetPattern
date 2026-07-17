package com.petpattern.analytics;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.petpattern.domain.AnalyticsEventType;
import org.junit.jupiter.api.Test;

import java.util.LinkedHashMap;
import java.util.Map;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Unit tests for the privacy-critical parts of analytics recording: the one-way pseudonym
 * and the categorical meta allow-list. The repository is unused by these paths, so it is
 * passed as null.
 */
class AnalyticsServiceTest {

    private final AnalyticsService service =
            new AnalyticsService(null, new ObjectMapper(), true, "test-salt");

    @Test
    void pseudonymIsStableForTheSameOwner() {
        UUID owner = UUID.fromString("00000000-0000-0000-0000-000000000001");
        assertEquals(service.pseudonym(owner), service.pseudonym(owner), "same owner -> same ref");
    }

    @Test
    void pseudonymDiffersByOwnerAndNeverEqualsTheRawId() {
        UUID a = UUID.fromString("00000000-0000-0000-0000-000000000001");
        UUID b = UUID.fromString("00000000-0000-0000-0000-000000000002");
        assertNotEquals(service.pseudonym(a), service.pseudonym(b), "different owners -> different refs");
        assertNotEquals(a.toString(), service.pseudonym(a), "the ref is not the raw owner id");
    }

    @Test
    void pseudonymDependsOnTheSalt() {
        UUID owner = UUID.fromString("00000000-0000-0000-0000-000000000001");
        AnalyticsService other = new AnalyticsService(null, new ObjectMapper(), true, "a-different-salt");
        assertNotEquals(service.pseudonym(owner), other.pseudonym(owner), "changing the salt changes the ref");
    }

    @Test
    void filterMetaKeepsOnlyAllowListedCategoricalValues() {
        Map<String, String> meta = new LinkedHashMap<>();
        meta.put("species", "DOG");
        meta.put("mode", "quick");
        meta.put("note", "Bella scratched a lot and I'm worried"); // free text — must be dropped
        meta.put("email", "owner@example.com");                    // PII — must be dropped
        meta.put("species_extra", "whatever");

        String json = service.filterMeta(AnalyticsEventType.CHECKIN_CREATED, meta);
        assertTrue(json.contains("\"species\":\"DOG\""), "allow-listed species kept");
        assertTrue(json.contains("\"mode\":\"quick\""), "allow-listed mode kept");
        assertTrue(!json.contains("note") && !json.contains("worried"), "free-text note dropped");
        assertTrue(!json.contains("email") && !json.contains("example.com"), "email dropped");
    }

    @Test
    void filterMetaRejectsAnUnknownSpeciesValue() {
        assertNull(service.filterMeta(AnalyticsEventType.CHECKIN_CREATED, Map.of("species", "DRAGON")),
                "an invalid species is not stored");
        assertNull(service.filterMeta(AnalyticsEventType.CHECKIN_CREATED, Map.of("mode", "yelling")),
                "an invalid mode is not stored");
        assertNull(service.filterMeta(AnalyticsEventType.CHECKIN_CREATED, Map.of()), "empty meta stores nothing");
    }

    @Test
    void filterMetaIsPerEventTypeNotGlobal() {
        // species is valid ON A CHECK-IN...
        assertTrue(service.filterMeta(AnalyticsEventType.CHECKIN_CREATED, Map.of("species", "DOG"))
                .contains("DOG"));
        // ...but a reminder event allows NO meta, so even a valid species is dropped.
        assertNull(service.filterMeta(AnalyticsEventType.REMINDER_ENABLED, Map.of("species", "DOG")),
                "a reminder event carries no categorical meta, so per-event filtering drops species");
        // ...and a mode is not allowed on ACCOUNT_REGISTERED.
        assertNull(service.filterMeta(AnalyticsEventType.ACCOUNT_REGISTERED, Map.of("mode", "quick")));
    }
}
