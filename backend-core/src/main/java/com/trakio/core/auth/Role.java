package com.trakio.core.auth;

import com.fasterxml.jackson.annotation.JsonValue;
import com.trakio.core.common.Enums;

public enum Role {
    CLIENT,
    TRAINER,
    /** Never self-assigned: created by the bootstrap config or the dev seed only. */
    ADMIN;

    @JsonValue
    public String json() {
        return Enums.json(this);
    }
}
