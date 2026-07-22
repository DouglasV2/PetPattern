package com.petpattern.api.dto;

import jakarta.validation.constraints.Size;

/** The owner's standing "questions for your vet" free-text (spec Part 4). */
public record VetQuestionsRequest(
        @Size(max = 2000, message = "That is too long (max 2000 characters)") String questions
) {
}
