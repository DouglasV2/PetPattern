package com.petpattern.analytics;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.petpattern.domain.AnalyticsEvent;
import com.petpattern.domain.AnalyticsEventType;
import com.petpattern.repository.AnalyticsEventRepository;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

import java.util.Map;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.argThat;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.clearInvocations;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/** Recording path: pseudonymity, per-event meta, once-per-ref idempotency, and check-in milestones. */
class AnalyticsRecordingTest {

    private final AnalyticsEventRepository repository = mock(AnalyticsEventRepository.class);
    private final AnalyticsService service = new AnalyticsService(repository, new ObjectMapper(), true, "salt");
    private final UUID owner = UUID.fromString("00000000-0000-0000-0000-000000000001");

    @Test
    void recordStoresAPseudonymousUtcRowWithFilteredMeta() {
        service.record(owner, AnalyticsEventType.CHECKIN_CREATED, "android", "1.2.3",
                Map.of("species", "DOG", "email", "x@y.com"));
        ArgumentCaptor<AnalyticsEvent> cap = ArgumentCaptor.forClass(AnalyticsEvent.class);
        verify(repository).save(cap.capture());
        AnalyticsEvent e = cap.getValue();
        assertEquals("checkin_created", e.getType());
        assertEquals("android", e.getPlatform());
        assertEquals("1.2.3", e.getAppVersion());
        assertEquals(AnalyticsService.SCHEMA_VERSION, e.getSchemaVersion());
        assertNotEquals(owner.toString(), e.getRef(), "ref is a pseudonym, never the owner id");
        assertNotNull(e.getOccurredOn());
        assertTrue(e.getMeta().contains("DOG"), "allow-listed species kept");
        assertFalse(e.getMeta().contains("email"), "PII stripped");
    }

    @Test
    void unknownPlatformFallsBackToWeb() {
        service.record(owner, AnalyticsEventType.PATTERN_VIEWED, "playstation", null, Map.of());
        ArgumentCaptor<AnalyticsEvent> cap = ArgumentCaptor.forClass(AnalyticsEvent.class);
        verify(repository).save(cap.capture());
        assertEquals("web", cap.getValue().getPlatform());
    }

    @Test
    void oncePerRefMilestoneIsSkippedWhenAlreadyPresent() {
        when(repository.existsByRefAndType(anyString(), eq("registered"))).thenReturn(true);
        service.record(owner, AnalyticsEventType.ACCOUNT_REGISTERED, "web", null, Map.of());
        verify(repository, never()).save(any());
    }

    @Test
    void checkInMilestonesFireOnlyTheThresholdsCrossed() {
        when(repository.existsByRefAndType(anyString(), anyString())).thenReturn(false);
        service.recordCheckInMilestones(owner, 1, "DOG");
        verify(repository, times(1)).save(argThat(e -> "first_checkin_completed".equals(e.getType())));
        verify(repository, never()).save(argThat(e -> "third_useful_checkin".equals(e.getType())));
        verify(repository, never()).save(argThat(e -> "seventh_useful_checkin".equals(e.getType())));

        clearInvocations(repository);
        when(repository.existsByRefAndType(anyString(), anyString())).thenReturn(false);
        service.recordCheckInMilestones(owner, 7, "DOG");
        verify(repository).save(argThat(e -> "first_checkin_completed".equals(e.getType())));
        verify(repository).save(argThat(e -> "third_useful_checkin".equals(e.getType())));
        verify(repository).save(argThat(e -> "seventh_useful_checkin".equals(e.getType())));
    }

    @Test
    void checkInMilestonesAreIdempotentWhenAlreadyRecorded() {
        when(repository.existsByRefAndType(anyString(), eq("first_checkin_completed"))).thenReturn(true);
        when(repository.existsByRefAndType(anyString(), eq("third_useful_checkin"))).thenReturn(false);
        service.recordCheckInMilestones(owner, 3, "DOG");
        verify(repository, never()).save(argThat(e -> "first_checkin_completed".equals(e.getType())));
        verify(repository, times(1)).save(argThat(e -> "third_useful_checkin".equals(e.getType())));
    }

    @Test
    void recordingIsNoOpWhenDisabledOrOwnerMissing() {
        AnalyticsService off = new AnalyticsService(repository, new ObjectMapper(), false, "salt");
        off.record(owner, AnalyticsEventType.PATTERN_VIEWED, "web", null, Map.of());
        service.record(null, AnalyticsEventType.PATTERN_VIEWED, "web", null, Map.of());
        verify(repository, never()).save(any());
    }

    @Test
    void deletionEventIsRecordedPseudonymously() {
        when(repository.existsByRefAndType(anyString(), anyString())).thenReturn(false);
        service.record(owner, AnalyticsEventType.ACCOUNT_DELETED, "web", null, Map.of());
        ArgumentCaptor<AnalyticsEvent> cap = ArgumentCaptor.forClass(AnalyticsEvent.class);
        verify(repository).save(cap.capture());
        assertEquals("account_deleted", cap.getValue().getType());
        assertNotEquals(owner.toString(), cap.getValue().getRef(), "the deletion row is pseudonymous, not identifying");
    }
}
