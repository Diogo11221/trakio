package com.trakio.core.plan;

import com.trakio.core.account.ClientProfile;
import com.trakio.core.account.ClientProfileRepository;
import com.trakio.core.auth.AuthUser;
import com.trakio.core.chat.ChatService;
import com.trakio.core.coaching.CoachingService;
import com.trakio.core.common.ApiException;
import com.trakio.core.exercise.Exercise;
import com.trakio.core.exercise.ExerciseRepository;
import com.trakio.core.plan.PlanDtos.DayInput;
import com.trakio.core.plan.PlanDtos.DayView;
import com.trakio.core.plan.PlanDtos.ExerciseInput;
import com.trakio.core.plan.PlanDtos.MyPlan;
import com.trakio.core.plan.PlanDtos.PlanExerciseView;
import com.trakio.core.plan.PlanDtos.PlanInput;
import com.trakio.core.plan.PlanDtos.PlanSummary;
import com.trakio.core.plan.PlanDtos.PlanView;
import com.trakio.core.workout.WorkoutSessionRepository;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class PlanService {

    private final WorkoutPlanRepository plans;
    private final ExerciseRepository exercises;
    private final ClientProfileRepository clients;
    private final WorkoutSessionRepository sessions;
    private final CoachingService coaching;
    private final ChatService chat;

    public PlanService(WorkoutPlanRepository plans, ExerciseRepository exercises, ClientProfileRepository clients,
            WorkoutSessionRepository sessions, CoachingService coaching, ChatService chat) {
        this.plans = plans;
        this.exercises = exercises;
        this.clients = clients;
        this.sessions = sessions;
        this.coaching = coaching;
        this.chat = chat;
    }

    // ── Reading ─────────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public List<PlanSummary> templates() {
        return plans.findTemplates().stream().map(p -> summary(p, 0)).toList();
    }

    /** Templates are public; a PT's plan is visible to the PT and to the students following it. */
    @Transactional(readOnly = true)
    public PlanView get(AuthUser caller, UUID planId) {
        WorkoutPlan plan = plans.findById(planId).orElseThrow(() -> ApiException.notFound("Este plano"));
        boolean visible = plan.isTemplate()
                || caller.id().equals(plan.getOwnerId())
                || caller.id().equals(plan.getClientId())
                || clients.findByUserId(caller.id()).map(c -> planId.equals(c.getPlanId())).orElse(false)
                || caller.isAdmin();
        if (!visible) {
            throw ApiException.notFound("Este plano");
        }
        return view(plan);
    }

    @Transactional(readOnly = true)
    public MyPlan myPlan(UUID clientId) {
        WorkoutPlan plan = planFor(clientId);
        // Next day: the one after the last workout done from this plan.
        UUID lastDay = sessions.findLastPlanDay(clientId, plan.getId(), PageRequest.of(0, 1)).stream().findFirst().orElse(null);
        List<PlanDay> days = plan.getDays();
        UUID next = days.isEmpty() ? null : days.getFirst().getId();
        for (int i = 0; i < days.size(); i++) {
            if (days.get(i).getId().equals(lastDay)) {
                next = days.get((i + 1) % days.size()).getId();
            }
        }
        return new MyPlan(view(plan), next);
    }

    WorkoutPlan planFor(UUID clientId) {
        UUID planId = clients.findByUserId(clientId).map(ClientProfile::getPlanId).orElse(null);
        if (planId != null) {
            var plan = plans.findById(planId);
            if (plan.isPresent()) {
                return plan.get();
            }
        }
        return plans.findTemplatesOldestFirst().stream().findFirst()
                .orElseThrow(() -> ApiException.notFound("Nenhum plano"));
    }

    /** A client training alone picks a Trakio template. With a PT, the PT decides. */
    @Transactional
    public MyPlan chooseTemplate(UUID clientId, UUID planId) {
        if (coaching.activeTrainerOf(clientId).isPresent()) {
            throw ApiException.conflict("has-trainer", "O teu plano é definido pelo teu PT.");
        }
        WorkoutPlan plan = plans.findById(planId).filter(WorkoutPlan::isTemplate)
                .orElseThrow(() -> ApiException.notFound("Este plano"));
        ClientProfile profile = clients.findByUserId(clientId)
                .orElseThrow(() -> ApiException.conflict("no-profile", "Cria o teu perfil primeiro."));
        profile.setPlanId(plan.getId());
        return myPlan(clientId);
    }

    // ── PT plans ────────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public List<PlanSummary> trainerPlans(UUID trainerId) {
        return plans.findByOwnerIdAndClientIdIsNullOrderByCreatedAtDesc(trainerId).stream()
                .map(p -> summary(p, clients.countByPlanId(p.getId())))
                .toList();
    }

    @Transactional
    public PlanView create(UUID trainerId, PlanInput input) {
        WorkoutPlan plan = new WorkoutPlan(trainerId, null, input.name().trim(), input.weeks(), input.workoutsPerWeek());
        plan.replaceDays(days(input.days()));
        return view(plans.save(plan));
    }

    @Transactional
    public PlanView copyTemplate(UUID trainerId, UUID templateId) {
        WorkoutPlan template = plans.findById(templateId).filter(WorkoutPlan::isTemplate)
                .orElseThrow(() -> ApiException.notFound("Este modelo"));
        WorkoutPlan plan = new WorkoutPlan(trainerId, null, template.getName(), template.getWeeks(),
                template.getWorkoutsPerWeek());
        plan.replaceDays(copyDays(template));
        return view(plans.save(plan));
    }

    @Transactional
    public PlanView update(UUID trainerId, UUID planId, PlanInput input) {
        WorkoutPlan plan = owned(trainerId, planId);
        plan.rename(input.name().trim(), input.weeks(), input.workoutsPerWeek());
        plan.replaceDays(days(input.days()));
        return view(plans.saveAndFlush(plan));
    }

    @Transactional
    public void delete(UUID trainerId, UUID planId) {
        plans.delete(owned(trainerId, planId));
    }

    private WorkoutPlan owned(UUID trainerId, UUID planId) {
        return plans.findById(planId).filter(p -> trainerId.equals(p.getOwnerId()) && p.getClientId() == null)
                .orElseThrow(() -> ApiException.notFound("Este plano"));
    }

    // ── A student's plan, edited by their PT ────────────────────────────────

    @Transactional(readOnly = true)
    public PlanView studentPlan(UUID trainerId, UUID clientId) {
        coaching.requireActiveStudent(trainerId, clientId);
        return view(planFor(clientId));
    }

    /** Points the student at one of the PT's shared plans. */
    @Transactional
    public PlanView assign(UUID trainerId, UUID clientId, UUID planId, String message) {
        coaching.requireActiveStudent(trainerId, clientId);
        WorkoutPlan plan = owned(trainerId, planId);
        clients.findByUserId(clientId).ifPresent(c -> c.setPlanId(plan.getId()));
        notifyStudent(trainerId, clientId, message);
        return view(plan);
    }

    /** "Guardar e enviar": the student's own copy, created on first edit. */
    @Transactional
    public PlanView saveStudentPlan(UUID trainerId, UUID clientId, PlanInput input, String message) {
        coaching.requireActiveStudent(trainerId, clientId);
        WorkoutPlan plan = plans.findByOwnerIdAndClientId(trainerId, clientId)
                .orElseGet(() -> new WorkoutPlan(trainerId, clientId, input.name().trim(), input.weeks(), input.workoutsPerWeek()));
        plan.rename(input.name().trim(), input.weeks(), input.workoutsPerWeek());
        plan.replaceDays(days(input.days()));
        WorkoutPlan saved = plans.saveAndFlush(plan);
        clients.findByUserId(clientId).ifPresent(c -> c.setPlanId(saved.getId()));
        notifyStudent(trainerId, clientId, message);
        return view(saved);
    }

    private void notifyStudent(UUID trainerId, UUID clientId, String message) {
        if (message != null && !message.isBlank()) {
            chat.postFromTrainer(trainerId, clientId, message.trim());
        }
    }

    // ── Mapping ─────────────────────────────────────────────────────────────

    private List<PlanDay> days(List<DayInput> input) {
        var slugs = input.stream().flatMap(d -> d.exercises().stream()).map(ExerciseInput::exercise).collect(Collectors.toSet());
        Map<String, Exercise> bySlug = exercises.findBySlugIn(slugs).stream()
                .collect(Collectors.toMap(Exercise::getSlug, Function.identity()));
        List<PlanDay> days = new ArrayList<>();
        for (int d = 0; d < input.size(); d++) {
            DayInput in = input.get(d);
            PlanDay day = new PlanDay(d, in.label().trim(), in.focus());
            for (int e = 0; e < in.exercises().size(); e++) {
                ExerciseInput ex = in.exercises().get(e);
                Exercise exercise = bySlug.get(ex.exercise());
                if (exercise == null) {
                    throw ApiException.badRequest("unknown-exercise", "Exercício desconhecido: " + ex.exercise());
                }
                if (ex.repsMax() < ex.repsMin()) {
                    throw ApiException.badRequest("invalid-reps", "O máximo de repetições não pode ser menor que o mínimo.");
                }
                day.addExercise(new PlanExercise(e, exercise, ex.sets(), ex.repsMin(), ex.repsMax(), ex.restSeconds(),
                        ex.referenceKg(), ex.note() == null ? "" : ex.note().trim()));
            }
            days.add(day);
        }
        return days;
    }

    private static List<PlanDay> copyDays(WorkoutPlan source) {
        List<PlanDay> days = new ArrayList<>();
        for (PlanDay d : source.getDays()) {
            PlanDay day = new PlanDay(d.getPosition(), d.getLabel(), d.getFocus());
            for (PlanExercise e : d.getExercises()) {
                day.addExercise(new PlanExercise(e.getPosition(), e.getExercise(), e.getSets(), e.getRepsMin(),
                        e.getRepsMax(), e.getRestSeconds(), e.getReferenceKg(), e.getNote()));
            }
            days.add(day);
        }
        return days;
    }

    private static PlanSummary summary(WorkoutPlan p, long students) {
        return new PlanSummary(p.getId(), p.getName(), p.getWeeks(), p.getWorkoutsPerWeek(), p.isTemplate(), students);
    }

    public static PlanView view(WorkoutPlan p) {
        return new PlanView(p.getId(), p.getName(), p.getWeeks(), p.getWorkoutsPerWeek(), p.isTemplate(),
                p.getDays().stream().map(d -> new DayView(d.getId(), d.getLabel(), d.getFocus(),
                        d.getExercises().stream().map(e -> new PlanExerciseView(e.getId(), e.getExercise().getSlug(),
                                e.getExercise().getName(), e.getExercise().getGroup(), e.getSets(), e.getRepsMin(),
                                e.getRepsMax(), e.getRestSeconds(), e.getReferenceKg(), e.getNote())).toList()))
                        .toList());
    }
}
