package com.trakio.core;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;

import com.trakio.core.ai.AiGateway;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import tools.jackson.databind.JsonNode;

/** AI features through backend-core, with backend-ai stubbed: both the AI path and the fallbacks. */
class AiFeaturesTest extends IntegrationTest {

    @MockitoBean
    AiGateway ai;

    @BeforeEach
    void aiIsDownByDefault() {
        when(ai.estimateMeal(any(), any(), any(), anyList())).thenReturn(Optional.empty());
        when(ai.readiness(any(), anyList())).thenReturn(Optional.empty());
        when(ai.insights(anyString(), any(), anyList(), anyInt(), anyInt(), anyList())).thenReturn(Optional.empty());
        when(ai.transcribe(any())).thenReturn(Optional.empty());
    }

    private Session premiumClient() throws Exception {
        Session s = client();
        call(post("/api/v1/me/premium/checkout"), s, null, 200);
        return s;
    }

    @Test
    void mealEstimateIsPremiumOnly() throws Exception {
        Session s = client();
        assertThat(call(post("/api/v1/me/meals/ai-estimate"), s, Map.of("text", "arroz"), 402).get("code").asText())
                .isEqualTo("premium-required");
    }

    @Test
    void mealEstimateUsesTheModelAndFallsBackToTheWordReader() throws Exception {
        Session s = premiumClient();
        // backend-ai down: the local reader still understands plain text.
        JsonNode fallback = call(post("/api/v1/me/meals/ai-estimate"), s, Map.of("text", "2 ovos e arroz"), 200);
        assertThat(fallback.get("ai").asBoolean()).isFalse();
        assertThat(fallback.findValuesAsString("foodId")).containsExactly("ovo", "arroz");

        when(ai.estimateMeal(eq("bacalhau à brás"), any(), any(), anyList())).thenReturn(Optional.of(new AiGateway.MealEstimate(
                List.of(new AiGateway.EstimatedItem(null, "Bacalhau à Brás", 350, new AiGateway.Per100(170, 11, 9, 10), "medium")),
                List.of(), "Assumi uma dose de restaurante.", "model")));
        JsonNode estimate = call(post("/api/v1/me/meals/ai-estimate"), s, Map.of("text", "bacalhau à brás"), 200);
        assertThat(estimate.get("ai").asBoolean()).isTrue();
        assertThat(estimate.get("items").get(0).get("name").asText()).isEqualTo("Bacalhau à Brás");

        // A photo must be the person's own meal photo.
        UUID other = upload(client(), "meal", "prato.png", Fixtures.png());
        call(post("/api/v1/me/meals/ai-estimate"), s, Map.of("photoFileId", other), 400);
        UUID mine = upload(s, "meal", "prato.png", Fixtures.png());
        JsonNode photoOnly = call(post("/api/v1/me/meals/ai-estimate"), s, Map.of("photoFileId", mine), 200);
        assertThat(photoOnly.get("items")).isEmpty();
        assertThat(photoOnly.get("note").asText()).contains("fotos");
    }

