package com.petpattern.auth;

import com.petpattern.domain.Owner;
import com.petpattern.domain.PasswordResetToken;
import com.petpattern.i18n.Copy;
import com.petpattern.repository.AuthSessionRepository;
import com.petpattern.repository.OwnerRepository;
import com.petpattern.repository.PasswordResetTokenRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;
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
 * Forgot / reset password. Deliberately privacy-preserving:
 *
 * <ul>
 *   <li>The forgot endpoint <b>never reveals whether an email exists</b> — it does
 *       the work only if the account exists, and the controller always returns the
 *       same neutral message.</li>
 *   <li>Tokens are high-entropy random values; only the SHA-256 hash is stored.</li>
 *   <li>Tokens <b>expire</b> and are <b>one-time use</b>. Requesting a new link
 *       invalidates any earlier outstanding token for that account.</li>
 *   <li>A successful reset <b>revokes all existing sessions</b>, so anyone holding
 *       the old password is signed out everywhere.</li>
 * </ul>
 */
@Service
public class PasswordResetService {

    private static final Logger log = LoggerFactory.getLogger(PasswordResetService.class);
    private static final int MIN_PASSWORD = 8;

    private final OwnerRepository ownerRepository;
    private final PasswordResetTokenRepository tokenRepository;
    private final AuthSessionRepository sessionRepository;
    private final PasswordResetMailer mailer;
    private final BCryptPasswordEncoder encoder = new BCryptPasswordEncoder();
    private final SecureRandom random = new SecureRandom();

    private final Duration tokenTtl;
    private final String publicOrigin;

    public PasswordResetService(OwnerRepository ownerRepository,
                                PasswordResetTokenRepository tokenRepository,
                                AuthSessionRepository sessionRepository,
                                PasswordResetMailer mailer,
                                @Value("${petpattern.reset.token-ttl-minutes:60}") long ttlMinutes,
                                @Value("${petpattern.public-origin:http://localhost:7317}") String publicOrigin) {
        this.ownerRepository = ownerRepository;
        this.tokenRepository = tokenRepository;
        this.sessionRepository = sessionRepository;
        this.mailer = mailer;
        this.tokenTtl = Duration.ofMinutes(ttlMinutes);
        // Strip a trailing slash so the built link never doubles up ("//#reset").
        this.publicOrigin = publicOrigin.endsWith("/")
                ? publicOrigin.substring(0, publicOrigin.length() - 1) : publicOrigin;
    }

    /**
     * If (and only if) an account exists for the email, mint a fresh token and
     * email a reset link. No-op otherwise. Callers must return an identical
     * response regardless, so the presence of an account is never revealed.
     */
    @Transactional
    public void requestReset(String email) {
        String normalized = normalizeEmail(email);
        if (normalized.isBlank()) {
            return;
        }
        Owner owner = ownerRepository.findByEmail(normalized).orElse(null);
        if (owner == null) {
            // Unknown email: do nothing (the caller still returns the neutral message).
            return;
        }
        // Only the most recent link should work.
        tokenRepository.deleteByOwner(owner);

        byte[] raw = new byte[32];
        random.nextBytes(raw);
        String token = Base64.getUrlEncoder().withoutPadding().encodeToString(raw);

        PasswordResetToken entity = new PasswordResetToken();
        entity.setOwner(owner);
        entity.setTokenHash(sha256(token));
        entity.setExpiresAt(Instant.now().plus(tokenTtl));
        tokenRepository.save(entity);

        String link = publicOrigin + "/#reset=" + token;
        // Render the email here (request thread — the locale is active), then deliver it
        // AFTER this transaction commits and off the request thread, so the response
        // never blocks on SMTP, never holds a DB connection during send, and its timing
        // no longer reveals whether an account exists.
        String subject = Copy.t("Reset your PetPattern password");
        String body = Copy.t("A password reset was requested for your PetPattern account.\n\n"
                + "Open this link to choose a new password (valid for 1 hour):\n{0}\n\n"
                + "If you don't recognise this request, you can ignore this email — "
                + "your password stays the same.", link);
        String to = owner.getEmail();
        if (TransactionSynchronizationManager.isSynchronizationActive()) {
            TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                @Override
                public void afterCommit() {
                    mailer.deliver(to, subject, body, link);
                }
            });
        } else {
            mailer.deliver(to, subject, body, link);
        }
    }

    /**
     * Redeem a token and set a new password. Fails with a single neutral message
     * whether the token is unknown, expired, or already used — so nothing is
     * revealed about which. On success, all sessions are revoked.
     */
    @Transactional
    public void resetPassword(String token, String newPassword) {
        if (newPassword == null || newPassword.length() < MIN_PASSWORD) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    Copy.t("Password must be at least 8 characters"));
        }
        PasswordResetToken entity = (token == null || token.isBlank())
                ? null : tokenRepository.findByTokenHash(sha256(token)).orElse(null);
        if (entity == null || entity.getUsedAt() != null
                || entity.getExpiresAt().isBefore(Instant.now())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    Copy.t("This reset link is invalid or has expired. Request a new one."));
        }

        Owner owner = entity.getOwner();
        owner.setPasswordHash(encoder.encode(newPassword));
        ownerRepository.save(owner);

        // One-time use: mark redeemed (blocks reuse) and drop any siblings.
        entity.setUsedAt(Instant.now());
        tokenRepository.save(entity);
        tokenRepository.deleteByOwner(owner);

        // Sign the account out everywhere — a stale password can't keep a session.
        sessionRepository.deleteByOwner(owner);
        log.info("Password reset completed for an account; sessions revoked.");
    }

    /** Hourly cleanup so expired token rows don't accumulate. */
    @Scheduled(fixedRate = 3_600_000L)
    @Transactional
    public void purgeExpiredTokens() {
        tokenRepository.deleteByExpiresAtBefore(Instant.now());
    }

    private String normalizeEmail(String email) {
        return email == null ? "" : email.trim().toLowerCase(Locale.ROOT);
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
