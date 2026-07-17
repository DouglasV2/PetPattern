package com.petpattern.analytics;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.petpattern.auth.ClientContext;
import com.petpattern.auth.OwnerContext;
import com.petpattern.domain.AnalyticsEvent;
import com.petpattern.domain.AnalyticsEventType;
import com.petpattern.domain.Owner;
import com.petpattern.domain.Species;
import com.petpattern.repository.AnalyticsEventRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.Base64;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

/**
 * Records product-analytics events with privacy built in. It stores a one-way pseudonymous
 * {@code ref} (never the owner id), an allow-listed {@link AnalyticsEventType}, and only
 * allow-listed categorical meta — no name, note, symptom, email, or health content can pass
 * through. Recording is fail-safe: it never throws into the calling request.
 */
@Service
public class AnalyticsService {

    private static final Logger log = LoggerFactory.getLogger(AnalyticsService.class);

    /** Bump when the stored shape or meaning changes; lets reporting reconcile old rows. */
    public static final int SCHEMA_VERSION = 1;

    private static final Set<String> PLATFORMS = Set.of("web", "android", "ios");
    private static final Set<String> CHECKIN_MODES = Set.of("quick", "full", "changed", "same_as_yesterday");
    // appVersion is client-supplied; constrain it to a version shape so it can never become a
    // free-text (e.g. email) sink, keeping the "allow-listed values only" guarantee airtight.
    private static final java.util.regex.Pattern APP_VERSION = java.util.regex.Pattern.compile("^[0-9A-Za-z.+_-]{1,20}$");

    private final AnalyticsEventRepository repository;
    private final ObjectMapper objectMapper;
    private final boolean enabled;
    private final String refSalt;

    public AnalyticsService(AnalyticsEventRepository repository,
                            ObjectMapper objectMapper,
                            @Value("${petpattern.analytics.enabled:true}") boolean enabled,
                            @Value("${petpattern.analytics.ref-salt:dev-analytics-salt}") String refSalt) {
        this.repository = repository;
        this.objectMapper = objectMapper;
        this.enabled = enabled;
        this.refSalt = refSalt;
    }

    /** Record an event for the currently signed-in owner (no-op if signed out). */
    public void recordCurrent(AnalyticsEventType type) {
        recordCurrent(type, Map.of());
    }

    public void recordCurrent(AnalyticsEventType type, Map<String, String> meta) {
        Owner owner = OwnerContext.get();
        if (owner == null) {
            return;
        }
        record(owner.getId(), type, meta);
    }

    /**
     * Record for a known owner, attributing the CURRENT request's platform and app version (from
     * {@link ClientContext}) rather than hardcoding "web"/null — so a server-generated event from a
     * mobile client lands in the mobile cohort. Platform/app-version are validated before storage.
     */
    public void record(UUID ownerId, AnalyticsEventType type, Map<String, String> meta) {
        record(ownerId, type, ClientContext.platform(), ClientContext.appVersion(), meta);
    }

    /**
     * Core recording path. Derives the pseudonym, applies duplicate-milestone prevention,
     * filters meta to the allow-list, and stores a UTC-stamped row. Any failure is swallowed
     * — analytics must never break a request.
     */
    public void record(UUID ownerId, AnalyticsEventType type, String platform, String appVersion,
                       Map<String, String> meta) {
        if (!enabled || ownerId == null || type == null) {
            return;
        }
        try {
            String ref = pseudonym(ownerId);
            if (type.isOncePerRef() && repository.existsByRefAndType(ref, type.wire())) {
                return;
            }
            Instant now = Instant.now();
            AnalyticsEvent event = new AnalyticsEvent();
            event.setRef(ref);
            event.setType(type.wire());
            event.setOccurredAt(now);
            event.setOccurredOn(now.atZone(ZoneOffset.UTC).toLocalDate());
            event.setPlatform(normalizePlatform(platform));
            event.setAppVersion(safeAppVersion(appVersion));
            event.setSchemaVersion(SCHEMA_VERSION);
            event.setMeta(filterMeta(type, meta));
            repository.save(event);
        } catch (Exception ex) {
            // Includes a partial UNIQUE(ref,type) violation racing a once-per-ref milestone —
            // that is exactly the idempotency guarantee working, so it stays non-fatal.
            log.debug("Analytics event dropped (non-fatal)", ex);
        }
    }

