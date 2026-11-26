package com.trakio.core.account;

import com.trakio.core.account.AccountDtos.MeResponse;
import com.trakio.core.account.AccountDtos.PreferencesInput;
import com.trakio.core.account.AccountDtos.PreferencesView;
import com.trakio.core.account.AccountDtos.ProfileInput;
import com.trakio.core.auth.AuthUser;
import jakarta.validation.Valid;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/me")
class AccountController {

    private final AccountService accounts;

    AccountController(AccountService accounts) {
        this.accounts = accounts;
    }

    @GetMapping
    MeResponse me(@AuthenticationPrincipal AuthUser me) {
        return accounts.me(me.id());
    }

    @PutMapping("/profile")
    MeResponse saveProfile(@AuthenticationPrincipal AuthUser me, @Valid @RequestBody ProfileInput input) {
        return accounts.saveProfile(me.id(), me.role(), input);
    }

    @PutMapping("/preferences")
    PreferencesView savePreferences(@AuthenticationPrincipal AuthUser me, @Valid @RequestBody PreferencesInput input) {
        return accounts.savePreferences(me.id(), input);
    }
}
