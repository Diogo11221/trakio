package com.trakio.core.progress;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

/** One weigh-in per day: logging again the same day replaces it. */
@Entity
@Table(name = "weight_entries")
public class WeightEntry {

    @Id
    private UUID id = UUID.randomUUID();

    @Column(nullable = false)
    private UUID userId;

    @Column(nullable = false)
    private LocalDate measuredOn;

    @Column(nullable = false)
    private double kg;

    @Column(nullable = false)
    private Instant createdAt;

    protected WeightEntry() {}

    public WeightEntry(UUID userId, LocalDate measuredOn, double kg, Instant now) {
        this.userId = userId;
        this.measuredOn = measuredOn;
        this.kg = kg;
        this.createdAt = now;
    }

    public UUID getId() {
        return id;
    }

    public LocalDate getMeasuredOn() {
        return measuredOn;
    }

    public double getKg() {
        return kg;
    }

    public void setKg(double kg) {
        this.kg = kg;
    }
}
