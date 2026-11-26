package com.trakio.core.workout;

import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.OneToMany;
import jakarta.persistence.OrderBy;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

/** A finished workout. Volume and set count are computed here, not taken from the app. */
@Entity
@Table(name = "workout_sessions")
public class WorkoutSession {

    @Id
    private UUID id = UUID.randomUUID();

    @Column(nullable = false)
    private UUID userId;

    @Column(nullable = false, length = 64)
    private String clientRef;

    private UUID planId;

    private UUID planDayId;

    @Column(nullable = false, length = 120)
    private String title;

    @Column(nullable = false, length = 80)
    private String focus;

    @Column(nullable = false)
    private Instant startedAt;

    @Column(nullable = false)
    private Instant finishedAt;

    @Column(nullable = false)
    private double volumeKg;

    @Column(nullable = false)
    private int setCount;

    @Enumerated(EnumType.STRING)
    @Column(length = 8)
    private Feeling feeling;

    @Column(nullable = false)
    private Instant createdAt;

    @OneToMany(mappedBy = "session", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("position")
    private List<SessionExercise> exercises = new ArrayList<>();

    protected WorkoutSession() {}

    public WorkoutSession(UUID userId, String clientRef, UUID planId, UUID planDayId, String title, String focus,
            Instant startedAt, Instant finishedAt, Feeling feeling, List<SessionExercise> exercises, Instant now) {
        this.userId = userId;
        this.clientRef = clientRef;
        this.planId = planId;
        this.planDayId = planDayId;
        this.title = title;
        this.focus = focus == null ? "" : focus;
        this.startedAt = startedAt;
        this.finishedAt = finishedAt;
        this.feeling = feeling;
        this.createdAt = now;
        for (SessionExercise e : exercises) {
            e.attachTo(this);
            this.exercises.add(e);
            for (SessionSet s : e.getSets()) {
                this.volumeKg += s.getKg() * s.getReps();
                this.setCount++;
            }
        }
    }

    public UUID getId() {
        return id;
    }

    public UUID getUserId() {
        return userId;
    }

    public String getClientRef() {
        return clientRef;
    }

    public UUID getPlanId() {
        return planId;
    }

    public UUID getPlanDayId() {
        return planDayId;
    }

    public String getTitle() {
        return title;
    }

    public String getFocus() {
        return focus;
    }

    public Instant getStartedAt() {
        return startedAt;
    }

    public Instant getFinishedAt() {
        return finishedAt;
    }

    public double getVolumeKg() {
        return volumeKg;
    }

    public int getSetCount() {
        return setCount;
    }

    public Feeling getFeeling() {
        return feeling;
    }

    public List<SessionExercise> getExercises() {
        return exercises;
    }

    public long minutes() {
        return Math.max(1, java.time.Duration.between(startedAt, finishedAt).toMinutes());
    }
}
