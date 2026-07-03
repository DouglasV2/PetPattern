package com.petpattern.auth;

import com.petpattern.domain.AuthSession;
import com.petpattern.domain.Owner;
import com.petpattern.repository.AuthSessionRepository;
import com.petpattern.repository.OwnerRepository;
import com.petpattern.i18n.Copy;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseCookie;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.Duration;
import java.time.Instant;
import java.util.Base64;
import java.util.Locale;

/**
 * Email + password auth with opaque, server-side sessions. The cookie carries a
 * random token; the database stores only its SHA-256 hash. Deliberately minimal
 * (no full Spring Security framework) so the rest of the app is untouched.
 */
@Service
public class AuthService {

    public static final String COOKIE = "pp_session";
    static final Duration SESSION_TTL = Duration.ofDays(30);
    private static final int MIN_PASSWORD = 8;

    private final OwnerRepository ownerRepository;
    private final AuthSessionRepository sessionRepository;
    private final BCryptPasswordEncoder encoder = new BCryptPasswordEncoder();
    private final SecureRandom random = new SecureRandom();

    // A throwaway hash to compare against when the email is unknown, so login always
    // does the same BCrypt work whether or not the account exists — no timing oracle
    // for account (email) enumeration. Computed once at class load.
    private static final String DUMMY_HASH = new BCryptPasswordEncoder().encode("timing-equalizer-not-a-real-password");

    // Set true in production (https) so the session cookie is only sent over TLS.
    // Field-injected (default false) so the cookie works on http://localhost.
    @Value("${petpattern.security.cookie-secure:false}")
    private boolean cookieSecure;

    public AuthService(OwnerRepository ownerRepository, AuthSessionRepository sessionRepository) {
        this.ownerRepository = ownerRepository;
        this.sessionRepository = sessionRepository;
    }

