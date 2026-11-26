package com.trakio.core.plan;

import com.trakio.core.exercise.MuscleGroup;
import jakarta.validation.Valid;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.util.List;
import java.util.UUID;

public final class PlanDtos {

    private PlanDtos() {}

    public record PlanSummary(UUID id, String name, int weeks, int workoutsPerWeek, boolean template, long students) {}

    public record PlanView(UUID id, String name, int weeks, int workoutsPerWeek, boolean template, List<DayView> days) {}

    public record DayView(UUID id, String label, String focus, List<PlanExerciseView> exercises) {}

    public record PlanExerciseView(UUID id, String exercise, String name, MuscleGroup group, int sets, int repsMin,
            int repsMax, int restSeconds, Double referenceKg, String note) {}

    /** The client's plan with the workout that comes next (A → B → C → A, from the history). */
    public record MyPlan(PlanView plan, UUID nextDayId) {}

    public record PlanInput(
            @NotBlank @Size(max = 120) String name,
            @Min(1) @Max(52) int weeks,
            @Min(1) @Max(7) int workoutsPerWeek,
            @NotNull @Size(min = 1, max = 7) List<@Valid @NotNull DayInput> days) {}

    public record DayInput(
            @NotBlank @Size(max = 80) String label,
            @Size(max = 80) String focus,
            @NotNull @Size(min = 1, max = 20) List<@Valid @NotNull ExerciseInput> exercises) {}

    public record ExerciseInput(
            /** Exercise slug from the library ("supino-plano"). */
            @NotBlank @Size(max = 64) String exercise,
            @Min(1) @Max(20) int sets,
            @Min(1) @Max(100) int repsMin,
            @Min(1) @Max(100) int repsMax,
            @Min(0) @Max(900) int restSeconds,
            @DecimalMin("0") @DecimalMax("1000") Double referenceKg,
            @Size(max = 500) String note) {}

    public record ChoosePlanInput(@NotNull UUID planId) {}

    /** A PT editing one student's plan; the optional message is sent to the student's chat. */
    public record StudentPlanInput(@Valid @NotNull PlanInput plan, @Size(max = 2000) String message) {}
}
