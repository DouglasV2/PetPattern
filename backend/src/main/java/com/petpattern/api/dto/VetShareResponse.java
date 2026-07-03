package com.petpattern.api.dto;

import java.time.Instant;

/**
 * Share-link status. {@code token} is only present right after creation (it is
 * never stored in the clear, so it can't be shown again — regenerate to get a
 * fresh link).
 */
public record VetShareResponse(boolean active, String token, Instant expiresAt) {
}
