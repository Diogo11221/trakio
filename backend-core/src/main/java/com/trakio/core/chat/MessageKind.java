package com.trakio.core.chat;

import com.fasterxml.jackson.annotation.JsonValue;
import com.trakio.core.common.Enums;

public enum MessageKind {
    TEXT, PHOTO, FILE, WORKOUT;

    @JsonValue
    public String json() {
        return Enums.json(this);
    }
}
