package com.trakio.core.ai;

import com.trakio.core.auth.AuthUser;
import com.trakio.core.common.ApiException;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Size;
import java.io.IOException;
import java.util.Map;
import java.util.UUID;
import org.springframework.http.MediaType;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

@RestController
class AiController {

    record EstimateInput(@Size(max = 500) String text, UUID photoFileId) {}

    private final AiService ai;

    AiController(AiService ai) {
        this.ai = ai;
    }

    /** Premium: estimate a meal from text and/or a photo. Nothing is saved until the app posts the confirmed meal. */
    @PostMapping("/api/v1/me/meals/ai-estimate")
    @PreAuthorize("hasRole('CLIENT')")
    AiService.Estimate estimate(@AuthenticationPrincipal AuthUser me, @Valid @RequestBody EstimateInput input) {
        return ai.estimateMeal(me.id(), input.text(), input.photoFileId());
    }

    @PostMapping(path = "/api/v1/me/meals/transcribe", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasRole('CLIENT')")
    Map<String, String> transcribe(@AuthenticationPrincipal AuthUser me, @RequestPart("audio") MultipartFile audio) {
        try {
            return Map.of("text", ai.transcribe(me.id(), audio.getBytes()));
        } catch (IOException e) {
            throw ApiException.badRequest("invalid-audio", "Não foi possível ler a gravação.");
        }
    }

    @GetMapping("/api/v1/me/readiness")
    @PreAuthorize("hasRole('CLIENT')")
    AiService.ReadinessView readiness(@AuthenticationPrincipal AuthUser me) {
        return ai.readiness(me.id());
    }
}
