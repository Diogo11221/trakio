package com.trakio.core.account;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.util.UUID;

/**
 * Phone preferences that follow the account. Premium is deliberately not here: it comes only
 * from a paid subscription, never from something the app can set.
 */
@Entity
@Table(name = "user_preferences")
public class Preferences {

    @Id
    private UUID userId;

    @Column(nullable = false)
    private boolean vibration = true;

    @Column(nullable = false)
    private boolean lockScreenAlert = true;

    @Column(nullable = false)
    private boolean restSound = true;

    protected Preferences() {}

    public Preferences(UUID userId) {
        this.userId = userId;
    }

    public boolean isVibration() {
        return vibration;
    }

    public boolean isLockScreenAlert() {
        return lockScreenAlert;
    }

    public boolean isRestSound() {
        return restSound;
    }

    public void update(boolean vibration, boolean lockScreenAlert, boolean restSound) {
        this.vibration = vibration;
        this.lockScreenAlert = lockScreenAlert;
        this.restSound = restSound;
    }
}
