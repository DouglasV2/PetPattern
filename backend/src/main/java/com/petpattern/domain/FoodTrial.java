package com.petpattern.domain;

import jakarta.persistence.*;

import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

/**
 * A guided "remove one ingredient and watch" experiment. The protein is stored
 * as a plain string (its {@link Protein} name) to avoid a brittle enum CHECK
 * constraint on the column — parse with {@code Protein.from(...)} when needed.
 */
@Entity
@Table(name = "food_trials")
public class FoodTrial {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "pet_id", nullable = false)
    private Pet pet;

    @Column(name = "protein", nullable = false, length = 40)
    private String protein;

    @Column(name = "start_date", nullable = false)
    private LocalDate startDate;

    @Column(name = "target_end_date", nullable = false)
    private LocalDate targetEndDate;

    @Column(name = "reintroduced_date")
    private LocalDate reintroducedDate;

    @Column(name = "completed_date")
    private LocalDate completedDate;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private TrialStatus status = TrialStatus.ACTIVE;

    @Column(length = 500)
    private String notes;

    @Column(nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    public UUID getId() {
        return id;
    }

    public Pet getPet() {
        return pet;
    }

    public void setPet(Pet pet) {
        this.pet = pet;
    }

    public String getProtein() {
        return protein;
    }

    public void setProtein(String protein) {
        this.protein = protein;
    }

    public LocalDate getStartDate() {
        return startDate;
    }

    public void setStartDate(LocalDate startDate) {
        this.startDate = startDate;
    }

    public LocalDate getTargetEndDate() {
        return targetEndDate;
    }

    public void setTargetEndDate(LocalDate targetEndDate) {
        this.targetEndDate = targetEndDate;
    }

    public LocalDate getReintroducedDate() {
        return reintroducedDate;
    }

    public void setReintroducedDate(LocalDate reintroducedDate) {
        this.reintroducedDate = reintroducedDate;
    }

    public LocalDate getCompletedDate() {
        return completedDate;
    }

    public void setCompletedDate(LocalDate completedDate) {
        this.completedDate = completedDate;
    }

    public TrialStatus getStatus() {
        return status == null ? TrialStatus.ACTIVE : status;
    }

    public void setStatus(TrialStatus status) {
        this.status = status == null ? TrialStatus.ACTIVE : status;
    }

    public String getNotes() {
        return notes;
    }

    public void setNotes(String notes) {
        this.notes = notes;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }
}
