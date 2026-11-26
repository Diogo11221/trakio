package com.trakio.core.billing;

import com.fasterxml.jackson.annotation.JsonValue;
import com.trakio.core.common.Enums;

public enum SubscriptionStatus {
    INCOMPLETE, ACTIVE, PAST_DUE, CANCELED;

    @JsonValue
    public String json() {
        return Enums.json(this);
    }
}
