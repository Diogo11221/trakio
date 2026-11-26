package com.trakio.core.nutrition;

import com.fasterxml.jackson.annotation.JsonValue;
import com.trakio.core.common.Enums;

public enum MealSource {
    MANUAL, AI;

    @JsonValue
    public String json() {
        return Enums.json(this);
    }
}
