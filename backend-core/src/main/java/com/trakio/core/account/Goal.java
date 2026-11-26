package com.trakio.core.account;

import com.fasterxml.jackson.annotation.JsonValue;
import com.trakio.core.common.Enums;

public enum Goal {
    LOSE, MAINTAIN, GAIN;

    @JsonValue
    public String json() {
        return Enums.json(this);
    }
}
