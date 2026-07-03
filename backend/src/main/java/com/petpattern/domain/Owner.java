package com.petpattern.domain;

import jakarta.persistence.*;

import java.time.Instant;
import java.util.UUID;

/**
 * A person who owns one or more pets. Introduced so each owner sees only their
 * own dogs — the foundation for a real (multi-user) beta.
 */
@Entity
@Table(name = "owners", uniqueConstraints = @UniqueConstraint(name = "uk_owner_email", columnNames = "email"))
public class Owner {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false, unique = true, length = 254)
    private String email;

    @Column(name = "password_hash", nullable = false)
    private String passwordHash;

    @Column(name = "display_name", length = 120)
    private String displayName;

    @Column(nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    // When the owner accepted the terms, privacy policy, and medical disclaimer
    // (stamped at registration; nullable for accounts created before this existed).
    @Column(name = "accepted_terms_at")
    private Instant acceptedTermsAt;

    @Column(name = "accepted_privacy_at")
    private Instant acceptedPrivacyAt;

    @Column(name = "accepted_medical_disclaimer_at")
    private Instant acceptedMedicalDisclaimerAt;

    public UUID getId() {
        return id;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public String getPasswordHash() {
        return passwordHash;
    }

    public void setPasswordHash(String passwordHash) {
        this.passwordHash = passwordHash;
    }

    public String getDisplayName() {
        return displayName;
    }

    public void setDisplayName(String displayName) {
        this.displayName = displayName;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public Instant getAcceptedTermsAt() {
        return acceptedTermsAt;
    }

    public void setAcceptedTermsAt(Instant acceptedTermsAt) {
        this.acceptedTermsAt = acceptedTermsAt;
    }

    public Instant getAcceptedPrivacyAt() {
        return acceptedPrivacyAt;
    }

    public void setAcceptedPrivacyAt(Instant acceptedPrivacyAt) {
        this.acceptedPrivacyAt = acceptedPrivacyAt;
    }

    public Instant getAcceptedMedicalDisclaimerAt() {
        return acceptedMedicalDisclaimerAt;
    }

    public void setAcceptedMedicalDisclaimerAt(Instant acceptedMedicalDisclaimerAt) {
        this.acceptedMedicalDisclaimerAt = acceptedMedicalDisclaimerAt;
    }
}
