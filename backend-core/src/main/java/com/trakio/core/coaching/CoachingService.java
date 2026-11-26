package com.trakio.core.coaching;

import com.trakio.core.account.ClientProfile;
import com.trakio.core.account.ClientProfileRepository;
import com.trakio.core.auth.UserRepository;
import com.trakio.core.billing.BillingDtos.CheckoutView;
import com.trakio.core.billing.BillingService;
import com.trakio.core.billing.PaymentEvents;
import com.trakio.core.chat.ChatService;
import com.trakio.core.coaching.CoachingDtos.Attention;
import com.trakio.core.coaching.CoachingDtos.StudentDetail;
import com.trakio.core.coaching.CoachingDtos.StudentView;
import com.trakio.core.coaching.CoachingDtos.TopLift;
import com.trakio.core.common.ApiException;
import com.trakio.core.files.FileService;
import com.trakio.core.marketplace.MarketplaceService;
import com.trakio.core.marketplace.TrainerPackage;
import com.trakio.core.marketplace.TrainerPackageRepository;
import com.trakio.core.plan.WorkoutPlan;
import com.trakio.core.plan.WorkoutPlanRepository;
import com.trakio.core.progress.ProgressService;
import com.trakio.core.workout.WorkoutSessionRepository;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class CoachingService {

    private static final Logger log = LoggerFactory.getLogger(CoachingService.class);
    private static final int DEFAULT_WEEKS = 12;
    private static final double ATTENTION_ADHERENCE = 0.7;

    private final CoachingRelationshipRepository relationships;
    private final TrainerPackageRepository packages;
    private final ClientProfileRepository clients;
    private final UserRepository users;
    private final WorkoutPlanRepository plans;
    private final WorkoutSessionRepository sessions;
    private final ProgressService progress;
    private final MarketplaceService marketplace;
    private final BillingService billing;
    private final ChatService chat;
    private final Clock clock;

    public CoachingService(CoachingRelationshipRepository relationships, TrainerPackageRepository packages,
            ClientProfileRepository clients, UserRepository users, WorkoutPlanRepository plans,
            WorkoutSessionRepository sessions, ProgressService progress, MarketplaceService marketplace,
            BillingService billing, ChatService chat, Clock clock) {
        this.relationships = relationships;
        this.packages = packages;
        this.clients = clients;
        this.users = users;
        this.plans = plans;
        this.sessions = sessions;
        this.progress = progress;
        this.marketplace = marketplace;
        this.billing = billing;
        this.chat = chat;
        this.clock = clock;
    }

    public Optional<UUID> activeTrainerOf(UUID clientId) {
        return relationships.findActiveForClient(clientId).map(CoachingRelationship::getTrainerId);
    }

    /** Object-level check: a PT only reaches students who are paying them right now. */
    public CoachingRelationship requireActiveStudent(UUID trainerId, UUID clientId) {
        return relationships.findByTrainerIdAndClientIdAndStatus(trainerId, clientId, RelationshipStatus.ACTIVE)
                // Same answer as a missing student: don't reveal who trains elsewhere.
                .orElseThrow(() -> ApiException.notFound("Este aluno"));
    }

    // ── Hiring ──────────────────────────────────────────────────────────────

    @Transactional
    public CheckoutView hire(UUID clientId, UUID trainerId, UUID packageId) {
        clients.findByUserId(clientId).orElseThrow(() -> ApiException.conflict("no-profile", "Cria o teu perfil primeiro."));
        Optional<CoachingRelationship> open = relationships.findOpenForClient(clientId);
        if (open.isPresent()) {
            CoachingRelationship current = open.get();
            if (current.getStatus() == RelationshipStatus.ACTIVE) {
                throw ApiException.conflict("has-trainer", "Já tens um PT. Termina esse acompanhamento antes de contratar outro.");
            }
            // An abandoned checkout: replace it.
            current.end(clock.instant());
            billing.cancelPendingFor(current.getId());
            relationships.flush();
        }
        if (!marketplace.isListed(trainerId)) {
            throw ApiException.notFound("Este PT");
        }
        TrainerPackage pack = packages.findByIdAndTrainerId(packageId, trainerId).filter(TrainerPackage::isActive)
                .orElseThrow(() -> ApiException.notFound("Este pacote"));
        CoachingRelationship relationship = relationships.saveAndFlush(new CoachingRelationship(clientId, pack));
        String email = users.findById(clientId).map(u -> u.getEmail()).orElseThrow();
        return billing.startCoachingPayment(relationship, email);
    }

    /** Payment confirmed (instantly in dev, by Stripe webhook in production). */
    @EventListener
    @Transactional
    public void onPaid(PaymentEvents.CoachingPaid event) {
        relationships.findById(event.relationshipId()).ifPresent(rel -> {
            if (rel.getStatus() != RelationshipStatus.PENDING_PAYMENT) {
                return;
            }
            rel.activate(clock.instant());
            clients.findByUserId(rel.getClientId()).ifPresent(c -> c.setCoached(true));
            chat.ensureConversation(rel.getTrainerId(), rel.getClientId());
            log.info("Coaching active relationship={}", rel.getId());
        });
    }

    @EventListener
    @Transactional
    public void onRefunded(PaymentEvents.CoachingRefunded event) {
        relationships.findById(event.relationshipId()).ifPresent(rel -> rel.end(clock.instant()));
    }

    @EventListener
    @Transactional
    public void onCheckoutFailed(PaymentEvents.CoachingCheckoutFailed event) {
        relationships.findById(event.relationshipId())
                .filter(rel -> rel.getStatus() == RelationshipStatus.PENDING_PAYMENT)
                .ifPresent(rel -> rel.end(clock.instant()));
    }

    /** The student stops training with their PT. */
    @Transactional
    public void endAsClient(UUID clientId) {
        CoachingRelationship rel = relationships.findOpenForClient(clientId)
                .orElseThrow(() -> ApiException.notFound("Acompanhamento"));
        rel.end(clock.instant());
        billing.cancelPendingFor(rel.getId());
        clients.findByUserId(clientId).ifPresent(c -> {
            c.setCoached(false);
            c.setPlanId(null);
        });
    }

    @Transactional
    public void endAsTrainer(UUID trainerId, UUID clientId) {
        CoachingRelationship rel = requireActiveStudent(trainerId, clientId);
        rel.end(clock.instant());
        clients.findByUserId(clientId).ifPresent(c -> {
            c.setCoached(false);
            c.setPlanId(null);
        });
    }

    // ── The PT's students ───────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public List<StudentView> students(UUID trainerId) {
        List<CoachingRelationship> active = relationships.findByTrainerIdAndStatusOrderByStartedAtDesc(trainerId,
                RelationshipStatus.ACTIVE);
        Map<UUID, ClientProfile> profiles = clients.findByUserIdIn(active.stream().map(CoachingRelationship::getClientId).toList())
                .stream().collect(Collectors.toMap(ClientProfile::getUserId, Function.identity()));
        return active.stream()
                .filter(rel -> profiles.containsKey(rel.getClientId()))
                .map(rel -> view(rel, profiles.get(rel.getClientId())))
                // Who needs attention first, then the newest.
                .sorted(Comparator.comparing((StudentView s) -> !"attention".equals(s.tag())))
                .toList();
    }

    @Transactional(readOnly = true)
    public StudentDetail student(UUID trainerId, UUID clientId) {
        CoachingRelationship rel = requireActiveStudent(trainerId, clientId);
        ClientProfile profile = clients.findByUserId(clientId).orElseThrow(() -> ApiException.notFound("Este aluno"));
        StudentView view = view(rel, profile);
        Load load = load(rel, profile);
        var summary = progress.summary(clientId, 8);
        TopLift top = summary.exercises().stream().max(Comparator.comparingDouble(e -> e.currentMax()))
                .map(e -> new TopLift(e.exercise(), e.name(), e.currentMax(), e.changePercent())).orElse(null);
        return new StudentDetail(view, profile.age(), profile.getHeightCm(), profile.getWeightKg(), profile.getGoalWeightKg(),
                load.done(), load.expected(), top);
    }

    private record Load(int done, int expected, int weeks, int workoutsPerWeek) {}

    /** Workouts done vs planned over the last four weeks (or since the start, if more recent). */
    private Load load(CoachingRelationship rel, ClientProfile profile) {
        WorkoutPlan plan = profile.getPlanId() == null ? null : plans.findById(profile.getPlanId()).orElse(null);
        int perWeek = plan == null ? profile.getDaysPerWeek() : plan.getWorkoutsPerWeek();
        int weeks = plan == null ? DEFAULT_WEEKS : plan.getWeeks();
        Instant now = clock.instant();
        Instant windowStart = rel.getStartedAt().isAfter(now.minus(28, ChronoUnit.DAYS)) ? rel.getStartedAt()
                : now.minus(28, ChronoUnit.DAYS);
        double windowWeeks = Duration.between(windowStart, now).toHours() / (24.0 * 7);
        int expected = (int) Math.round(windowWeeks * perWeek);
        int done = (int) sessions.countByUserIdAndFinishedAtAfter(rel.getClientId(), windowStart);
        return new Load(done, expected, weeks, perWeek);
    }

    private StudentView view(CoachingRelationship rel, ClientProfile profile) {
        Load load = load(rel, profile);
        Instant now = clock.instant();
        long days = Duration.between(rel.getStartedAt(), now).toDays();
        int week = (int) Math.min(load.weeks(), days / 7 + 1);
        Double adherence = load.expected() == 0 ? null : Math.min(1.0, (double) load.done() / load.expected());
        String tag = null;
        Attention attention = null;
        if (days < 7) {
            tag = "new";
        } else if (adherence != null && adherence < ATTENTION_ADHERENCE) {
            tag = "attention";
            attention = new Attention("missed-workouts", load.done(), load.expected(), null);
        } else {
            var stalled = progress.summary(rel.getClientId(), 6).exercises().stream().filter(e -> e.stalled()).findFirst();
            if (stalled.isPresent()) {
                tag = "attention";
                attention = new Attention("stalled", null, null, stalled.get().name());
            }
        }
        return new StudentView(rel.getClientId(), rel.getId(), profile.getName(), FileService.url(profile.getPhotoFileId()),
                profile.getGoal(), week, load.weeks(), adherence == null ? null : Math.round(adherence * 100) / 100.0, tag,
                attention, rel.getPackageName(), rel.getPriceCents(), rel.getPeriod(), rel.getStartedAt(),
                chat.conversationId(rel.getTrainerId(), rel.getClientId()).orElse(null));
    }
}
