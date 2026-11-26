package com.trakio.core.auth;

import java.util.UUID;

/** The signed-in caller, taken from a verified access token. */
public record AuthUser(UUID id, Role role) {

    public boolean isClient() {
        return role == Role.CLIENT;
    }

    public boolean isTrainer() {
        return role == Role.TRAINER;
    }

    public boolean isAdmin() {
        return role == Role.ADMIN;
    }
}
