package com.trakio.core.workout;

import com.fasterxml.jackson.annotation.JsonValue;
import com.trakio.core.common.Enums;

public enum Feeling {
    EASY, GOOD, HARD, MAX;

    @JsonValue
    public String json() {
        return Enums.json(this);
    }
}
