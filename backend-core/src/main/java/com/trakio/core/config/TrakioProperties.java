package com.trakio.core.config;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.time.Duration;
import java.time.ZoneId;
import java.util.List;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.validation.annotation.Validated;

/** Everything configurable, validated at startup: a missing secret stops the app instead of running insecurely. */
@Validated
@ConfigurationProperties(prefix = "trakio")
public record TrakioProperties(
        @NotNull ZoneId zone,
        @Valid @NotNull Jwt jwt,
        @Valid @NotNull Cors cors,
        @Valid @NotNull Storage storage,
        @Valid @NotNull Payments payments,
        @Valid @NotNull RateLimit rateLimit,
        @Valid BootstrapAdmin bootstrapAdmin,
        @Valid @NotNull Ai ai) {

    /** backend-ai (internal). Empty URL = AI off: simple fallbacks are used instead. */
    public record Ai(String baseUrl, String token, @NotNull Duration timeout) {

        public boolean enabled() {
            return baseUrl != null && !baseUrl.isBlank() && token != null && token.length() >= 32;
        }
    }

    public record Jwt(
            /** Base64 HMAC key, at least 256 bits. */
            @NotBlank String secret,
            @NotBlank String issuer,
            @NotBlank String audience,
            @NotNull Duration accessTokenTtl,
            @NotNull Duration refreshTokenTtl) {}

    public record Cors(@NotNull List<String> allowedOrigins) {}

    public record Storage(@NotBlank String localDir, @Min(1) long maxFileBytes) {}

    public record Payments(
            /** "stripe" in production, "fake" for local development (payments complete instantly). */
            @NotBlank String provider,
            @Min(0) @Max(50) int platformFeePercent,
            /** Shown in the app and used for revenue in fake mode; Stripe prices are the source of truth in production. */
            @Min(1) int premiumPriceCents,
            @Min(1) int marketplacePriceCents,
            @Valid @NotNull Stripe stripe) {}

    public record Stripe(
            String secretKey,
            String webhookSecret,
            String premiumPriceId,
            String marketplacePriceId,
            @NotBlank String successUrl,
            @NotBlank String cancelUrl,
            @NotBlank String connectReturnUrl,
            @NotBlank String connectRefreshUrl) {}

    public record RateLimit(
            /** Requests per minute per IP on sign-in, sign-up and refresh. */
            @Min(1) int authPerMinute,
            /** Requests per minute per IP on everything else. */
            @Min(1) int generalPerMinute,
            /** Wrong passwords in a row before an email is paused. */
            @Min(1) int maxFailedLogins,
            @NotNull Duration lockout) {}

    public record BootstrapAdmin(String email, String password) {}
}
