package com.petpattern.domain;

import java.util.Locale;

public enum Protein {
    CHICKEN,
    BEEF,
    LAMB,
    SALMON,
    TURKEY,
    DUCK,
    PORK,
    EGG,
    DAIRY,
    UNKNOWN,
    OTHER;

    public static Protein from(String value) {
        if (value == null || value.isBlank()) {
            return UNKNOWN;
        }

        String normalized = value.trim()
                .replace("-", "_")
                .replace(" ", "_")
                .toUpperCase(Locale.ROOT);

        try {
            return Protein.valueOf(normalized);
        } catch (IllegalArgumentException ignored) {
            return OTHER;
        }
    }

    public String displayName() {
        String lower = name().toLowerCase(Locale.ROOT).replace("_", " ");
        return Character.toUpperCase(lower.charAt(0)) + lower.substring(1);
    }
}
