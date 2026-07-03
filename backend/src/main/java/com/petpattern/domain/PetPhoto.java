package com.petpattern.domain;

import jakarta.persistence.*;

import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

/**
 * One photo attached to a pet on a given day. Bytes live in the database
 * (bytea) so they persist with the existing Postgres volume and need no
 * separate file store. Clients resize before upload, so rows stay small.
 */
@Entity
@Table(name = "pet_photos")
public class PetPhoto {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "pet_id", nullable = false)
    private Pet pet;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private PhotoArea area = PhotoArea.OTHER;

    @Column(name = "captured_date", nullable = false)
    private LocalDate capturedDate;

    @Column(name = "content_type", nullable = false, length = 64)
    private String contentType;

    @Column(name = "caption", length = 300)
    private String caption;

    @Column(name = "data", nullable = false)
    private byte[] data;

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

    public PhotoArea getArea() {
        return area == null ? PhotoArea.OTHER : area;
    }

    public void setArea(PhotoArea area) {
        this.area = area == null ? PhotoArea.OTHER : area;
    }

    public LocalDate getCapturedDate() {
        return capturedDate;
    }

    public void setCapturedDate(LocalDate capturedDate) {
        this.capturedDate = capturedDate;
    }

    public String getContentType() {
        return contentType;
    }

    public void setContentType(String contentType) {
        this.contentType = contentType;
    }

    public String getCaption() {
        return caption;
    }

    public void setCaption(String caption) {
        this.caption = caption;
    }

    public byte[] getData() {
        return data;
    }

    public void setData(byte[] data) {
        this.data = data;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }
}
