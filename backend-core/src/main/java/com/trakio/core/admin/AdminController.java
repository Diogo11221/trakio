package com.trakio.core.admin;

import com.trakio.core.admin.AdminDtos.AuditRow;
import com.trakio.core.admin.AdminDtos.DemoStatusInput;
import com.trakio.core.admin.AdminDtos.ExerciseInput;
import com.trakio.core.admin.AdminDtos.ExerciseRow;
import com.trakio.core.admin.AdminDtos.Overview;
import com.trakio.core.admin.AdminDtos.PaymentRow;
import com.trakio.core.admin.AdminDtos.RefundDecisionInput;
import com.trakio.core.admin.AdminDtos.UserRow;
import com.trakio.core.auth.AuthUser;
import com.trakio.core.auth.UserStatus;
import com.trakio.core.billing.BillingDtos.PaymentView;
import com.trakio.core.common.ApiException;
import com.trakio.core.common.PageResponse;
import com.trakio.core.config.TrakioProperties;
import com.trakio.core.moderation.ModerationService;
import com.trakio.core.moderation.ReportResolution;
import com.trakio.core.verification.VerificationDtos.AdminDetail;
import com.trakio.core.verification.VerificationDtos.DecisionInput;
import com.trakio.core.verification.VerificationDtos.DocumentStatusInput;
import com.trakio.core.verification.VerificationDtos.QueueItem;
import com.trakio.core.verification.VerificationService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.time.Clock;
import java.time.YearMonth;
import java.time.format.DateTimeParseException;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

/** Back office (web-app). The whole /api/v1/admin tree requires the ADMIN role (SecurityConfig). */
@RestController
@Validated
@RequestMapping("/api/v1/admin")
class AdminController {

    record StatusInput(@Size(max = 500) String reason) {}

    record ResolveInput(@NotNull ReportResolution resolution) {}

    private final AdminService admin;
    private final VerificationService verification;
    private final ModerationService moderation;
    private final TrakioProperties properties;
    private final Clock clock;

    AdminController(AdminService admin, VerificationService verification, ModerationService moderation,
            TrakioProperties properties, Clock clock) {
        this.admin = admin;
        this.verification = verification;
        this.moderation = moderation;
        this.properties = properties;
        this.clock = clock;
    }

    @GetMapping("/overview")
    Overview overview(@RequestParam(required = false) String month) {
        YearMonth ym;
        try {
            ym = month == null ? YearMonth.now(clock.withZone(properties.zone())) : YearMonth.parse(month);
        } catch (DateTimeParseException e) {
            throw ApiException.badRequest("invalid-month", "Mês inválido (usa AAAA-MM).");
        }
        return admin.overview(ym);
    }

    // Users
    @GetMapping("/users")
    PageResponse<UserRow> users(@RequestParam(required = false) @Size(max = 100) String q,
            @RequestParam(required = false) String role, @RequestParam(required = false) String status,
            @RequestParam(defaultValue = "0") int page, @RequestParam(defaultValue = "25") int size) {
        return admin.users(q, role, status, page, size);
    }

    @PostMapping("/users/{id}/suspend")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    void suspend(@AuthenticationPrincipal AuthUser me, @PathVariable UUID id, @Valid @RequestBody StatusInput input) {
        admin.setUserStatus(me.id(), id, UserStatus.SUSPENDED, input.reason());
    }

    @PostMapping("/users/{id}/reactivate")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    void reactivate(@AuthenticationPrincipal AuthUser me, @PathVariable UUID id, @Valid @RequestBody StatusInput input) {
        admin.setUserStatus(me.id(), id, UserStatus.ACTIVE, input.reason());
    }

    // Payments
    @GetMapping("/payments")
    PageResponse<PaymentRow> payments(@RequestParam(required = false) String status, @RequestParam(required = false) String kind,
            @RequestParam(defaultValue = "0") int page, @RequestParam(defaultValue = "25") int size) {
        return admin.payments(status, kind, page, size);
    }

    @PostMapping("/payments/{id}/refund-decision")
    PaymentView refundDecision(@AuthenticationPrincipal AuthUser me, @PathVariable UUID id,
            @Valid @RequestBody RefundDecisionInput input) {
        return admin.decideRefund(me.id(), id, input.decision());
    }

    // Verification
    @GetMapping("/verifications")
    List<QueueItem> verifications() {
        return verification.queue();
    }

    @GetMapping("/verifications/{id}")
    AdminDetail verificationDetail(@PathVariable UUID id) {
        return verification.detail(id);
    }

    @PostMapping("/verifications/{id}/decision")
    AdminDetail decide(@AuthenticationPrincipal AuthUser me, @PathVariable UUID id, @Valid @RequestBody DecisionInput input) {
        return verification.decide(me.id(), id, input.decision(), input.note());
    }

    @PutMapping("/verification-documents/{id}/status")
    AdminDetail documentStatus(@AuthenticationPrincipal AuthUser me, @PathVariable UUID id,
            @Valid @RequestBody DocumentStatusInput input) {
        return verification.setDocumentStatus(me.id(), id, input.status());
    }

    // Reports
    @GetMapping("/reports")
    List<ModerationService.ReportView> reports() {
        return moderation.open();
    }

    @PostMapping("/reports/{id}/resolve")
    ModerationService.ReportView resolve(@AuthenticationPrincipal AuthUser me, @PathVariable UUID id,
            @Valid @RequestBody ResolveInput input) {
        return moderation.resolve(me.id(), id, input.resolution());
    }

    // Exercise library
    @GetMapping("/exercises")
    PageResponse<ExerciseRow> exercises(@RequestParam(required = false) @Size(max = 60) String q,
            @RequestParam(required = false) String group, @RequestParam(required = false) String demo,
            @RequestParam(defaultValue = "0") int page, @RequestParam(defaultValue = "25") int size) {
        return admin.exercises(q, group, demo, page, size);
    }

    @PostMapping("/exercises")
    @ResponseStatus(HttpStatus.CREATED)
    ExerciseRow addExercise(@AuthenticationPrincipal AuthUser me, @Valid @RequestBody ExerciseInput input) {
        return admin.addExercise(me.id(), input);
    }

    @PutMapping("/exercises/{id}/demo-status")
    ExerciseRow demoStatus(@AuthenticationPrincipal AuthUser me, @PathVariable UUID id,
            @Valid @RequestBody DemoStatusInput input) {
        return admin.setDemoStatus(me.id(), id, input.demoStatus());
    }

    @GetMapping("/audit")
    PageResponse<AuditRow> audit(@RequestParam(defaultValue = "0") int page, @RequestParam(defaultValue = "50") int size) {
        return admin.audit(page, size);
    }
}
