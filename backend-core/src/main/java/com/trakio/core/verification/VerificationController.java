package com.trakio.core.verification;

import com.trakio.core.auth.AuthUser;
import com.trakio.core.common.Enums;
import com.trakio.core.verification.VerificationDtos.DocumentInput;
import com.trakio.core.verification.VerificationDtos.VerificationView;
import jakarta.validation.Valid;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

@RestController
class VerificationController {

    private final VerificationService verification;

    VerificationController(VerificationService verification) {
        this.verification = verification;
    }

    @GetMapping("/api/v1/trainer/verification")
    VerificationView mine(@AuthenticationPrincipal AuthUser me) {
        return verification.mine(me.id());
    }

    /** Upload the file first (POST /api/v1/files, purpose=verification), then attach it here. */
    @PutMapping("/api/v1/trainer/verification/documents/{type}")
    VerificationView putDocument(@AuthenticationPrincipal AuthUser me, @PathVariable String type,
            @Valid @RequestBody DocumentInput input) {
        DocumentType documentType = Enums.parse(DocumentType.class, type, "type");
        return verification.putDocument(me.id(), documentType, input.fileId(), input.validUntil());
    }

    @PostMapping("/api/v1/trainer/verification/submit")
    VerificationView submit(@AuthenticationPrincipal AuthUser me) {
        return verification.submit(me.id());
    }
}
