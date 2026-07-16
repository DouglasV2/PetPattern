package com.petpattern.domain;

import jakarta.persistence.*;

import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

/**
 * One product-analytics event. Deliberately holds no identifying data: {@code ref} is a
 * one-way pseudonym (never the owner id), {@code type} is allow-listed, and {@code meta}
 * carries only small allow-listed categorical values — never a name, note, symptom, email,
 * or any health content.
 */
@Entity
@Table(name = "analytics_event", indexes = {
        @Index(name = "ix_analytics_event_type_day", columnList = "type, occurred_on"),
        @Index(name = "ix_analytics_event_ref_day", columnList = "ref, occurred_on")
})
public class AnalyticsEvent {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false, length = 64)
    private String ref;

    @Column(nullable = false, length = 40)
    private String type;

    @Column(name = "occurred_at", nullable = false)
    private Instant occurredAt;

    @Column(name = "occurred_on", nullable = false)
    private LocalDate occurredOn;

    @Column(nullable = false, length = 10)
    private String platform;

    @Column(name = "app_version", length = 20)
    private String appVersion;

    @Column(name = "schema_version", nullable = false)
    private int schemaVersion;

    @Column(length = 500)
    private String meta;

    public UUID getId() { return id; }
    public String getRef() { return ref; }
    public void setRef(String ref) { this.ref = ref; }
    public String getType() { return type; }
    public void setType(String type) { this.type = type; }
    public Instant getOccurredAt() { return occurredAt; }
    public void setOccurredAt(Instant occurredAt) { this.occurredAt = occurredAt; }
    public LocalDate getOccurredOn() { return occurredOn; }
    public void setOccurredOn(LocalDate occurredOn) { this.occurredOn = occurredOn; }
    public String getPlatform() { return platform; }
    public void setPlatform(String platform) { this.platform = platform; }
    public String getAppVersion() { return appVersion; }
    public void setAppVersion(String appVersion) { this.appVersion = appVersion; }
    public int getSchemaVersion() { return schemaVersion; }
    public void setSchemaVersion(int schemaVersion) { this.schemaVersion = schemaVersion; }
    public String getMeta() { return meta; }
    public void setMeta(String meta) { this.meta = meta; }
}
