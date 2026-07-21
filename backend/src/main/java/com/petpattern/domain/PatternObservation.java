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
import java.time.temporal.ChronoUnit;
import java.util.UUID;

/**
 * The persisted memory of a possible pattern for one pet.
 *
 * <p>The deterministic engine recomputes candidates on every request; this row
 * is what survives between requests. It is keyed by the candidate's stable
 * {@code patternKey} and tracks the owner's standing decision about it, plus two
 * deliberately-distinct counts:
 *
 * <ul>
 *   <li>{@code detectionCount} — how many calendar days the engine re-surfaced
 *       the SAME evidence. It climbs while a single stretch stays visible, so it
 *       is <strong>not</strong> recurrence and must never be shown as such
 *       (spec Part 9). It is internal: persistence, sorting and lifecycle only.</li>
 *   <li>{@code episodeCount} — how many genuinely SEPARATE periods the pattern
 *       has appeared in: it only increments when the pattern had gone quiet for
 *       at least {@link #EPISODE_GAP_DAYS} days and then came back. This is the
 *       only count that may drive "seen before / repeated" language.</li>
 * </ul>
 */
@Entity
@Table(
        name = "pattern_observations",
        uniqueConstraints = @UniqueConstraint(
                name = "uk_pattern_observation_pet_key",
                columnNames = {"pet_id", "pattern_key"})
)
public class PatternObservation {

    /**
     * How many days a pattern must go undetected before a fresh detection counts
     * as a separate period rather than a continuation. Two weeks is deliberately
     * conservative — it under-counts rather than over-claims recurrence.
     *
     * <p>PROVISIONAL: this threshold shapes when the product says "seen in
     * separate periods"; it has not been validated against veterinary or
     * statistical review and should be revisited with real data.
     */
    public static final int EPISODE_GAP_DAYS = 14;

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

    // Genuinely separate periods (see EPISODE_GAP_DAYS). Starts at 1; the only
    // count that may back any "seen before / repeated" claim.
    @Column(nullable = false)
    private int episodeCount = 1;

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
        this.episodeCount = 1;
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

    /** Genuinely separate periods this pattern appeared in (>= 1). */
    public int getEpisodeCount() {
        return episodeCount;
    }

    public void setEpisodeCount(int episodeCount) {
        this.episodeCount = episodeCount;
    }

    /** True only when the pattern has appeared in at least two separate periods. */
    public boolean isSeenAcrossSeparatePeriods() {
        return episodeCount >= 2;
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

    /**
     * Records a fresh detection. {@code detectionCount} bumps once per new
     * calendar day (internal — it just tracks how long this stretch has been
     * visible). {@code episodeCount} bumps only when the pattern reappears after
     * going quiet for {@link #EPISODE_GAP_DAYS} or more — a genuinely separate
     * period, the only thing that may be described as "seen before".
     */
    public void recordDetection(LocalDate date, String confidence, String title, String summary) {
        if (date != null && lastDetectedDate != null && date.isAfter(lastDetectedDate)) {
            detectionCount++;
            if (ChronoUnit.DAYS.between(lastDetectedDate, date) >= EPISODE_GAP_DAYS) {
                episodeCount++;
            }
            lastDetectedDate = date;
        } else if (date != null && lastDetectedDate == null) {
            lastDetectedDate = date;
        }
        this.lastConfidence = confidence;
        this.lastTitle = title;
        this.lastSummary = summary;
    }
}
