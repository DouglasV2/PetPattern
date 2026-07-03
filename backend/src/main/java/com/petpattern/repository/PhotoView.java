package com.petpattern.repository;

import com.petpattern.domain.PhotoArea;

import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

/**
 * Closed projection for the gallery list, so the query never selects the
 * (potentially large) {@code data} bytea column — the bytes are only loaded
 * when an image is actually streamed.
 */
public interface PhotoView {
    UUID getId();

    PhotoArea getArea();

    LocalDate getCapturedDate();

    String getCaption();

    String getContentType();

    Instant getCreatedAt();
}
