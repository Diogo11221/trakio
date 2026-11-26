package com.trakio.core.verification;

import com.fasterxml.jackson.annotation.JsonValue;
import com.trakio.core.common.Enums;

public enum DocumentStatus {
    SUBMITTED, CONFIRMED, REJECTED;

    @JsonValue
    public String json() {
        return Enums.json(this);
    }
}
