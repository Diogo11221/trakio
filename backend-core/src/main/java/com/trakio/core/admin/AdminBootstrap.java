package com.trakio.core.admin;

import com.trakio.core.account.Preferences;
import com.trakio.core.account.PreferencesRepository;
import com.trakio.core.auth.AuthService;
import com.trakio.core.auth.PasswordPolicy;
import com.trakio.core.auth.Role;
import com.trakio.core.auth.User;
import com.trakio.core.auth.UserRepository;
import com.trakio.core.config.TrakioProperties;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/**
 * Admins can't sign up. The first one is created at startup from TRAKIO_BOOTSTRAP_ADMIN_EMAIL /
 * TRAKIO_BOOTSTRAP_ADMIN_PASSWORD, only while no admin exists (remove the variables afterwards).
 */
@Component
class AdminBootstrap implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(AdminBootstrap.class);
    private static final int MIN_ADMIN_PASSWORD = 12;

    private final UserRepository users;
    private final PreferencesRepository preferences;
    private final PasswordEncoder passwords;
    private final TrakioProperties properties;

    AdminBootstrap(UserRepository users, PreferencesRepository preferences, PasswordEncoder passwords,
            TrakioProperties properties) {
        this.users = users;
        this.preferences = preferences;
        this.passwords = passwords;
        this.properties = properties;
    }

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        var config = properties.bootstrapAdmin();
        if (config == null || config.email() == null || config.email().isBlank() || users.existsByRole(Role.ADMIN)) {
            return;
        }
        String email = AuthService.normaliseEmail(config.email());
        String password = config.password();
        if (password == null || password.length() < MIN_ADMIN_PASSWORD) {
            throw new IllegalStateException("Bootstrap admin password must have at least " + MIN_ADMIN_PASSWORD + " characters");
        }
        PasswordPolicy.check(password, email);
        if (users.existsByEmail(email)) {
            throw new IllegalStateException("Bootstrap admin email already belongs to a non-admin account");
        }
        User admin = users.save(new User(email, passwords.encode(password), Role.ADMIN));
        preferences.save(new Preferences(admin.getId()));
        log.warn("Created the first admin account ({}). Remove the bootstrap variables now.", email);
    }
}
