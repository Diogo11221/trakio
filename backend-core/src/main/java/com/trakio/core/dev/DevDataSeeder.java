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
import com.trakio.core.agenda.Appointment;
import com.trakio.core.agenda.AppointmentRepository;
import com.trakio.core.files.FilePurpose;
import com.trakio.core.files.FileStorage;
import com.trakio.core.nutrition.Meal;
import com.trakio.core.nutrition.MealItem;
import com.trakio.core.nutrition.MealSlot;
import com.trakio.core.nutrition.MealSource;
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
    private final FileStorage storage;
    private final AppointmentRepository appointments;
    private final com.trakio.core.nutrition.FoodRepository foods;
    private final com.trakio.core.nutrition.MealRepository mealRepository;
    private final com.trakio.core.moderation.ReportRepository reports;
    private final Clock clock;

    DevDataSeeder(UserRepository users, PreferencesRepository preferences, ClientProfileRepository clients,
            TrainerProfileRepository trainers, TrainerPackageRepository packages, SubscriptionRepository subscriptions,
            PaymentRepository payments, CoachingRelationshipRepository coaching, ConversationRepository conversations,
            MessageRepository messages, WorkoutPlanRepository plans, WorkoutSessionRepository sessions,
            WeightEntryRepository weights, ReviewRepository reviews, VerificationRequestRepository verifications,
            StoredFileRepository files, PasswordEncoder passwords, FileStorage storage, AppointmentRepository appointments,
            com.trakio.core.nutrition.FoodRepository foods, com.trakio.core.nutrition.MealRepository mealRepository,
            com.trakio.core.moderation.ReportRepository reports, Clock clock) {
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
        this.storage = storage;
        this.appointments = appointments;
        this.foods = foods;
        this.mealRepository = mealRepository;
        this.reports = reports;
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
        TrainerProfile ritaProfile = trainer(rita, "rita", "Rita Santos", "a", "Lisboa", "", true,
                "6 anos a treinar atletas amadores e iniciantes. Planos com progressão de carga clara e ajustes semanais com base nos teus dados.",
                List.of("Hipertrofia", "Força", "Nutrição"), true);
        TrainerPackage ritaFull = pack(rita, "Treino + Nutrição", "Plano, dieta, ajustes semanais e chat", 4500, PackagePeriod.MONTH, 0);
        pack(rita, "Só treino", "Plano e acompanhamento de cargas", 3500, PackagePeriod.MONTH, 1);
        pack(rita, "Sessão online", "Videochamada de 45 min", 2000, PackagePeriod.ONCE, 2);
        approved(rita, now);
        listed(rita, now);

        User tiago = user("tiago@trakio.test", Role.TRAINER, hash);
        trainer(tiago, "tiago", "Tiago Ferreira", "o", "Lisboa", "Alvalade", false,
                "Perda de peso sem dietas extremas: hábitos, treino de força e acompanhamento semanal.",
                List.of("Perda de peso", "Nutrição"), true);
        pack(tiago, "Treino + Nutrição", "Plano, dieta e check-in semanal", 4000, PackagePeriod.MONTH, 0);
        pack(tiago, "Só treino", "Plano e acompanhamento de cargas", 3000, PackagePeriod.MONTH, 1);
        approved(tiago, now);
        listed(tiago, now);

        User bruno = user("bruno@trakio.test", Role.TRAINER, hash);
        trainer(bruno, "bruno", "Bruno Lopes", "o", "Lisboa", "Benfica", false,
                "Agachamento, supino e peso morto: técnica, periodização e preparação para competição.",
                List.of("Força", "Powerlifting"), true);
        pack(bruno, "Preparação de força", "Plano por blocos e revisão de vídeos", 4500, PackagePeriod.MONTH, 0);
        approved(bruno, now);
        listed(bruno, now);

        // Inês: verification waiting for an admin (shows up in the back office queue).
        User ines = user("ines@trakio.test", Role.TRAINER, hash);
        trainer(ines, "ines", "Inês Almeida", "a", "Online", "", true,
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
        ClientProfile miguelProfile = client(miguel, "miguel", "Miguel Costa", Sex.MALE, 1997, 178, 78.4, 81.0, Goal.GAIN, 4);
        WorkoutPlan template = plans.findTemplatesOldestFirst().getFirst();
        miguelProfile.setPlanId(template.getId());
        coachedBy(miguel, ritaFull, now.minus(41, ChronoUnit.DAYS), List.of(
                "O supino hoje estava leve. Subo o peso na próxima?", "Sim! Sobe 2,5 kg e mantém as 8 repetições."));
        premium(miguel, now);
        history(miguel, template, now, 24, 2.34, null);
        meals(miguel, now);
        weighIns(miguel, now);
        reviews.save(new Review(rita.getId(), miguel.getId(), 5, "A Rita ajusta o plano todas as semanas. Nunca treinei tão bem.",
                now.minus(10, ChronoUnit.DAYS)));

        TrainerPackage ritaTrain = packages.findByTrainerIdAndActiveTrueOrderByPosition(rita.getId()).get(1);
        TrainerPackage ritaSession = packages.findByTrainerIdAndActiveTrueOrderByPosition(rita.getId()).get(2);

        // Ana trains far less than planned → "treino em casa".
        User ana = student("ana", "Ana Ribeiro", Sex.FEMALE, 1994, 165, 68, 62.0, Goal.LOSE, 4, ritaFull, 20, template, 3, 6.0, null,
                List.of("Como correu a semana, Ana?", "Esta semana não consegui ir ao ginásio…",
                        "Tens algum treino que dê para fazer em casa?"));
        // João's Romanian deadlift has stalled → "variação".
        student("joao", "João Martins", Sex.MALE, 1990, 182, 86, null, Goal.GAIN, 3, ritaTrain, 60, template, 16, 2.6,
                "peso-morto-romeno", List.of("Postura no peso morto, está bem assim?", "Está ótima, mantém as costas direitas."));
        student("carla", "Carla Sousa", Sex.FEMALE, 1988, 160, 57, null, Goal.MAINTAIN, 2, ritaTrain, 12, template, 4, 2.8, null,
                List.of("Obrigada pelas dicas!"));
        student("pedro", "Pedro Gomes", Sex.MALE, 1985, 175, 80, 76.0, Goal.LOSE, 3, ritaFull, 70, template, 22, 2.9, null,
                List.of("Treino C feito, pernas a tremer 😅"));
        User sofia = student("sofia", "Sofia Lopes", Sex.FEMALE, 1996, 168, 61, 64.0, Goal.GAIN, 3, ritaSession, 3, template, 0, 0, null,
                List.of("Olá Sofia! Ficamos para as 10h, por videochamada?", "Combinado, às 10h estou online!"));
        User tomas = student("tomas", "Tomás Silva", Sex.MALE, 2000, 180, 74, 78.0, Goal.GAIN, 3, ritaTrain, 2, template, 0, 0, null,
                List.of());
        // Back-office examples: a refund request and a suspicious review reported by the PT.
        payments.findByPayerIdOrderByCreatedAtDesc(sofia.getId(), org.springframework.data.domain.PageRequest.of(0, 1)).getContent()
                .forEach(p -> p.refundRequested("A sessão das 10:00 não aconteceu, a PT não entrou na videochamada."));
        User marco = user("marco@trakio.test", Role.CLIENT, hash);
        ClientProfile marcoProfile = new ClientProfile(marco.getId());
        marcoProfile.update(new ClientProfileInput("Marco Pinto", null, Sex.MALE, 1992, 176, 80, null, Goal.MAINTAIN,
                ActivityLevel.LIGHT, 3, Experience.NEW, false));
        clients.save(marcoProfile);
        Review fake = reviews.save(new Review(rita.getId(), marco.getId(), 1, "Não percam tempo, é uma fraude.", now));
        reports.save(new com.trakio.core.moderation.Report(rita.getId(), com.trakio.core.moderation.ReportKind.REVIEW, fake.getId(),
                rita.getId(), "Esta pessoa nunca foi minha aluna."));

        var today = LocalDate.now(clock.withZone(java.time.ZoneId.of("Europe/Lisbon")));
        appointments.save(new Appointment(rita.getId(), sofia.getId(),
                today.atTime(10, 0).atZone(java.time.ZoneId.of("Europe/Lisbon")).toInstant(), 45, "Sessão online", "", true));
        appointments.save(new Appointment(rita.getId(), tomas.getId(),
                today.atTime(18, 30).atZone(java.time.ZoneId.of("Europe/Lisbon")).toInstant(), 60, "Avaliação inicial",
                "Ginásio de Alvalade", false));

        log.info("Dev data ready: miguel@trakio.test, rita@trakio.test, admin@trakio.test (password {})", PASSWORD);
    }

    private User student(String person, String name, Sex sex, int birthYear, double height, double weight, Double goalWeight,
            Goal goal, int days, TrainerPackage pack, int sinceDays, WorkoutPlan plan, int sessionsCount, double spacing,
            String stalled, List<String> thread) {
        User user = user(person + "@trakio.test", Role.CLIENT, passwords.encode(PASSWORD));
        ClientProfile profile = client(user, person, name, sex, birthYear, height, weight, goalWeight, goal, days);
        profile.setPlanId(plan.getId());
        coachedBy(user, pack, clock.instant().minus(sinceDays, ChronoUnit.DAYS), thread);
        history(user, plan, clock.instant(), sessionsCount, spacing, stalled);
        return user;
    }

    private UUID avatar(UUID owner, String person) {
        try (var in = new org.springframework.core.io.ClassPathResource("dev/avatars/" + person + ".jpg").getInputStream()) {
            byte[] bytes = in.readAllBytes();
            String key = UUID.randomUUID().toString().replace("-", "");
            storage.write(key, bytes);
            return files.save(new StoredFile(owner, FilePurpose.AVATAR, FileType.JPEG, bytes.length, person + ".jpg", key,
                    "0".repeat(64), clock.instant())).getId();
        } catch (java.io.IOException e) {
            log.warn("No demo photo for {}", person);
            return null;
        }
    }

    private User user(String email, Role role, String hash) {
        User user = users.save(new User(email, hash, role));
        preferences.save(new Preferences(user.getId()));
        return user;
    }

    private TrainerProfile trainer(User user, String person, String name, String article, String city, String area, boolean online, String bio,
            List<String> specialties, boolean verified) {
        TrainerProfile p = new TrainerProfile(user.getId());
        p.update(new TrainerProfileInput(name, avatar(user.getId(), person), article, city, area, online, bio, specialties));
        p.setVerified(verified);
        p.setStripeAccountId("fake_acct_" + user.getId());
        p.setPayoutsEnabled(true);
        return trainers.save(p);
    }

    private ClientProfile client(User user, String person, String name, Sex sex, int birthYear, double height, double weight, Double goalWeight,
            Goal goal, int days) {
        ClientProfile p = new ClientProfile(user.getId());
        p.update(new ClientProfileInput(name, avatar(user.getId(), person), sex, birthYear, height, weight, goalWeight, goal, ActivityLevel.MODERATE, days,
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

    private void coachedBy(User client, TrainerPackage pack, Instant since, List<String> thread) {
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
        if (thread.isEmpty()) {
            return;
        }
        // Alternates student / PT, starting with whoever the first line sounds like (PT lines end in "?" addressed by name).
        Instant t = clock.instant().minus(3L * thread.size(), ChronoUnit.HOURS);
        boolean fromTrainer = thread.getFirst().startsWith("Olá") || thread.getFirst().startsWith("Como correu");
        List<Message> saved = new ArrayList<>();
        for (String text : thread) {
            saved.add(messages.save(Message.text(c.getId(), fromTrainer ? pack.getTrainerId() : client.getId(), text, t)));
            fromTrainer = !fromTrainer;
            t = t.plus(37, ChronoUnit.MINUTES);
        }
        c.touched(saved.getLast().getCreatedAt());
        c.markRead(client.getId(), saved.getLast().getId());
        // The PT hasn't read the student's last message yet when it came from the student.
        c.markRead(pack.getTrainerId(), saved.getLast().getSenderId().equals(pack.getTrainerId()) || saved.size() < 2
                ? saved.getLast().getId() : saved.get(saved.size() - 2).getId());
    }

    /** A/B/C sessions, newest {@code spacing} days ago, a little stronger each time (except a stalled exercise). */
    private void history(User client, WorkoutPlan plan, Instant now, int count, double spacing, String stalled) {
        List<PlanDay> days = plan.getDays();
        for (int i = count - 1; i >= 0; i--) {
            PlanDay day = days.get((2 - (i % 3) + 3) % 3);
            Instant finished = now.minus(2 + Math.round(i * spacing), ChronoUnit.DAYS).truncatedTo(ChronoUnit.HOURS);
            double progress = 1 - i * 0.006;
            List<SessionExercise> done = new ArrayList<>();
            for (PlanExercise e : day.getExercises()) {
                boolean flat = e.getExercise().getSlug().equals(stalled) && i < 9;
                double kg = rack((e.getReferenceKg() == null ? 20 : e.getReferenceKg()) * (flat ? 1 - 9 * 0.006 : progress));
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

    /** Breakfast and lunch already logged today (the Figma "Nutrição" screen). */
    private void meals(User client, Instant now) {
        var today = LocalDate.now(clock.withZone(java.time.ZoneId.of("Europe/Lisbon")));
        var byId = foods.findAllById(List.of("aveia", "iogurte-grego", "banana", "frango", "arroz", "salada", "azeite")).stream()
                .collect(java.util.stream.Collectors.toMap(f -> f.getId(), f -> f));
        mealRepository.save(new Meal(client.getId(), today, MealSlot.BREAKFAST, java.time.LocalTime.of(8, 10), MealSource.MANUAL, null,
                List.of(MealItem.of(byId.get("aveia"), 60), MealItem.of(byId.get("iogurte-grego"), 170), MealItem.of(byId.get("banana"), 120)), now));
        mealRepository.save(new Meal(client.getId(), today, MealSlot.LUNCH, java.time.LocalTime.of(13, 2), MealSource.AI, null,
                List.of(MealItem.of(byId.get("frango"), 160), MealItem.of(byId.get("arroz"), 150), MealItem.of(byId.get("salada"), 80),
                        MealItem.of(byId.get("azeite"), 5)), now));
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
