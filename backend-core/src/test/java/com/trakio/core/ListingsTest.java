package com.trakio.core;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;

import java.util.Map;
import org.junit.jupiter.api.Test;
import tools.jackson.databind.JsonNode;

/** Every list with optional filters, with and without them. */
class ListingsTest extends IntegrationTest {

    @Test
    void marketplaceWithAndWithoutFilters() throws Exception {
        call(get("/api/v1/trainers"), null, null, 200);
        call(get("/api/v1/trainers?city=online"), null, null, 200);
        call(get("/api/v1/trainers?specialty=Força"), null, null, 200);
    }

    @Test
    void exerciseLibrary() throws Exception {
        Session s = client();
        assertThat(call(get("/api/v1/exercises"), s, null, 200).get("totalElements").asLong()).isGreaterThan(20);
        assertThat(call(get("/api/v1/exercises?q=SUPINO"), s, null, 200).findValuesAsString("slug")).contains("supino-plano");
        assertThat(call(get("/api/v1/exercises?group=legs"), s, null, 200).findValuesAsString("group")).containsOnly("legs");
        assertThat(call(get("/api/v1/exercises").param("q", "%"), s, null, 200).get("totalElements").asLong()).isGreaterThan(20);
        call(get("/api/v1/exercises?group=wings"), s, null, 400);
        assertThat(call(get("/api/v1/foods?q=frango"), s, null, 200).findValuesAsString("id")).contains("frango");
        assertThat(call(get("/api/v1/plans/templates"), s, null, 200).get(0).get("name").asText()).isEqualTo("Treino A · B · C");
    }

    @Test
    void adminListsAndLibrary() throws Exception {
        Session admin = admin();
        Session c = client();
        call(get("/api/v1/admin/overview"), admin, null, 200);
        call(get("/api/v1/admin/overview?month=2026-13"), admin, null, 400);
        call(get("/api/v1/admin/users"), admin, null, 200);
        call(get("/api/v1/admin/users?role=trainer&status=active"), admin, null, 200);
        JsonNode found = call(get("/api/v1/admin/users?q=" + c.email().substring(0, 12)), admin, null, 200);
        assertThat(found.findValuesAsString("email")).contains(c.email());
        call(get("/api/v1/admin/payments"), admin, null, 200);
        call(get("/api/v1/admin/payments?status=refund-requested&kind=coaching"), admin, null, 200);
        call(get("/api/v1/admin/reports"), admin, null, 200);
        call(get("/api/v1/admin/reports?status=resolved"), admin, null, 200);
        call(get("/api/v1/admin/verifications?status=approved"), admin, null, 200);
        call(get("/api/v1/admin/verifications?status=refused"), admin, null, 200);
        assertThat(call(get("/api/v1/admin/users/totals"), admin, null, 200).get("all").asLong()).isPositive();
        JsonNode settings = call(get("/api/v1/admin/settings"), admin, null, 200);
        assertThat(settings.get("platformFeePercent").asInt()).isEqualTo(10);
        assertThat(settings.findValuesAsString("email")).contains(admin.email());
        assertThat(call(get("/api/v1/admin/exercises/demo-totals"), admin, null, 200).has("ready")).isTrue();
        call(get("/api/v1/admin/settings"), c, null, 403);
        call(get("/api/v1/admin/exercises"), admin, null, 200);
        JsonNode created = call(post("/api/v1/admin/exercises"), admin,
                Map.of("name", "Elevação pélvica unilateral", "group", "legs", "muscles", "Glúteos", "equipment", "Banco"), 201);
        assertThat(created.get("slug").asText()).isEqualTo("elevacao-pelvica-unilateral");
        call(post("/api/v1/admin/exercises"), admin, Map.of("name", "Elevação pélvica unilateral", "group", "legs"), 409);
        JsonNode ready = call(put("/api/v1/admin/exercises/" + created.get("id").asText() + "/demo-status"), admin,
                Map.of("demoStatus", "ready"), 200);
        assertThat(ready.get("demoStatus").asText()).isEqualTo("ready");
        // Admins can't suspend themselves or other admins.
        call(post("/api/v1/admin/users/" + admin.id() + "/suspend"), admin, Map.of(), 400);
        call(post("/api/v1/admin/users/" + admin().id() + "/suspend"), admin, Map.of(), 403);
    }

    @Test
    void trainerPlansCrud() throws Exception {
        Session pt = trainer();
        String template = call(get("/api/v1/plans/templates"), pt, null, 200).get(0).get("id").asText();
        JsonNode copy = call(post("/api/v1/trainer/plans/from-template/" + template), pt, null, 201);
        assertThat(copy.get("days")).hasSize(3);
        assertThat(call(get("/api/v1/trainer/plans"), pt, null, 200)).hasSize(1);
        // Another PT can't read, edit or delete it.
        Session other = trainer();
        call(get("/api/v1/plans/" + copy.get("id").asText()), other, null, 404);
        call(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete("/api/v1/trainer/plans/" + copy.get("id").asText()),
                other, null, 404);
        call(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete("/api/v1/trainer/plans/" + copy.get("id").asText()),
                pt, null, 204);
    }
}
