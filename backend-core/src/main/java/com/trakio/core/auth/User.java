package com.trakio.core.auth;

import com.trakio.core.common.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Table;
import java.time.Instant;

@Entity
@Table(name = "users")
public class User extends BaseEntity {

    @Column(nullable = false, unique = true, length = 254)
    private String email;

    @Column(nullable = false)
    private String passwordHash;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 16)
    private Role role;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 16)
    private UserStatus status = UserStatus.ACTIVE;

    @Column(nullable = false)
    private int tokenVersion;

    private Instant lastSeenAt;

    protected User() {}

    public User(String email, String passwordHash, Role role) {
        this.email = email;
        this.passwordHash = passwordHash;
        this.role = role;
    }

    public String getEmail() {
        return email;
    }

    public String getPasswordHash() {
        return passwordHash;
    }

    public Role getRole() {
        return role;
    }

    public UserStatus getStatus() {
        return status;
    }

    public int getTokenVersion() {
        return tokenVersion;
    }

    public Instant getLastSeenAt() {
        return lastSeenAt;
    }

    public boolean isActive() {
        return status == UserStatus.ACTIVE;
    }

    /** New password: every access token issued before now stops working. */
    public void changePassword(String passwordHash) {
        this.passwordHash = passwordHash;
        this.tokenVersion++;
    }

    /** Re-hash with stronger settings after sign-in, without signing anyone out. */
    public void changePasswordKeepingSessions(String passwordHash) {
        this.passwordHash = passwordHash;
    }

    public void suspend() {
        this.status = UserStatus.SUSPENDED;
        this.tokenVersion++;
    }

    public void reactivate() {
        this.status = UserStatus.ACTIVE;
    }

    public void seen(Instant now) {
        this.lastSeenAt = now;
    }
}
