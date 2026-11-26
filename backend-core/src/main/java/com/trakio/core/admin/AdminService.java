package com.trakio.core.admin;

import com.trakio.core.account.ClientProfile;
import com.trakio.core.account.ClientProfileRepository;
import com.trakio.core.account.TrainerProfile;
import com.trakio.core.account.TrainerProfileRepository;
import com.trakio.core.admin.AdminDtos.AuditRow;
import com.trakio.core.admin.AdminDtos.ExerciseInput;
import com.trakio.core.admin.AdminDtos.ExerciseRow;
import com.trakio.core.admin.AdminDtos.MonthRevenue;
import com.trakio.core.admin.AdminDtos.Overview;
import com.trakio.core.admin.AdminDtos.PaymentRow;
import com.trakio.core.admin.AdminDtos.UserRow;
import com.trakio.core.auth.RefreshTokenRepository;
import com.trakio.core.auth.Role;
import com.trakio.core.auth.User;
import com.trakio.core.auth.UserRepository;
import com.trakio.core.auth.UserStatus;
import com.trakio.core.billing.BillingDtos.PaymentView;
import com.trakio.core.billing.BillingService;
import com.trakio.core.billing.Payment;
import com.trakio.core.billing.PaymentKind;
import com.trakio.core.billing.PaymentRepository;
import com.trakio.core.billing.PaymentStatus;
import com.trakio.core.billing.SubscriptionKind;
import com.trakio.core.billing.SubscriptionRepository;
import com.trakio.core.coaching.CoachingRelationshipRepository;
import com.trakio.core.common.ApiException;
import com.trakio.core.common.Enums;
import com.trakio.core.common.PageResponse;
import com.trakio.core.common.Pages;
import com.trakio.core.config.TrakioProperties;
import com.trakio.core.exercise.DemoStatus;
import com.trakio.core.exercise.Exercise;
import com.trakio.core.exercise.ExerciseRepository;
import com.trakio.core.exercise.MuscleGroup;
import com.trakio.core.moderation.ModerationService;
import com.trakio.core.nutrition.MealRepository;
import com.trakio.core.nutrition.MealSource;
import com.trakio.core.verification.VerificationService;
import java.text.Normalizer;
import java.time.Clock;
import java.time.Instant;
import java.time.YearMonth;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AdminService {

    private final UserRepository users;
    private final RefreshTokenRepository refreshTokens;
    private final ClientProfileRepository clients;
    private final TrainerProfileRepository trainers;
    private final SubscriptionRepository subscriptions;
    private final PaymentRepository payments;
    private final CoachingRelationshipRepository coaching;
    private final MealRepository meals;
    private final ExerciseRepository exercises;
    private final AuditLogRepository auditLog;
    private final BillingService billing;
    private final VerificationService verification;
    private final ModerationService moderation;
    private final AuditService audit;
    private final TrakioProperties properties;
    private final Clock clock;

    public AdminService(UserRepository users, RefreshTokenRepository refreshTokens, ClientProfileRepository clients,
            TrainerProfileRepository trainers, SubscriptionRepository subscriptions, PaymentRepository payments,
            CoachingRelationshipRepository coaching, MealRepository meals, ExerciseRepository exercises,
            AuditLogRepository auditLog, BillingService billing, VerificationService verification,
            ModerationService moderation, AuditService audit, TrakioProperties properties, Clock clock) {
        this.users = users;
        this.refreshTokens = refreshTokens;
        this.clients = clients;
        this.trainers = trainers;
        this.subscriptions = subscriptions;
        this.payments = payments;
        this.coaching = coaching;
        this.meals = meals;
        this.exercises = exercises;
        this.auditLog = auditLog;
        this.billing = billing;
        this.verification = verification;
        this.moderation = moderation;
        this.audit = audit;
        this.properties = properties;
        this.clock = clock;
    }

    // ── Overview ────────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public Overview overview(YearMonth month) {
        var zone = properties.zone();
        Instant from = month.atDay(1).atStartOfDay(zone).toInstant();
        Instant to = month.plusMonths(1).atDay(1).atStartOfDay(zone).toInstant();
        long revenue = revenue(month);
        long previous = revenue(month.minusMonths(1));
        List<MonthRevenue> byMonth = new ArrayList<>();
        for (int i = 5; i >= 0; i--) {
            YearMonth m = month.minusMonths(i);
            Instant f = m.atDay(1).atStartOfDay(zone).toInstant();
            Instant t = m.plusMonths(1).atDay(1).atStartOfDay(zone).toInstant();
            byMonth.add(new MonthRevenue(m.toString(), payments.sumFees(PaymentRepository.COUNTED, f, t),
                    payments.sumSubscriptions(PaymentRepository.COUNTED, f, t)));
        }
        return new Overview(month.toString(),
                users.countByLastSeenAtAfter(clock.instant().minus(30, ChronoUnit.DAYS)),
                users.count(), users.countByRole(Role.CLIENT), users.countByRole(Role.TRAINER),
                trainers.findListed(null, null).size(),
                users.countByRoleAndCreatedAtAfter(Role.TRAINER, from),
                subscriptions.countActive(SubscriptionKind.PREMIUM),
                revenue, previous == 0 ? null : Math.round((revenue - previous) * 1000.0 / previous) / 10.0,
                payments.sumProcessed(PaymentRepository.COUNTED, from, to), byMonth,
                meals.countBySourceAndCreatedAtAfter(MealSource.AI, from),
                verification.pendingCount(), moderation.openCount(),
                payments.search(PaymentStatus.REFUND_REQUESTED, null, Pages.of(0, 1, Sort.unsorted())).getTotalElements(),
                payments.search(PaymentStatus.DISPUTED, null, Pages.of(0, 1, Sort.unsorted())).getTotalElements());
    }

    @Transactional(readOnly = true)
    public AdminDtos.Settings settings() {
        var p = properties.payments();
        var admins = users.adminSearch(null, Role.ADMIN, null, Pages.of(0, 50, Sort.unsorted())).getContent().stream()
                .map(u -> new AdminDtos.TeamMember(u.getId(), u.getEmail(), u.getCreatedAt(), u.getLastSeenAt())).toList();
        return new AdminDtos.Settings(p.platformFeePercent(), p.premiumPriceCents(), p.marketplacePriceCents(), p.provider(),
                properties.ai().enabled(), admins);
    }

    @Transactional(readOnly = true)
    public AdminDtos.Totals totals() {
        return new AdminDtos.Totals(users.count(), users.countByRole(Role.CLIENT), users.countByRole(Role.TRAINER),
                subscriptions.countActive(SubscriptionKind.PREMIUM),
                users.adminSearch(null, null, UserStatus.SUSPENDED, Pages.of(0, 1, Sort.unsorted())).getTotalElements());
    }

    /** Platform revenue: commission on PT payments plus Premium and marketplace subscriptions. */
    private long revenue(YearMonth month) {
        var zone = properties.zone();
        Instant from = month.atDay(1).atStartOfDay(zone).toInstant();
        Instant to = month.plusMonths(1).atDay(1).atStartOfDay(zone).toInstant();
        return payments.sumFees(PaymentRepository.COUNTED, from, to) + payments.sumSubscriptions(PaymentRepository.COUNTED, from, to);
    }

    // ── Users ───────────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public PageResponse<UserRow> users(String q, String role, String status, int page, int size) {
        var result = users.adminSearch(q == null || q.isBlank() ? null : q.trim(), Enums.parse(Role.class, role, "role"),
                Enums.parse(UserStatus.class, status, "status"), Pages.of(page, size, Sort.unsorted()));
        List<UUID> ids = result.getContent().stream().map(User::getId).toList();
        Map<UUID, ClientProfile> clientProfiles = clients.findByUserIdIn(ids).stream()
                .collect(Collectors.toMap(ClientProfile::getUserId, Function.identity()));
        Map<UUID, TrainerProfile> trainerProfiles = trainers.findByUserIdIn(ids).stream()
                .collect(Collectors.toMap(TrainerProfile::getUserId, Function.identity()));
        Set<UUID> listed = trainers.findListed(null, null).stream().map(TrainerProfile::getUserId).collect(Collectors.toSet());
        Set<UUID> premium = new HashSet<>();
        for (UUID id : ids) {
            subscriptions.findByUserIdAndKind(id, SubscriptionKind.PREMIUM).filter(s -> s.grantsAccess()).ifPresent(s -> premium.add(id));
        }
        return PageResponse.of(result, u -> {
            ClientProfile c = clientProfiles.get(u.getId());
            TrainerProfile t = trainerProfiles.get(u.getId());
            String name = c != null ? c.getName() : t != null ? t.getName() : null;
            UUID photo = c != null ? c.getPhotoFileId() : t != null ? t.getPhotoFileId() : null;
            return new UserRow(u.getId(), name, com.trakio.core.files.FileService.url(photo), u.getEmail(), u.getRole(), t != null ? t.getCity() : null,
                    premium.contains(u.getId()), coaching.findActiveForClient(u.getId()).isPresent(),
                    t == null ? null : t.isVerified(), t == null ? null : listed.contains(u.getId()), u.getCreatedAt(),
                    u.getLastSeenAt(), u.getStatus());
        });
    }

    /** Suspending logs the person out everywhere at once (token version + refresh tokens). */
    @Transactional
    public void setUserStatus(UUID adminId, UUID userId, UserStatus status, String reason) {
        if (adminId.equals(userId)) {
            throw ApiException.badRequest("self", "Não podes alterar o estado da tua própria conta.");
        }
        User user = users.findById(userId).orElseThrow(() -> ApiException.notFound("Esta conta"));
        if (user.getRole() == Role.ADMIN) {
            throw ApiException.forbidden("Contas de administrador não se gerem aqui.");
        }
        if (status == UserStatus.SUSPENDED) {
            user.suspend();
            refreshTokens.revokeAllForUser(userId, clock.instant());
        } else {
            user.reactivate();
        }
        audit.record(adminId, "user." + Enums.json(status), "user", userId.toString(), reason == null ? "" : reason);
    }

    // ── Payments ────────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public PageResponse<PaymentRow> payments(String status, String kind, int page, int size) {
        var result = payments.search(Enums.parse(PaymentStatus.class, status, "status"), Enums.parse(PaymentKind.class, kind, "kind"),
                Pages.of(page, size, Sort.unsorted()));
        Set<UUID> people = new HashSet<>();
        result.getContent().forEach(p -> {
            if (p.getPayerId() != null) {
                people.add(p.getPayerId());
            }
            if (p.getTrainerId() != null) {
                people.add(p.getTrainerId());
            }
        });
        Map<UUID, String> names = new java.util.HashMap<>();
        Map<UUID, String> photos = new java.util.HashMap<>();
        clients.findByUserIdIn(people).forEach(c -> {
            names.put(c.getUserId(), c.getName());
            photos.put(c.getUserId(), com.trakio.core.files.FileService.url(c.getPhotoFileId()));
        });
        trainers.findByUserIdIn(people).forEach(t -> {
            names.put(t.getUserId(), t.getName());
            photos.put(t.getUserId(), com.trakio.core.files.FileService.url(t.getPhotoFileId()));
        });
        return PageResponse.of(result, (Payment p) -> new PaymentRow(p.getId(), p.getPaidAt() == null ? p.getCreatedAt() : p.getPaidAt(),
                names.getOrDefault(p.getPayerId(), "—"), photos.get(p.getPayerId()), p.getTrainerId() == null ? null : names.getOrDefault(p.getTrainerId(), "—"),
                p.getKind(), p.getDescription(), p.getAmountCents(), p.getFeeCents(), p.getStatus(), p.getRefundReason()));
    }

    @Transactional
    public PaymentView decideRefund(UUID adminId, UUID paymentId, BillingService.RefundDecision decision) {
        PaymentView view = billing.decideRefund(paymentId, decision);
        audit.record(adminId, "payment.refund." + decision.name().toLowerCase(Locale.ROOT), "payment", paymentId.toString(), "");
        return view;
    }

    // ── Exercise library ────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public PageResponse<ExerciseRow> exercises(String q, String group, String demo, int page, int size) {
        var result = exercises.search(q == null || q.isBlank() ? null : q.trim(), Enums.parse(MuscleGroup.class, group, "group"),
                Enums.parse(DemoStatus.class, demo, "demo"), Pages.of(page, size, Sort.by("name")));
        return PageResponse.of(result, this::row);
    }

    @Transactional
    public ExerciseRow addExercise(UUID adminId, ExerciseInput in) {
        String slug = in.slug() == null || in.slug().isBlank() ? slugify(in.name()) : in.slug();
        if (exercises.existsBySlug(slug)) {
            throw ApiException.conflict("exercise-exists", "Já existe um exercício com este nome.");
        }
        Exercise exercise = exercises.save(new Exercise(slug, in.name().trim(), in.group(),
                in.muscles() == null ? "" : in.muscles().trim(), in.equipment() == null ? "" : in.equipment().trim()));
        audit.record(adminId, "exercise.create", "exercise", exercise.getId().toString(), slug);
        return row(exercise);
    }

    @Transactional
    public ExerciseRow setDemoStatus(UUID adminId, UUID exerciseId, DemoStatus status) {
        Exercise exercise = exercises.findById(exerciseId).orElseThrow(() -> ApiException.notFound("Este exercício"));
        exercise.setDemoStatus(status);
        audit.record(adminId, "exercise.demo." + Enums.json(status), "exercise", exerciseId.toString(), "");
        return row(exercise);
    }

    @Transactional(readOnly = true)
    public Map<String, Long> demoTotals() {
        Map<String, Long> totals = new java.util.LinkedHashMap<>();
        for (DemoStatus status : DemoStatus.values()) {
            totals.put(Enums.json(status), exercises.countByDemoStatus(status));
        }
        return totals;
    }

    private ExerciseRow row(Exercise e) {
        return new ExerciseRow(e.getId(), e.getSlug(), e.getName(), e.getGroup(), e.getMuscles(), e.getEquipment(),
                e.getDemoStatus(), exercises.countPlansUsing(e.getId()));
    }

    static String slugify(String name) {
        String ascii = Normalizer.normalize(name, Normalizer.Form.NFD).replaceAll("\\p{M}", "");
        String slug = ascii.toLowerCase(Locale.ROOT).replaceAll("[^a-z0-9]+", "-").replaceAll("(^-|-$)", "");
        return slug.length() > 64 ? slug.substring(0, 64) : slug;
    }

    // ── Audit ───────────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public PageResponse<AuditRow> audit(int page, int size) {
        return PageResponse.of(auditLog.findAllByOrderByIdDesc(Pages.of(page, size, Sort.unsorted())),
                a -> new AuditRow(a.getId(), a.getActorId(), a.getAction(), a.getTargetType(), a.getTargetId(), a.getDetail(),
                        a.getCreatedAt()));
    }
}
