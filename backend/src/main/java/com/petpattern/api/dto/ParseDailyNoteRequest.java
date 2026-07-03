package com.petpattern.api.dto;

import jakarta.validation.constraints.Size;

import java.util.UUID;

/**
 * Request to turn a free-text daily note into suggested fields. {@code petId} is
 * optional and used only for auditing; extraction works without a pet selected.
 */
public record ParseDailyNoteRequest(
        UUID petId,
        @Size(max = 2000, message = "Note is too long") String note
) {
}
