package com.petpattern.ai;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.Instant;
import java.util.UUID;

/**
 * Lightweight audit record of an AI note-parse request. Useful for quality and
 * cost visibility later. It stores no medical conclusion — only the raw note,
 * which provider answered, and how confident the extraction was.
 *
 * <p>{@code petId} is a plain column (not a foreign key) so an attempt can be
 * recorded even before a pet is selected, and so audit rows never block a save.
 */
@Entity
@Table(name = "ai_parse_attempts")
public class AiParseAttempt {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "pet_id")
    private UUID petId;

    @Column(length = 2000)
    private String note;

    private String provider;

    private String confidence;

    @Column(nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    protected AiParseAttempt() {
    }

    public AiParseAttempt(UUID petId, String note, String provider, String confidence) {
        this.petId = petId;
        this.note = note;
        this.provider = provider;
        this.confidence = confidence;
    }

    public UUID getId() {
        return id;
    }

    public UUID getPetId() {
        return petId;
    }

    public String getNote() {
        return note;
    }

    public String getProvider() {
        return provider;
    }

    public String getConfidence() {
        return confidence;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }
}
