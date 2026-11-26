package com.trakio.core.auth;

import com.trakio.core.common.ApiException;
import java.util.Locale;
import java.util.Set;

/**
 * At least 8 characters (what the app asks), at most 128 (hashing cost), and not one of the
 * passwords every attacker tries first.
 */
public final class PasswordPolicy {

    public static final int MIN = 8;
    public static final int MAX = 128;

    private static final Set<String> COMMON = Set.of(
            "12345678", "123456789", "1234567890", "password", "password1", "password123", "qwertyui", "qwerty123",
            "11111111", "00000000", "abcdefgh", "iloveyou", "palavrapasse", "benfica1", "portugal", "sporting",
            "trakio123", "letmein1", "welcome1", "admin123");

    private PasswordPolicy() {}

    public static void check(String password, String email) {
        if (password == null || password.length() < MIN) {
            throw ApiException.badRequest("weak-password", "A palavra-passe precisa de pelo menos 8 caracteres.");
        }
        if (password.length() > MAX) {
            throw ApiException.badRequest("weak-password", "A palavra-passe pode ter no máximo 128 caracteres.");
        }
        String lower = password.toLowerCase(Locale.ROOT);
        String localPart = email.substring(0, Math.max(0, email.indexOf('@')));
        if (COMMON.contains(lower) || lower.equals(email) || (!localPart.isEmpty() && lower.equals(localPart))) {
            throw ApiException.badRequest("weak-password", "Essa palavra-passe é demasiado fácil de adivinhar.");
        }
    }
}
