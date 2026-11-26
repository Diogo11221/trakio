package com.trakio.core.auth;

import com.trakio.core.account.AccountService;
import com.trakio.core.account.Preferences;
import com.trakio.core.account.PreferencesRepository;
import com.trakio.core.auth.AuthDtos.AuthResponse;
import com.trakio.core.billing.BillingService;
import com.trakio.core.common.ApiException;
import com.trakio.core.files.FileService;
import java.time.Clock;
import java.time.Instant;
import java.util.Locale;
import java.util.UUID;
import java.util.regex.Pattern;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AuthService {

    private static final Logger log = LoggerFactory.getLogger(AuthService.class);
    private static final Pattern EMAIL = Pattern.compile("^[^\\s@]+@[^\\s@]+\\.[^\\s@]{2,}$");

    private final UserRepository users;
    private final RefreshTokenRepository refreshTokens;
    private final PreferencesRepository preferences;
    private final PasswordEncoder passwords;
    private final TokenService tokens;
    private final LoginThrottle throttle;
    private final AccountService accounts;
    private final FileService files;
    private final BillingService billing;
    private final Clock clock;
    /** Hash checked when the email doesn't exist, so both answers take the same time. */
    private final String dummyHash;

    public AuthService(UserRepository users, RefreshTokenRepository refreshTokens, PreferencesRepository preferences,
            PasswordEncoder passwords, TokenService tokens, LoginThrottle throttle, AccountService accounts,
            FileService files, BillingService billing, Clock clock) {
        this.users = users;
        this.refreshTokens = refreshTokens;
        this.preferences = preferences;
        this.passwords = passwords;
        this.tokens = tokens;
        this.throttle = throttle;
        this.accounts = accounts;
        this.files = files;
        this.billing = billing;
        this.clock = clock;
        this.dummyHash = passwords.encode(UUID.randomUUID().toString());
    }

    public static String normaliseEmail(String email) {
        return email == null ? "" : email.trim().toLowerCase(Locale.ROOT);
    }

    @Transactional
    public AuthResponse signUp(String rawEmail, String password, Role role) {
        if (role == Role.ADMIN) {
            throw ApiException.forbidden("Não é possível criar esta conta.");
        }
        String email = normaliseEmail(rawEmail);
        if (!EMAIL.matcher(email).matches() || email.length() > 254) {
            throw ApiException.badRequest("invalid-email", "Este email não parece estar certo.");
        }
        PasswordPolicy.check(password, email);
        if (users.existsByEmail(email)) {
            throw ApiException.conflict("email-taken", "Já existe uma conta com este email. Entra em vez de criar outra.");
        }
        User user;
        try {
            user = users.saveAndFlush(new User(email, passwords.encode(password), role));
        } catch (DataIntegrityViolationException e) {
            // Two sign-ups with the same email at the same time.
            throw ApiException.conflict("email-taken", "Já existe uma conta com este email. Entra em vez de criar outra.");
        }
        preferences.save(new Preferences(user.getId()));
        user.seen(clock.instant());
        log.info("Account created id={} role={}", user.getId(), role);
        return AuthResponse.of(tokens.issue(user), accounts.me(user.getId()));
    }

    @Transactional
    public AuthResponse signIn(String rawEmail, String password) {
        String email = normaliseEmail(rawEmail);
        throttle.check(email);
        User user = users.findByEmail(email).orElse(null);
        boolean matches = passwords.matches(password, user == null ? dummyHash : user.getPasswordHash());
        if (user == null || !matches) {
            throttle.failed(email);
            throw new ApiException(HttpStatus.UNAUTHORIZED, "wrong-credentials", "Email ou palavra-passe errados.");
        }
        throttle.succeeded(email);
        if (!user.isActive()) {
            throw new ApiException(HttpStatus.FORBIDDEN, "account-suspended",
                    "Esta conta está suspensa. Fala connosco em suporte@trakio.app.");
        }
        if (passwords instanceof org.springframework.security.crypto.password.DelegatingPasswordEncoder delegating
                && delegating.upgradeEncoding(user.getPasswordHash())) {
            user.changePasswordKeepingSessions(passwords.encode(password));
        }
        user.seen(clock.instant());
        return AuthResponse.of(tokens.issue(user), accounts.me(user.getId()));
    }

    /**
     * Single-use refresh: the old token is marked replaced and a new one is issued in the same
     * family. Presenting a spent token again means it leaked, so the whole family is revoked.
     */
    @Transactional(noRollbackFor = ApiException.class)
    public AuthResponse refresh(String refreshToken) {
        Instant now = clock.instant();
        RefreshToken stored = refreshTokens.findByTokenHash(TokenService.hash(refreshToken)).orElse(null);
        if (stored == null) {
            throw invalidRefresh();
        }
        if (stored.isSpent()) {
            log.warn("Refresh token reuse detected for user={} — revoking the session family", stored.getUserId());
            refreshTokens.revokeFamily(stored.getFamilyId(), now);
            throw invalidRefresh();
        }
        if (stored.isExpired(now)) {
            throw invalidRefresh();
        }
        User user = users.findById(stored.getUserId()).filter(User::isActive).orElseThrow(AuthService::invalidRefresh);
        stored.markReplaced(now);
        user.seen(now);
        return AuthResponse.of(tokens.issue(user, stored.getFamilyId()), accounts.me(user.getId()));
    }

    @Transactional
    public void signOut(String refreshToken) {
        refreshTokens.findByTokenHash(TokenService.hash(refreshToken))
                .ifPresent(t -> refreshTokens.revokeFamily(t.getFamilyId(), clock.instant()));
    }

    /** Signs out every other device: old access tokens fail the version check, refresh tokens are revoked. */
    @Transactional
    public AuthResponse changePassword(UUID userId, String current, String next) {
        User user = users.findById(userId).orElseThrow(() -> ApiException.notFound("Esta conta"));
        if (!passwords.matches(current, user.getPasswordHash())) {
            throw ApiException.badRequest("wrong-password", "A palavra-passe atual não está certa.");
        }
        PasswordPolicy.check(next, user.getEmail());
        user.changePassword(passwords.encode(next));
        refreshTokens.revokeAllForUser(userId, clock.instant());
        users.flush();
        return AuthResponse.of(tokens.issue(user), accounts.me(userId));
    }

    /** Deletes the account and everything that belongs to it (GDPR erasure). Asks for the password again. */
    @Transactional
    public void deleteAccount(UUID userId, String password) {
        User user = users.findById(userId).orElseThrow(() -> ApiException.notFound("Esta conta"));
        if (!passwords.matches(password, user.getPasswordHash())) {
            throw ApiException.badRequest("wrong-password", "A palavra-passe não está certa.");
        }
        billing.cancelEverythingFor(userId);
        files.deleteAllOwnedBy(userId);
        users.delete(user);
        log.info("Account deleted id={}", userId);
    }

    private static ApiException invalidRefresh() {
        return new ApiException(HttpStatus.UNAUTHORIZED, "invalid-refresh", "A sessão terminou. Entra outra vez.");
    }
}
