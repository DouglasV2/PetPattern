package com.petpattern.api.dto;

import jakarta.validation.constraints.Size;

public record ResetPasswordRequest(
        @Size(max = 512, message = "Invalid reset token") String token,
        @Size(max = 200, message = "That password is too long") String password) {
}
