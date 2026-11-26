package com.trakio.core.verification;

import com.fasterxml.jackson.annotation.JsonValue;
import com.trakio.core.common.Enums;

public enum VerificationStatus {
    DRAFT, SUBMITTED, INFO_REQUESTED, APPROVED, REFUSED;

    @JsonValue
    public String json() {
        return Enums.json(this);
    }
}
