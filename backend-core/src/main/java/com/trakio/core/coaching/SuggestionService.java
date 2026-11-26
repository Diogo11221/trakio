package com.trakio.core.coaching;

import com.trakio.core.ai.AiGateway;
import com.trakio.core.ai.AiService;
import com.trakio.core.common.Enums;
import com.trakio.core.progress.ProgressService;
import com.trakio.core.workout.WorkoutSessionRepository;
import java.time.Clock;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;
import org.springframework.stereotype.Service;

/**
 * AI suggestions about one student for their PT (from backend-ai), minus the ones the PT already
 * applied or ignored in the last two weeks. Without backend-ai, the same three checks run here.
 */
@Service
public class SuggestionService {

    public record SuggestionView(String kind, String title, String body, String action) {}

    public record Result(Integer readiness, List<SuggestionView> suggestions) {}

    private static final long HIDE_DAYS = 14;

    private final AiGateway ai;
    private final AiDecisionRepository decisions;
    private final WorkoutSessionRepository sessions;
    private final ProgressService progress;
    private final Clock clock;

    public SuggestionService(AiGateway ai, AiDecisionRepository decisions, WorkoutSessionRepository sessions,
            ProgressService progress, Clock clock) {
        this.ai = ai;
        this.decisions = decisions;
        this.sessions = sessions;
        this.progress = progress;
        this.clock = clock;
    }

    public Result forStudent(UUID trainerId, UUID clientId, String firstName, int done, int expected) {
        Instant now = clock.instant();
        var recent = sessions.findByUserIdAndFinishedAtAfterOrderByFinishedAtDesc(clientId, now.minus(35, ChronoUnit.DAYS));
        List<String> stalled = progress.summary(clientId, 6).exercises().stream().filter(e -> e.stalled())
                .map(e -> e.name()).toList();
        Set<String> decided = decisions.findByTrainerIdAndClientIdAndCreatedAtAfter(trainerId, clientId,
                now.minus(HIDE_DAYS, ChronoUnit.DAYS)).stream().map(d -> Enums.json(d.getKind())).collect(Collectors.toSet());

        var insights = ai.insights(firstName, now, AiService.points(recent), done, expected, stalled);
        Integer readiness = insights.map(AiGateway.Insights::readiness).orElse(null);
        List<SuggestionView> list = insights
                .map(i -> i.suggestions().stream().map(s -> new SuggestionView(s.kind(), s.title(), s.body(), s.action())).toList())
                .orElseGet(() -> fallback(firstName, done, expected, stalled));
        return new Result(readiness, list.stream().filter(s -> !decided.contains(s.kind())).toList());
    }

    private static List<SuggestionView> fallback(String name, int done, int expected, List<String> stalled) {
        List<SuggestionView> out = new ArrayList<>();
        if (expected >= 2 && done < expected * 0.7) {
            int missed = expected - done;
            out.add(new SuggestionView("home-workout", "Faltou " + missed + (missed == 1 ? " treino" : " treinos") + " nas últimas semanas",
                    name + " fez " + done + " de " + expected + " treinos previstos. Sugestão: enviar um treino de 30 minutos para fazer em casa.",
                    "Enviar treino em casa"));
        }
        if (!stalled.isEmpty()) {
            String exercise = stalled.getFirst();
            out.add(new SuggestionView("variation", exercise + " sem evolução há 3 semanas",
                    "A carga máxima estimada no " + exercise.toLowerCase(Locale.ROOT)
                            + " não sobe há 3 semanas. Sugestão: 2 semanas com uma variação antes de voltar a testar.",
                    "Aplicar variação"));
        }
        return out;
    }
}
