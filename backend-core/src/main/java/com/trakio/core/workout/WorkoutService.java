package com.trakio.core.workout;

import com.trakio.core.common.ApiException;
import com.trakio.core.common.PageResponse;
import com.trakio.core.common.Pages;
import com.trakio.core.exercise.Exercise;
import com.trakio.core.exercise.ExerciseRepository;
import com.trakio.core.plan.PlanDay;
import com.trakio.core.plan.WorkoutPlan;
import com.trakio.core.plan.WorkoutPlanRepository;
import com.trakio.core.account.ClientProfileRepository;
import com.trakio.core.workout.WorkoutDtos.ExerciseInput;
import com.trakio.core.workout.WorkoutDtos.FinishWorkoutInput;
import com.trakio.core.workout.WorkoutDtos.SessionView;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import tools.jackson.core.JacksonException;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

@Service
public class WorkoutService {

    static final int MAX_LIVE_STATE_CHARS = 64 * 1024;
    private static final Duration MAX_WORKOUT = Duration.ofHours(6);
    private static final Duration MAX_AGE = Duration.ofDays(30);
    private static final Duration CLOCK_SKEW = Duration.ofMinutes(10);

    private final WorkoutSessionRepository sessions;
    private final LiveWorkoutRepository live;
    private final ExerciseRepository exercises;
    private final WorkoutPlanRepository plans;
    private final ClientProfileRepository clients;
    private final ObjectMapper json;
    private final Clock clock;

    public WorkoutService(WorkoutSessionRepository sessions, LiveWorkoutRepository live, ExerciseRepository exercises,
            WorkoutPlanRepository plans, ClientProfileRepository clients, ObjectMapper json, Clock clock) {
        this.sessions = sessions;
        this.live = live;
        this.exercises = exercises;
        this.plans = plans;
        this.clients = clients;
        this.json = json;
        this.clock = clock;
    }

    @Transactional(readOnly = true)
    public PageResponse<SessionView> history(UUID userId, int page, int size) {
        return PageResponse.of(sessions.findByUserIdOrderByFinishedAtDesc(userId, Pages.of(page, size, Sort.unsorted())),
                SessionView::of);
    }

    @Transactional(readOnly = true)
    public SessionView get(UUID userId, UUID sessionId) {
        return sessions.findByIdAndUserId(sessionId, userId).map(SessionView::of)
                .orElseThrow(() -> ApiException.notFound("Este treino"));
    }

    public record Saved(SessionView session, boolean created) {}

    /**
     * Saves a finished workout. Volume, set count and records are worked out here from the sets,
     * so the history can't be inflated by editing a request. Idempotent on {@code clientRef}.
     */
    @Transactional
    public Saved finish(UUID userId, FinishWorkoutInput in) {
        Optional<WorkoutSession> existing = sessions.findByUserIdAndClientRef(userId, in.clientRef());
        if (existing.isPresent()) {
            return new Saved(SessionView.of(existing.get()), false);
        }
        Instant now = clock.instant();
        if (in.finishedAt().isBefore(in.startedAt()) || Duration.between(in.startedAt(), in.finishedAt()).compareTo(MAX_WORKOUT) > 0) {
            throw ApiException.badRequest("invalid-times", "As horas do treino não estão certas.");
        }
        if (in.finishedAt().isAfter(now.plus(CLOCK_SKEW)) || in.startedAt().isBefore(now.minus(MAX_AGE))) {
            throw ApiException.badRequest("invalid-times", "As horas do treino não estão certas.");
        }
        checkPlan(userId, in.planId(), in.planDayId());

        Map<String, Exercise> bySlug = exercises.findBySlugIn(in.exercises().stream().map(ExerciseInput::exercise).toList())
                .stream().collect(Collectors.toMap(Exercise::getSlug, Function.identity()));
        List<SessionExercise> done = new ArrayList<>();
        for (int i = 0; i < in.exercises().size(); i++) {
            ExerciseInput e = in.exercises().get(i);
            Exercise exercise = bySlug.get(e.exercise());
            if (exercise == null) {
                throw ApiException.badRequest("unknown-exercise", "Exercício desconhecido: " + e.exercise());
            }
            done.add(new SessionExercise(i, exercise, e.sets().stream().map(s -> new SessionSet(s.kg(), s.reps())).toList()));
        }

        // Records: best estimated max beats every earlier session (the first time doesn't count).
        Map<UUID, Double> best = new HashMap<>();
        for (SessionExercise previous : sessions.findHistoryOf(userId, done.stream().map(e -> e.getExercise().getId()).toList())) {
            best.merge(previous.getExercise().getId(), previous.bestMax(), Math::max);
        }
        for (SessionExercise e : done) {
            Double before = best.get(e.getExercise().getId());
            if (before != null && before > 0 && e.bestMax() > before + 0.01) {
                e.markRecord();
            }
        }

        WorkoutSession session = new WorkoutSession(userId, in.clientRef(), in.planId(), in.planDayId(), in.title().trim(),
                in.focus(), in.startedAt(), in.finishedAt(), in.feeling(), done, now);
        sessions.save(session);
        live.findById(userId).ifPresent(live::delete);
        return new Saved(SessionView.of(session), true);
    }

    /** The plan must be one the person can follow (a template or their own); the day must belong to it. */
    private void checkPlan(UUID userId, UUID planId, UUID planDayId) {
        if (planId == null) {
            if (planDayId != null) {
                throw ApiException.badRequest("invalid-plan", "Plano inválido.");
            }
            return;
        }
        WorkoutPlan plan = plans.findById(planId).orElseThrow(() -> ApiException.badRequest("invalid-plan", "Plano inválido."));
        boolean mine = plan.isTemplate() || userId.equals(plan.getClientId())
                || clients.findByUserId(userId).map(c -> planId.equals(c.getPlanId())).orElse(false);
        boolean dayOk = planDayId == null || plan.getDays().stream().map(PlanDay::getId).anyMatch(planDayId::equals);
        if (!mine || !dayOk) {
            throw ApiException.badRequest("invalid-plan", "Plano inválido.");
        }
    }

    // ── Workout in progress ────────────────────────────────────────────────

    public record LiveView(JsonNode state, Instant updatedAt) {}

    @Transactional(readOnly = true)
    public Optional<LiveView> live(UUID userId) {
        return live.findById(userId).map(l -> new LiveView(json.readTree(l.getState()), l.getUpdatedAt()));
    }

    @Transactional
    public LiveView saveLive(UUID userId, JsonNode state) {
        if (state == null || !state.isObject()) {
            throw ApiException.badRequest("invalid-state", "Estado do treino inválido.");
        }
        String raw;
        try {
            raw = json.writeValueAsString(state);
        } catch (JacksonException e) {
            throw ApiException.badRequest("invalid-state", "Estado do treino inválido.");
        }
        if (raw.length() > MAX_LIVE_STATE_CHARS) {
            throw ApiException.badRequest("state-too-large", "O treino guardado é demasiado grande.");
        }
        LiveWorkout entity = live.findById(userId).orElseGet(() -> new LiveWorkout(userId));
        entity.update(raw, clock.instant());
        live.save(entity);
        return new LiveView(state, entity.getUpdatedAt());
    }

    @Transactional
    public void clearLive(UUID userId) {
        live.findById(userId).ifPresent(live::delete);
    }
}
