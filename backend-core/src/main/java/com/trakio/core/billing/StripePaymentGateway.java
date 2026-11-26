package com.trakio.core.billing;

import com.stripe.exception.StripeException;
import com.stripe.model.Account;
import com.stripe.model.AccountLink;
import com.stripe.model.Refund;
import com.stripe.model.Subscription;
import com.stripe.model.checkout.Session;
import com.stripe.net.RequestOptions;
import com.stripe.param.AccountCreateParams;
import com.stripe.param.AccountLinkCreateParams;
import com.stripe.param.RefundCreateParams;
import com.stripe.param.SubscriptionCancelParams;
import com.stripe.param.SubscriptionUpdateParams;
import com.stripe.param.checkout.SessionCreateParams;
import com.trakio.core.common.ApiException;
import com.trakio.core.config.TrakioProperties;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;

/**
 * Stripe Checkout for subscriptions (Billing) and for student → PT payments (Connect, with the
 * platform fee kept as an application fee). Card details never touch our servers.
 */
@Component
@ConditionalOnProperty(name = "trakio.payments.provider", havingValue = "stripe")
class StripePaymentGateway implements PaymentGateway {

    private static final Logger log = LoggerFactory.getLogger(StripePaymentGateway.class);

    private final TrakioProperties.Stripe stripe;

    StripePaymentGateway(TrakioProperties properties) {
        this.stripe = properties.payments().stripe();
        require(stripe.secretKey(), "trakio.payments.stripe.secret-key");
        require(stripe.webhookSecret(), "trakio.payments.stripe.webhook-secret");
        require(stripe.premiumPriceId(), "trakio.payments.stripe.premium-price-id");
        require(stripe.marketplacePriceId(), "trakio.payments.stripe.marketplace-price-id");
    }

    private static void require(String value, String name) {
        if (value == null || value.isBlank()) {
            throw new IllegalStateException(name + " is required when trakio.payments.provider=stripe");
        }
    }

    private RequestOptions options(String idempotencyKey) {
        return RequestOptions.builder().setApiKey(stripe.secretKey()).setIdempotencyKey(idempotencyKey).build();
    }

    @Override
    public Checkout subscriptionCheckout(UUID userId, String email, SubscriptionKind kind, String idempotencyKey) {
        String price = kind == SubscriptionKind.PREMIUM ? stripe.premiumPriceId() : stripe.marketplacePriceId();
        SessionCreateParams params = SessionCreateParams.builder()
                .setMode(SessionCreateParams.Mode.SUBSCRIPTION)
                .setClientReferenceId(userId.toString())
                .setCustomerEmail(email)
                .setSuccessUrl(stripe.successUrl())
                .setCancelUrl(stripe.cancelUrl())
                .addLineItem(SessionCreateParams.LineItem.builder().setPrice(price).setQuantity(1L).build())
                .putMetadata("userId", userId.toString())
                .putMetadata("kind", kind.name())
                .setSubscriptionData(SessionCreateParams.SubscriptionData.builder()
                        .putMetadata("userId", userId.toString())
                        .putMetadata("kind", kind.name())
                        .build())
                .build();
        return call(() -> {
            Session session = Session.create(params, options(idempotencyKey));
            return new Checkout(session.getId(), session.getUrl(), false);
        });
    }

    @Override
    public Checkout coachingCheckout(Payment payment, String trainerAccountId, String email, String idempotencyKey) {
        SessionCreateParams params = SessionCreateParams.builder()
                .setMode(SessionCreateParams.Mode.PAYMENT)
                .setCustomerEmail(email)
                .setSuccessUrl(stripe.successUrl())
                .setCancelUrl(stripe.cancelUrl())
                .addLineItem(SessionCreateParams.LineItem.builder()
                        .setQuantity(1L)
                        .setPriceData(SessionCreateParams.LineItem.PriceData.builder()
                                .setCurrency("eur")
                                .setUnitAmount(payment.getAmountCents())
                                .setProductData(SessionCreateParams.LineItem.PriceData.ProductData.builder()
                                        .setName(payment.getDescription())
                                        .build())
                                .build())
                        .build())
                .setPaymentIntentData(SessionCreateParams.PaymentIntentData.builder()
                        .setApplicationFeeAmount(payment.getFeeCents())
                        .setTransferData(SessionCreateParams.PaymentIntentData.TransferData.builder()
                                .setDestination(trainerAccountId)
                                .build())
                        .putMetadata("paymentId", payment.getId().toString())
                        .build())
                .putMetadata("paymentId", payment.getId().toString())
                .putMetadata("kind", PaymentKind.COACHING.name())
                .build();
        return call(() -> {
            Session session = Session.create(params, options(idempotencyKey));
            return new Checkout(session.getId(), session.getUrl(), false);
        });
    }

    @Override
    public void cancelAtPeriodEnd(String providerSubscriptionId) {
        call(() -> Subscription.retrieve(providerSubscriptionId, options(null))
                .update(SubscriptionUpdateParams.builder().setCancelAtPeriodEnd(true).build(), options(null)));
    }

    @Override
    public void cancelNow(String providerSubscriptionId) {
        call(() -> Subscription.retrieve(providerSubscriptionId, options(null))
                .cancel(SubscriptionCancelParams.builder().build(), options(null)));
    }

    @Override
    public void refund(String providerPaymentRef, String idempotencyKey) {
        call(() -> Refund.create(RefundCreateParams.builder()
                .setPaymentIntent(providerPaymentRef)
                .setReverseTransfer(true)
                .setRefundApplicationFee(true)
                .build(), options(idempotencyKey)));
    }

    @Override
    public ConnectLink connectOnboarding(UUID trainerId, String existingAccountId, String email) {
        return call(() -> {
            String accountId = existingAccountId;
            boolean payouts = false;
            if (accountId != null) {
                payouts = Boolean.TRUE.equals(Account.retrieve(accountId, options(null)).getPayoutsEnabled());
            } else {
                Account account = Account.create(AccountCreateParams.builder()
                        .setType(AccountCreateParams.Type.EXPRESS)
                        .setCountry("PT")
                        .setEmail(email)
                        .setCapabilities(AccountCreateParams.Capabilities.builder()
                                .setCardPayments(AccountCreateParams.Capabilities.CardPayments.builder().setRequested(true).build())
                                .setTransfers(AccountCreateParams.Capabilities.Transfers.builder().setRequested(true).build())
                                .build())
                        .putMetadata("trainerId", trainerId.toString())
                        .build(), options("connect-" + trainerId));
                accountId = account.getId();
                payouts = Boolean.TRUE.equals(account.getPayoutsEnabled());
            }
            AccountLink link = AccountLink.create(AccountLinkCreateParams.builder()
                    .setAccount(accountId)
                    .setRefreshUrl(stripe.connectRefreshUrl())
                    .setReturnUrl(stripe.connectReturnUrl())
                    .setType(AccountLinkCreateParams.Type.ACCOUNT_ONBOARDING)
                    .build(), options(null));
            return new ConnectLink(accountId, link.getUrl(), payouts);
        });
    }

    @Override
    public boolean requiresPayoutAccount() {
        return true;
    }

    private interface StripeCall<T> {
        T run() throws StripeException;
    }

    private static <T> T call(StripeCall<T> call) {
        try {
            return call.run();
        } catch (StripeException e) {
            log.error("Stripe request failed: {} (request id {})", e.getMessage(), e.getRequestId());
            throw new ApiException(HttpStatus.BAD_GATEWAY, "payment-provider",
                    "O serviço de pagamentos não respondeu. Tenta outra vez daqui a pouco.");
        }
    }
}
