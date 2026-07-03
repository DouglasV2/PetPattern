package com.petpattern.domain;

import com.petpattern.patterns.PatternType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;

import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

/**
 * The persisted memory of a possible pattern for one pet.
 *
 * <p>The deterministic engine recomputes candidates on every request; this row
 * is what survives between requests. It is keyed by the candidate's stable
 * {@code patternKey} and tracks how long the pattern has been seen, how many
 * distinct days it has recurred, and the owner's standing decision about it.
 */
@Entity
@Table(
        name = "pattern_observations",
        uniqueConstraints = @UniqueConstraint(
                name = "uk_pattern_observation_pet_key",
                columnNames = {"pet_id", "pattern_key"})
)
public class PatternObservation {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "pet_id", nullable = false)
    private Pet pet;

    @Column(name = "pattern_key", nullable = false)
    private String patternKey;

    // Stored as a plain string (not @Enumerated) so adding new PatternType
    // values never collides with a stale enum CHECK constraint under ddl-auto.
    @Column(nullable = false)
    private String type;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private PatternStatus status = PatternStatus.NEW;

    @Column(nullable = false)
    private LocalDate firstDetectedDate;

    @Column(nullable = false)
    private LocalDate lastDetectedDate;

    @Column(nullable = false)
    private int detectionCount = 1;

    private String lastConfidence;

    @Column(length = 240)
    private String lastTitle;

    @Column(length = 1200)
    private String lastSummary;

    private Instant statusUpdatedAt;

    @Column(nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    protected PatternObservation() {
    }

    public PatternObservation(Pet pet, String patternKey, PatternType type, LocalDate detectedDate) {
        this.pet = pet;
        this.patternKey = patternKey;
        this.type = type == null ? null : type.name();
        this.firstDetectedDate = detectedDate;
        this.lastDetectedDate = detectedDate;
        this.detectionCount = 1;
    }

    public UUID getId() {
        return id;
    }

    public Pet getPet() {
        return pet;
    }

    public String getPatternKey() {
        return patternKey;
    }

    /** Pattern type as its enum name; stored as a plain string for forward-compatibility. */
    public String getType() {
        return type;
    }

    public PatternStatus getStatus() {
        return status == null ? PatternStatus.NEW : status;
    }

    public void setStatus(PatternStatus status) {
        this.status = status == null ? PatternStatus.NEW : status;
        this.statusUpdatedAt = Instant.now();
    }

    public LocalDate getFirstDetectedDate() {
        return firstDetectedDate;
    }

    public LocalDate getLastDetectedDate() {
        return lastDetectedDate;
    }

    public void setLastDetectedDate(LocalDate lastDetectedDate) {
        this.lastDetectedDate = lastDetectedDate;
    }

    public int getDetectionCount() {
        return detectionCount;
    }

    public void setDetectionCount(int detectionCount) {
        this.detectionCount = detectionCount;
    }

    public String getLastConfidence() {
        return lastConfidence;
    }

    public void setLastConfidence(String lastConfidence) {
        this.lastConfidence = lastConfidence;
    }

    public String getLastTitle() {
        return lastTitle;
    }

    public void setLastTitle(String lastTitle) {
        this.lastTitle = lastTitle;
    }

    public String getLastSummary() {
        return lastSummary;
    }

    public void setLastSummary(String lastSummary) {
        this.lastSummary = lastSummary;
    }

    public Instant getStatusUpdatedAt() {
        return statusUpdatedAt;
    }

    /** Records a fresh detection, bumping the recurrence count once per calendar day. */
    public void recordDetection(LocalDate date, String confidence, String title, String summary) {
        if (date != null && lastDetectedDate != null && date.isAfter(lastDetectedDate)) {
            detectionCount++;
            lastDetectedDate = date;
        } else if (date != null && lastDetectedDate == null) {
            lastDetectedDate = date;
        }
        this.lastConfidence = confidence;
        this.lastTitle = title;
        this.lastSummary = summary;
    }
}
