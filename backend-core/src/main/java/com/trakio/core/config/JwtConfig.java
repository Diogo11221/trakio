package com.trakio.core.config;

import com.nimbusds.jose.jwk.source.ImmutableSecret;
import com.trakio.core.auth.TokenStatusValidator;
import java.util.Base64;
import javax.crypto.SecretKey;
import javax.crypto.spec.SecretKeySpec;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.oauth2.core.DelegatingOAuth2TokenValidator;
import org.springframework.security.oauth2.core.OAuth2TokenValidator;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtClaimValidator;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.JwtValidators;
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder;
import org.springframework.security.oauth2.jwt.NimbusJwtEncoder;

/**
 * Access tokens: HS256, short-lived, issuer + audience checked, and the account's status and
 * token version checked on every request (so suspension or a password change logs out at once).
 */
@Configuration
class JwtConfig {

    private static final int MIN_KEY_BYTES = 32;

    @Bean
    SecretKey jwtKey(TrakioProperties properties) {
        byte[] bytes;
        try {
            bytes = Base64.getDecoder().decode(properties.jwt().secret());
        } catch (IllegalArgumentException e) {
            throw new IllegalStateException("trakio.jwt.secret must be base64", e);
        }
        if (bytes.length < MIN_KEY_BYTES) {
            throw new IllegalStateException("trakio.jwt.secret must be at least 256 bits (32 bytes, base64)");
        }
        return new SecretKeySpec(bytes, "HmacSHA256");
    }

    @Bean
    JwtEncoder jwtEncoder(SecretKey jwtKey) {
        return new NimbusJwtEncoder(new ImmutableSecret<>(jwtKey));
    }

    @Bean
    JwtDecoder jwtDecoder(SecretKey jwtKey, TrakioProperties properties, TokenStatusValidator statusValidator) {
        NimbusJwtDecoder decoder = NimbusJwtDecoder.withSecretKey(jwtKey).macAlgorithm(MacAlgorithm.HS256).build();
        OAuth2TokenValidator<Jwt> audience = new JwtClaimValidator<java.util.List<String>>("aud",
                aud -> aud != null && aud.contains(properties.jwt().audience()));
        decoder.setJwtValidator(new DelegatingOAuth2TokenValidator<>(
                JwtValidators.createDefaultWithIssuer(properties.jwt().issuer()), audience, statusValidator));
        return decoder;
    }
}
