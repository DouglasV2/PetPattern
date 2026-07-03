package com.petpattern.domain;

import jakarta.persistence.*;

import java.time.Instant;
import java.util.UUID;

/**
 * A read-only share link for a pet's vet summary. The link carries a high-entropy
 * token; only its SHA-256 hash is stored (like sessions), it expires, and it can
 * be revoked. It grants nothing but a read-only vet summary — no account access.
 */
@Entity
@Table(name = "vet_shares",
        uniqueConstraints = @UniqueConstraint(name = "uk_vet_share_token", columnNames = "token_hash"))
public class VetShare {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    // Eager so the public resolve path can read the pet without an open session.
    @ManyToOne(fetch = FetchType.EAGER, optional = false)
    @JoinColumn(name = "pet_id", nullable = false)
    private Pet pet;

    @Column(name = "token_hash", nullable = false, unique = true, length = 64)
    private String tokenHash;

    @Column(nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    @Column(name = "expires_at", nullable = false)
    private Instant expiresAt;

    public UUID getId() {
        return id;
    }

    public Pet getPet() {
        return pet;
    }

    public void setPet(Pet pet) {
        this.pet = pet;
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
