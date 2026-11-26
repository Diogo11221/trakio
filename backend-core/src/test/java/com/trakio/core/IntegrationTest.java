package com.trakio.core;

import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;

import com.trakio.core.account.Preferences;
import com.trakio.core.account.PreferencesRepository;
import com.trakio.core.auth.Role;
import com.trakio.core.auth.User;
import com.trakio.core.auth.UserRepository;
import com.trakio.core.config.RateLimitFilter;
import com.trakio.core.config.RequestSizeFilter;
import io.zonky.test.db.postgres.embedded.EmbeddedPostgres;
import java.io.IOException;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.context.WebApplicationContext;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

/**
 * Full application against a real PostgreSQL (embedded binaries — no Docker needed), with the
 * same security filter chain and servlet filters as production.
 */
@SpringBootTest
@ActiveProfiles("test")
public abstract class IntegrationTest {

    private static final EmbeddedPostgres POSTGRES;

    static {
        try {
            POSTGRES = EmbeddedPostgres.start();
        } catch (IOException e) {
            throw new IllegalStateException(e);
        }
    }

    @DynamicPropertySource
    static void database(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", () -> POSTGRES.getJdbcUrl("postgres", "postgres"));
        registry.add("spring.datasource.username", () -> "postgres");
        registry.add("spring.datasource.password", () -> "");
    }

    public static final String PASSWORD = "uma-palavra-passe-boa";

    @Autowired
    protected WebApplicationContext context;
    @Autowired
    protected ObjectMapper json;
    @Autowired
    protected UserRepository users;
    @Autowired
    protected PreferencesRepository preferences;
    @Autowired
    protected PasswordEncoder passwords;

    protected MockMvc mvc;

    @BeforeEach
    void setUpMvc() {
        mvc = MockMvcBuilders.webAppContextSetup(context)
                .addFilters(context.getBean(RateLimitFilter.class), context.getBean(RequestSizeFilter.class))
                .apply(springSecurity())
                .build();
    }

    public record Session(UUID id, String email, String token, String refresh) {}

    protected static String email(String prefix) {
        return prefix + "-" + UUID.randomUUID().toString().substring(0, 8) + "@trakio.test";
    }

    protected Session signUp(String role) throws Exception {
        String email = email(role);
        JsonNode body = call(post("/api/v1/auth/sign-up"), null, Map.of("email", email, "password", PASSWORD, "role", role), 201);
        return session(body, email);
    }

    protected Session signIn(String email, String password) throws Exception {
        JsonNode body = call(post("/api/v1/auth/sign-in"), null, Map.of("email", email, "password", password), 200);
        return session(body, email);
    }

    private static Session session(JsonNode body, String email) {
        return new Session(UUID.fromString(body.get("account").get("id").asText()), email, body.get("accessToken").asText(),
                body.get("refreshToken").asText());
    }

    /** Admins can't sign up, so tests create them directly. */
    protected Session admin() throws Exception {
        String email = email("admin");
        User admin = users.save(new User(email, passwords.encode(PASSWORD), Role.ADMIN));
        preferences.save(new Preferences(admin.getId()));
        return signIn(email, PASSWORD);
    }

    protected Session client() throws Exception {
        Session s = signUp("client");
        call(put("/api/v1/me/profile"), s, Map.ofEntries(
                Map.entry("kind", "client"), Map.entry("name", "Cliente Teste"), Map.entry("sex", "male"),
                Map.entry("birthYear", 1995), Map.entry("heightCm", 178), Map.entry("weightKg", 78),
                Map.entry("goalWeightKg", 81), Map.entry("goal", "gain"), Map.entry("activity", "moderate"),
                Map.entry("daysPerWeek", 4), Map.entry("experience", "some"), Map.entry("coached", false)), 200);
        return s;
    }

    protected Session trainer() throws Exception {
        Session s = signUp("trainer");
        call(put("/api/v1/me/profile"), s, Map.of("kind", "trainer", "name", "PT Teste", "article", "a", "city", "Lisboa",
                "online", true, "bio", "Treino de força.", "specialties", java.util.List.of("Hipertrofia", "Força")), 200);
        return s;
    }

    /** A PT who is verified, listed in the marketplace and sells one monthly package. Returns the package id. */
    protected UUID listedTrainer(Session trainer, Session admin) throws Exception {
        JsonNode pack = call(post("/api/v1/trainer/packages"), trainer,
                Map.of("name", "Treino + Nutrição", "description", "Plano e chat", "priceCents", 4500, "period", "month",
                        "position", 0), 201);
        UUID fileId = upload(trainer, "verification", "id.pdf", pdf());
        call(put("/api/v1/trainer/verification/documents/identity"), trainer, Map.of("fileId", fileId), 200);
        UUID title = upload(trainer, "verification", "title.pdf", pdf());
        call(put("/api/v1/trainer/verification/documents/professional-title"), trainer, Map.of("fileId", title), 200);
        call(post("/api/v1/trainer/verification/submit"), trainer, null, 200);
        JsonNode queue = call(get("/api/v1/admin/verifications"), admin, null, 200);
        String requestId = null;
        for (JsonNode item : queue) {
            if (item.get("trainerId").asText().equals(trainer.id().toString())) {
                requestId = item.get("id").asText();
            }
        }
        call(post("/api/v1/admin/verifications/" + requestId + "/decision"), admin, Map.of("decision", "approve"), 200);
        call(post("/api/v1/trainer/marketplace/checkout"), trainer, null, 200);
        return UUID.fromString(pack.get("id").asText());
    }

    protected UUID upload(Session s, String purpose, String name, byte[] bytes) throws Exception {
        var file = new org.springframework.mock.web.MockMultipartFile("file", name, "application/octet-stream", bytes);
        MvcResult result = mvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders
                        .multipart("/api/v1/files").file(file).param("purpose", purpose)
                        .header("Authorization", "Bearer " + s.token()))
                .andReturn();
        if (result.getResponse().getStatus() != 201) {
            throw new AssertionError("Upload failed: " + result.getResponse().getStatus() + " " + result.getResponse().getContentAsString());
        }
        return UUID.fromString(json.readTree(result.getResponse().getContentAsString()).get("id").asText());
    }

    protected static byte[] pdf() {
        return "%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF".getBytes();
    }

    /** Performs a request and checks the status; returns the JSON body (or null when empty). */
    protected JsonNode call(MockHttpServletRequestBuilder request, Session as, Object body, int expectedStatus) throws Exception {
        if (as != null) {
            request.header("Authorization", "Bearer " + as.token());
        }
        if (body != null) {
            request.contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(body));
        }
        MvcResult result = mvc.perform(request).andReturn();
        String content = result.getResponse().getContentAsString();
        if (result.getResponse().getStatus() != expectedStatus) {
            throw new AssertionError("Expected " + expectedStatus + " but got " + result.getResponse().getStatus() + ": " + content);
        }
        return content.isEmpty() ? null : json.readTree(content);
    }
}
