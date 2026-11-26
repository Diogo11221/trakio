package com.trakio.core.billing;

import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.core.env.Environment;
import org.springframework.core.env.Profiles;
import org.springframework.stereotype.Component;

/** Local development only: every payment succeeds at once. Refuses to start under the "prod" profile. */
@Component
@ConditionalOnProperty(name = "trakio.payments.provider", havingValue = "fake")
class FakePaymentGateway implements PaymentGateway {

    private static final Logger log = LoggerFactory.getLogger(FakePaymentGateway.class);

    FakePaymentGateway(Environment environment) {
        if (environment.acceptsProfiles(Profiles.of("prod"))) {
            throw new IllegalStateException("The fake payment provider cannot run with the prod profile");
        }
        log.warn("Payments are FAKE: every checkout succeeds instantly. Never use this in production.");
    }

    @Override
    public Checkout subscriptionCheckout(UUID userId, String email, SubscriptionKind kind, String idempotencyKey) {
        return new Checkout("fake_sub_" + UUID.randomUUID(), null, true);
    }

    @Override
    public Checkout coachingCheckout(Payment payment, String trainerAccountId, String email, String idempotencyKey) {
        return new Checkout("fake_pi_" + UUID.randomUUID(), null, true);
    }

    @Override
    public void cancelAtPeriodEnd(String providerSubscriptionId) {}

    @Override
    public void cancelNow(String providerSubscriptionId) {}

    @Override
    public void refund(String providerPaymentRef, String idempotencyKey) {}

    @Override
    public ConnectLink connectOnboarding(UUID trainerId, String existingAccountId, String email) {
        return new ConnectLink(existingAccountId != null ? existingAccountId : "fake_acct_" + trainerId, null, true);
    }

    @Override
    public boolean requiresPayoutAccount() {
        return false;
    }
}
