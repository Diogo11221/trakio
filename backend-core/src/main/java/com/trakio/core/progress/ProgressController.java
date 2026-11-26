package com.trakio.core.progress;

import com.trakio.core.auth.AuthUser;
import com.trakio.core.coaching.CoachingService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
class ProgressController {

    record WeightInput(@DecimalMin("30") @DecimalMax("300") double kg, LocalDate day) {}

    private final ProgressService progress;
    private final CoachingService coaching;

    ProgressController(ProgressService progress, CoachingService coaching) {
        this.progress = progress;
        this.coaching = coaching;
    }

    @GetMapping("/api/v1/me/weights")
    @PreAuthorize("hasRole('CLIENT')")
    List<ProgressService.WeightView> weights(@AuthenticationPrincipal AuthUser me) {
        return progress.weights(me.id());
    }

    @PostMapping("/api/v1/me/weights")
    @PreAuthorize("hasRole('CLIENT')")
    ProgressService.WeightView log(@AuthenticationPrincipal AuthUser me, @Valid @RequestBody WeightInput input) {
        return progress.logWeight(me.id(), input.kg(), input.day());
    }

    @DeleteMapping("/api/v1/me/weights/{id}")
    @PreAuthorize("hasRole('CLIENT')")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    void delete(@AuthenticationPrincipal AuthUser me, @PathVariable UUID id) {
        progress.deleteWeight(me.id(), id);
    }

    @GetMapping("/api/v1/me/progress")
    @PreAuthorize("hasRole('CLIENT')")
    ProgressService.Summary summary(@AuthenticationPrincipal AuthUser me, @RequestParam(defaultValue = "8") int weeks) {
        return progress.summary(me.id(), weeks);
    }

    @GetMapping("/api/v1/trainer/students/{clientId}/progress")
    ProgressService.Summary studentSummary(@AuthenticationPrincipal AuthUser me, @PathVariable UUID clientId,
            @RequestParam(defaultValue = "8") int weeks) {
        coaching.requireActiveStudent(me.id(), clientId);
        return progress.summary(clientId, weeks);
    }

    @GetMapping("/api/v1/trainer/students/{clientId}/weights")
    List<ProgressService.WeightView> studentWeights(@AuthenticationPrincipal AuthUser me, @PathVariable UUID clientId) {
        coaching.requireActiveStudent(me.id(), clientId);
        return progress.weights(clientId);
    }
}
