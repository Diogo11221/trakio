package com.trakio.core.moderation;

import com.fasterxml.jackson.annotation.JsonValue;
import com.trakio.core.common.Enums;

public enum ReportKind {
    REVIEW, PROFILE;

    @JsonValue
    public String json() {
        return Enums.json(this);
    }
}
