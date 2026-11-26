package com.trakio.core.coaching;

import com.trakio.core.account.ClientProfileRepository;
import com.trakio.core.chat.ChatService;
import com.trakio.core.common.ApiException;
import com.trakio.core.plan.PlanService;
import java.time.Clock;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** A PT applying or ignoring a suggestion. Applying changes the plan and/or tells the student in the chat. */
@Service
public class SuggestionActionService {

    private static final String HOME_WORKOUT = """
            Treino de 30 minutos para fazer em casa (3 voltas, 1 minuto de descanso entre voltas):
            • 15 agachamentos
            • 10 flexões (de joelhos, se precisares)
            • 12 afundos por perna
            • 30 segundos de prancha
            • 15 elevações de anca no chão
            Diz-me como correu!""";

    private final CoachingService coaching;
    private final PlanService plans;
    private final ChatService chat;
    private final AiDecisionRepository decisions;
    private final ClientProfileRepository clients;
    private final Clock clock;

    public SuggestionActionService(CoachingService coaching, PlanService plans, ChatService chat, AiDecisionRepository decisions,
            ClientProfileRepository clients, Clock clock) {
        this.coaching = coaching;
        this.plans = plans;
        this.chat = chat;
        this.decisions = decisions;
        this.clients = clients;
        this.clock = clock;
    }

    @Transactional
    public void decide(UUID trainerId, UUID clientId, AiDecision.Kind kind, AiDecision.Decision decision, String exercise) {
        coaching.requireActiveStudent(trainerId, clientId);
        if (decision == AiDecision.Decision.APPLIED) {
            String name = clients.findByUserId(clientId).map(c -> CoachingService.firstName(c.getName())).orElse("");
            switch (kind) {
                case LIGHT_WEEK -> plans.lighterWeek(trainerId, clientId,
                        "Olá " + name + "! Esta semana vamos aliviar: tirei uma série a cada exercício do teu plano. "
                                + "Descansa bem e diz-me como te sentes.");
                case HOME_WORKOUT -> chat.postFromTrainer(trainerId, clientId, HOME_WORKOUT);
                case VARIATION -> {
                    if (exercise == null || exercise.isBlank()) {
                        throw ApiException.badRequest("exercise-required", "Indica o exercício.");
                    }
                    chat.postFromTrainer(trainerId, clientId, "Nas próximas 2 semanas vamos trocar o " + exercise.trim().toLowerCase()
                            + " por uma variação, para desbloquear a carga. Depois voltamos a testar.");
                }
            }
        }
        decisions.save(new AiDecision(trainerId, clientId, kind, decision, clock.instant()));
    }
}
