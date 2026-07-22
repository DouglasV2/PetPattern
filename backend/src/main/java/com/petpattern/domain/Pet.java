package com.petpattern.domain;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

@Entity
@Table(name = "pets")
public class Pet {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    // Nullable at the DB level so ddl-auto=update can add the column to existing
    // rows without a default; always set in code for new pets.
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "owner_id")
    private Owner owner;

    @NotBlank
    @Column(nullable = false)
    private String name;

    @NotNull
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Species species = Species.DOG;

    private String breed;
    private LocalDate birthDate;

    @Enumerated(EnumType.STRING)
    private Sex sex = Sex.UNKNOWN;

    @Column(precision = 6, scale = 2)
    private BigDecimal currentWeightKg;

    // Owner's standing questions to raise at the next vet visit (spec Part 4).
    // Free-text the owner edits over time; shown in the vet summary they share.
    @Column(name = "vet_questions", length = 2000)
    private String vetQuestions;

    @Column(nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    public UUID getId() {
        return id;
    }

    public Owner getOwner() {
        return owner;
    }

    public void setOwner(Owner owner) {
        this.owner = owner;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getVetQuestions() {
        return vetQuestions;
    }

    public void setVetQuestions(String vetQuestions) {
        this.vetQuestions = vetQuestions;
    }

    public Species getSpecies() {
        return species;
    }

    public void setSpecies(Species species) {
        this.species = species;
    }

    public String getBreed() {
        return breed;
    }

    public void setBreed(String breed) {
        this.breed = breed;
    }

    public LocalDate getBirthDate() {
        return birthDate;
    }

    public void setBirthDate(LocalDate birthDate) {
        this.birthDate = birthDate;
    }

    public Sex getSex() {
        return sex;
    }

    public void setSex(Sex sex) {
        this.sex = sex;
    }

    public BigDecimal getCurrentWeightKg() {
        return currentWeightKg;
    }

    public void setCurrentWeightKg(BigDecimal currentWeightKg) {
        this.currentWeightKg = currentWeightKg;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }
}
