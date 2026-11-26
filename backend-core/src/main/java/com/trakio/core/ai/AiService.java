package com.trakio.core.ai;

import com.trakio.core.ai.AiGateway.SessionPoint;
import com.trakio.core.billing.SubscriptionKind;
import com.trakio.core.billing.SubscriptionRepository;
import com.trakio.core.common.ApiException;
import com.trakio.core.files.FilePurpose;
import com.trakio.core.files.FileService;
import com.trakio.core.files.StoredFile;
import com.trakio.core.files.StoredFileRepository;
import com.trakio.core.nutrition.FoodRepository;
import com.trakio.core.nutrition.MealParser;
import com.trakio.core.workout.WorkoutSession;
import com.trakio.core.workout.WorkoutSessionRepository;
import java.io.IOException;
import java.io.InputStream;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Locale;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AiService {

    public record EstimateItem(String foodId, String name, double grams, AiGateway.Per100 per100, String confidence) {}

    public record Estimate(List<EstimateItem> items, List<String> unrecognised, String note, boolean ai) {}

    public record ReadinessView(int score, String level, Integer daysSinceLast, boolean model) {}

    static final int MAX_AUDIO_BYTES = 10 * 1024 * 1024;

    private final AiGateway ai;
    private final MealParser parser;
    private final FoodRepository foods;
    private final StoredFileRepository files;
    private final FileService fileService;
    private final SubscriptionRepository subscriptions;
    private final WorkoutSessionRepository sessions;
    private final Clock clock;

    public AiService(AiGateway ai, MealParser parser, FoodRepository foods, StoredFileRepository files, FileService fileService,
            SubscriptionRepository subscriptions, WorkoutSessionRepository sessions, Clock clock) {
        this.ai = ai;
        this.parser = parser;
        this.foods = foods;
        this.files = files;
        this.fileService = fileService;
        this.subscriptions = subscriptions;
        this.sessions = sessions;
        this.clock = clock;
    }

    private void requirePremium(UUID userId) {
        boolean premium = subscriptions.findByUserIdAndKind(userId, SubscriptionKind.PREMIUM).map(s -> s.grantsAccess()).orElse(false);
        if (!premium) {
            throw new ApiException(HttpStatus.PAYMENT_REQUIRED, "premium-required", "O registo de refeições com IA faz parte do Premium.");
        }
    }

    /**
     * Text and/or a photo the person already uploaded (purpose "meal") → foods to review. Nothing is
     * saved here: the app shows the estimate and only "Confirmar" stores the meal.
     */
    @Transactional(readOnly = true)
    public Estimate estimateMeal(UUID userId, String text, UUID photoFileId) {
        requirePremium(userId);
        String clean = text == null ? null : text.strip();
        if ((clean == null || clean.isEmpty()) && photoFileId == null) {
            throw ApiException.badRequest("empty-meal", "Escreve o que comeste ou junta uma foto.");
        }
        byte[] image = null;
        String mediaType = null;
        if (photoFileId != null) {
            fileService.requireOwned(userId, photoFileId, FilePurpose.MEAL);
            StoredFile file = files.findById(photoFileId).orElseThrow();
            try (InputStream in = fileService.open(file)) {
                image = in.readAllBytes();
                mediaType = file.getContentType();
            } catch (IOException e) {
                throw ApiException.badRequest("invalid-file", "Não foi possível ler a foto.");
            }
        }
        List<AiGateway.CatalogFood> catalog = foods.findAll().stream()
                .map(f -> new AiGateway.CatalogFood(f.getId(), f.getName(),
                        new AiGateway.Per100(f.getKcal(), f.getProtein(), f.getCarbs(), f.getFat())))
                .toList();
        var result = ai.estimateMeal(clean, image, mediaType, catalog).filter(r -> !"unavailable".equals(r.source()));
        if (result.isPresent()) {
            var r = result.get();
            return new Estimate(r.items().stream()
                    .map(i -> new EstimateItem(i.foodId(), i.name(), i.grams(), i.per100(), i.confidence())).toList(),
                    r.unrecognised(), r.note(), true);
        }
        // Fallback: the same word-based reader the quick add uses (text only).
        if (clean == null || clean.isEmpty()) {
            return new Estimate(List.of(), List.of(), "Ainda não consigo ler fotos. Escreve o que está no prato.", false);
        }
        MealParser.Parsed parsed = parser.parse(clean.length() > 500 ? clean.substring(0, 500) : clean);
        return new Estimate(parsed.items().stream().map(i -> new EstimateItem(i.getFoodId(), i.getName(), i.getGrams(),
                new AiGateway.Per100(i.getKcalPerG() * 100, i.getProteinPerG() * 100, i.getCarbsPerG() * 100, i.getFatPerG() * 100),
                "medium")).toList(), parsed.unknown(), "", false);
    }

    /** Voice → text, so the person can check it before estimating. The audio is not stored. */
    public String transcribe(UUID userId, byte[] audio) {
        requirePremium(userId);
        if (audio.length == 0 || audio.length > MAX_AUDIO_BYTES) {
            throw ApiException.badRequest("invalid-audio", "A gravação é demasiado longa ou está vazia.");
        }
        return ai.transcribe(audio).filter(t -> !t.isBlank())
                .orElseThrow(() -> new ApiException(HttpStatus.SERVICE_UNAVAILABLE, "voice-unavailable",
                        "O registo por voz não está disponível agora. Escreve a refeição."));
    }

    @Transactional(readOnly = true)
    public ReadinessView readiness(UUID userId) {
        Instant now = clock.instant();
        List<WorkoutSession> recent = sessions.findByUserIdAndFinishedAtAfterOrderByFinishedAtDesc(userId, now.minus(35, ChronoUnit.DAYS));
        return ai.readiness(now, points(recent))
                .map(r -> new ReadinessView(r.score(), r.level(), r.daysSinceLast(), true))
                .orElseGet(() -> heuristic(recent, now));
    }

    public static List<SessionPoint> points(List<WorkoutSession> sessions) {
        return sessions.stream().map(s -> new SessionPoint(s.getFinishedAt(), s.getVolumeKg(), s.getSetCount(),
                s.getFeeling() == null ? null : s.getFeeling().name().toLowerCase(Locale.ROOT))).toList();
    }

    /** Same rule the app used before backend-ai: rest pushes readiness up, hard recent sessions pull it down. */
    static ReadinessView heuristic(List<WorkoutSession> recent, Instant now) {
        if (recent.isEmpty()) {
            return new ReadinessView(85, "ready", null, false);
        }
        WorkoutSession last = recent.getFirst();
        int days = (int) Duration.between(last.getFinishedAt(), now).toDays();
        int value = 80;
        if (last.getFeeling() != null) {
            value -= switch (last.getFeeling()) {
                case MAX -> 16;
                case HARD -> 8;
                default -> 0;
            };
        }
        value += days == 0 ? -12 : days == 1 ? -4 : days >= 3 ? 6 : 0;
        long week = recent.stream().filter(s -> s.getFinishedAt().isAfter(now.minus(7, ChronoUnit.DAYS))).count();
        if (week >= 5) {
            value -= 8;
        }
        value = Math.clamp(value, 30, 98);
        return new ReadinessView(value, value >= 75 ? "ready" : value >= 55 ? "steady" : "rest", days, false);
    }
}
