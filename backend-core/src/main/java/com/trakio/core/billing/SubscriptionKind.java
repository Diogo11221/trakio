package com.trakio.core.billing;

import com.fasterxml.jackson.annotation.JsonValue;
import com.trakio.core.common.Enums;

public enum SubscriptionKind {
    PREMIUM, MARKETPLACE;

    @JsonValue
    public String json() {
        return Enums.json(this);
    }
}