    @Test
    void voiceNeedsTheAiServiceAndSaysSoClearly() throws Exception {
        Session s = premiumClient();
        var audio = new org.springframework.mock.web.MockMultipartFile("audio", "a.m4a", "audio/mp4", new byte[] {0, 0, 0, 32});
        var response = mvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders
                .multipart("/api/v1/me/meals/transcribe").file(audio).header("Authorization", "Bearer " + s.token()))
                .andReturn().getResponse();
        assertThat(response.getStatus()).isEqualTo(503);
        assertThat(response.getContentAsString()).contains("voice-unavailable");
    }

    @Test
    void readinessComesFromTheModelOrTheSimpleRule() throws Exception {
        Session s = client();
        JsonNode fallback = call(get("/api/v1/me/readiness"), s, null, 200);
        assertThat(fallback.get("score").asInt()).isEqualTo(85);
        assertThat(fallback.get("model").asBoolean()).isFalse();

        when(ai.readiness(any(), anyList())).thenReturn(Optional.of(new AiGateway.Readiness(61, "steady", 1, 1.4, List.of(), "bootstrap")));
        JsonNode model = call(get("/api/v1/me/readiness"), s, null, 200);
        assertThat(model.get("score").asInt()).isEqualTo(61);
        assertThat(model.get("model").asBoolean()).isTrue();
    }

    @Test
    void trainerSuggestionsCanBeAppliedOnceAndChangeThePlan() throws Exception {
        Session admin = admin();
        Session rita = trainer();
        UUID pack = listedTrainer(rita, admin);
        Session miguel = client();
        call(post("/api/v1/trainers/" + rita.id() + "/hire"), miguel, Map.of("packageId", pack), 200);

        when(ai.insights(anyString(), any(), anyList(), anyInt(), anyInt(), anyList())).thenReturn(Optional.of(new AiGateway.Insights(48,
                List.of(new AiGateway.Suggestion("light-week", "Cansaço alto previsto", "A carga subiu.", "Aplicar semana leve", 1)))));
        JsonNode students = call(get("/api/v1/trainer/students"), rita, null, 200);
        assertThat(students.get(0).get("tag").asText()).isEqualTo("attention");
        assertThat(students.get(0).get("readiness").asInt()).isEqualTo(48);
        assertThat(students.get(0).get("suggestion").get("kind").asText()).isEqualTo("light-week");

        int setsBefore = call(get("/api/v1/me/plan"), miguel, null, 200).at("/plan/days/0/exercises/0/sets").asInt();
        call(post("/api/v1/trainer/students/" + miguel.id() + "/suggestions/light-week"), rita, Map.of("decision", "applied"), 204);
        int setsAfter = call(get("/api/v1/me/plan"), miguel, null, 200).at("/plan/days/0/exercises/0/sets").asInt();
        assertThat(setsAfter).isEqualTo(setsBefore - 1);
        String conversation = call(get("/api/v1/me"), miguel, null, 200).at("/trainer/conversationId").asText();
        assertThat(call(get("/api/v1/conversations/" + conversation + "/messages"), miguel, null, 200).toString()).contains("aliviar");

        // Decided: hidden for two weeks.
        JsonNode detail = call(get("/api/v1/trainer/students/" + miguel.id()), rita, null, 200);
        assertThat(detail.get("suggestions")).isEmpty();
        // Not their student: no decisions.
        call(post("/api/v1/trainer/students/" + miguel.id() + "/suggestions/light-week"), trainer(), Map.of("decision", "applied"), 404);
    }

    @Test
    void agendaIsPrivateToThePtAndTheirStudents() throws Exception {
        Session admin = admin();
        Session rita = trainer();
        UUID pack = listedTrainer(rita, admin);
        Session miguel = client();
        call(post("/api/v1/trainers/" + rita.id() + "/hire"), miguel, Map.of("packageId", pack), 200);
        Instant at = Instant.now().plus(1, ChronoUnit.DAYS);
        JsonNode created = call(post("/api/v1/trainer/agenda"), rita, Map.of("clientId", miguel.id(), "startsAt", at.toString(),
                "durationMinutes", 45, "title", "Sessão online", "online", true), 201);
        assertThat(created.at("/with/name").asText()).isEqualTo("Cliente Teste");
        assertThat(call(get("/api/v1/trainer/agenda"), rita, null, 200)).hasSize(1);
        assertThat(call(get("/api/v1/me/agenda"), miguel, null, 200).get(0).get("title").asText()).isEqualTo("Sessão online");

        Session other = trainer();
        call(post("/api/v1/trainer/agenda"), other, Map.of("clientId", miguel.id(), "startsAt", at.toString(),
                "durationMinutes", 45, "title", "Intruso"), 404);
        call(delete("/api/v1/trainer/agenda/" + created.get("id").asText()), other, null, 404);
        call(delete("/api/v1/trainer/agenda/" + created.get("id").asText()), rita, null, 204);
    }
}
