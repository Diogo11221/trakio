package com.trakio.core.auth;

import com.trakio.core.auth.AuthDtos.AuthResponse;
import com.trakio.core.auth.AuthDtos.ChangePasswordRequest;
import com.trakio.core.auth.AuthDtos.DeleteAccountRequest;
import com.trakio.core.auth.AuthDtos.RefreshRequest;
import com.trakio.core.auth.AuthDtos.SignInRequest;
import com.trakio.core.auth.AuthDtos.SignUpRequest;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
class AuthController {

    private final AuthService auth;

    AuthController(AuthService auth) {
        this.auth = auth;
    }

    @PostMapping("/api/v1/auth/sign-up")
    @ResponseStatus(HttpStatus.CREATED)
    AuthResponse signUp(@Valid @RequestBody SignUpRequest request) {
        return auth.signUp(request.email(), request.password(), Role.valueOf(request.role().toUpperCase()));
    }

    @PostMapping("/api/v1/auth/sign-in")
    AuthResponse signIn(@Valid @RequestBody SignInRequest request) {
        return auth.signIn(request.email(), request.password());
    }

    @PostMapping("/api/v1/auth/refresh")
    AuthResponse refresh(@Valid @RequestBody RefreshRequest request) {
        return auth.refresh(request.refreshToken());
    }

    @PostMapping("/api/v1/auth/sign-out")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    void signOut(@Valid @RequestBody RefreshRequest request) {
        auth.signOut(request.refreshToken());
    }

    @PostMapping("/api/v1/me/password")
    AuthResponse changePassword(@AuthenticationPrincipal AuthUser me, @Valid @RequestBody ChangePasswordRequest request) {
        return auth.changePassword(me.id(), request.currentPassword(), request.newPassword());
    }

    @DeleteMapping("/api/v1/me")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    void deleteAccount(@AuthenticationPrincipal AuthUser me, @Valid @RequestBody DeleteAccountRequest request) {
        auth.deleteAccount(me.id(), request.password());
    }
}
