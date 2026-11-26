package com.trakio.core.auth;

import com.fasterxml.jackson.annotation.JsonValue;
import com.trakio.core.common.Enums;

public enum UserStatus {
    ACTIVE,
    SUSPENDED;

    @JsonValue
    public String json() {
        return Enums.json(this);
    }
}
