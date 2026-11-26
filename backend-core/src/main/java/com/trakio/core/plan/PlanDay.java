package com.trakio.core.plan;

import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToMany;
import jakarta.persistence.OrderBy;
import jakarta.persistence.Table;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "plan_days")
public class PlanDay {

    @Id
    private UUID id = UUID.randomUUID();

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "plan_id")
    private WorkoutPlan plan;

    @Column(nullable = false)
    private int position;

    @Column(nullable = false, length = 80)
    private String label;

    @Column(nullable = false, length = 80)
    private String focus = "";

    @OneToMany(mappedBy = "day", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("position")
    private List<PlanExercise> exercises = new ArrayList<>();

    protected PlanDay() {}

    public PlanDay(int position, String label, String focus) {
        this.position = position;
        this.label = label;
        this.focus = focus == null ? "" : focus;
    }

    void attachTo(WorkoutPlan plan) {
        this.plan = plan;
    }

    public void addExercise(PlanExercise exercise) {
        exercise.attachTo(this);
        exercises.add(exercise);
    }

    public UUID getId() {
        return id;
    }

    public WorkoutPlan getPlan() {
        return plan;
    }

    public int getPosition() {
        return position;
    }

    public String getLabel() {
        return label;
    }

    public String getFocus() {
        return focus;
    }

    public List<PlanExercise> getExercises() {
        return exercises;
    }
}
