package com.petpattern.api;

import com.petpattern.analytics.AnalyticsReportService;
import com.petpattern.analytics.AnalyticsService;
import com.petpattern.api.dto.AnalyticsEventRequest;
import com.petpattern.api.dto.AnalyticsReportResponse;
import com.petpattern.auth.PetAccess;
import com.petpattern.domain.AnalyticsEventType;
import com.petpattern.domain.Owner;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.LocalDate;
import java.util.Map;

/**
 * Analytics ingest (authenticated, for client/mobile events) and reporting (admin-guarded).
 * The web activation funnel is recorded server-side at each touchpoint; this ingest exists
 * for platform-tagged client events (e.g. the mobile apps in Phase 4).
 */
@RestController
@RequestMapping("/api/analytics")
public class AnalyticsController {

    private final AnalyticsService analyticsService;
    private final AnalyticsReportService reportService;
    private final PetAccess petAccess;
    private final String adminToken;

    public AnalyticsController(AnalyticsService analyticsService,
                              AnalyticsReportService reportService,
                              PetAccess petAccess,
                              @Value("${petpattern.analytics.admin-token:}") String adminToken) {
        this.analyticsService = analyticsService;
        this.reportService = reportService;
        this.petAccess = petAccess;
        this.adminToken = adminToken;
    }

    /** Record one client event for the signed-in owner. 401 if signed out, 400 if unknown type. */
    @PostMapping("/events")
    public ResponseEntity<Void> record(@Valid @RequestBody AnalyticsEventRequest request) {
        Owner owner = petAccess.currentOwner();
        AnalyticsEventType type = AnalyticsEventType.fromWire(request.type())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Unknown event type"));
        analyticsService.record(owner.getId(), type, request.platform(), request.appVersion(),
                request.meta() == null ? Map.of() : request.meta());
        return ResponseEntity.accepted().build();
    }

    /** Funnel + D1/D7/D30 retention. 404 when no admin token is configured; 403 on a bad token. */
    @GetMapping("/report")
    public AnalyticsReportResponse report(
            @RequestHeader(value = "X-Analytics-Token", required = false) String token) {
        if (adminToken == null || adminToken.isBlank()) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Not found");
        }
        if (!constantTimeEquals(adminToken, token)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Forbidden");
        }
        return reportService.report(LocalDate.now());
    }

    private static boolean constantTimeEquals(String expected, String provided) {
        if (provided == null) {
            return false;
        }
        return MessageDigest.isEqual(
                expected.getBytes(StandardCharsets.UTF_8),
                provided.getBytes(StandardCharsets.UTF_8));
    }
}
