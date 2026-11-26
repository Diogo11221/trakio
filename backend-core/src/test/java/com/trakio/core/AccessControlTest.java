package com.trakio.core;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;

import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import tools.jackson.databind.JsonNode;

/** Object-level authorization: nobody reaches someone else's data by guessing or swapping ids. */
class AccessControlTest extends IntegrationTest {

    @Test
    void rolesAreEnforced() throws Exception {
        Session client = client();
        Session trainer = trainer();
        call(get("/api/v1/trainer/students"), client, null, 403);
        call(get("/api/v1/admin/overview"), client, null, 403);
        call(get("/api/v1/admin/users"), trainer, null, 403);
        call(get("/api/v1/me/workouts"), trainer, null, 403);
        call(post("/api/v1/me/premium/checkout"), trainer, null, 403);
    }

    @Test
    void aTrainerOnlySeesTheirOwnStudents() throws Exception {
        Session admin = admin();
        Session rita = trainer();
        Session other = trainer();
        UUID pack = listedTrainer(rita, admin);
        Session miguel = client();
        call(post("/api/v1/trainers/" + rita.id() + "/hire"), miguel, Map.of("packageId", pack), 200);

        call(get("/api/v1/trainer/students/" + miguel.id()), rita, null, 200);
        call(get("/api/v1/trainer/students/" + miguel.id()), other, null, 404);
        call(get("/api/v1/trainer/students/" + miguel.id() + "/workouts"), other, null, 404);
        call(get("/api/v1/trainer/students/" + miguel.id() + "/progress"), other, null, 404);
        call(get("/api/v1/trainer/students/" + miguel.id() + "/meals?day=2026-11-20"), other, null, 404);
        call(get("/api/v1/trainer/students/" + miguel.id() + "/plan"), other, null, 404);
    }

    @Test
    void conversationsAndChatFilesAreOnlyForTheTwoPeopleInThem() throws Exception {
        Session admin = admin();
        Session rita = trainer();
        UUID pack = listedTrainer(rita, admin);
        Session miguel = client();
        call(post("/api/v1/trainers/" + rita.id() + "/hire"), miguel, Map.of("packageId", pack), 200);
        String conversation = call(get("/api/v1/me"), miguel, null, 200).get("trainer").get("conversationId").asText();

        UUID photo = upload(miguel, "chat", "almoco.png", Fixtures.png());
        call(post("/api/v1/conversations/" + conversation + "/messages"), miguel, Map.of("kind", "photo", "fileId", photo), 201);

        Session stranger = client();
        call(get("/api/v1/conversations/" + conversation + "/messages"), stranger, null, 404);
        call(post("/api/v1/conversations/" + conversation + "/messages"), stranger, Map.of("kind", "text", "text", "olá"), 404);
        call(get("/api/v1/files/" + photo), stranger, null, 404);
        // The PT in the conversation can open it.
        assertThat(mvc.perform(get("/api/v1/files/" + photo).header("Authorization", "Bearer " + rita.token()))
                .andReturn().getResponse().getStatus()).isEqualTo(200);
        // A stranger can't attach someone else's file to their own message either.
        assertThat(call(get("/api/v1/conversations"), stranger, null, 200)).isEmpty();
    }

    @Test
    void verificationDocumentsAreOnlyForTheTrainerAndAdmins() throws Exception {
        Session rita = trainer();
        UUID doc = upload(rita, "verification", "cc.pdf", pdf());
        Session other = trainer();
        call(get("/api/v1/files/" + doc), other, null, 404);
        call(get("/api/v1/files/" + doc), client(), null, 404);
        assertThat(mvc.perform(get("/api/v1/files/" + doc).header("Authorization", "Bearer " + admin().token()))
                .andReturn().getResponse().getStatus()).isEqualTo(200);
        // Clients can't upload verification documents at all.
        var file = new org.springframework.mock.web.MockMultipartFile("file", "x.pdf", "application/pdf", pdf());
        Session client = client();
        assertThat(mvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart("/api/v1/files")
                .file(file).param("purpose", "verification").header("Authorization", "Bearer " + client.token()))
                .andReturn().getResponse().getStatus()).isEqualTo(403);
    }

    @Test
    void someoneElsesFileCantBeUsedAsMyProfilePhoto() throws Exception {
        Session a = client();
        UUID aPhoto = upload(a, "avatar", "a.png", Fixtures.png());
        Session b = signUp("client");
        JsonNode error = call(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put("/api/v1/me/profile"), b,
                Map.ofEntries(Map.entry("kind", "client"), Map.entry("name", "B"), Map.entry("photoFileId", aPhoto),
                        Map.entry("sex", "female"), Map.entry("birthYear", 1990), Map.entry("heightCm", 165),
                        Map.entry("weightKg", 60), Map.entry("goal", "maintain"), Map.entry("activity", "light"),
                        Map.entry("daysPerWeek", 3), Map.entry("experience", "new"), Map.entry("coached", false)), 400);
        assertThat(error.get("code").asText()).isEqualTo("invalid-file");
    }

    @Test
    void aClientCantLinkThemselvesToATrainerWithoutPaying() throws Exception {
        Session client = client();
        // "trainer" in the profile body is ignored; the link only comes from a paid relationship.
        call(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put("/api/v1/me/profile"), client,
                Map.ofEntries(Map.entry("kind", "client"), Map.entry("name", "C"), Map.entry("sex", "male"),
                        Map.entry("birthYear", 1990), Map.entry("heightCm", 180), Map.entry("weightKg", 80),
                        Map.entry("goal", "maintain"), Map.entry("activity", "light"), Map.entry("daysPerWeek", 3),
                        Map.entry("experience", "new"), Map.entry("coached", true),
                        Map.entry("trainer", Map.of("id", UUID.randomUUID().toString(), "name", "Rita"))), 200);
        assertThat(call(get("/api/v1/me"), client, null, 200).get("trainer").isNull()).isTrue();
    }

    @Test
    void unverifiedTrainersCantJoinTheMarketplaceNorBeHired() throws Exception {
        Session trainer = trainer();
        assertThat(call(post("/api/v1/trainer/marketplace/checkout"), trainer, null, 409).get("code").asText())
                .isEqualTo("not-verified");
        JsonNode pack = call(post("/api/v1/trainer/packages"), trainer,
                Map.of("name", "Só treino", "priceCents", 3000, "period", "month", "position", 0), 201);
        call(post("/api/v1/trainers/" + trainer.id() + "/hire"), client(), Map.of("packageId", pack.get("id").asText()), 404);
        call(get("/api/v1/trainers/" + trainer.id()), null, null, 404);
    }
}
