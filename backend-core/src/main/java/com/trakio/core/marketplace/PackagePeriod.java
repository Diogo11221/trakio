package com.trakio.core.marketplace;

import com.fasterxml.jackson.annotation.JsonValue;
import com.trakio.core.common.Enums;

public enum PackagePeriod {
    /** Monthly coaching. */
    MONTH,
    /** A single session. */
    ONCE;

    @JsonValue
    public String json() {
        return Enums.json(this);
    }
}
