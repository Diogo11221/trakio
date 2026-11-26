package com.trakio.core.workout;

import com.trakio.core.auth.AuthUser;
import com.trakio.core.coaching.CoachingService;
import com.trakio.core.common.PageResponse;
import com.trakio.core.workout.WorkoutDtos.FinishWorkoutInput;
import com.trakio.core.workout.WorkoutDtos.SessionView;
import jakarta.validation.Valid;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import tools.jackson.databind.JsonNode;

@RestController
class WorkoutController {

    private final WorkoutService workouts;
    private final CoachingService coaching;

    WorkoutController(WorkoutService workouts, CoachingService coaching) {
        this.workouts = workouts;
        this.coaching = coaching;
    }

    @GetMapping("/api/v1/me/workouts")
    @PreAuthorize("hasRole('CLIENT')")
    PageResponse<SessionView> history(@AuthenticationPrincipal AuthUser me, @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "50") int size) {
        return workouts.history(me.id(), page, size);
    }

    @GetMapping("/api/v1/me/workouts/{id}")
    @PreAuthorize("hasRole('CLIENT')")
    SessionView get(@AuthenticationPrincipal AuthUser me, @PathVariable UUID id) {
        return workouts.get(me.id(), id);
    }

    /** 201 when saved now, 200 when this clientRef was already saved (a retry). */
    @PostMapping("/api/v1/me/workouts")
    @PreAuthorize("hasRole('CLIENT')")
    ResponseEntity<SessionView> finish(@AuthenticationPrincipal AuthUser me, @Valid @RequestBody FinishWorkoutInput input) {
        var saved = workouts.finish(me.id(), input);
        return ResponseEntity.status(saved.created() ? HttpStatus.CREATED : HttpStatus.OK).body(saved.session());
    }

    @GetMapping("/api/v1/me/live-workout")
    @PreAuthorize("hasRole('CLIENT')")
    ResponseEntity<WorkoutService.LiveView> live(@AuthenticationPrincipal AuthUser me) {
        return workouts.live(me.id()).map(ResponseEntity::ok).orElse(ResponseEntity.noContent().build());
    }

    @PutMapping("/api/v1/me/live-workout")
    @PreAuthorize("hasRole('CLIENT')")
    WorkoutService.LiveView saveLive(@AuthenticationPrincipal AuthUser me, @RequestBody JsonNode state) {
        return workouts.saveLive(me.id(), state);
    }

    @DeleteMapping("/api/v1/me/live-workout")
    @PreAuthorize("hasRole('CLIENT')")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    void clearLive(@AuthenticationPrincipal AuthUser me) {
        workouts.clearLive(me.id());
    }

    /** A PT reading one of their students' workouts. */
    @GetMapping("/api/v1/trainer/students/{clientId}/workouts")
    PageResponse<SessionView> studentHistory(@AuthenticationPrincipal AuthUser me, @PathVariable UUID clientId,
            @RequestParam(defaultValue = "0") int page, @RequestParam(defaultValue = "50") int size) {
        coaching.requireActiveStudent(me.id(), clientId);
        return workouts.history(clientId, page, size);
    }
}