    public Owner register(String email, String password, String displayName, boolean acceptedTerms) {
        String normalized = normalizeEmail(email);
        if (normalized.isBlank() || !normalized.contains("@")) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, Copy.t("Enter a valid email"));
        }
        if (password == null || password.length() < MIN_PASSWORD) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, Copy.t("Password must be at least 8 characters"));
        }
        // display_name column is 120 chars — reject early instead of a DB error.
        if (displayName != null && displayName.trim().length() > 120) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, Copy.t("That name is too long"));
        }
        if (!acceptedTerms) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    Copy.t("Please accept the terms and privacy policy to continue"));
        }
        if (ownerRepository.existsByEmail(normalized)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, Copy.t("An account with that email already exists"));
        }
        Owner owner = new Owner();
        owner.setEmail(normalized);
        owner.setPasswordHash(encoder.encode(password));
        owner.setDisplayName(clean(displayName));
        // One confirmation covers all three; stamp them together.
        Instant now = Instant.now();
        owner.setAcceptedTermsAt(now);
        owner.setAcceptedPrivacyAt(now);
        owner.setAcceptedMedicalDisclaimerAt(now);
        try {
            return ownerRepository.save(owner);
        } catch (DataIntegrityViolationException ex) {
            // Concurrent registration with the same email hit the unique constraint.
            throw new ResponseStatusException(HttpStatus.CONFLICT, Copy.t("An account with that email already exists"));
        }
    }

    public Owner authenticate(String email, String password) {
        Owner owner = ownerRepository.findByEmail(normalizeEmail(email)).orElse(null);
        // Constant-work compare: run one BCrypt check against a dummy hash when the
        // email is unknown, so the response takes the same time whether or not the
        // account exists (no timing side-channel for email enumeration). The 401 is
        // uniform, so nothing reveals which part was wrong.
        String hash = owner != null ? owner.getPasswordHash() : DUMMY_HASH;
        boolean matches = password != null && encoder.matches(password, hash);
        if (owner == null || !matches) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, Copy.t("Email or password is incorrect"));
        }
        return owner;
    }

    /** Creates a session and returns the RAW token to put in the cookie. */
    public String issueSession(Owner owner) {
        byte[] raw = new byte[32];
        random.nextBytes(raw);
        String token = Base64.getUrlEncoder().withoutPadding().encodeToString(raw);
        AuthSession session = new AuthSession();
        session.setOwner(owner);
        session.setTokenHash(sha256(token));
        session.setExpiresAt(Instant.now().plus(SESSION_TTL));
        sessionRepository.save(session);
        return token;
    }

    /** Resolves a cookie token to an owner, or null if missing/invalid/expired. */
    public Owner resolve(String token) {
        if (token == null || token.isBlank()) {
            return null;
        }
        return sessionRepository.findByTokenHash(sha256(token))
                .filter(session -> session.getExpiresAt().isAfter(Instant.now()))
                .map(AuthSession::getOwner)
                .orElse(null);
    }

    /** Finds an owner by email or creates it — used to back the Bella demo account. */
    public Owner ensureOwner(String email, String rawPassword, String displayName) {
        String normalized = normalizeEmail(email);
        return ownerRepository.findByEmail(normalized).orElseGet(() -> {
            Owner owner = new Owner();
            owner.setEmail(normalized);
            owner.setPasswordHash(encoder.encode(rawPassword));
            owner.setDisplayName(clean(displayName));
            Instant now = Instant.now();
            owner.setAcceptedTermsAt(now);
            owner.setAcceptedPrivacyAt(now);
            owner.setAcceptedMedicalDisclaimerAt(now);
            return ownerRepository.save(owner);
        });
    }

    /**
     * Finds the owner for a verified Google email, creating one on first sign-in.
     * A Google account has no usable password — a random, never-shared hash fills
     * the non-null column, so a password login can never match it. An existing
     * email/password owner with the same email is reused, so Google sign-in links
     * to that account rather than creating a duplicate. First sign-in counts as
     * accepting the terms (the same one-click consent as registration).
     */
    public Owner findOrCreateGoogleOwner(String email, String displayName) {
        String normalized = normalizeEmail(email);
        return ownerRepository.findByEmail(normalized).orElseGet(() -> {
            Owner owner = new Owner();
            owner.setEmail(normalized);
            byte[] unusable = new byte[32];
            random.nextBytes(unusable);
            owner.setPasswordHash(encoder.encode(Base64.getEncoder().encodeToString(unusable)));
            owner.setDisplayName(clean(displayName));
            Instant now = Instant.now();
            owner.setAcceptedTermsAt(now);
            owner.setAcceptedPrivacyAt(now);
            owner.setAcceptedMedicalDisclaimerAt(now);
            try {
                return ownerRepository.save(owner);
            } catch (DataIntegrityViolationException ex) {
                // Two first-sign-ins for the same email raced — reload the winner.
                return ownerRepository.findByEmail(normalized).orElseThrow(() -> ex);
            }
        });
    }

    /** HttpOnly, SameSite=Lax session cookie; Secure when configured (prod/https). */
    public ResponseCookie sessionCookie(String token) {
        return ResponseCookie.from(COOKIE, token)
                .httpOnly(true).secure(cookieSecure).path("/").sameSite("Lax").maxAge(SESSION_TTL).build();
    }

    public ResponseCookie clearCookie() {
        return ResponseCookie.from(COOKIE, "")
                .httpOnly(true).secure(cookieSecure).path("/").sameSite("Lax").maxAge(Duration.ZERO).build();
    }

    public void revoke(String token) {
        if (token == null || token.isBlank()) {
            return;
        }
        sessionRepository.findByTokenHash(sha256(token)).ifPresent(sessionRepository::delete);
    }

    /** Hourly cleanup so expired session rows don't accumulate. */
    @Scheduled(fixedRate = 3_600_000L)
    @Transactional
    public void purgeExpiredSessions() {
        sessionRepository.deleteByExpiresAtBefore(Instant.now());
    }

    private String normalizeEmail(String email) {
        return email == null ? "" : email.trim().toLowerCase(Locale.ROOT);
    }

    private String clean(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }

    private String sha256(String value) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(value.getBytes(StandardCharsets.UTF_8));
            StringBuilder sb = new StringBuilder(hash.length * 2);
            for (byte b : hash) {
                sb.append(Character.forDigit((b >> 4) & 0xF, 16));
                sb.append(Character.forDigit(b & 0xF, 16));
            }
            return sb.toString();
        } catch (NoSuchAlgorithmException ex) {
            throw new IllegalStateException("SHA-256 unavailable", ex);
        }
    }
}
