package com.trakio.core;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;

import java.util.Map;
import org.junit.jupiter.api.Test;
import tools.jackson.databind.JsonNode;

class AuthSecurityTest extends IntegrationTest {

    @Test
    void signUpReturnsTokensAndNeverThePasswordHash() throws Exception {
        String email = email("new");
        JsonNode body = call(post("/api/v1/auth/sign-up"), null, Map.of("email", "  " + email.toUpperCase() + " ",
                "password", PASSWORD, "role", "client"), 201);
        assertThat(body.get("tokenType").asText()).isEqualTo("Bearer");
        assertThat(body.get("expiresIn").asLong()).isEqualTo(900);
        assertThat(body.get("account").get("email").asText()).isEqualTo(email);
        assertThat(body.get("account").get("role").asText()).isEqualTo("client");
        assertThat(body.toString()).doesNotContain("passwordHash").doesNotContain("argon2");
        assertThat(users.findByEmail(email).orElseThrow().getPasswordHash()).startsWith("{argon2}");
    }

    @Test
    void duplicateEmailIsRefused() throws Exception {
        Session s = signUp("client");
        JsonNode body = call(post("/api/v1/auth/sign-up"), null, Map.of("email", s.email(), "password", PASSWORD, "role", "client"), 409);
        assertThat(body.get("code").asText()).isEqualTo("email-taken");
    }

    @Test
    void weakAndCommonPasswordsAreRefused() throws Exception {
        assertThat(call(post("/api/v1/auth/sign-up"), null, Map.of("email", email("w"), "password", "curta", "role", "client"), 400)
                .get("code").asText()).isEqualTo("weak-password");
        assertThat(call(post("/api/v1/auth/sign-up"), null, Map.of("email", email("w"), "password", "password123", "role", "client"), 400)
                .get("code").asText()).isEqualTo("weak-password");
    }

    @Test
    void nobodyCanSignUpAsAdmin() throws Exception {
        call(post("/api/v1/auth/sign-up"), null, Map.of("email", email("x"), "password", PASSWORD, "role", "admin"), 400);
        call(post("/api/v1/auth/sign-up"), null, Map.of("email", email("x"), "password", PASSWORD, "role", "ADMIN"), 400);
    }

    @Test
    void wrongPasswordAndUnknownEmailGetTheSameAnswer() throws Exception {
        Session s = signUp("client");
        JsonNode wrong = call(post("/api/v1/auth/sign-in"), null, Map.of("email", s.email(), "password", "errada-123456"), 401);
        JsonNode unknown = call(post("/api/v1/auth/sign-in"), null, Map.of("email", email("ghost"), "password", "errada-123456"), 401);
        assertThat(wrong.get("code").asText()).isEqualTo("wrong-credentials");
        assertThat(unknown.get("detail").asText()).isEqualTo(wrong.get("detail").asText());
    }

    @Test
    void repeatedWrongPasswordsPauseTheEmailEvenForTheRightPassword() throws Exception {
        Session s = signUp("client");
        for (int i = 0; i < 5; i++) {
            call(post("/api/v1/auth/sign-in"), null, Map.of("email", s.email(), "password", "errada-123456"), 401);
        }
        JsonNode locked = call(post("/api/v1/auth/sign-in"), null, Map.of("email", s.email(), "password", PASSWORD), 429);
        assertThat(locked.get("code").asText()).isEqualTo("too-many-attempts");
    }

    @Test
    void refreshTokensRotateAndReuseRevokesTheWholeSession() throws Exception {
        Session s = signUp("client");
        JsonNode first = call(post("/api/v1/auth/refresh"), null, Map.of("refreshToken", s.refresh()), 200);
        String rotated = first.get("refreshToken").asText();
        assertThat(rotated).isNotEqualTo(s.refresh());

        // The old token is replayed (stolen): refused, and the rotated one dies with it.
        assertThat(call(post("/api/v1/auth/refresh"), null, Map.of("refreshToken", s.refresh()), 401).get("code").asText())
                .isEqualTo("invalid-refresh");
        call(post("/api/v1/auth/refresh"), null, Map.of("refreshToken", rotated), 401);
    }

    @Test
    void signOutRevokesTheRefreshToken() throws Exception {
        Session s = signUp("client");
        call(post("/api/v1/auth/sign-out"), null, Map.of("refreshToken", s.refresh()), 204);
        call(post("/api/v1/auth/refresh"), null, Map.of("refreshToken", s.refresh()), 401);
    }

