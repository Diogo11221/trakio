package com.trakio.core.exercise;

import com.trakio.core.common.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Table;

@Entity
@Table(name = "exercises")
public class Exercise extends BaseEntity {

    /** Stable, readable id the apps use ("supino-plano"). */
    @Column(nullable = false, unique = true, length = 64)
    private String slug;

    @Column(nullable = false, length = 120)
    private String name;

    @Enumerated(EnumType.STRING)
    @Column(name = "muscle_group", nullable = false, length = 16)
    private MuscleGroup group;

    @Column(nullable = false, length = 200)
    private String muscles = "";

    @Column(nullable = false, length = 120)
    private String equipment = "";

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 16)
    private DemoStatus demoStatus = DemoStatus.TODO;

    protected Exercise() {}

    public Exercise(String slug, String name, MuscleGroup group, String muscles, String equipment) {
        this.slug = slug;
        this.name = name;
        this.group = group;
        this.muscles = muscles;
        this.equipment = equipment;
    }

    public String getSlug() {
        return slug;
    }

    public String getName() {
        return name;
    }

    public MuscleGroup getGroup() {
        return group;
    }

    public String getMuscles() {
        return muscles;
    }

    public String getEquipment() {
        return equipment;
    }

    public DemoStatus getDemoStatus() {
        return demoStatus;
    }

    public void setDemoStatus(DemoStatus demoStatus) {
        this.demoStatus = demoStatus;
    }
}
