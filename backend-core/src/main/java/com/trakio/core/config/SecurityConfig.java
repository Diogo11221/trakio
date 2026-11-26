package com.trakio.core.config;

import com.trakio.core.auth.AuthUser;
import com.trakio.core.auth.Role;
import com.trakio.core.common.GlobalExceptionHandler;
import java.util.List;
import java.util.UUID;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.convert.converter.Converter;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ProblemDetail;
import org.springframework.security.authentication.AbstractAuthenticationToken;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.crypto.argon2.Argon2PasswordEncoder;
import org.springframework.security.crypto.password.DelegatingPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.header.writers.ReferrerPolicyHeaderWriter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;
import tools.jackson.databind.ObjectMapper;

@Configuration
@EnableMethodSecurity
class SecurityConfig {

    /**
     * Stateless bearer-token API: no cookies, so no CSRF surface (CSRF protection is off on purpose).
     * Deny by default; only sign-in/up, the public marketplace and the signed Stripe webhook are open.
     */
    @Bean
    SecurityFilterChain api(HttpSecurity http, ObjectMapper json) throws Exception {
        http
            .csrf(AbstractHttpConfigurer::disable)
            .cors(cors -> {})
            .formLogin(AbstractHttpConfigurer::disable)
            .httpBasic(AbstractHttpConfigurer::disable)
            .logout(AbstractHttpConfigurer::disable)
            .sessionManagement(s -> s.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .authorizeHttpRequests(auth -> auth
                .requestMatchers(HttpMethod.POST, "/api/v1/auth/sign-up", "/api/v1/auth/sign-in",
                        "/api/v1/auth/refresh", "/api/v1/auth/sign-out").permitAll()
                .requestMatchers(HttpMethod.POST, "/api/v1/billing/stripe/webhook").permitAll()
                .requestMatchers(HttpMethod.GET, "/api/v1/trainers", "/api/v1/trainers/*", "/api/v1/trainers/*/reviews").permitAll()
                .requestMatchers(HttpMethod.GET, "/actuator/health", "/actuator/health/**").permitAll()
                .requestMatchers("/api/v1/admin/**").hasRole("ADMIN")
                .requestMatchers("/api/v1/trainer/**").hasRole("TRAINER")
                .requestMatchers("/api/v1/**").authenticated()
                .anyRequest().denyAll())
            .oauth2ResourceServer(oauth -> oauth
                .jwt(jwt -> jwt.jwtAuthenticationConverter(new AuthUserConverter()))
                .authenticationEntryPoint((request, response, e) -> writeProblem(response, json, HttpStatus.UNAUTHORIZED,
                        "unauthenticated", "Inicia sessão para continuar."))
                .accessDeniedHandler((request, response, e) -> writeProblem(response, json, HttpStatus.FORBIDDEN,
                        "forbidden", "Não tens acesso a isto.")))
            .exceptionHandling(e -> e
                .authenticationEntryPoint((request, response, ex) -> writeProblem(response, json, HttpStatus.UNAUTHORIZED,
                        "unauthenticated", "Inicia sessão para continuar."))
                .accessDeniedHandler((request, response, ex) -> writeProblem(response, json, HttpStatus.FORBIDDEN,
                        "forbidden", "Não tens acesso a isto.")))
            .headers(headers -> headers
                .contentSecurityPolicy(csp -> csp.policyDirectives("default-src 'none'; frame-ancestors 'none'; sandbox"))
                .frameOptions(frame -> frame.deny())
                .referrerPolicy(ref -> ref.policy(ReferrerPolicyHeaderWriter.ReferrerPolicy.NO_REFERRER))
                .httpStrictTransportSecurity(hsts -> hsts.includeSubDomains(true).maxAgeInSeconds(31_536_000))
                .permissionsPolicyHeader(p -> p.policy("camera=(), microphone=(), geolocation=()")));
        return http.build();
    }

    private static void writeProblem(jakarta.servlet.http.HttpServletResponse response, ObjectMapper json,
            HttpStatus status, String code, String detail) throws java.io.IOException {
        ProblemDetail problem = GlobalExceptionHandler.problem(status, code, detail);
        response.setStatus(status.value());
        response.setContentType(MediaType.APPLICATION_PROBLEM_JSON_VALUE);
        json.writeValue(response.getOutputStream(), problem);
    }

    /** Argon2id (OWASP's first choice); the "{id}" prefix lets us change algorithm later without a reset. */
    @Bean
    PasswordEncoder passwordEncoder() {
        String id = "argon2";
        return new DelegatingPasswordEncoder(id, java.util.Map.of(id, Argon2PasswordEncoder.defaultsForSpringSecurity_v5_8()));
    }

    @Bean
    CorsConfigurationSource corsConfigurationSource(TrakioProperties properties) {
        CorsConfiguration config = new CorsConfiguration();
        config.setAllowedOrigins(properties.cors().allowedOrigins());
        config.setAllowedMethods(List.of("GET", "POST", "PUT", "PATCH", "DELETE"));
        config.setAllowedHeaders(List.of("Authorization", "Content-Type", "Idempotency-Key"));
        config.setAllowCredentials(false);
        config.setMaxAge(3600L);
        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/api/**", config);
        return source;
    }

    /** Puts an {@link AuthUser} (id + role) in the security context, so controllers never parse tokens. */
    static final class AuthUserConverter implements Converter<Jwt, AbstractAuthenticationToken> {
        @Override
        public AbstractAuthenticationToken convert(Jwt jwt) {
            Role role = Role.valueOf(jwt.getClaimAsString("role"));
            AuthUser user = new AuthUser(UUID.fromString(jwt.getSubject()), role);
            return UsernamePasswordAuthenticationToken.authenticated(user, jwt,
                    List.of(new SimpleGrantedAuthority("ROLE_" + role.name())));
        }
    }
}
