package com.trakio.core.dev;

import com.trakio.core.account.AccountDtos.ClientProfileInput;
import com.trakio.core.account.AccountDtos.TrainerProfileInput;
import com.trakio.core.account.ActivityLevel;
import com.trakio.core.account.ClientProfile;
import com.trakio.core.account.ClientProfileRepository;
import com.trakio.core.account.Experience;
import com.trakio.core.account.Goal;
import com.trakio.core.account.Preferences;
import com.trakio.core.account.PreferencesRepository;
import com.trakio.core.account.Sex;
import com.trakio.core.account.TrainerProfile;
import com.trakio.core.account.TrainerProfileRepository;
import com.trakio.core.auth.Role;
import com.trakio.core.auth.User;
import com.trakio.core.auth.UserRepository;
import com.trakio.core.billing.Payment;
import com.trakio.core.billing.PaymentKind;
import com.trakio.core.billing.PaymentRepository;
import com.trakio.core.billing.Subscription;
import com.trakio.core.billing.SubscriptionKind;
import com.trakio.core.billing.SubscriptionRepository;
import com.trakio.core.chat.Conversation;
import com.trakio.core.chat.ConversationRepository;
import com.trakio.core.chat.Message;
import com.trakio.core.chat.MessageRepository;
import com.trakio.core.coaching.CoachingRelationship;
import com.trakio.core.coaching.CoachingRelationshipRepository;
import com.trakio.core.marketplace.PackagePeriod;
import com.trakio.core.marketplace.Review;
import com.trakio.core.marketplace.ReviewRepository;
import com.trakio.core.marketplace.TrainerPackage;
import com.trakio.core.marketplace.TrainerPackageRepository;
import com.trakio.core.plan.PlanDay;
import com.trakio.core.plan.PlanExercise;
import com.trakio.core.plan.WorkoutPlan;
import com.trakio.core.plan.WorkoutPlanRepository;
import com.trakio.core.progress.WeightEntry;
import com.trakio.core.progress.WeightEntryRepository;
import com.trakio.core.verification.DocumentType;
import com.trakio.core.verification.VerificationRequest;
import com.trakio.core.verification.VerificationRequestRepository;
import com.trakio.core.verification.VerificationStatus;
import com.trakio.core.workout.Feeling;
import com.trakio.core.workout.SessionExercise;
import com.trakio.core.workout.SessionSet;
import com.trakio.core.workout.WorkoutSession;
import com.trakio.core.workout.WorkoutSessionRepository;
import com.trakio.core.files.FilePurpose;
import com.trakio.core.files.FileType;
import com.trakio.core.files.StoredFile;
import com.trakio.core.files.StoredFileRepository;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.context.annotation.Profile;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/**
 * Demo data for local development — the same test accounts as the app (password "trakio123"):
 * miguel@trakio.test (student of Rita), rita@trakio.test (PT), admin@trakio.test (admin).
 * Only runs with the "dev" profile and only on an empty database.
 */
