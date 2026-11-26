package com.trakio.core.moderation;

import com.fasterxml.jackson.annotation.JsonValue;
import com.trakio.core.common.Enums;

public enum ReportResolution {
    REMOVE_REVIEW, ASK_PROFILE_FIX, KEEP;

    @JsonValue
    public String json() {
        return Enums.json(this);
    }
}
