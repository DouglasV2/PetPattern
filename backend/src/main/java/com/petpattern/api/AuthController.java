package com.petpattern.api;

import com.petpattern.api.dto.ForgotPasswordRequest;
import com.petpattern.api.dto.LoginRequest;
import com.petpattern.api.dto.OwnerResponse;
import com.petpattern.api.dto.RegisterRequest;
import com.petpattern.api.dto.ResetPasswordRequest;
import com.petpattern.analytics.AnalyticsService;
import com.petpattern.auth.AuthService;
import com.petpattern.auth.OwnerContext;
import com.petpattern.auth.PasswordResetService;
import com.petpattern.i18n.Copy;
import com.petpattern.domain.AnalyticsEventType;
import com.petpattern.domain.Owner;
import jakarta.validation.Valid;

import java.util.Map;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthService authService;
    private final PasswordResetService passwordResetService;
    private final AnalyticsService analytics;

    public AuthController(AuthService authService, PasswordResetService passwordResetService,
                         AnalyticsService analytics) {
        this.authService = authService;
        this.passwordResetService = passwordResetService;
        this.analytics = analytics;
    }

    @PostMapping("/register")
    public ResponseEntity<OwnerResponse> register(@Valid @RequestBody RegisterRequest request,
                                                  @RequestHeader(value = "X-PetPattern-Client", required = false) String client) {
        Owner owner = authService.register(request.email(), request.password(), request.displayName(), request.acceptedTerms());
        String token = authService.issueSession(owner);
        // The new owner has no OwnerContext on this request yet, so record with the id directly.
        analytics.record(owner.getId(), AnalyticsEventType.ACCOUNT_REGISTERED, "web", null, Map.of());
        ResponseEntity.BodyBuilder response = ResponseEntity.status(HttpStatus.CREATED)
                .header(HttpHeaders.SET_COOKIE, authService.sessionCookie(token).toString());
        if (isMobileClient(client)) {
            response.header("X-Session-Token", token);
        }
        return response.body(OwnerResponse.from(owner));
    }

    @PostMapping("/login")
    public ResponseEntity<OwnerResponse> login(@RequestBody LoginRequest request,
                                               @RequestHeader(value = "X-PetPattern-Client", required = false) String client) {
        Owner owner = authService.authenticate(request.email(), request.password());
        String token = authService.issueSession(owner);
        ResponseEntity.BodyBuilder response = ResponseEntity.ok()
                .header(HttpHeaders.SET_COOKIE, authService.sessionCookie(token).toString());
        if (isMobileClient(client)) {
            response.header("X-Session-Token", token);
        }
        return response.body(OwnerResponse.from(owner));
    }

    /**
     * Always returns the same neutral message, whether or not the email exists —
     * so this endpoint can't be used to discover which emails have accounts.
     * Rate-limited in {@code RateLimitFilter}.
     */
    @PostMapping("/forgot-password")
    public ResponseEntity<Map<String, String>> forgotPassword(@RequestBody ForgotPasswordRequest request) {
        passwordResetService.requestReset(request.email());
        return ResponseEntity.ok(Map.of(
                "message", Copy.t("If an account exists for that email, we've sent reset instructions.")));
    }

    @PostMapping("/reset-password")
    public ResponseEntity<Map<String, String>> resetPassword(@Valid @RequestBody ResetPasswordRequest request) {
        passwordResetService.resetPassword(request.token(), request.password());
        return ResponseEntity.ok(Map.of(
                "message", Copy.t("Your password has been updated. You can sign in now.")));
    }

    @PostMapping("/logout")
    public ResponseEntity<Void> logout(@CookieValue(value = AuthService.COOKIE, required = false) String token,
                                       @RequestHeader(value = HttpHeaders.AUTHORIZATION, required = false) String authorization) {
        authService.revoke(token != null ? token : bearerToken(authorization));
        return ResponseEntity.noContent()
                .header(HttpHeaders.SET_COOKIE, authService.clearCookie().toString())
                .build();
    }

    private boolean isMobileClient(String client) {
        return client != null && client.equalsIgnoreCase("mobile");
    }

    private String bearerToken(String authorization) {
        if (authorization == null) {
            return null;
        }
        String prefix = "Bearer ";
        if (!authorization.regionMatches(true, 0, prefix, 0, prefix.length())) {
            return null;
        }
        String token = authorization.substring(prefix.length()).trim();
        return token.isBlank() ? null : token;
    }

    @GetMapping("/me")
    public OwnerResponse me() {
        Owner owner = OwnerContext.get();
        if (owner == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, Copy.t("Not signed in"));
        }
        return OwnerResponse.from(owner);
    }
}
