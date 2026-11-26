package com.trakio.core;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;

import org.junit.jupiter.api.Test;
import org.springframework.test.context.ActiveProfiles;
import tools.jackson.databind.JsonNode;

/** The "dev" profile seeds the same test accounts the app uses, so the phone works against a local API. */
@ActiveProfiles({"test", "dev"})
class DevSeedTest extends IntegrationTest {

    @Test
    void demoAccountsAreReady() throws Exception {
        Session miguel = signIn("miguel@trakio.test", "trakio123");
        JsonNode me = call(get("/api/v1/me"), miguel, null, 200);
        assertThat(me.get("profile").get("name").asText()).isEqualTo("Miguel Costa");
        assertThat(me.get("premium").asBoolean()).isTrue();
        assertThat(me.get("trainer").get("name").asText()).isEqualTo("Rita Santos");
        assertThat(call(get("/api/v1/me/workouts"), miguel, null, 200).get("totalElements").asLong()).isEqualTo(24);
        assertThat(call(get("/api/v1/me/progress"), miguel, null, 200).get("exercises").size()).isGreaterThan(10);
        assertThat(call(get("/api/v1/me/weights"), miguel, null, 200).size()).isEqualTo(9);

        Session rita = signIn("rita@trakio.test", "trakio123");
        assertThat(call(get("/api/v1/trainer/students"), rita, null, 200).findValuesAsString("name"))
                .contains("Miguel Costa", "Ana Ribeiro");
        assertThat(call(get("/api/v1/trainer/earnings"), rita, null, 200).get("receivedCents").asLong()).isPositive();

        assertThat(call(get("/api/v1/trainers"), null, null, 200).findValuesAsString("name"))
                .contains("Rita Santos", "Tiago Ferreira", "Bruno Lopes").doesNotContain("Inês Almeida");

        Session admin = signIn("admin@trakio.test", "trakio123");
        assertThat(call(get("/api/v1/admin/verifications"), admin, null, 200).findValuesAsString("name")).contains("Inês Almeida");
        assertThat(call(get("/api/v1/admin/overview"), admin, null, 200).get("revenueCents").asLong()).isPositive();
    }
}
