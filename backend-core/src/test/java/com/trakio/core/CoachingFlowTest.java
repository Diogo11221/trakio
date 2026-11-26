package com.trakio.core;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import tools.jackson.databind.JsonNode;

/** The whole journey: PT gets verified and listed, a student hires them, they train and talk. */
class CoachingFlowTest extends IntegrationTest {

    @Test
    void hireTrainTalkAndReview() throws Exception {
        Session admin = admin();
        Session rita = trainer();
        UUID pack = listedTrainer(rita, admin);

        // Marketplace: public, filterable.
        JsonNode list = call(get("/api/v1/trainers?city=Lisboa&specialty=Força"), null, null, 200);
        assertThat(list.findValuesAsString("id")).contains(rita.id().toString());
        JsonNode detail = call(get("/api/v1/trainers/" + rita.id()), null, null, 200);
        assertThat(detail.get("packages").get(0).get("priceCents").asInt()).isEqualTo(4500);

        // Hire (fake payments complete at once).
        Session miguel = client();
        assertThat(call(post("/api/v1/trainers/" + rita.id() + "/hire"), miguel, Map.of("packageId", pack), 200)
                .get("status").asText()).isEqualTo("active");
        JsonNode me = call(get("/api/v1/me"), miguel, null, 200);
        assertThat(me.get("trainer").get("trainerId").asText()).isEqualTo(rita.id().toString());
        assertThat(me.get("profile").get("coached").asBoolean()).isTrue();
        // One PT at a time.
        call(post("/api/v1/trainers/" + rita.id() + "/hire"), miguel, Map.of("packageId", pack), 409);

        // The PT sees the new student and the payment minus the 10 % fee.
        JsonNode students = call(get("/api/v1/trainer/students"), rita, null, 200);
        assertThat(students.get(0).get("clientId").asText()).isEqualTo(miguel.id().toString());
        assertThat(students.get(0).get("tag").asText()).isEqualTo("new");
        JsonNode earnings = call(get("/api/v1/trainer/earnings"), rita, null, 200);
        assertThat(earnings.get("receivedCents").asLong()).isEqualTo(4500);
        assertThat(earnings.get("netCents").asLong()).isEqualTo(4050);

        // PT edits the student's plan and tells them in the chat.
        JsonNode plan = call(put("/api/v1/trainer/students/" + miguel.id() + "/plan"), rita, Map.of(
                "plan", Map.of("name", "Hipertrofia do Miguel", "weeks", 12, "workoutsPerWeek", 3, "days", List.of(
                        Map.of("label", "Treino A", "focus", "Peito", "exercises", List.of(
                                Map.of("exercise", "supino-plano", "sets", 3, "repsMin", 8, "repsMax", 10, "restSeconds", 120,
                                        "referenceKg", 80, "note", "Desce devagar"))))),
                "message", "Atualizei o teu plano para esta semana."), 200);
        JsonNode myPlan = call(get("/api/v1/me/plan"), miguel, null, 200);
        assertThat(myPlan.get("plan").get("name").asText()).isEqualTo("Hipertrofia do Miguel");
        String dayId = myPlan.get("nextDayId").asText();
        // A client with a PT can't swap to another plan on their own.
        JsonNode templates = call(get("/api/v1/plans/templates"), miguel, null, 200);
        call(put("/api/v1/me/plan"), miguel, Map.of("planId", templates.get(0).get("id").asText()), 409);

        // Two workouts: the second beats the first → a record, computed by the server.
        Instant now = Instant.now();
        finish(miguel, "w-1", plan.get("id").asText(), dayId, now.minus(3, ChronoUnit.DAYS), 80, 8);
        JsonNode second = finish(miguel, "w-2", plan.get("id").asText(), dayId, now.minus(1, ChronoUnit.HOURS), 85, 8);
        assertThat(second.get("records").get(0).asText()).isEqualTo("Supino plano");
        assertThat(second.get("volumeKg").asDouble()).isEqualTo(85 * 8 * 3);
        // Retrying the same upload returns the same workout instead of a copy.
        var retry = mvc.perform(post("/api/v1/me/workouts").header("Authorization", "Bearer " + miguel.token())
                .contentType("application/json").content(json.writeValueAsString(workout("w-2", plan.get("id").asText(), dayId,
                        now.minus(1, ChronoUnit.HOURS), 85, 8)))).andReturn().getResponse();
        assertThat(retry.getStatus()).isEqualTo(200);
        assertThat(json.readTree(retry.getContentAsString()).get("id").asText()).isEqualTo(second.get("id").asText());
        assertThat(call(get("/api/v1/me/workouts"), miguel, null, 200).get("totalElements").asLong()).isEqualTo(2);

        // Progress for the student and, through the relationship, for the PT.
        JsonNode progress = call(get("/api/v1/trainer/students/" + miguel.id() + "/progress"), rita, null, 200);
        assertThat(progress.get("exercises").get(0).get("exercise").asText()).isEqualTo("supino-plano");
        assertThat(progress.get("exercises").get(0).get("changePercent").asDouble()).isGreaterThan(0);

        // Chat: the plan message arrived; the student shares the workout card built from real data.
        String conversation = call(get("/api/v1/me"), miguel, null, 200).get("trainer").get("conversationId").asText();
        JsonNode conversations = call(get("/api/v1/conversations"), miguel, null, 200);
        assertThat(conversations.get(0).get("unread").asLong()).isEqualTo(1);
        JsonNode card = call(post("/api/v1/conversations/" + conversation + "/messages"), miguel,
                Map.of("kind", "workout", "sessionId", second.get("id").asText()), 201);
        assertThat(card.get("title").asText()).isEqualTo("Treino A · Peito concluído");
        assertThat(card.get("detail").asText()).contains("novo recorde: Supino plano");
        call(post("/api/v1/conversations/" + conversation + "/messages"), rita, Map.of("kind", "text", "text", "Boa!"), 201);
        JsonNode page = call(get("/api/v1/conversations/" + conversation + "/messages?after=0"), miguel, null, 200);
        assertThat(page.get("messages")).hasSize(3);
        // Someone else's workout can't be shared.
        Session other = client();
        JsonNode otherWorkout = finish(other, "o-1", null, null, now.minus(2, ChronoUnit.HOURS), 50, 5);
        call(post("/api/v1/conversations/" + conversation + "/messages"), miguel,
                Map.of("kind", "workout", "sessionId", otherWorkout.get("id").asText()), 400);

        // Reviews: only after training together.
        call(post("/api/v1/trainers/" + rita.id() + "/reviews"), other, Map.of("rating", 1, "comment", "Fraude"), 403);
        JsonNode review = call(post("/api/v1/trainers/" + rita.id() + "/reviews"), miguel, Map.of("rating", 5, "comment", "Top"), 200);
        assertThat(review.get("author").asText()).isEqualTo("Cliente");

        // Reporting a review and an admin removing it.
        JsonNode report = call(post("/api/v1/reports"), rita, Map.of("kind", "review", "reviewId", review.get("id").asText(),
                "reason", "Teste de moderação"), 201);
        call(post("/api/v1/admin/reports/" + report.get("id").asText() + "/resolve"), admin, Map.of("resolution", "remove-review"), 200);
        assertThat(call(get("/api/v1/trainers/" + rita.id() + "/reviews"), null, null, 200).get("totalElements").asLong()).isZero();

        // Refund: requested by the student, approved by an admin, which ends the coaching.
        JsonNode payments = call(get("/api/v1/me/payments"), miguel, null, 200);
        String paymentId = payments.get("content").get(0).get("id").asText();
        call(post("/api/v1/me/payments/" + paymentId + "/refund-request"), miguel, Map.of("reason", "Mudei de cidade"), 200);
        call(post("/api/v1/admin/payments/" + paymentId + "/refund-decision"), admin, Map.of("decision", "approve"), 200);
        assertThat(call(get("/api/v1/me"), miguel, null, 200).get("trainer").isNull()).isTrue();
        // After the coaching ends, the chat stays readable but closed.
        call(get("/api/v1/conversations/" + conversation + "/messages"), miguel, null, 200);
        call(post("/api/v1/conversations/" + conversation + "/messages"), miguel, Map.of("kind", "text", "text", "Olá?"), 409);
        call(get("/api/v1/trainer/students/" + miguel.id()), rita, null, 404);

        // Admin audit trail has the decisions.
        JsonNode audit = call(get("/api/v1/admin/audit"), admin, null, 200);
        assertThat(audit.findValuesAsString("action")).contains("verification.approve", "report.remove-review", "payment.refund.approve");
    }

