package com.trakio.core.auth;

import com.trakio.core.config.TrakioProperties;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.Clock;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Base64;
import java.util.HexFormat;
import java.util.List;
import java.util.UUID;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.JwsHeader;
import org.springframework.security.oauth2.jwt.JwtClaimsSet;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.JwtEncoderParameters;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Issues short-lived access tokens and long-lived, single-use refresh tokens. */
@Service
public class TokenService {

    public record Tokens(String accessToken, long expiresIn, String refreshToken) {}

    private static final SecureRandom RANDOM = new SecureRandom();

    private final JwtEncoder encoder;
    private final RefreshTokenRepository refreshTokens;
    private final TrakioProperties properties;
    private final Clock clock;

    public TokenService(JwtEncoder encoder, RefreshTokenRepository refreshTokens, TrakioProperties properties, Clock clock) {
        this.encoder = encoder;
        this.refreshTokens = refreshTokens;
        this.properties = properties;
        this.clock = clock;
    }

    /** A new session (sign-in, sign-up): a new refresh-token family. */
    public Tokens issue(User user) {
        return issue(user, UUID.randomUUID());
    }

    /** Rotation keeps the family, so reuse of an old token can revoke everything that came after it. */
    public Tokens issue(User user, UUID familyId) {
        Instant now = clock.instant();
        var jwt = properties.jwt();
        JwtClaimsSet claims = JwtClaimsSet.builder()
                .issuer(jwt.issuer())
                .audience(List.of(jwt.audience()))
                .subject(user.getId().toString())
                .id(UUID.randomUUID().toString())
                .issuedAt(now)
                .expiresAt(now.plus(jwt.accessTokenTtl()))
                .claim("role", user.getRole().name())
                .claim("ver", user.getTokenVersion())
                .build();
        String access = encoder.encode(JwtEncoderParameters.from(JwsHeader.with(MacAlgorithm.HS256).build(), claims))
                .getTokenValue();

        byte[] bytes = new byte[32];
        RANDOM.nextBytes(bytes);
        String refresh = Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
        refreshTokens.save(new RefreshToken(user.getId(), familyId, hash(refresh), now, now.plus(jwt.refreshTokenTtl())));
        return new Tokens(access, jwt.accessTokenTtl().toSeconds(), refresh);
    }

    public static String hash(String token) {
        try {
            byte[] digest = MessageDigest.getInstance("SHA-256").digest(token.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(digest);
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException(e);
        }
    }

    @Scheduled(cron = "0 17 4 * * *")
    @Transactional
    public void purgeExpired() {
        refreshTokens.deleteExpired(clock.instant().minus(1, ChronoUnit.DAYS));
    }
}
