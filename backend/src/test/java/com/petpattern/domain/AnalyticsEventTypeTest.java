package com.petpattern.domain;

import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

class AnalyticsEventTypeTest {

    @Test
    void resolvesKnownWireNamesCaseInsensitively() {
        assertEquals(AnalyticsEventType.CHECKIN_CREATED, AnalyticsEventType.fromWire("checkin_created").orElseThrow());
        // Wire name is frozen as "registered" even though the constant is ACCOUNT_REGISTERED.
        assertEquals(AnalyticsEventType.ACCOUNT_REGISTERED, AnalyticsEventType.fromWire("  REGISTERED  ").orElseThrow());
    }

    @Test
    void dropsUnknownOrNullWireNames() {
        assertTrue(AnalyticsEventType.fromWire("something_made_up").isEmpty());
        assertTrue(AnalyticsEventType.fromWire(null).isEmpty());
    }

    @Test
    void milestonesAreOncePerRefAndActivityEventsAreNot() {
        assertTrue(AnalyticsEventType.ACCOUNT_REGISTERED.isOncePerRef(), "registration is a one-time milestone");
        assertTrue(AnalyticsEventType.ONBOARDING_COMPLETED.isOncePerRef(), "onboarding is a one-time milestone");
        assertTrue(AnalyticsEventType.FIRST_CHECKIN_COMPLETED.isOncePerRef(), "first check-in is a milestone");
        assertTrue(AnalyticsEventType.THIRD_USEFUL_CHECKIN_REACHED.isOncePerRef(), "third useful check-in is a milestone");
        assertTrue(AnalyticsEventType.SEVENTH_USEFUL_CHECKIN_REACHED.isOncePerRef(), "seventh useful check-in is a milestone");
        assertTrue(AnalyticsEventType.FIRST_WEEKLY_OVERVIEW_AVAILABLE.isOncePerRef(), "first weekly overview is a milestone");
        assertTrue(AnalyticsEventType.FIRST_PATTERN_GENERATED.isOncePerRef(), "first pattern is a milestone");
        assertTrue(AnalyticsEventType.ACCOUNT_DELETED.isOncePerRef(), "deletion is a one-time milestone");

        assertFalse(AnalyticsEventType.CHECKIN_CREATED.isOncePerRef(), "check-ins repeat (retention needs them)");
        assertFalse(AnalyticsEventType.SAME_AS_USUAL_CHECKIN_COMPLETED.isOncePerRef(), "same-as-usual repeats");
        assertFalse(AnalyticsEventType.PATTERN_VIEWED.isOncePerRef(), "views repeat");
        assertFalse(AnalyticsEventType.REMINDER_ENABLED.isOncePerRef(), "reminder toggles repeat");
        assertFalse(AnalyticsEventType.NOTIFICATION_TO_CHECKIN_CONVERSION.isOncePerRef(), "conversions repeat");
    }

    @Test
    void theFullRequestedEventVocabularyIsPresentAndResolvable() {
        List<String> required = List.of(
                "registered", "pet_created", "onboarding_completed", "first_checkin_completed",
                "same_as_usual_checkin", "changed_day_checkin", "third_useful_checkin", "seventh_useful_checkin",
                "first_weekly_overview", "weekly_overview_viewed", "first_pattern_generated", "pattern_viewed",
                "photo_timeline_used", "vet_summary_generated", "vet_summary_shared", "caregiver_invited",
                "reminder_enabled", "reminder_permission_granted", "reminder_permission_denied",
                "reminder_notification_opened", "notification_to_checkin", "export_clicked", "account_deleted");
        assertEquals(23, required.size(), "the requested model has 23 events");
        for (String wire : required) {
            assertTrue(AnalyticsEventType.fromWire(wire).isPresent(), "missing required event: " + wire);
        }
    }

    @Test
    void metaAllowListIsPerEventNotGlobal() {
        // A check-in may carry species + mode; a reminder event may carry nothing.
        assertTrue(AnalyticsEventType.CHECKIN_CREATED.allowedMetaKeys().contains("species"));
        assertTrue(AnalyticsEventType.CHECKIN_CREATED.allowedMetaKeys().contains("mode"));
        assertTrue(AnalyticsEventType.REMINDER_ENABLED.allowedMetaKeys().isEmpty(),
                "a reminder event carries no categorical meta");
        assertTrue(AnalyticsEventType.ACCOUNT_REGISTERED.allowedMetaKeys().isEmpty());
    }
}
