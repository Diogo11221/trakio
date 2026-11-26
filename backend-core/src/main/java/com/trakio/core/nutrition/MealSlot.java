package com.trakio.core.nutrition;

import com.fasterxml.jackson.annotation.JsonValue;
import com.trakio.core.common.Enums;

public enum MealSlot {
    BREAKFAST, LUNCH, SNACK, DINNER;

    @JsonValue
    public String json() {
        return Enums.json(this);
    }
}
