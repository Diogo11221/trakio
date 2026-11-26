package com.trakio.core.billing;

import com.fasterxml.jackson.annotation.JsonValue;
import com.trakio.core.common.Enums;

public enum PaymentStatus {
    PENDING, PAID, FAILED, REFUND_REQUESTED, REFUNDED, REFUND_DECLINED, RESCHEDULED, DISPUTED;

    @JsonValue
    public String json() {
        return Enums.json(this);
    }
}
