package com.trakio.core.coaching;

import com.fasterxml.jackson.annotation.JsonValue;
import com.trakio.core.common.Enums;

public enum RelationshipStatus {
    PENDING_PAYMENT, ACTIVE, ENDED, CANCELLED;

    @JsonValue
    public String json() {
        return Enums.json(this);
    }
}
