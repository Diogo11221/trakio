package com.trakio.core.billing;

import com.fasterxml.jackson.annotation.JsonValue;
import com.trakio.core.common.Enums;

public enum PaymentKind {
    COACHING, PREMIUM, MARKETPLACE;

    @JsonValue
    public String json() {
        return Enums.json(this);
    }
}
