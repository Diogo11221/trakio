package com.trakio.core.auth;

import com.trakio.core.common.ApiException;
import com.trakio.core.config.TrakioProperties;
import java.time.Clock;
import java.time.Instant;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import org.springframework.http.HttpStatus;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/**
 * Pauses sign-in for an email after too many wrong passwords. Keyed by email whether or not the
 * account exists, so the pause itself doesn't reveal who has an account.
 */
@Component
public class LoginThrottle {

    private record State(int failures, Instant lockedUntil, Instant lastFailure) {}

    private final Map<String, State> states = new ConcurrentHashMap<>();
    private final TrakioProperties properties;
    private final Clock clock;

    public LoginThrottle(TrakioProperties properties, Clock clock) {
        this.properties = properties;
        this.clock = clock;
    }

    public void check(String email) {
        State state = states.get(email);
        if (state != null && state.lockedUntil() != null && clock.instant().isBefore(state.lockedUntil())) {
            throw new ApiException(HttpStatus.TOO_MANY_REQUESTS, "too-many-attempts",
                    "Demasiadas tentativas. Espera uns minutos e tenta outra vez.");
        }
    }

    public void failed(String email) {
        Instant now = clock.instant();
        var limits = properties.rateLimit();
        states.compute(email, (k, s) -> {
            int failures = (s == null || (s.lockedUntil() != null && !now.isBefore(s.lockedUntil()))) ? 1 : s.failures() + 1;
            Instant locked = failures >= limits.maxFailedLogins() ? now.plus(limits.lockout()) : null;
            return new State(failures, locked, now);
        });
    }

    public void succeeded(String email) {
        states.remove(email);
    }

    @Scheduled(fixedDelay = 300_000)
    void evict() {
        Instant cutoff = clock.instant().minus(properties.rateLimit().lockout().multipliedBy(2));
        states.values().removeIf(s -> s.lastFailure().isBefore(cutoff));
    }
}
