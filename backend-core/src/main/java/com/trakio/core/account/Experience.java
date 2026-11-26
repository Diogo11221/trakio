package com.trakio.core.account;

import com.fasterxml.jackson.annotation.JsonValue;
import com.trakio.core.common.Enums;

public enum Experience {
    NEW, SOME, ADVANCED;

    @JsonValue
    public String json() {
        return Enums.json(this);
    }
}
