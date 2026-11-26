package com.trakio.core.exercise;

import com.fasterxml.jackson.annotation.JsonValue;
import com.trakio.core.common.Enums;

public enum MuscleGroup {
    CHEST, BACK, LEGS, SHOULDERS, ARMS, CORE;

    @JsonValue
    public String json() {
        return Enums.json(this);
    }
}
