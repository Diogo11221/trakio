package com.trakio.core.plan;

import com.trakio.core.exercise.Exercise;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.util.UUID;

@Entity
@Table(name = "plan_exercises")
public class PlanExercise {

    @Id
    private UUID id = UUID.randomUUID();

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "day_id")
    private PlanDay day;

    @Column(nullable = false)
    private int position;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "exercise_id")
    private Exercise exercise;

    @Column(nullable = false)
    private int sets;

    @Column(nullable = false)
    private int repsMin;

    @Column(nullable = false)
    private int repsMax;

    @Column(nullable = false)
    private int restSeconds;

    /** Starting load for an intermediate lifter, before there's any history. */
    private Double referenceKg;

    @Column(nullable = false, length = 500)
    private String note = "";

    protected PlanExercise() {}

    public PlanExercise(int position, Exercise exercise, int sets, int repsMin, int repsMax, int restSeconds,
            Double referenceKg, String note) {
        this.position = position;
        this.exercise = exercise;
        this.sets = sets;
        this.repsMin = repsMin;
        this.repsMax = repsMax;
        this.restSeconds = restSeconds;
        this.referenceKg = referenceKg;
        this.note = note == null ? "" : note;
    }

    void attachTo(PlanDay day) {
        this.day = day;
    }

    public UUID getId() {
        return id;
    }

    public PlanDay getDay() {
        return day;
    }

    public int getPosition() {
        return position;
    }

    public Exercise getExercise() {
        return exercise;
    }

    public int getSets() {
        return sets;
    }

    public int getRepsMin() {
        return repsMin;
    }

    public int getRepsMax() {
        return repsMax;
    }

    public int getRestSeconds() {
        return restSeconds;
    }

    public Double getReferenceKg() {
        return referenceKg;
    }

    public String getNote() {
        return note;
    }
}
