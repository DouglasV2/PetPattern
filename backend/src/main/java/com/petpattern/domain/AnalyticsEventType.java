package com.petpattern.domain;

import java.util.Optional;
import java.util.Set;

/**
 * The fixed allow-list of product-analytics events (the activation → value → retention model).
 * Anything not here is dropped, so a stray call can never introduce a new field or leak content.
 * Each type is stored by its stable lowercase {@link #wire()} name — wire names are frozen for
 * database compatibility even where the constant was later renamed to the product vocabulary
 * (e.g. {@code ACCOUNT_REGISTERED} still stores {@code "registered"}).
 *
 * <p>{@code oncePerRef} milestones (registration, onboarding, the first/third/seventh useful
 * check-in, first weekly overview, first pattern, deletion) are recorded at most once per
 * pseudonymous ref — idempotent by construction and additionally guarded by a partial UNIQUE
 * index on {@code (ref, type)} (see {@code V15}). Repeatable activity events (check-ins,
 * pattern/vet/overview views, reminders) are recorded every time, which is what makes retention
 * and rates measurable.
 *
 * <p>Each type also declares its OWN allow-list of categorical meta keys ({@link #allowedMetaKeys}).
 * The recorder keeps only those keys for that type, so meta is filtered per-event, not globally —
 * a reminder event can never carry a species and no event can carry free text.
 */
public enum AnalyticsEventType {

    // --- Activation funnel ---------------------------------------------------
    ACCOUNT_REGISTERED("registered", true, Set.of()),
    ONBOARDING_COMPLETED("onboarding_completed", true, Set.of("species")),
    PET_CREATED("pet_created", false, Set.of("species")),
    FIRST_CHECKIN_COMPLETED("first_checkin_completed", true, Set.of("species")),
    SAME_AS_USUAL_CHECKIN_COMPLETED("same_as_usual_checkin", false, Set.of("species")),
    CHANGED_DAY_CHECKIN_COMPLETED("changed_day_checkin", false, Set.of("species")),
    THIRD_USEFUL_CHECKIN_REACHED("third_useful_checkin", true, Set.of("species")),
    SEVENTH_USEFUL_CHECKIN_REACHED("seventh_useful_checkin", true, Set.of("species")),

    // --- Value / insight -----------------------------------------------------
    FIRST_WEEKLY_OVERVIEW_AVAILABLE("first_weekly_overview", true, Set.of("species")),
    WEEKLY_OVERVIEW_VIEWED("weekly_overview_viewed", false, Set.of("species")),
    FIRST_PATTERN_GENERATED("first_pattern_generated", true, Set.of("species")),
    PATTERN_VIEWED("pattern_viewed", false, Set.of("species")),
    PHOTO_TIMELINE_USED("photo_timeline_used", false, Set.of("species")),
    VET_SUMMARY_GENERATED("vet_summary_generated", false, Set.of("species")),
    VET_SUMMARY_SHARED("vet_summary_shared", false, Set.of("species")),
    CAREGIVER_INVITED("caregiver_invited", false, Set.of()),

    // --- Reminders / notifications (client-reported via the ingest endpoint) -
    REMINDER_ENABLED("reminder_enabled", false, Set.of()),
    REMINDER_PERMISSION_GRANTED("reminder_permission_granted", false, Set.of()),
    REMINDER_PERMISSION_DENIED("reminder_permission_denied", false, Set.of()),
    REMINDER_NOTIFICATION_OPENED("reminder_notification_opened", false, Set.of()),
    NOTIFICATION_TO_CHECKIN_CONVERSION("notification_to_checkin", false, Set.of()),

    // --- Lifecycle -----------------------------------------------------------
    DATA_EXPORT_REQUESTED("export_clicked", false, Set.of()),
    ACCOUNT_DELETED("account_deleted", true, Set.of()),

    // --- Retained legacy events (present in existing rows; kept for continuity) ---
    /** Any saved check-in (repeatable). The mode-specific SAME_AS_USUAL / CHANGED_DAY events
     *  are the funnel-facing pair; this stays as the raw "a check-in happened" denominator. */
    CHECKIN_CREATED("checkin_created", false, Set.of("species", "mode")),
    /** A vet summary was opened (distinct from GENERATED, which is when one is produced). */
    VET_SUMMARY_VIEWED("vet_summary_viewed", false, Set.of("species"));

    private final String wire;
    private final boolean oncePerRef;
    private final Set<String> allowedMetaKeys;

    AnalyticsEventType(String wire, boolean oncePerRef, Set<String> allowedMetaKeys) {
        this.wire = wire;
        this.oncePerRef = oncePerRef;
        this.allowedMetaKeys = allowedMetaKeys;
    }

    public String wire() {
        return wire;
    }

    public boolean isOncePerRef() {
        return oncePerRef;
    }

    /** The categorical meta keys this event type may carry; anything else is stripped. */
    public Set<String> allowedMetaKeys() {
        return allowedMetaKeys;
    }

    /** Resolve a client-supplied wire name against the allow-list. Empty if unknown. */
    public static Optional<AnalyticsEventType> fromWire(String wire) {
        if (wire == null) {
            return Optional.empty();
        }
        String normalized = wire.trim().toLowerCase(java.util.Locale.ROOT);
        for (AnalyticsEventType type : values()) {
            if (type.wire.equals(normalized)) {
                return Optional.of(type);
            }
        }
        return Optional.empty();
    }
}