    @Test
    void premiumIsBoughtAndCancelledOnlyWithExplicitConfirmation() throws Exception {
        Session s = client();
        assertThat(call(post("/api/v1/me/premium/checkout"), s, null, 200).get("status").asText()).isEqualTo("active");
        assertThat(call(get("/api/v1/me"), s, null, 200).get("premium").asBoolean()).isTrue();
        call(post("/api/v1/me/premium/checkout"), s, null, 409);
        call(post("/api/v1/me/premium/cancel"), s, Map.of("confirm", false), 400);
        JsonNode cancelled = call(post("/api/v1/me/premium/cancel"), s, Map.of("confirm", true), 200);
        assertThat(cancelled.get("cancelAtPeriodEnd").asBoolean()).isTrue();
        // Still Premium until the end of the paid month.
        assertThat(call(get("/api/v1/me"), s, null, 200).get("premium").asBoolean()).isTrue();
    }

    @Test
    void workoutTimesMustBePlausible() throws Exception {
        Session s = client();
        Instant now = Instant.now();
        call(post("/api/v1/me/workouts"), s, workout("bad-1", null, null, now.plus(2, ChronoUnit.DAYS), 50, 5), 400);
        call(post("/api/v1/me/workouts"), s, workout("bad-2", null, null, now.minus(90, ChronoUnit.DAYS), 50, 5), 400);
        call(post("/api/v1/me/workouts"), s, workout("bad-3", null, null, now, 5000, 5), 400);
        // Another person's plan can't be referenced.
        call(post("/api/v1/me/workouts"), s, workout("bad-4", UUID.randomUUID().toString(), null, now, 50, 5), 400);
    }

