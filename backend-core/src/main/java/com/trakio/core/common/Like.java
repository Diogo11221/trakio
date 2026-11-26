package com.trakio.core.common;

import java.util.Locale;

/** Search text for {@code like} queries: lower-case, never null, and % or _ typed by the user match literally. */
public final class Like {

    private Like() {}

    public static String term(String q) {
        if (q == null || q.isBlank()) {
            return "";
        }
        return q.trim().toLowerCase(Locale.ROOT).replace("\\", "").replace("%", "").replace("_", "");
    }
}
