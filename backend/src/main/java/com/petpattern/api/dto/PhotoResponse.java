package com.petpattern.api.dto;

import com.petpattern.domain.PetPhoto;
import com.petpattern.domain.PhotoArea;
import com.petpattern.repository.PhotoView;

import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

/**
 * Photo metadata for the gallery. Never carries the image bytes — those are
 * streamed from {@code imageUrl} so lists stay light.
 */
public record PhotoResponse(
        UUID id,
        String area,
        String areaLabel,
        LocalDate capturedDate,
        String caption,
        String contentType,
        String imageUrl,
        Instant createdAt) {

    public static PhotoResponse from(PetPhoto photo) {
        return build(photo.getId(), photo.getArea(), photo.getCapturedDate(), photo.getCaption(),
                photo.getContentType(), photo.getCreatedAt(), photo.getPet().getId());
    }

    /** From a metadata-only projection (the gallery list path) — no bytes loaded. */
    public static PhotoResponse fromView(PhotoView view, UUID petId) {
        return build(view.getId(), view.getArea(), view.getCapturedDate(), view.getCaption(),
                view.getContentType(), view.getCreatedAt(), petId);
    }

    private static PhotoResponse build(UUID id, PhotoArea area, LocalDate capturedDate, String caption,
                                       String contentType, Instant createdAt, UUID petId) {
        PhotoArea safeArea = area == null ? PhotoArea.OTHER : area;
        return new PhotoResponse(
                id,
                safeArea.name(),
                safeArea.displayName(),
                capturedDate,
                caption,
                contentType,
                "/api/pets/" + petId + "/photos/" + id + "/image",
                createdAt
        );
    }
}