    @Test
    void liveWorkoutRoundTripsAndIsBounded() throws Exception {
        Session s = client();
        call(get("/api/v1/me/live-workout"), s, null, 204);
        call(put("/api/v1/me/live-workout"), s, Map.of("currentId", "supino-plano", "startedAt", 1), 200);
        assertThat(call(get("/api/v1/me/live-workout"), s, null, 200).get("state").get("currentId").asText()).isEqualTo("supino-plano");
        call(put("/api/v1/me/live-workout"), s, List.of(1, 2, 3), 400);
        call(delete("/api/v1/me/live-workout"), s, null, 204);
        call(get("/api/v1/me/live-workout"), s, null, 204);
    }

    private JsonNode finish(Session s, String ref, String planId, String dayId, Instant finishedAt, double kg, int reps)
            throws Exception {
        return call(post("/api/v1/me/workouts"), s, workout(ref, planId, dayId, finishedAt, kg, reps), 201);
    }

    private static Map<String, Object> workout(String ref, String planId, String dayId, Instant finishedAt, double kg, int reps) {
        var body = new java.util.HashMap<String, Object>();
        body.put("clientRef", ref);
        body.put("planId", planId);
        body.put("planDayId", dayId);
        body.put("title", "Treino A");
        body.put("focus", "Peito");
        body.put("startedAt", finishedAt.minus(50, ChronoUnit.MINUTES).toString());
        body.put("finishedAt", finishedAt.toString());
        body.put("feeling", "good");
        body.put("exercises", List.of(Map.of("exercise", "supino-plano", "sets",
                List.of(Map.of("kg", kg, "reps", reps), Map.of("kg", kg, "reps", reps), Map.of("kg", kg, "reps", reps)))));
        return body;
    }
}
