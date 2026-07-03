package com.petpattern.domain;

import jakarta.persistence.*;

import java.time.Instant;
import java.util.UUID;

/**
 * A one-time, expiring password-reset token. As with {@link AuthSession}, the
 * emailed token is random and high-entropy; only its SHA-256 hash is stored, so
 * a database leak never exposes a usable reset link. {@code usedAt} enforces
 * one-time use; {@code expiresAt} enforces the short lifetime.
 */
@Entity
@Table(name = "password_reset_tokens",
        uniqueConstraints = @UniqueConstraint(name = "uk_reset_token", columnNames = "token_hash"))
public class PasswordResetToken {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.EAGER, optional = false)
    @JoinColumn(name = "owner_id", nullable = false)
    private Owner owner;

    @Column(name = "token_hash", nullable = false, unique = true, length = 64)
    private String tokenHash;

    @Column(nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    @Column(name = "expires_at", nullable = false)
    private Instant expiresAt;

    // Null until the token is redeemed; set once, then the token can never be
    // used again (one-time use).
    @Column(name = "used_at")
    private Instant usedAt;

    public UUID getId() {
        return id;
    }

    public Owner getOwner() {
        return owner;
    }

    public void setOwner(Owner owner) {
        this.owner = owner;
    }

    public String getTokenHash() {
        return tokenHash;
    }

    public void setTokenHash(String tokenHash) {
        this.tokenHash = tokenHash;
    }

    public Instant getExpiresAt() {
        return expiresAt;
    }

    public void setExpiresAt(Instant expiresAt) {
        this.expiresAt = expiresAt;
    }

    public Instant getUsedAt() {
        return usedAt;
    }

    public void setUsedAt(Instant usedAt) {
        this.usedAt = usedAt;
    }
}
