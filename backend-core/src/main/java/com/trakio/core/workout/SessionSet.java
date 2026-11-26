package com.trakio.core.workout;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;

@Embeddable
public class SessionSet {

    @Column(nullable = false)
    private double kg;

    @Column(nullable = false)
    private int reps;

    protected SessionSet() {}

    public SessionSet(double kg, int reps) {
        this.kg = kg;
        this.reps = reps;
    }

    public double getKg() {
        return kg;
    }

    public int getReps() {
        return reps;
    }
}
