package com.trakio.core.progress;

import com.trakio.core.account.ClientProfileRepository;
import com.trakio.core.common.ApiException;
import com.trakio.core.config.TrakioProperties;
import com.trakio.core.exercise.MuscleGroup;
import com.trakio.core.workout.SessionExercise;
import com.trakio.core.workout.WorkoutSession;
import com.trakio.core.workout.WorkoutSessionRepository;
import java.time.Clock;
import java.time.DayOfWeek;
import java.time.Instant;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.time.temporal.TemporalAdjusters;
import java.util.ArrayList;
import java.util.EnumMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ProgressService {

    public record WeightView(UUID id, LocalDate day, double kg) {}

    public record Point(Instant at, double kg) {}

    /** Estimated max for one exercise over time, its change and whether it has stalled. */
    public record ExerciseProgress(String exercise, String name, MuscleGroup group, double currentMax, double changePercent,
            boolean stalled, List<Point> series) {}

    public record WeekSummary(int workouts, double volumeKg, Map<MuscleGroup, Integer> setsByGroup) {}

    public record Summary(int weeks, WeekSummary thisWeek, List<ExerciseProgress> exercises) {}

    private final WeightEntryRepository weights;
    private final WorkoutSessionRepository sessions;
    private final ClientProfileRepository clients;
    private final TrakioProperties properties;
    private final Clock clock;

    public ProgressService(WeightEntryRepository weights, WorkoutSessionRepository sessions, ClientProfileRepository clients,
            TrakioProperties properties, Clock clock) {
        this.weights = weights;
        this.sessions = sessions;
        this.clients = clients;
        this.properties = properties;
        this.clock = clock;
    }

    private LocalDate today() {
        return LocalDate.now(clock.withZone(properties.zone()));
    }

    // ── Weight ──────────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public List<WeightView> weights(UUID userId) {
        return weights.findByUserIdAndMeasuredOnGreaterThanEqualOrderByMeasuredOn(userId, today().minusYears(1)).stream()
                .map(w -> new WeightView(w.getId(), w.getMeasuredOn(), w.getKg())).toList();
    }

    /** Logs a weigh-in (replacing one from the same day) and keeps the profile weight current. */
    @Transactional
    public WeightView logWeight(UUID userId, double kg, LocalDate day) {
        LocalDate on = day == null ? today() : day;
        if (on.isAfter(today().plusDays(1)) || on.isBefore(today().minusYears(1))) {
            throw ApiException.badRequest("invalid-day", "Escolhe um dia do último ano.");
        }
        WeightEntry entry = weights.findByUserIdAndMeasuredOn(userId, on)
                .orElseGet(() -> new WeightEntry(userId, on, kg, clock.instant()));
        entry.setKg(kg);
        weights.save(entry);
        boolean latest = weights.findFirstByUserIdOrderByMeasuredOnDesc(userId)
                .map(w -> !w.getMeasuredOn().isAfter(on)).orElse(true);
        if (latest) {
            clients.findByUserId(userId).ifPresent(p -> p.setWeightKg(kg));
        }
        return new WeightView(entry.getId(), entry.getMeasuredOn(), entry.getKg());
    }

    @Transactional
    public void deleteWeight(UUID userId, UUID id) {
        weights.delete(weights.findByIdAndUserId(id, userId).orElseThrow(() -> ApiException.notFound("Esta pesagem")));
    }

    // ── Training progress ───────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public Summary summary(UUID userId, int weeks) {
        int span = Math.clamp(weeks, 1, 52);
        Instant now = clock.instant();
        Instant since = now.minus(span * 7L, ChronoUnit.DAYS);
        List<WorkoutSession> recent = sessions.findByUserIdAndFinishedAtAfterOrderByFinishedAtDesc(userId, since);

        Instant weekStart = today().with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY))
                .atStartOfDay(properties.zone()).toInstant();
        int workouts = 0;
        double volume = 0;
        Map<MuscleGroup, Integer> setsByGroup = new EnumMap<>(MuscleGroup.class);
        for (WorkoutSession s : recent) {
            if (s.getFinishedAt().isBefore(weekStart)) {
                continue;
            }
            workouts++;
            volume += s.getVolumeKg();
            for (SessionExercise e : s.getExercises()) {
                setsByGroup.merge(e.getExercise().getGroup(), e.getSets().size(), Integer::sum);
            }
        }

        // Oldest first, one point per session: that session's best estimated max.
        Map<String, List<Point>> series = new LinkedHashMap<>();
        Map<String, SessionExercise> sample = new LinkedHashMap<>();
        for (WorkoutSession s : recent.reversed()) {
            for (SessionExercise e : s.getExercises()) {
                String slug = e.getExercise().getSlug();
                series.computeIfAbsent(slug, k -> new ArrayList<>()).add(new Point(s.getFinishedAt(), round(e.bestMax())));
                sample.putIfAbsent(slug, e);
            }
        }
        Instant stallWindow = now.minus(21, ChronoUnit.DAYS);
        List<ExerciseProgress> exercises = new ArrayList<>();
        series.forEach((slug, points) -> {
            double first = points.getFirst().kg();
            double current = points.getLast().kg();
            double change = first > 0 ? round((current - first) / first * 100) : 0;
            List<Point> lastWeeks = points.stream().filter(p -> !p.at().isBefore(stallWindow)).toList();
            double before = points.stream().filter(p -> p.at().isBefore(stallWindow)).mapToDouble(Point::kg).max().orElse(0);
            double lately = lastWeeks.stream().mapToDouble(Point::kg).max().orElse(0);
            // Stalled: trained it at least 3 times in 3 weeks without beating what came before.
            boolean stalled = lastWeeks.size() >= 3 && before > 0 && lately <= before + 0.01;
            SessionExercise e = sample.get(slug);
            exercises.add(new ExerciseProgress(slug, e.getName(), e.getExercise().getGroup(), current, change, stalled, points));
        });
        return new Summary(span, new WeekSummary(workouts, round(volume), setsByGroup), exercises);
    }

    private static double round(double value) {
        return Math.round(value * 10) / 10.0;
    }
}
