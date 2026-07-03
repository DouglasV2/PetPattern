package com.petpattern.domain;

import jakarta.persistence.*;

import java.time.Instant;
import java.util.UUID;

/**
 * A pending invitation for someone to help care for a pet. Stored by email so a
 * person can be invited before they even have an account — the invite waits, and
 * appears to them once they sign in with that email. Accepting turns it into a
 * {@link PetCaregiver}; nobody is added without their own consent.
 */
@Entity
@Table(name = "pet_invites",
        uniqueConstraints = @UniqueConstraint(name = "uk_pet_invite", columnNames = {"pet_id", "invited_email"}))
public class PetInvite {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    // Eager: the invitee's list shows the pet's name, read outside a transaction.
    @ManyToOne(fetch = FetchType.EAGER, optional = false)
    @JoinColumn(name = "pet_id", nullable = false)
    private Pet pet;

    @Column(name = "invited_email", nullable = false, length = 254)
    private String invitedEmail;

    // Eager: the invitee sees who invited them.
    @ManyToOne(fetch = FetchType.EAGER, optional = false)
    @JoinColumn(name = "invited_by", nullable = false)
    private Owner invitedBy;

    @Column(name = "created_at", nullable = false, updatable = false)
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

    public String getInvitedEmail() {
        return invitedEmail;
    }

    public void setInvitedEmail(String invitedEmail) {
        this.invitedEmail = invitedEmail;
    }

    public Owner getInvitedBy() {
        return invitedBy;
    }

    public void setInvitedBy(Owner invitedBy) {
        this.invitedBy = invitedBy;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public Instant getExpiresAt() {
        return expiresAt;
    }

    public void setExpiresAt(Instant expiresAt) {
        this.expiresAt = expiresAt;
    }
}
