package com.petpattern.domain;

import java.util.Locale;

/**
 * The part of the dog (or its stool) a photo is about. Drives the
 * progression view, where photos of the same area line up over time.
 */
public enum PhotoArea {
    EAR,
    PAW,
    SKIN,
    COAT,
    EYE,
    STOOL,
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
