package com.trakio.core.config;

import com.trakio.core.common.GlobalExceptionHandler;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicInteger;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;
import tools.jackson.databind.ObjectMapper;

/**
 * Fixed one-minute windows per client IP: a tight budget on the auth endpoints (brute force,
 * sign-up spam) and a generous one elsewhere. In-memory — with several instances, move this
 * to the gateway or Redis.
 *
 * <p>The IP is {@code request.getRemoteAddr()}: behind a proxy, enable
 * {@code server.forward-headers-strategy} so only the trusted proxy's header is used.
 */
@Component
@Order(Ordered.HIGHEST_PRECEDENCE + 10)
public class RateLimitFilter extends OncePerRequestFilter {

    private record Window(long minute, AtomicInteger count) {}

    private final Map<String, Window> windows = new ConcurrentHashMap<>();
    private final TrakioProperties properties;
    private final ObjectMapper json;

    public RateLimitFilter(TrakioProperties properties, ObjectMapper json) {
        this.properties = properties;
        this.json = json;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {
        String path = request.getRequestURI();
        if (!path.startsWith("/api/") || path.equals("/api/v1/billing/stripe/webhook")) {
            chain.doFilter(request, response);
            return;
        }
        boolean auth = path.startsWith("/api/v1/auth/");
        int limit = auth ? properties.rateLimit().authPerMinute() : properties.rateLimit().generalPerMinute();
        String key = (auth ? "auth:" : "api:") + request.getRemoteAddr();
        long minute = System.currentTimeMillis() / 60_000;
        Window window = windows.compute(key, (k, w) -> w == null || w.minute() != minute ? new Window(minute, new AtomicInteger()) : w);
        if (window.count().incrementAndGet() > limit) {
            response.setStatus(HttpStatus.TOO_MANY_REQUESTS.value());
            response.setHeader("Retry-After", "60");
            response.setContentType(MediaType.APPLICATION_PROBLEM_JSON_VALUE);
            json.writeValue(response.getOutputStream(), GlobalExceptionHandler.problem(HttpStatus.TOO_MANY_REQUESTS,
                    "rate-limited", "Demasiados pedidos. Espera um minuto e tenta outra vez."));
            return;
        }
        chain.doFilter(request, response);
    }

    @Scheduled(fixedDelay = 60_000)
    void evictOldWindows() {
        long minute = System.currentTimeMillis() / 60_000;
        windows.values().removeIf(w -> w.minute() < minute);
    }
}
