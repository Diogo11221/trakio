package com.trakio.core.billing;

import java.util.UUID;

/** The payment provider: Stripe in production, an instant fake for local development. */
public interface PaymentGateway {

    /** Where to send the person to pay. {@code completed} = already paid (fake mode). */
    record Checkout(String reference, String url, boolean completed) {}

    record ConnectLink(String accountId, String url, boolean payoutsEnabled) {}

    Checkout subscriptionCheckout(UUID userId, String email, SubscriptionKind kind, String idempotencyKey);

    Checkout coachingCheckout(Payment payment, String trainerAccountId, String email, String idempotencyKey);

    void cancelAtPeriodEnd(String providerSubscriptionId);

    void cancelNow(String providerSubscriptionId);

    void refund(String providerPaymentRef, String idempotencyKey);

    /** Creates the PT's payout account if needed and returns the onboarding link. */
    ConnectLink connectOnboarding(UUID trainerId, String existingAccountId, String email);

    /** Whether PTs need a connected payout account before students can pay them. */
    boolean requiresPayoutAccount();
}
