package com.petpattern.domain;

import jakarta.persistence.*;
import jakarta.validation.constraints.Min;

import java.time.Instant;
import java.time.LocalDate;
import java.util.LinkedHashSet;
import java.util.Set;
import java.util.UUID;

@Entity
@Table(name = "food_logs")
public class FoodLog {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "pet_id", nullable = false)
    private Pet pet;

    @Column(name = "date_started", nullable = false)
    private LocalDate dateStarted;

    @Column(name = "date", nullable = false)
    private LocalDate legacyDate;

    @Enumerated(EnumType.STRING)
    private FoodKind foodKind = FoodKind.MAIN_FOOD;

    private String brand;
    private String productName;

    @Convert(converter = ProteinAttributeConverter.class)
    private Protein primaryProtein = Protein.UNKNOWN;

    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "food_log_secondary_proteins", joinColumns = @JoinColumn(name = "food_log_id"))
    @Enumerated(EnumType.STRING)
    @Column(name = "protein", nullable = false)
    private Set<Protein> secondaryProteins = new LinkedHashSet<>();

    private boolean grainFree;
    private boolean newFood;

    @Min(0)
    private Integer amountGrams;

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

    public LocalDate getDateStarted() {
        return dateStarted != null ? dateStarted : legacyDate;
    }

    public void setDateStarted(LocalDate dateStarted) {
        this.dateStarted = dateStarted;
        this.legacyDate = dateStarted;
    }

    public LocalDate getDate() {
        return getDateStarted();
    }

    public void setDate(LocalDate date) {
        setDateStarted(date);
    }

    public FoodKind getFoodKind() {
        return foodKind == null ? FoodKind.MAIN_FOOD : foodKind;
    }

    public void setFoodKind(FoodKind foodKind) {
        this.foodKind = foodKind == null ? FoodKind.MAIN_FOOD : foodKind;
    }

    public String getBrand() {
        return brand;
    }

    public void setBrand(String brand) {
        this.brand = brand;
    }

    public String getProductName() {
        return productName;
    }

    public void setProductName(String productName) {
        this.productName = productName;
    }

    public String getRecipeName() {
        return productName;
    }

    public void setRecipeName(String recipeName) {
        this.productName = recipeName;
    }

    public Protein getPrimaryProtein() {
        return primaryProtein == null ? Protein.UNKNOWN : primaryProtein;
    }

    public void setPrimaryProtein(Protein primaryProtein) {
        this.primaryProtein = primaryProtein == null ? Protein.UNKNOWN : primaryProtein;
    }

    public Set<Protein> getSecondaryProteins() {
        return secondaryProteins;
    }

    public void setSecondaryProteins(Set<Protein> secondaryProteins) {
        this.secondaryProteins.clear();
        if (secondaryProteins != null) {
            secondaryProteins.stream()
                    .filter(protein -> protein != null && protein != Protein.UNKNOWN)
                    .forEach(this.secondaryProteins::add);
        }
    }

    public boolean isGrainFree() {
        return grainFree;
    }

    public void setGrainFree(boolean grainFree) {
        this.grainFree = grainFree;
    }

    public boolean isNewFood() {
        return newFood;
    }

    public void setNewFood(boolean newFood) {
        this.newFood = newFood;
    }

    public Integer getAmountGrams() {
        return amountGrams;
    }

    public void setAmountGrams(Integer amountGrams) {
        this.amountGrams = amountGrams;
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