package com.trakio.core.plan;

import com.trakio.core.common.BaseEntity;
import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.OneToMany;
import jakarta.persistence.OrderBy;
import jakarta.persistence.Table;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

/**
 * A training plan. No owner = Trakio template. With an owner = a PT's plan; with a client too =
 * that student's own copy, edited by their PT.
 */
@Entity
@Table(name = "workout_plans")
public class WorkoutPlan extends BaseEntity {

    private UUID ownerId;

    private UUID clientId;

    @Column(nullable = false, length = 120)
    private String name;

    @Column(nullable = false)
    private int weeks;

    @Column(nullable = false)
    private int workoutsPerWeek;

    @OneToMany(mappedBy = "plan", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("position")
    private List<PlanDay> days = new ArrayList<>();

    protected WorkoutPlan() {}

    public WorkoutPlan(UUID ownerId, UUID clientId, String name, int weeks, int workoutsPerWeek) {
        this.ownerId = ownerId;
        this.clientId = clientId;
        this.name = name;
        this.weeks = weeks;
        this.workoutsPerWeek = workoutsPerWeek;
    }

    public boolean isTemplate() {
        return ownerId == null;
    }

    public UUID getOwnerId() {
        return ownerId;
    }

    public UUID getClientId() {
        return clientId;
    }

    public String getName() {
        return name;
    }

    public int getWeeks() {
        return weeks;
    }

    public int getWorkoutsPerWeek() {
        return workoutsPerWeek;
    }

    public List<PlanDay> getDays() {
        return days;
    }

    public void rename(String name, int weeks, int workoutsPerWeek) {
        this.name = name;
        this.weeks = weeks;
        this.workoutsPerWeek = workoutsPerWeek;
    }

    public void replaceDays(List<PlanDay> newDays) {
        days.clear();
        for (PlanDay day : newDays) {
            day.attachTo(this);
            days.add(day);
        }
    }
}
