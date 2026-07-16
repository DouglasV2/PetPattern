package com.petpattern.domain;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

class AnalyticsEventTypeTest {

    @Test
    void resolvesKnownWireNamesCaseInsensitively() {
        assertEquals(AnalyticsEventType.CHECKIN_CREATED, AnalyticsEventType.fromWire("checkin_created").orElseThrow());
        assertEquals(AnalyticsEventType.REGISTERED, AnalyticsEventType.fromWire("  REGISTERED  ").orElseThrow());
    }

    @Test
    void dropsUnknownOrNullWireNames() {
        assertTrue(AnalyticsEventType.fromWire("something_made_up").isEmpty());
        assertTrue(AnalyticsEventType.fromWire(null).isEmpty());
    }

    @Test
    void milestonesAreOncePerRefAndActivityEventsAreNot() {
        assertTrue(AnalyticsEventType.REGISTERED.isOncePerRef(), "registration is a one-time milestone");
        assertTrue(AnalyticsEventType.ACCOUNT_DELETED.isOncePerRef(), "deletion is a one-time milestone");
        assertFalse(AnalyticsEventType.CHECKIN_CREATED.isOncePerRef(), "check-ins repeat (retention needs them)");
        assertFalse(AnalyticsEventType.PATTERN_VIEWED.isOncePerRef(), "views repeat");
    }
}
