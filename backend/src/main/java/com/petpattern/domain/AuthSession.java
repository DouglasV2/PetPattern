package com.petpattern.domain;

import jakarta.persistence.*;

import java.time.Instant;
import java.util.UUID;

/**
 * A logged-in session. The cookie holds a high-entropy random token; only the
 * SHA-256 hash of it is stored here, so a database leak never exposes live
 * sessions. Owner is eager so the auth filter can read it without an open
 * session (open-in-view is off).
 */
@Entity
@Table(name = "auth_sessions", uniqueConstraints = @UniqueConstraint(name = "uk_session_token", columnNames = "token_hash"))
public class AuthSession {

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
}
