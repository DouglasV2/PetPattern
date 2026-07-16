package com.petpattern.domain;

import java.util.Optional;

/**
 * The fixed allow-list of product-analytics events. Anything not here is dropped, so a
 * stray call can never introduce a new field or leak content. Each type is stored by its
 * stable lowercase {@link #wire()} name.
 *
 * <p>{@code oncePerRef} milestones (registration, deletion) are recorded at most once per
 * pseudonymous ref — duplicate-milestone prevention — while repeatable activity events
 * (check-ins, pattern/vet views, exports) are recorded every time, which is what makes
 * retention measurable.
 */
public enum AnalyticsEventType {

    REGISTERED("registered", true),
    PET_CREATED("pet_created", false),
    CHECKIN_CREATED("checkin_created", false),
    PATTERN_VIEWED("pattern_viewed", false),
    VET_SUMMARY_VIEWED("vet_summary_viewed", false),
    EXPORT_CLICKED("export_clicked", false),
    ACCOUNT_DELETED("account_deleted", true);

    private final String wire;
    private final boolean oncePerRef;

    AnalyticsEventType(String wire, boolean oncePerRef) {
        this.wire = wire;
        this.oncePerRef = oncePerRef;
    }

    public String wire() {
        return wire;
    }

    public boolean isOncePerRef() {
        return oncePerRef;
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
