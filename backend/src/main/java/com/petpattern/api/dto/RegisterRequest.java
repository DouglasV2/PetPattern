package com.petpattern.api.dto;

import jakarta.validation.constraints.Size;

/**
 * Registration. {@code acceptedTerms} is the single confirmation that the person
 * accepts the Terms + Privacy Policy and understands PetPattern is not a diagnosis
 * or a substitute for a vet — required, enforced server-side.
 *
 * <p>The upper-bound {@code @Size} caps only guard against oversized input (a clean
 * 400 instead of a DB error / wasted work); the minimum length and email-format
 * checks stay in AuthService so their user-facing messages are unchanged.
 */
public record RegisterRequest(
        @Size(max = 254, message = "That email is too long") String email,
        @Size(max = 200, message = "That password is too long") String password,
        @Size(max = 120, message = "That name is too long") String displayName,
        boolean acceptedTerms) {
}
