package com.trakio.core.auth;

import java.util.UUID;
import org.springframework.security.oauth2.core.OAuth2Error;
import org.springframework.security.oauth2.core.OAuth2TokenValidator;
import org.springframework.security.oauth2.core.OAuth2TokenValidatorResult;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Component;

/**
 * Rejects a valid-looking token whose account was suspended, deleted or changed password since
 * it was issued — without waiting for the token to expire.
 */
@Component
public class TokenStatusValidator implements OAuth2TokenValidator<Jwt> {

    private static final OAuth2Error REVOKED = new OAuth2Error("invalid_token", "Token no longer valid", null);

    private final UserRepository users;

    public TokenStatusValidator(UserRepository users) {
        this.users = users;
    }

    @Override
    public OAuth2TokenValidatorResult validate(Jwt jwt) {
        UUID id;
        try {
            id = UUID.fromString(jwt.getSubject());
        } catch (IllegalArgumentException | NullPointerException e) {
            return OAuth2TokenValidatorResult.failure(REVOKED);
        }
        Object version = jwt.getClaims().get("ver");
        return users.findTokenState(id)
                .filter(state -> state.getStatus() == UserStatus.ACTIVE)
                .filter(state -> version instanceof Number n && n.intValue() == state.getTokenVersion())
                .map(state -> OAuth2TokenValidatorResult.success())
                .orElse(OAuth2TokenValidatorResult.failure(REVOKED));
    }
}
