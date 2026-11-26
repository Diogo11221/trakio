package com.trakio.core.exercise;

import java.util.UUID;

public record ExerciseView(UUID id, String slug, String name, MuscleGroup group, String muscles, String equipment,
        DemoStatus demoStatus) {

    public static ExerciseView of(Exercise e) {
        return new ExerciseView(e.getId(), e.getSlug(), e.getName(), e.getGroup(), e.getMuscles(), e.getEquipment(),
                e.getDemoStatus());
    }
}