    @Test
    void changingThePasswordKillsOldAccessTokensAtOnce() throws Exception {
        Session s = signUp("client");
        call(get("/api/v1/me"), s, null, 200);
        JsonNode fresh = call(post("/api/v1/me/password"), s,
                Map.of("currentPassword", PASSWORD, "newPassword", "outra-palavra-passe-boa"), 200);
        call(get("/api/v1/me"), s, null, 401);
        call(post("/api/v1/auth/refresh"), null, Map.of("refreshToken", s.refresh()), 401);
        call(get("/api/v1/me"), new Session(s.id(), s.email(), fresh.get("accessToken").asText(), null), null, 200);
    }

    @Test
    void requestsWithoutOrWithForgedTokensAreRejected() throws Exception {
        JsonNode none = call(get("/api/v1/me"), null, null, 401);
        assertThat(none.get("code").asText()).isEqualTo("unauthenticated");

        Session s = signUp("client");
        String[] parts = s.token().split("\\.");
        // Same header and signature, payload changed to claim the admin role.
        String payload = new String(java.util.Base64.getUrlDecoder().decode(parts[1])).replace("\"CLIENT\"", "\"ADMIN\"");
        String forged = parts[0] + "." + java.util.Base64.getUrlEncoder().withoutPadding().encodeToString(payload.getBytes()) + "." + parts[2];
        call(get("/api/v1/admin/overview"), new Session(s.id(), s.email(), forged, null), null, 401);
        // "alg: none" tokens are not accepted either.
        String none64 = java.util.Base64.getUrlEncoder().withoutPadding().encodeToString("{\"alg\":\"none\"}".getBytes());
        call(get("/api/v1/me"), new Session(s.id(), s.email(), none64 + "." + parts[1] + ".", null), null, 401);
    }

    @Test
    void suspendedAccountsAreLoggedOutEverywhere() throws Exception {
        Session admin = admin();
        Session s = signUp("client");
        call(post("/api/v1/admin/users/" + s.id() + "/suspend"), admin, Map.of("reason", "spam"), 204);
        call(get("/api/v1/me"), s, null, 401);
        call(post("/api/v1/auth/refresh"), null, Map.of("refreshToken", s.refresh()), 401);
        assertThat(call(post("/api/v1/auth/sign-in"), null, Map.of("email", s.email(), "password", PASSWORD), 403)
                .get("code").asText()).isEqualTo("account-suspended");
    }

    @Test
    void deletingTheAccountNeedsThePasswordAndRemovesEverything() throws Exception {
        Session s = client();
        call(delete("/api/v1/me"), s, Map.of("password", "errada-123456"), 400);
        call(delete("/api/v1/me"), s, Map.of("password", PASSWORD), 204);
        assertThat(users.findById(s.id())).isEmpty();
        call(post("/api/v1/auth/sign-in"), null, Map.of("email", s.email(), "password", PASSWORD), 401);
    }

    @Test
    void premiumCannotBeSwitchedOnByTheApp() throws Exception {
        Session s = client();
        // Unknown fields like "premium" are not part of preferences.
        call(put("/api/v1/me/preferences"), s, Map.of("vibration", false, "lockScreenAlert", true, "restSound", true, "premium", true), 200);
        assertThat(call(get("/api/v1/me"), s, null, 200).get("premium").asBoolean()).isFalse();
    }

    @Test
    void errorsAreProblemDetailsWithoutInternals() throws Exception {
        Session s = signUp("client");
        var result = mvc.perform(post("/api/v1/me/weights").header("Authorization", "Bearer " + s.token())
                .contentType("application/json").content("{not json")).andReturn();
        assertThat(result.getResponse().getStatus()).isEqualTo(400);
        assertThat(result.getResponse().getContentType()).contains("application/problem+json");
        assertThat(result.getResponse().getContentAsString()).doesNotContain("Exception").doesNotContain("tools.jackson");
    }

    @Test
    void securityHeadersAreSet() throws Exception {
        Session s = signUp("client");
        var response = mvc.perform(get("/api/v1/me").header("Authorization", "Bearer " + s.token())).andReturn().getResponse();
        assertThat(response.getHeader("X-Content-Type-Options")).isEqualTo("nosniff");
        assertThat(response.getHeader("X-Frame-Options")).isEqualTo("DENY");
        assertThat(response.getHeader("Content-Security-Policy")).contains("default-src 'none'");
        assertThat(response.getHeader("Cache-Control")).contains("no-store");
    }

    @Test
    void oversizedBodiesAreRejected() throws Exception {
        String huge = "{\"text\":\"" + "a".repeat(300 * 1024) + "\"}";
        var response = mvc.perform(post("/api/v1/auth/sign-in").contentType("application/json").content(huge)).andReturn().getResponse();
        assertThat(response.getStatus()).isEqualTo(413);
    }
}
