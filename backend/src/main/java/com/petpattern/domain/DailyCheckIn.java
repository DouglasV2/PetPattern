package com.petpattern.domain;

import jakarta.persistence.*;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

@Entity
@Table(
        name = "daily_check_ins",
        uniqueConstraints = @UniqueConstraint(name = "uk_pet_checkin_date", columnNames = {"pet_id", "check_in_date"})
)
public class DailyCheckIn {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "pet_id", nullable = false)
    private Pet pet;

    @NotNull
    @Column(name = "check_in_date", nullable = false)
    private LocalDate checkInDate;

    @Min(1)
    @Max(5)
    private Integer stoolScore;

    @Min(0)
    @Max(10)
    private Integer itchingScore;

    @Min(0)
    @Max(10)
    private Integer energyScore;

    @Min(0)
    @Max(10)
    private Integer appetiteScore;

    @Min(0)
    @Max(10)
    private Integer sleepQualityScore;

    @Min(0)
    private Integer waterIntakeMl;

    private boolean vomiting;
    private boolean diarrhea;
    private boolean earRedness;

    @Column(length = 1200)
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

    public LocalDate getCheckInDate() {
        return checkInDate;
    }

    public void setCheckInDate(LocalDate checkInDate) {
        this.checkInDate = checkInDate;
    }

    public Integer getStoolScore() {
        return stoolScore;
    }

    public void setStoolScore(Integer stoolScore) {
        this.stoolScore = stoolScore;
    }

    public Integer getItchingScore() {
        return itchingScore;
    }

    public void setItchingScore(Integer itchingScore) {
        this.itchingScore = itchingScore;
    }

    public Integer getEnergyScore() {
        return energyScore;
    }

    public void setEnergyScore(Integer energyScore) {
        this.energyScore = energyScore;
    }

    public Integer getAppetiteScore() {
        return appetiteScore;
    }

    public void setAppetiteScore(Integer appetiteScore) {
        this.appetiteScore = appetiteScore;
    }

    public Integer getSleepQualityScore() {
        return sleepQualityScore;
    }

    public void setSleepQualityScore(Integer sleepQualityScore) {
        this.sleepQualityScore = sleepQualityScore;
    }

    public Integer getWaterIntakeMl() {
        return waterIntakeMl;
    }

    public void setWaterIntakeMl(Integer waterIntakeMl) {
        this.waterIntakeMl = waterIntakeMl;
    }

    public boolean isVomiting() {
        return vomiting;
    }

    public void setVomiting(boolean vomiting) {
        this.vomiting = vomiting;
    }

    public boolean isDiarrhea() {
        return diarrhea;
    }

    public void setDiarrhea(boolean diarrhea) {
        this.diarrhea = diarrhea;
    }

    public boolean isEarRedness() {
        return earRedness;
    }

    public void setEarRedness(boolean earRedness) {
        this.earRedness = earRedness;
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
