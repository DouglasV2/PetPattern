package com.petpattern.observations;

import java.util.Locale;

/**
 * One owner-observed signal parsed from {@code DailyCheckIn.observationsJson}.
 *
 * <p>These are the flexible, species-specific observations used by starter
 * species (rabbit, bird, reptile, …) and by the universal Visible Change / Wound
 * flow. Every field is a raw, owner-reported fact — no inference, no diagnosis.
 *
 * <p>A signal whose {@link #key()} is {@link #VISIBLE_CHANGE_KEY} is a
 * visible-change note: {@link #status()} then carries better/same/worse and
 * {@link #area()} a photo-area hint, so the same change can line up over time.
 */
public record ObservationSignal(
        String key,
        String label,
        String value,
        String severity,
        String status,
        String area,
        String note
) {

    /** Reserved key for the universal Visible Change / Wound flow. */
    public static final String VISIBLE_CHANGE_KEY = "visible_change";

    public boolean isVisibleChange() {
        return VISIBLE_CHANGE_KEY.equalsIgnoreCase(key);
    }

    /** A signal counts as "changed" unless it is explicitly a normal/clear value. */
    public boolean isChanged() {
        return ObservationSignals.isChangedValue(value);
    }

    /** A human label, falling back to the de-underscored key. */
    public String displayLabel() {
        if (label != null && !label.isBlank()) {
            return label;
        }
        return key == null ? "" : key.replace('_', ' ');
    }

    /** A short, human display value, falling back to a generic "Changed". */
    public String displayValue() {
        if (value != null && !value.isBlank()) {
            return value;
        }
        return "Changed";
    }

    /** Normalised better/same/worse, or null when not a tracked visible change. */
    public String normalizedStatus() {
        if (status == null || status.isBlank()) {
            return null;
        }
        String s = status.trim().toLowerCase(Locale.ROOT);
        return switch (s) {
            case "better", "same", "worse" -> s;
            default -> null;
        };
    }
}
