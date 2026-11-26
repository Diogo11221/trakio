package com.trakio.core.common;

import java.util.Locale;

/** Enums travel as lower-case kebab strings ("refund-requested"), the same values the apps use. */
public final class Enums {

    private Enums() {}

    public static String json(Enum<?> value) {
        return value.name().toLowerCase(Locale.ROOT).replace('_', '-');
    }

    public static <E extends Enum<E>> E parse(Class<E> type, String raw, String field) {
        if (raw == null || raw.isBlank()) {
            return null;
        }
        String name = raw.trim().toUpperCase(Locale.ROOT).replace('-', '_');
        try {
            return Enum.valueOf(type, name);
        } catch (IllegalArgumentException e) {
            throw ApiException.badRequest("invalid-" + field, "Valor inválido para " + field + ".");
        }
    }
}
