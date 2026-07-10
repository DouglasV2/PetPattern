package com.petpattern.domain;

import java.util.Locale;

/**
 * The part of the pet (or its stool) a photo is about. Drives the
 * progression view, where photos of the same area line up over time.
 *
 * <p>The visible-change areas (WOUND, SWELLING, SHELL, FEATHER, FIN_SCALE)
 * are universal across species — they let an owner track how a visible change
 * looks over time for a vet conversation. This is not a wound detector or a
 * diagnostic tool; it only organises owner-taken photos.
 */
public enum PhotoArea {
    EAR,
    PAW,
    SKIN,
    COAT,
    EYE,
    STOOL,
    // Visible-change / wound tracking — species-neutral. A photo of the same
    // area lines up over time so owners can show a vet how it looked.
    WOUND,
    SWELLING,
    SHELL,
    FEATHER,
    FIN_SCALE,
    OTHER,
    PROFILE;

    public static PhotoArea from(String value) {
        if (value == null || value.isBlank()) {
            return OTHER;
        }
        String normalized = value.trim()
                .replace("-", "_")
                .replace(" ", "_")
                .toUpperCase(Locale.ROOT);
        try {
            return PhotoArea.valueOf(normalized);
        } catch (IllegalArgumentException ignored) {
            return OTHER;
        }
    }

    public String displayName() {
        String lower = name().toLowerCase(Locale.ROOT).replace("_", " ");
        return Character.toUpperCase(lower.charAt(0)) + lower.substring(1);
    }
}
