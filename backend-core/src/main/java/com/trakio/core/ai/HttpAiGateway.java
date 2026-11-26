package com.trakio.core.ai;

import com.trakio.core.config.TrakioProperties;
import java.net.http.HttpClient;
import java.time.Duration;
import java.time.Instant;
import java.util.Base64;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.http.MediaType;
import org.springframework.http.client.JdkClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestClientResponseException;
import tools.jackson.core.JacksonException;
import tools.jackson.databind.PropertyNamingStrategies;
import tools.jackson.databind.json.JsonMapper;

/** Calls backend-ai over the internal network with the shared token. Failures become "no answer". */
@Component
class HttpAiGateway implements AiGateway {

    private static final Logger log = LoggerFactory.getLogger(HttpAiGateway.class);

    private final TrakioProperties.Ai config;
    private final RestClient http;
    /** backend-ai speaks snake_case. */
    private final JsonMapper json = JsonMapper.builder().propertyNamingStrategy(PropertyNamingStrategies.SNAKE_CASE)
            .findAndAddModules().build();

    HttpAiGateway(TrakioProperties properties) {
        this.config = properties.ai();
        var factory = new JdkClientHttpRequestFactory(HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(3)).build());
        factory.setReadTimeout(config.timeout());
        this.http = RestClient.builder().baseUrl(config.enabled() ? config.baseUrl() : "http://ai.invalid")
                .requestFactory(factory).defaultHeader("X-Internal-Token", config.enabled() ? config.token() : "").build();
        if (!config.enabled()) {
            log.info("backend-ai is not configured: AI features use their simple fallbacks");
        }
    }

    private <T> Optional<T> post(String path, Object body, Class<T> type) {
        if (!config.enabled()) {
            return Optional.empty();
        }
        try {
            String response = http.post().uri(path).contentType(MediaType.APPLICATION_JSON)
                    .body(json.writeValueAsString(body)).retrieve().body(String.class);
            return Optional.ofNullable(response).map(r -> json.readValue(r, type));
        } catch (RestClientResponseException e) {
            log.warn("backend-ai {} answered {}", path, e.getStatusCode().value());
        } catch (RestClientException | JacksonException e) {
            log.warn("backend-ai {} unavailable: {}", path, e.getClass().getSimpleName());
        }
        return Optional.empty();
    }

    @Override
    public Optional<MealEstimate> estimateMeal(String text, byte[] image, String mediaType, List<CatalogFood> catalog) {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("text", text);
        body.put("image_base64", image == null ? null : Base64.getEncoder().encodeToString(image));
        body.put("image_media_type", image == null ? null : mediaType);
        body.put("catalog", catalog);
        return post("/v1/meals/estimate", body, MealEstimate.class);
    }

    @Override
    public Optional<String> transcribe(byte[] audio) {
        if (!config.enabled()) {
            return Optional.empty();
        }
        var form = new LinkedMultiValueMap<String, Object>();
        form.add("audio", new ByteArrayResource(audio) {
            @Override
            public String getFilename() {
                return "meal.audio";
            }
        });
        try {
            String response = http.post().uri("/v1/transcribe").contentType(MediaType.MULTIPART_FORM_DATA).body(form)
                    .retrieve().body(String.class);
            return Optional.ofNullable(response).map(r -> json.readTree(r).path("text").asText(""));
        } catch (RestClientException | JacksonException e) {
            log.warn("backend-ai transcription unavailable: {}", e.getClass().getSimpleName());
            return Optional.empty();
        }
    }

    @Override
    public Optional<Readiness> readiness(Instant now, List<SessionPoint> sessions) {
        return post("/v1/readiness", Map.of("now", now.toString(), "sessions", sessions), Readiness.class);
    }

    @Override
    public Optional<Insights> insights(String firstName, Instant now, List<SessionPoint> sessions, int done, int expected,
            List<String> stalled) {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("first_name", firstName);
        body.put("now", now.toString());
        body.put("sessions", sessions);
        body.put("workouts_done", done);
        body.put("workouts_expected", expected);
        body.put("stalled_exercises", stalled);
        return post("/v1/insights", body, Insights.class);
    }
}
