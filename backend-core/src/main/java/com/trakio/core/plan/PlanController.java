package com.trakio.core.plan;

import com.trakio.core.auth.AuthUser;
import com.trakio.core.plan.PlanDtos.ChoosePlanInput;
import com.trakio.core.plan.PlanDtos.MyPlan;
import com.trakio.core.plan.PlanDtos.PlanInput;
import com.trakio.core.plan.PlanDtos.PlanSummary;
import com.trakio.core.plan.PlanDtos.PlanView;
import com.trakio.core.plan.PlanDtos.StudentPlanInput;
import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
class PlanController {

    private final PlanService plans;

    PlanController(PlanService plans) {
        this.plans = plans;
    }

    @GetMapping("/api/v1/plans/templates")
    List<PlanSummary> templates() {
        return plans.templates();
    }

    @GetMapping("/api/v1/plans/{id}")
    PlanView get(@AuthenticationPrincipal AuthUser me, @PathVariable UUID id) {
        return plans.get(me, id);
    }

    @GetMapping("/api/v1/me/plan")
    @PreAuthorize("hasRole('CLIENT')")
    MyPlan myPlan(@AuthenticationPrincipal AuthUser me) {
        return plans.myPlan(me.id());
    }

    @PutMapping("/api/v1/me/plan")
    @PreAuthorize("hasRole('CLIENT')")
    MyPlan choose(@AuthenticationPrincipal AuthUser me, @Valid @RequestBody ChoosePlanInput input) {
        return plans.chooseTemplate(me.id(), input.planId());
    }

    // ── PT ──────────────────────────────────────────────────────────────────

    @GetMapping("/api/v1/trainer/plans")
    List<PlanSummary> mine(@AuthenticationPrincipal AuthUser me) {
        return plans.trainerPlans(me.id());
    }

    @PostMapping("/api/v1/trainer/plans")
    @ResponseStatus(HttpStatus.CREATED)
    PlanView create(@AuthenticationPrincipal AuthUser me, @Valid @RequestBody PlanInput input) {
        return plans.create(me.id(), input);
    }

    @PostMapping("/api/v1/trainer/plans/from-template/{templateId}")
    @ResponseStatus(HttpStatus.CREATED)
    PlanView fromTemplate(@AuthenticationPrincipal AuthUser me, @PathVariable UUID templateId) {
        return plans.copyTemplate(me.id(), templateId);
    }

    @PutMapping("/api/v1/trainer/plans/{id}")
    PlanView update(@AuthenticationPrincipal AuthUser me, @PathVariable UUID id, @Valid @RequestBody PlanInput input) {
        return plans.update(me.id(), id, input);
    }

    @DeleteMapping("/api/v1/trainer/plans/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    void delete(@AuthenticationPrincipal AuthUser me, @PathVariable UUID id) {
        plans.delete(me.id(), id);
    }

    @GetMapping("/api/v1/trainer/students/{clientId}/plan")
    PlanView studentPlan(@AuthenticationPrincipal AuthUser me, @PathVariable UUID clientId) {
        return plans.studentPlan(me.id(), clientId);
    }

    record AssignInput(@jakarta.validation.constraints.NotNull UUID planId,
            @jakarta.validation.constraints.Size(max = 2000) String message) {}

    @PutMapping("/api/v1/trainer/students/{clientId}/plan/assignment")
    PlanView assign(@AuthenticationPrincipal AuthUser me, @PathVariable UUID clientId, @Valid @RequestBody AssignInput input) {
        return plans.assign(me.id(), clientId, input.planId(), input.message());
    }

    @PutMapping("/api/v1/trainer/students/{clientId}/plan")
    PlanView saveStudentPlan(@AuthenticationPrincipal AuthUser me, @PathVariable UUID clientId,
            @Valid @RequestBody StudentPlanInput input) {
        return plans.saveStudentPlan(me.id(), clientId, input.plan(), input.message());
    }
}
