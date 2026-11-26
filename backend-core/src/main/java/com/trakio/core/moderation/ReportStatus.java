package com.trakio.core.moderation;

import com.fasterxml.jackson.annotation.JsonValue;
import com.trakio.core.common.Enums;

public enum ReportStatus {
    OPEN, RESOLVED;

    @JsonValue
    public String json() {
        return Enums.json(this);
    }
}
