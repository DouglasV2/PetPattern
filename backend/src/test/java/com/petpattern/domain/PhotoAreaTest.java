package com.petpattern.domain;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;

/**
 * The visible-change photo areas must parse from client strings (lenient, like
 * every other area) and render readable labels. Unknown input still falls back
 * to OTHER so a bad value can never break a photo upload.
 */
class PhotoAreaTest {

    @Test
    void parsesVisibleChangeAreas() {
        assertEquals(PhotoArea.WOUND, PhotoArea.from("WOUND"));
        assertEquals(PhotoArea.SWELLING, PhotoArea.from("swelling"));
        assertEquals(PhotoArea.SHELL, PhotoArea.from("Shell"));
        assertEquals(PhotoArea.FEATHER, PhotoArea.from("feather"));
        // Hyphen/space normalisation, matching the existing from() contract.
        assertEquals(PhotoArea.FIN_SCALE, PhotoArea.from("fin-scale"));
        assertEquals(PhotoArea.FIN_SCALE, PhotoArea.from("fin scale"));
    }

    @Test
    void unknownAreaFallsBackToOther() {
        assertEquals(PhotoArea.OTHER, PhotoArea.from("not-a-real-area"));
        assertEquals(PhotoArea.OTHER, PhotoArea.from(""));
        assertEquals(PhotoArea.OTHER, PhotoArea.from(null));
    }

    @Test
    void displayNameIsReadable() {
        assertEquals("Wound", PhotoArea.WOUND.displayName());
        assertEquals("Fin scale", PhotoArea.FIN_SCALE.displayName());
    }
}
