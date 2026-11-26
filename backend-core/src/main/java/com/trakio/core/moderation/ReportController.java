package com.trakio.core.moderation;

import com.trakio.core.auth.AuthUser;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
class ReportController {

    private final ModerationService moderation;

    ReportController(ModerationService moderation) {
        this.moderation = moderation;
    }

    @PostMapping("/api/v1/reports")
    @ResponseStatus(HttpStatus.CREATED)
    ModerationService.ReportCreated report(@AuthenticationPrincipal AuthUser me,
            @Valid @RequestBody ModerationService.ReportInput input) {
        return moderation.report(me.id(), input);
    }
}
