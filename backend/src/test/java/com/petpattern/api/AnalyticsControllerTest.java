package com.petpattern.api;

import com.petpattern.analytics.AnalyticsReportService;
import com.petpattern.analytics.AnalyticsService;
import com.petpattern.api.dto.AnalyticsEventRequest;
import com.petpattern.api.dto.AnalyticsReportResponse;
import com.petpattern.auth.PetAccess;
import com.petpattern.domain.AnalyticsEventType;
import com.petpattern.domain.Owner;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertSame;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyMap;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

/** Report authorization (404/403/200) and ingest guards for the analytics endpoints. */
class AnalyticsControllerTest {

    private final AnalyticsService analyticsService = mock(AnalyticsService.class);
    private final AnalyticsReportService reportService = mock(AnalyticsReportService.class);
    private final PetAccess petAccess = mock(PetAccess.class);

    private AnalyticsController controller(String adminToken) {
        return new AnalyticsController(analyticsService, reportService, petAccess, adminToken);
    }

    private Owner owner() {
        Owner owner = mock(Owner.class);
        when(owner.getId()).thenReturn(UUID.randomUUID());
        return owner;
    }

    @Test
    void reportIs404WhenNoAdminTokenConfigured() {
        ResponseStatusException ex = assertThrows(ResponseStatusException.class,
                () -> controller("").report("anything"));
        assertEquals(HttpStatus.NOT_FOUND, ex.getStatusCode());
        verifyNoInteractions(reportService);
    }

    @Test
    void reportIs403OnAWrongOrMissingToken() {
        AnalyticsController c = controller("s3cret");
        assertEquals(HttpStatus.FORBIDDEN,
                assertThrows(ResponseStatusException.class, () -> c.report("nope")).getStatusCode());
        assertEquals(HttpStatus.FORBIDDEN,
                assertThrows(ResponseStatusException.class, () -> c.report(null)).getStatusCode());
        verifyNoInteractions(reportService);
    }

    @Test
    void reportReturnsDataOnTheCorrectToken() {
        AnalyticsController c = controller("s3cret");
        AnalyticsReportResponse dummy = new AnalyticsReportResponse(
                LocalDate.now(), null, null, 0, 0, List.of(), List.of(), List.of(), List.of(),
                List.of(), List.of(), List.of(), List.of());
        when(reportService.report(any())).thenReturn(dummy);
        assertSame(dummy, c.report("s3cret"));
    }

    @Test
    void ingestRejectsAServerAuthoritativeMilestoneType() {
        AnalyticsController c = controller("s3cret");
        Owner owner = owner();
        when(petAccess.currentOwner()).thenReturn(owner);
        ResponseStatusException ex = assertThrows(ResponseStatusException.class,
                () -> c.record(new AnalyticsEventRequest("registered", "web", null, null, null)));
        assertEquals(HttpStatus.BAD_REQUEST, ex.getStatusCode());
    }

    @Test
    void ingestRejectsAnUnknownType() {
        AnalyticsController c = controller("s3cret");
        Owner owner = owner();
        when(petAccess.currentOwner()).thenReturn(owner);
        ResponseStatusException ex = assertThrows(ResponseStatusException.class,
                () -> c.record(new AnalyticsEventRequest("made_up", "web", null, null, null)));
        assertEquals(HttpStatus.BAD_REQUEST, ex.getStatusCode());
    }

    @Test
    void ingestAcceptsARepeatableClientEvent() {
        AnalyticsController c = controller("s3cret");
        Owner owner = owner();
        when(petAccess.currentOwner()).thenReturn(owner);
        ResponseEntity<Void> response =
                c.record(new AnalyticsEventRequest("reminder_enabled", "android", "1.0.0", null, null));
        assertEquals(HttpStatus.ACCEPTED, response.getStatusCode());
        verify(analyticsService).record(any(), eq(AnalyticsEventType.REMINDER_ENABLED),
                eq("android"), eq("1.0.0"), anyMap());
    }
}
