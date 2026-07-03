package com.petpattern.domain;

import jakarta.persistence.*;

import java.time.Instant;
import java.util.UUID;

/**
 * Grants a second (or third) person access to a pet that another owner created.
 * The pet keeps a single primary owner (Pet.owner, the creator, who manages the
 * care circle); each caregiver row adds one more person who can view and log for
 * that pet. One row per (pet, caregiver).
 */
@Entity
@Table(name = "pet_caregivers",
        uniqueConstraints = @UniqueConstraint(name = "uk_pet_caregiver", columnNames = {"pet_id", "caregiver_id"}))
public class PetCaregiver {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "pet_id", nullable = false)
    private Pet pet;

    // Eager: the caregiver list is always mapped to email/name for display, and
    // open-in-view is off, so a lazy proxy would blow up outside the transaction.
    @ManyToOne(fetch = FetchType.EAGER, optional = false)
    @JoinColumn(name = "caregiver_id", nullable = false)
    private Owner caregiver;

    @Column(name = "added_at", nullable = false, updatable = false)
    private Instant addedAt = Instant.now();

    public UUID getId() {
        return id;
    }

    public Pet getPet() {
        return pet;
    }

    public void setPet(Pet pet) {
        this.pet = pet;
    }

    public Owner getCaregiver() {
        return caregiver;
    }

    public void setCaregiver(Owner caregiver) {
        this.caregiver = caregiver;
    }

    public Instant getAddedAt() {
        return addedAt;
    }
}
