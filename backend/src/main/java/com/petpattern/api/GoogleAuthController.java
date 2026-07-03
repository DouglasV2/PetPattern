package com.petpattern.api;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.petpattern.auth.AuthService;
import com.petpattern.domain.Owner;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseCookie;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CookieValue;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.time.Duration;
import java.util.Base64;

/**
 * "Continue with Google" — a hand-rolled OAuth2 authorization-code flow that
 * plugs into the app's existing opaque-session auth instead of pulling in the
 * whole Spring Security framework. Additive only: email/password sign-in is
 * untouched, and both endpoints 404 unless all three env vars are set, so the UI
 * never offers a button that can't work.
 *
 * <p>Flow: {@code /start} sets a short-lived CSRF {@code state} cookie and
 * redirects to Google → the user consents → Google redirects back to
 * {@code /callback}, where we verify the state, swap the code for tokens
 * server-to-server (over TLS, with the client secret), read the verified email
 * from Google's userinfo, find-or-create the owner, and issue the normal
 * {@code pp_session} cookie. Only {@code openid email profile} is requested.
 */
@RestController
@RequestMapping("/api/auth/google")
public class GoogleAuthController {

    private static final Logger log = LoggerFactory.getLogger(GoogleAuthController.class);
    private static final String STATE_COOKIE = "pp_oauth_state";
    private static final String AUTH_ENDPOINT = "https://accounts.google.com/o/oauth2/v2/auth";
    private static final String TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token";
    private static final String USERINFO_ENDPOINT = "https://openidconnect.googleapis.com/v1/userinfo";
    private static final String SCOPE = "openid email profile";

