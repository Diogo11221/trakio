package com.trakio.core.coaching;

import com.trakio.core.auth.AuthUser;
import com.trakio.core.coaching.CoachingDtos.StudentDetail;
import com.trakio.core.coaching.CoachingDtos.StudentView;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
class CoachingController {

    private final CoachingService coaching;
    private final SuggestionActionService actions;

    CoachingController(CoachingService coaching, SuggestionActionService actions) {
        this.coaching = coaching;
        this.actions = actions;
    }

    /** The client stops training with their PT (or abandons a checkout). */
    @DeleteMapping("/api/v1/me/coaching")
    @PreAuthorize("hasRole('CLIENT')")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    void end(@AuthenticationPrincipal AuthUser me) {
        coaching.endAsClient(me.id());
    }

    @GetMapping("/api/v1/trainer/students")
    List<StudentView> students(@AuthenticationPrincipal AuthUser me) {
        return coaching.students(me.id());
    }

    @GetMapping("/api/v1/trainer/students/{clientId}")
    StudentDetail student(@AuthenticationPrincipal AuthUser me, @PathVariable UUID clientId) {
        return coaching.student(me.id(), clientId);
    }

    record DecisionInput(@jakarta.validation.constraints.NotNull AiDecision.Decision decision,
            @jakarta.validation.constraints.Size(max = 120) String exercise) {}

    /** Apply or ignore an AI suggestion ({@code kind}: light-week, home-workout, variation). */
    @PostMapping("/api/v1/trainer/students/{clientId}/suggestions/{kind}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    void decide(@AuthenticationPrincipal AuthUser me, @PathVariable UUID clientId, @PathVariable String kind,
            @jakarta.validation.Valid @org.springframework.web.bind.annotation.RequestBody DecisionInput input) {
        actions.decide(me.id(), clientId, com.trakio.core.common.Enums.parse(AiDecision.Kind.class, kind, "kind"), input.decision(),
                input.exercise());
    }

    @PostMapping("/api/v1/trainer/students/{clientId}/end")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    void endStudent(@AuthenticationPrincipal AuthUser me, @PathVariable UUID clientId) {
        coaching.endAsTrainer(me.id(), clientId);
    }
}
