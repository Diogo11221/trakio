package com.trakio.core.workout;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;

/** A workout left half-way ("Sair e continuar depois"), kept as the app's own JSON. */
@Entity
@Table(name = "live_workouts")
public class LiveWorkout {

    @Id
    private UUID userId;

    @Column(nullable = false, columnDefinition = "text")
    private String state;

    @Column(nullable = false)
    private Instant updatedAt;

    protected LiveWorkout() {}

    public LiveWorkout(UUID userId) {
        this.userId = userId;
    }

    public String getState() {
        return state;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }

    public void update(String state, Instant now) {
        this.state = state;
        this.updatedAt = now;
    }
}
