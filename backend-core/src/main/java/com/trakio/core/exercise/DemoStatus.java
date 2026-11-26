package com.trakio.core.exercise;

import com.fasterxml.jackson.annotation.JsonValue;
import com.trakio.core.common.Enums;

public enum DemoStatus {
    READY, PRODUCTION, TODO;

    @JsonValue
    public String json() {
        return Enums.json(this);
    }
}