    private final AuthService authService;
    private final ObjectMapper objectMapper;
    private final HttpClient http = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(8)).build();
    private final SecureRandom random = new SecureRandom();

    @Value("${petpattern.google.client-id:}")
    private String clientId;

    @Value("${petpattern.google.client-secret:}")
    private String clientSecret;

    @Value("${petpattern.google.redirect-uri:}")
    private String redirectUri;

    @Value("${petpattern.security.cookie-secure:false}")
    private boolean cookieSecure;

    public GoogleAuthController(AuthService authService, ObjectMapper objectMapper) {
        this.authService = authService;
        this.objectMapper = objectMapper;
    }

    /** True only when Google sign-in is fully configured. */
    public boolean enabled() {
        return notBlank(clientId) && notBlank(clientSecret) && notBlank(redirectUri);
    }

    @GetMapping("/start")
    public ResponseEntity<Void> start() {
        requireEnabled();
        String state = randomToken();
        ResponseCookie stateCookie = ResponseCookie.from(STATE_COOKIE, state)
                .httpOnly(true).secure(cookieSecure).path("/api/auth/google").sameSite("Lax")
                .maxAge(Duration.ofMinutes(5)).build();
        String url = AUTH_ENDPOINT
                + "?client_id=" + enc(clientId)
                + "&redirect_uri=" + enc(redirectUri)
                + "&response_type=code"
                + "&scope=" + enc(SCOPE)
                + "&state=" + enc(state)
                + "&access_type=online"
                + "&prompt=select_account";
        return ResponseEntity.status(HttpStatus.FOUND)
                .header(HttpHeaders.SET_COOKIE, stateCookie.toString())
                .header(HttpHeaders.LOCATION, url)
                .build();
    }

    @GetMapping("/callback")
    public ResponseEntity<Void> callback(@RequestParam(required = false) String code,
                                         @RequestParam(required = false) String state,
                                         @RequestParam(required = false) String error,
                                         @CookieValue(value = STATE_COOKIE, required = false) String stateCookie) {
        requireEnabled();
        ResponseCookie clearState = ResponseCookie.from(STATE_COOKIE, "")
                .httpOnly(true).secure(cookieSecure).path("/api/auth/google").sameSite("Lax")
                .maxAge(Duration.ZERO).build();

        // Reject anything that isn't a clean, state-matched success redirect.
        if (error != null || code == null || state == null || stateCookie == null
                || !MessageDigest.isEqual(state.getBytes(StandardCharsets.UTF_8), stateCookie.getBytes(StandardCharsets.UTF_8))) {
            return redirectHome("google_failed", clearState);
        }

        try {
            JsonNode token = exchangeCode(code);
            String accessToken = token.path("access_token").asText(null);
            if (accessToken == null) {
                return redirectHome("google_failed", clearState);
            }
            JsonNode info = fetchUserInfo(accessToken);
            String email = info.path("email").asText(null);
            boolean verified = info.path("email_verified").asBoolean(false);
            if (email == null || email.isBlank() || !verified) {
                return redirectHome("google_unverified", clearState);
            }
            String name = info.path("name").asText(null);
            Owner owner = authService.findOrCreateGoogleOwner(email, name);
            ResponseCookie session = authService.sessionCookie(authService.issueSession(owner));
            return ResponseEntity.status(HttpStatus.FOUND)
                    .header(HttpHeaders.SET_COOKIE, session.toString())
                    .header(HttpHeaders.SET_COOKIE, clearState.toString())
                    .header(HttpHeaders.LOCATION, appHome())
                    .build();
        } catch (Exception ex) {
            log.warn("Google sign-in callback failed: {}", ex.getMessage());
            return redirectHome("google_failed", clearState);
        }
    }

    private JsonNode exchangeCode(String code) throws Exception {
        String body = "code=" + enc(code)
                + "&client_id=" + enc(clientId)
                + "&client_secret=" + enc(clientSecret)
                + "&redirect_uri=" + enc(redirectUri)
                + "&grant_type=authorization_code";
        HttpRequest request = HttpRequest.newBuilder(URI.create(TOKEN_ENDPOINT))
                .timeout(Duration.ofSeconds(10))
                .header("Content-Type", "application/x-www-form-urlencoded")
                .header("Accept", "application/json")
                .POST(HttpRequest.BodyPublishers.ofString(body))
                .build();
        HttpResponse<String> response = http.send(request, HttpResponse.BodyHandlers.ofString());
        if (response.statusCode() / 100 != 2) {
            throw new IllegalStateException("token endpoint returned " + response.statusCode());
        }
        return objectMapper.readTree(response.body());
    }

    private JsonNode fetchUserInfo(String accessToken) throws Exception {
        HttpRequest request = HttpRequest.newBuilder(URI.create(USERINFO_ENDPOINT))
                .timeout(Duration.ofSeconds(10))
                .header("Authorization", "Bearer " + accessToken)
                .header("Accept", "application/json")
                .GET()
                .build();
        HttpResponse<String> response = http.send(request, HttpResponse.BodyHandlers.ofString());
        if (response.statusCode() / 100 != 2) {
            throw new IllegalStateException("userinfo endpoint returned " + response.statusCode());
        }
        return objectMapper.readTree(response.body());
    }

    /** The app origin's root, derived from the (registered) redirect URI. */
    private String appHome() {
        return URI.create(redirectUri).resolve("/").toString();
    }

    private ResponseEntity<Void> redirectHome(String reason, ResponseCookie clearState) {
        return ResponseEntity.status(HttpStatus.FOUND)
                .header(HttpHeaders.SET_COOKIE, clearState.toString())
                .header(HttpHeaders.LOCATION, appHome() + "#auth-error=" + reason)
                .build();
    }

    private void requireEnabled() {
        if (!enabled()) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Not found");
        }
    }

    private String randomToken() {
        byte[] raw = new byte[32];
        random.nextBytes(raw);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(raw);
    }

    private static String enc(String value) {
        return URLEncoder.encode(value, StandardCharsets.UTF_8);
    }

    private static boolean notBlank(String value) {
        return value != null && !value.isBlank();
    }
}
