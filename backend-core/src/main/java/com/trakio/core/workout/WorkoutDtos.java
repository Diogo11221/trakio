package com.trakio.core.workout;

import jakarta.validation.Valid;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

public final class WorkoutDtos {

    private WorkoutDtos() {}

    public record SetView(double kg, int reps) {}

    public record SessionExerciseView(String exercise, String name, boolean record, List<SetView> sets) {}

    public record SessionView(UUID id, String clientRef, UUID planId, UUID planDayId, String title, String focus,
            Instant startedAt, Instant finishedAt, double volumeKg, int sets, Feeling feeling, List<String> records,
            List<SessionExerciseView> exercises) {

        public static SessionView of(WorkoutSession s) {
            return new SessionView(s.getId(), s.getClientRef(), s.getPlanId(), s.getPlanDayId(), s.getTitle(), s.getFocus(),
                    s.getStartedAt(), s.getFinishedAt(), s.getVolumeKg(), s.getSetCount(), s.getFeeling(),
                    s.getExercises().stream().filter(SessionExercise::isRecord).map(SessionExercise::getName).toList(),
                    s.getExercises().stream().map(e -> new SessionExerciseView(e.getExercise().getSlug(), e.getName(),
                            e.isRecord(), e.getSets().stream().map(x -> new SetView(x.getKg(), x.getReps())).toList()))
                            .toList());
        }
    }

    public record SetInput(@DecimalMin("0") @DecimalMax("1000") double kg, @Min(1) @Max(100) int reps) {}

    public record ExerciseInput(
            @NotBlank @Size(max = 64) String exercise,
            @NotNull @Size(min = 1, max = 20) List<@Valid @NotNull SetInput> sets) {}

    /** A finished workout from the phone. Only the sets actually done. */
    public record FinishWorkoutInput(
            /** Made up by the phone; sending the same one twice saves the workout once. */
            @NotBlank @Size(max = 64) @Pattern(regexp = "[A-Za-z0-9._:-]+") String clientRef,
            UUID planId,
            UUID planDayId,
            @NotBlank @Size(max = 120) String title,
            @Size(max = 80) String focus,
            @NotNull Instant startedAt,
            @NotNull Instant finishedAt,
            Feeling feeling,
            @NotNull @Size(min = 1, max = 30) List<@Valid @NotNull ExerciseInput> exercises) {}
}
