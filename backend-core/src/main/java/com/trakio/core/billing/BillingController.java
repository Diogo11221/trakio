package com.trakio.core.billing;

import com.trakio.core.auth.AuthUser;
import com.trakio.core.billing.BillingDtos.CancelInput;
import com.trakio.core.billing.BillingDtos.CheckoutView;
import com.trakio.core.billing.BillingDtos.Earnings;
import com.trakio.core.billing.BillingDtos.PaymentView;
import com.trakio.core.billing.BillingDtos.PayoutAccountView;
import com.trakio.core.billing.BillingDtos.RefundRequestInput;
import com.trakio.core.billing.BillingDtos.SubscriptionView;
import com.trakio.core.common.ApiException;
import com.trakio.core.common.PageResponse;
import com.trakio.core.config.TrakioProperties;
import jakarta.validation.Valid;
import java.time.Clock;
import java.time.YearMonth;
import java.time.format.DateTimeParseException;
import java.util.List;
import java.util.UUID;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
class BillingController {

    private final BillingService billing;
    private final TrakioProperties properties;
    private final Clock clock;

    BillingController(BillingService billing, TrakioProperties properties, Clock clock) {
        this.billing = billing;
        this.properties = properties;
        this.clock = clock;
    }

    @GetMapping("/api/v1/me/subscriptions")
    List<SubscriptionView> mine(@AuthenticationPrincipal AuthUser me) {
        return billing.subscriptions(me.id());
    }

    @GetMapping("/api/v1/me/payments")
    PageResponse<PaymentView> payments(@AuthenticationPrincipal AuthUser me, @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return billing.myPayments(me.id(), page, size);
    }

    @PostMapping("/api/v1/me/payments/{id}/refund-request")
    @PreAuthorize("hasRole('CLIENT')")
    PaymentView requestRefund(@AuthenticationPrincipal AuthUser me, @PathVariable UUID id,
            @Valid @RequestBody RefundRequestInput input) {
        return billing.requestRefund(me.id(), id, input.reason());
    }

    // ── Premium (clients) ───────────────────────────────────────────────────

    @PostMapping("/api/v1/me/premium/checkout")
    @PreAuthorize("hasRole('CLIENT')")
    CheckoutView premium(@AuthenticationPrincipal AuthUser me) {
        return billing.startSubscription(me.id(), SubscriptionKind.PREMIUM);
    }

    @PostMapping("/api/v1/me/premium/cancel")
    @PreAuthorize("hasRole('CLIENT')")
    SubscriptionView cancelPremium(@AuthenticationPrincipal AuthUser me, @Valid @RequestBody CancelInput input) {
        return billing.cancelSubscription(me.id(), SubscriptionKind.PREMIUM);
    }

    // ── Marketplace listing and payouts (PTs) ───────────────────────────────

    @GetMapping("/api/v1/trainer/marketplace")
    SubscriptionView marketplace(@AuthenticationPrincipal AuthUser me) {
        return billing.subscription(me.id(), SubscriptionKind.MARKETPLACE);
    }

    @PostMapping("/api/v1/trainer/marketplace/checkout")
    CheckoutView activateMarketplace(@AuthenticationPrincipal AuthUser me) {
        return billing.startSubscription(me.id(), SubscriptionKind.MARKETPLACE);
    }

    @PostMapping("/api/v1/trainer/marketplace/cancel")
    SubscriptionView cancelMarketplace(@AuthenticationPrincipal AuthUser me, @Valid @RequestBody CancelInput input) {
        return billing.cancelSubscription(me.id(), SubscriptionKind.MARKETPLACE);
    }

    @GetMapping("/api/v1/trainer/payout-account")
    PayoutAccountView payoutAccount(@AuthenticationPrincipal AuthUser me) {
        return billing.payoutAccount(me.id());
    }

    @PostMapping("/api/v1/trainer/payout-account/onboarding")
    PayoutAccountView onboarding(@AuthenticationPrincipal AuthUser me) {
        return billing.payoutOnboarding(me.id());
    }

    @GetMapping("/api/v1/trainer/earnings")
    Earnings earnings(@AuthenticationPrincipal AuthUser me, @RequestParam(required = false) String month) {
        YearMonth ym;
        try {
            ym = month == null ? YearMonth.now(clock.withZone(properties.zone())) : YearMonth.parse(month);
        } catch (DateTimeParseException e) {
            throw ApiException.badRequest("invalid-month", "Mês inválido (usa AAAA-MM).");
        }
        return billing.earnings(me.id(), ym);
    }
}
