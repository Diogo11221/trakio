package com.trakio.core.agenda;

import com.trakio.core.common.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;

/** A session in the PT's agenda, with one of their students or on their own (an assessment slot, say). */
@Entity
@Table(name = "appointments")
public class Appointment extends BaseEntity {

    @Column(nullable = false)
    private UUID trainerId;

    private UUID clientId;

    @Column(nullable = false)
    private Instant startsAt;

    @Column(nullable = false)
    private int durationMinutes;

    @Column(nullable = false, length = 120)
    private String title;

    @Column(nullable = false, length = 120)
    private String place = "";

    @Column(nullable = false)
    private boolean online;

    protected Appointment() {}

    public Appointment(UUID trainerId, UUID clientId, Instant startsAt, int durationMinutes, String title, String place,
            boolean online) {
        this.trainerId = trainerId;
        this.clientId = clientId;
        this.startsAt = startsAt;
        this.durationMinutes = durationMinutes;
        this.title = title;
        this.place = place == null ? "" : place;
        this.online = online;
    }

    public UUID getTrainerId() {
        return trainerId;
    }

    public UUID getClientId() {
        return clientId;
    }

    public Instant getStartsAt() {
        return startsAt;
    }

    public int getDurationMinutes() {
        return durationMinutes;
    }

    public String getTitle() {
        return title;
    }

    public String getPlace() {
        return place;
    }

    public boolean isOnline() {
        return online;
    }
}