    /**
     * Fire the idempotent check-in activation milestones for an owner, given how many distinct
     * check-ins they have logged. Each milestone is once-per-ref, so re-invoking at a higher count
     * (or on an edit that does not change the count) never double-fires — a "useful check-in" is a
     * distinct saved check-in day, so editing an existing day does not advance the milestone.
     */
    public void recordCheckInMilestones(UUID ownerId, long distinctCheckIns, String speciesName) {
        Map<String, String> meta = speciesName == null ? Map.of() : Map.of("species", speciesName);
        if (distinctCheckIns >= 1) {
            record(ownerId, AnalyticsEventType.FIRST_CHECKIN_COMPLETED, meta);
        }
        if (distinctCheckIns >= 3) {
            record(ownerId, AnalyticsEventType.THIRD_USEFUL_CHECKIN_REACHED, meta);
        }
        if (distinctCheckIns >= 7) {
            record(ownerId, AnalyticsEventType.SEVENTH_USEFUL_CHECKIN_REACHED, meta);
        }
    }

    /** A stable, one-way pseudonym for an owner. Not reversible without the id and salt. */
    String pseudonym(UUID ownerId) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest((ownerId + ":" + refSalt).getBytes(StandardCharsets.UTF_8));
            return Base64.getUrlEncoder().withoutPadding().encodeToString(hash);
        } catch (Exception ex) {
            // Never used in practice (SHA-256 is always available); degrade without crashing.
            return "unknown";
        }
    }

    /**
     * Per-event meta filter: keep only the categorical keys THIS event type allows
     * ({@link AnalyticsEventType#allowedMetaKeys()}), each with an allow-listed value, so no free
     * text or health content is ever stored and a key valid for one event (e.g. species on a
     * check-in) is dropped on an event that does not allow it (e.g. a reminder). Returns compact
     * JSON, or null when nothing survives.
     */
    String filterMeta(AnalyticsEventType type, Map<String, String> meta) {
        if (type == null || meta == null || meta.isEmpty()) {
            return null;
        }
        Set<String> allowed = type.allowedMetaKeys();
        if (allowed.isEmpty()) {
            return null;
        }
        Map<String, String> safe = new LinkedHashMap<>();
        if (allowed.contains("species")) {
            String species = meta.get("species");
            if (species != null && isSpecies(species)) {
                safe.put("species", species.trim().toUpperCase(java.util.Locale.ROOT));
            }
        }
        if (allowed.contains("mode")) {
            String mode = meta.get("mode");
            if (mode != null && CHECKIN_MODES.contains(mode.trim().toLowerCase(java.util.Locale.ROOT))) {
                safe.put("mode", mode.trim().toLowerCase(java.util.Locale.ROOT));
            }
        }
        if (safe.isEmpty()) {
            return null;
        }
        try {
            String json = objectMapper.writeValueAsString(safe);
            return clip(json, 500);
        } catch (Exception ex) {
            return null;
        }
    }

    /**
     * Normalize a client-supplied platform to the allow-list ({@code web/android/ios}), lower-cased
     * and trimmed; anything unknown or absent (including a server event with no request context)
     * falls back to {@code "web"}. The value is never trusted as free text.
     */
    private static String normalizePlatform(String platform) {
        if (platform == null) {
            return "web";
        }
        String normalized = platform.trim().toLowerCase(java.util.Locale.ROOT);
        return PLATFORMS.contains(normalized) ? normalized : "web";
    }

    /**
     * Store the app version only if it looks like a version string; otherwise fall back to
     * {@code "unknown"} (never null), so reporting always has a concrete cohort value.
     */
    private static String safeAppVersion(String appVersion) {
        String clipped = clip(appVersion, 20);
        return (clipped != null && APP_VERSION.matcher(clipped).matches()) ? clipped : "unknown";
    }

    private static boolean isSpecies(String value) {
        try {
            Species.valueOf(value.trim().toUpperCase(java.util.Locale.ROOT));
            return true;
        } catch (IllegalArgumentException ex) {
            return false;
        }
    }

    private static String clip(String value, int max) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        if (trimmed.isEmpty()) {
            return null;
        }
        return trimmed.length() <= max ? trimmed : trimmed.substring(0, max);
    }
}
