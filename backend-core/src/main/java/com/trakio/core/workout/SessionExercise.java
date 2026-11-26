package com.trakio.core.workout;

import com.trakio.core.common.Formulas;
import com.trakio.core.exercise.Exercise;
import jakarta.persistence.CollectionTable;
import jakarta.persistence.Column;
import jakarta.persistence.ElementCollection;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OrderColumn;
import jakarta.persistence.Table;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "session_exercises")
public class SessionExercise {

    @Id
    private UUID id = UUID.randomUUID();

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "session_id")
    private WorkoutSession session;

    @Column(nullable = false)
    private int position;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "exercise_id")
    private Exercise exercise;

    /** Name at the time of the workout, so history reads the same if the library changes. */
    @Column(nullable = false, length = 120)
    private String name;

    /** Beat the previous best estimated max for this exercise. */
    @Column(nullable = false)
    private boolean record;

    @ElementCollection
    @CollectionTable(name = "session_sets", joinColumns = @JoinColumn(name = "session_exercise_id"))
    @OrderColumn(name = "position")
    private List<SessionSet> sets = new ArrayList<>();

    protected SessionExercise() {}

    public SessionExercise(int position, Exercise exercise, List<SessionSet> sets) {
        this.position = position;
        this.exercise = exercise;
        this.name = exercise.getName();
        this.sets.addAll(sets);
    }

    void attachTo(WorkoutSession session) {
        this.session = session;
    }

    /** Best estimated one-rep max in this exercise. */
    public double bestMax() {
        return sets.stream().mapToDouble(s -> Formulas.oneRepMax(s.getKg(), s.getReps())).max().orElse(0);
    }

    public WorkoutSession getSession() {
        return session;
    }

    public int getPosition() {
        return position;
    }

    public Exercise getExercise() {
        return exercise;
    }

    public String getName() {
        return name;
    }

    public boolean isRecord() {
        return record;
    }

    public void markRecord() {
        this.record = true;
    }

    public List<SessionSet> getSets() {
        return sets;
    }
}
