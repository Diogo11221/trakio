package com.trakio.core.auth;

import com.trakio.core.account.AccountDtos.MeResponse;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public final class AuthDtos {

    private AuthDtos() {}

    /** Only client or trainer can be chosen — never admin. */
    public record SignUpRequest(
            /** Format checked after trimming and lower-casing (AuthService), so the app gets "invalid-email". */
            @NotBlank @Size(max = 300) String email,
            @NotBlank @Size(max = 128) String password,
            @NotNull @Pattern(regexp = "client|trainer") String role) {}

    public record SignInRequest(@NotBlank @Size(max = 254) String email, @NotBlank @Size(max = 128) String password) {}

    public record RefreshRequest(@NotBlank @Size(max = 128) String refreshToken) {}

    public record ChangePasswordRequest(
            @NotBlank @Size(max = 128) String currentPassword, @NotBlank @Size(max = 128) String newPassword) {}

    public record DeleteAccountRequest(@NotBlank @Size(max = 128) String password) {}

    public record AuthResponse(String accessToken, String tokenType, long expiresIn, String refreshToken, MeResponse account) {

        static AuthResponse of(TokenService.Tokens tokens, MeResponse account) {
            return new AuthResponse(tokens.accessToken(), "Bearer", tokens.expiresIn(), tokens.refreshToken(), account);
        }
    }
}