@Component
@Profile("dev")
class DevDataSeeder implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(DevDataSeeder.class);
    static final String PASSWORD = "trakio123";

    private final UserRepository users;
    private final PreferencesRepository preferences;
    private final ClientProfileRepository clients;
    private final TrainerProfileRepository trainers;
    private final TrainerPackageRepository packages;
    private final SubscriptionRepository subscriptions;
    private final PaymentRepository payments;
    private final CoachingRelationshipRepository coaching;
    private final ConversationRepository conversations;
    private final MessageRepository messages;
    private final WorkoutPlanRepository plans;
    private final WorkoutSessionRepository sessions;
    private final WeightEntryRepository weights;
    private final ReviewRepository reviews;
    private final VerificationRequestRepository verifications;
    private final StoredFileRepository files;
    private final PasswordEncoder passwords;
    private final Clock clock;

    DevDataSeeder(UserRepository users, PreferencesRepository preferences, ClientProfileRepository clients,
            TrainerProfileRepository trainers, TrainerPackageRepository packages, SubscriptionRepository subscriptions,
            PaymentRepository payments, CoachingRelationshipRepository coaching, ConversationRepository conversations,
            MessageRepository messages, WorkoutPlanRepository plans, WorkoutSessionRepository sessions,
            WeightEntryRepository weights, ReviewRepository reviews, VerificationRequestRepository verifications,
            StoredFileRepository files, PasswordEncoder passwords, Clock clock) {
        this.users = users;
        this.preferences = preferences;
        this.clients = clients;
        this.trainers = trainers;
        this.packages = packages;
        this.subscriptions = subscriptions;
        this.payments = payments;
        this.coaching = coaching;
        this.conversations = conversations;
        this.messages = messages;
        this.plans = plans;
        this.sessions = sessions;
        this.weights = weights;
        this.reviews = reviews;
        this.verifications = verifications;
        this.files = files;
        this.passwords = passwords;
        this.clock = clock;
    }

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        if (users.existsByEmail("miguel@trakio.test")) {
            return;
        }
        Instant now = clock.instant();
        String hash = passwords.encode(PASSWORD);
        user("admin@trakio.test", Role.ADMIN, hash);

        User rita = user("rita@trakio.test", Role.TRAINER, hash);
        TrainerProfile ritaProfile = trainer(rita, "Rita Santos", "a", "Lisboa", "", true,
                "6 anos a treinar atletas amadores e iniciantes. Planos com progressão de carga clara e ajustes semanais com base nos teus dados.",
                List.of("Hipertrofia", "Força", "Nutrição"), true);
        TrainerPackage ritaFull = pack(rita, "Treino + Nutrição", "Plano, dieta, ajustes semanais e chat", 4500, PackagePeriod.MONTH, 0);
        pack(rita, "Só treino", "Plano e acompanhamento de cargas", 3500, PackagePeriod.MONTH, 1);
        pack(rita, "Sessão online", "Videochamada de 45 min", 2000, PackagePeriod.ONCE, 2);
        approved(rita, now);
        listed(rita, now);

        User tiago = user("tiago@trakio.test", Role.TRAINER, hash);
        trainer(tiago, "Tiago Ferreira", "o", "Lisboa", "Alvalade", false,
                "Perda de peso sem dietas extremas: hábitos, treino de força e acompanhamento semanal.",
                List.of("Perda de peso", "Nutrição"), true);
        pack(tiago, "Treino + Nutrição", "Plano, dieta e check-in semanal", 4000, PackagePeriod.MONTH, 0);
        pack(tiago, "Só treino", "Plano e acompanhamento de cargas", 3000, PackagePeriod.MONTH, 1);
        approved(tiago, now);
        listed(tiago, now);

        User bruno = user("bruno@trakio.test", Role.TRAINER, hash);
        trainer(bruno, "Bruno Lopes", "o", "Lisboa", "Benfica", false,
                "Agachamento, supino e peso morto: técnica, periodização e preparação para competição.",
                List.of("Força", "Powerlifting"), true);
        pack(bruno, "Preparação de força", "Plano por blocos e revisão de vídeos", 4500, PackagePeriod.MONTH, 0);
        approved(bruno, now);
        listed(bruno, now);

        // Inês: verification waiting for an admin (shows up in the back office queue).
        User ines = user("ines@trakio.test", Role.TRAINER, hash);
        trainer(ines, "Inês Almeida", "a", "Online", "", true,
                "Mobilidade, dor lombar e regresso ao treino no pós-parto, sempre com progressões seguras.",
                List.of("Mobilidade", "Pós-parto"), false);
        pack(ines, "Plano de mobilidade", "Rotina semanal e ajustes", 4000, PackagePeriod.MONTH, 0);
        VerificationRequest inesRequest = new VerificationRequest(ines.getId());
        for (DocumentType type : DocumentType.values()) {
            inesRequest.putDocument(type, placeholderDocument(ines.getId(), now), LocalDate.now(clock).plusYears(2), now);
        }
        inesRequest.submit(now.minus(3, ChronoUnit.DAYS));
        verifications.save(inesRequest);

        User miguel = user("miguel@trakio.test", Role.CLIENT, hash);
        ClientProfile miguelProfile = client(miguel, "Miguel Costa", Sex.MALE, 1997, 178, 78.4, 81.0, Goal.GAIN, 4);
        WorkoutPlan template = plans.findTemplatesOldestFirst().getFirst();
        miguelProfile.setPlanId(template.getId());
        coachedBy(miguel, ritaFull, now.minus(41, ChronoUnit.DAYS));
        premium(miguel, now);
        history(miguel, template, now);
        weighIns(miguel, now);
        reviews.save(new Review(rita.getId(), miguel.getId(), 5, "A Rita ajusta o plano todas as semanas. Nunca treinei tão bem.",
                now.minus(10, ChronoUnit.DAYS)));

        User ana = user("ana@trakio.test", Role.CLIENT, hash);
        client(ana, "Ana Ribeiro", Sex.FEMALE, 1994, 165, 68, 62.0, Goal.LOSE, 4);
        coachedBy(ana, ritaFull, now.minus(20, ChronoUnit.DAYS));

        log.info("Dev data ready: miguel@trakio.test, rita@trakio.test, admin@trakio.test (password {})", PASSWORD);
    }

    private User user(String email, Role role, String hash) {
        User user = users.save(new User(email, hash, role));
        preferences.save(new Preferences(user.getId()));
        return user;
    }

    private TrainerProfile trainer(User user, String name, String article, String city, String area, boolean online, String bio,
            List<String> specialties, boolean verified) {
        TrainerProfile p = new TrainerProfile(user.getId());
        p.update(new TrainerProfileInput(name, null, article, city, area, online, bio, specialties));
        p.setVerified(verified);
        p.setStripeAccountId("fake_acct_" + user.getId());
        p.setPayoutsEnabled(true);
        return trainers.save(p);
    }

    private ClientProfile client(User user, String name, Sex sex, int birthYear, double height, double weight, Double goalWeight,
            Goal goal, int days) {
        ClientProfile p = new ClientProfile(user.getId());
        p.update(new ClientProfileInput(name, null, sex, birthYear, height, weight, goalWeight, goal, ActivityLevel.MODERATE, days,
                Experience.SOME, true));
        return clients.save(p);
    }

    private TrainerPackage pack(User trainer, String name, String description, int cents, PackagePeriod period, int position) {
        TrainerPackage p = new TrainerPackage(trainer.getId());
        p.update(name, description, cents, period, position);
        return packages.save(p);
    }

    private void approved(User trainer, Instant now) {
        VerificationRequest r = new VerificationRequest(trainer.getId());
        r.submit(now.minus(60, ChronoUnit.DAYS));
        r.decide(VerificationStatus.APPROVED, "", null, now.minus(58, ChronoUnit.DAYS));
        verifications.save(r);
    }

    private void listed(User trainer, Instant now) {
        Subscription s = new Subscription(trainer.getId(), SubscriptionKind.MARKETPLACE);
        s.started("fake_sub_" + UUID.randomUUID(), null, now.plus(20, ChronoUnit.DAYS));
        subscriptions.save(s);
        Payment p = new Payment(trainer.getId(), null, null, PaymentKind.MARKETPLACE, "Subscrição do marketplace", 400, 0);
        p.paid("fake_inv_" + UUID.randomUUID(), now.minus(10, ChronoUnit.DAYS));
        payments.save(p);
    }

    private void premium(User client, Instant now) {
        Subscription s = new Subscription(client.getId(), SubscriptionKind.PREMIUM);
        s.started("fake_sub_" + UUID.randomUUID(), null, now.plus(28, ChronoUnit.DAYS));
        subscriptions.save(s);
        Payment p = new Payment(client.getId(), null, null, PaymentKind.PREMIUM, "Trakio Premium", 499, 0);
        p.paid("fake_inv_" + UUID.randomUUID(), now.minus(2, ChronoUnit.DAYS));
        payments.save(p);
    }

    private void coachedBy(User client, TrainerPackage pack, Instant since) {
        CoachingRelationship rel = new CoachingRelationship(client.getId(), pack);
        rel.activate(since);
        coaching.save(rel);
        clients.findByUserId(client.getId()).ifPresent(c -> c.setCoached(true));
        for (Instant paid = since; paid.isBefore(clock.instant()); paid = paid.plus(30, ChronoUnit.DAYS)) {
            Payment p = new Payment(client.getId(), pack.getTrainerId(), rel.getId(), PaymentKind.COACHING,
                    pack.getName() + " · Rita Santos", pack.getPriceCents(), Math.round(pack.getPriceCents() * 0.1));
            p.paid("fake_pi_" + UUID.randomUUID(), paid);
            payments.save(p);
        }
        Conversation c = conversations.save(new Conversation(pack.getTrainerId(), client.getId()));
        Instant t = clock.instant().minus(3, ChronoUnit.HOURS);
        List<Message> thread = List.of(
                Message.text(c.getId(), client.getId(), "O supino hoje estava leve. Subo o peso na próxima?", t),
                Message.text(c.getId(), pack.getTrainerId(), "Sim! Sobe 2,5 kg e mantém as 8 repetições.", t.plus(6, ChronoUnit.MINUTES)));
        messages.saveAll(thread);
        c.touched(t.plus(6, ChronoUnit.MINUTES));
        c.markRead(pack.getTrainerId(), thread.getLast().getId());
        c.markRead(client.getId(), thread.getLast().getId());
    }

    /** Eight weeks of A/B/C, getting a little stronger each session. */
    private void history(User client, WorkoutPlan plan, Instant now) {
        List<PlanDay> days = plan.getDays();
        for (int i = 23; i >= 0; i--) {
            PlanDay day = days.get((2 - (i % 3) + 3) % 3);
            Instant finished = now.minus(2 + Math.round(i * 2.34), ChronoUnit.DAYS).truncatedTo(ChronoUnit.HOURS);
            double progress = 1 - i * 0.006;
            List<SessionExercise> done = new ArrayList<>();
            for (PlanExercise e : day.getExercises()) {
                double kg = rack((e.getReferenceKg() == null ? 20 : e.getReferenceKg()) * progress);
                List<SessionSet> sets = new ArrayList<>();
                for (int s = 0; s < e.getSets(); s++) {
                    sets.add(new SessionSet(kg, e.getRepsMin()));
                }
                done.add(new SessionExercise(e.getPosition(), e.getExercise(), sets));
            }
            sessions.save(new WorkoutSession(client.getId(), "demo-" + i, plan.getId(), day.getId(), day.getLabel(), day.getFocus(),
                    finished.minus(55, ChronoUnit.MINUTES), finished, i % 4 == 0 ? Feeling.HARD : Feeling.GOOD, done, finished));
        }
    }

    private void weighIns(User client, Instant now) {
        double[] values = {76.0, 76.3, 76.4, 76.9, 77.1, 77.0, 77.6, 77.9, 78.4};
        LocalDate today = LocalDate.now(clock);
        for (int i = 0; i < values.length; i++) {
            weights.save(new WeightEntry(client.getId(), today.minusWeeks(values.length - 1 - i), values[i], now));
        }
    }

    /** Verification needs real file rows; in dev they point at nothing readable. */
    private UUID placeholderDocument(UUID owner, Instant now) {
        StoredFile f = files.save(new StoredFile(owner, FilePurpose.VERIFICATION, FileType.PDF, 0, "documento.pdf",
                UUID.randomUUID().toString().replace("-", ""), "0".repeat(64), now));
        return f.getId();
    }

    private static double rack(double kg) {
        double step = kg < 20 ? 1.25 : 2.5;
        return Math.max(step, Math.round(kg / step) * step);
    }
}
