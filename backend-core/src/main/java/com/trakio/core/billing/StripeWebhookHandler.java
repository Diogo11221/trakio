package com.trakio.core.billing;

import com.stripe.exception.EventDataObjectDeserializationException;
import com.stripe.exception.SignatureVerificationException;
import com.stripe.model.Account;
import com.stripe.model.Charge;
import com.stripe.model.Dispute;
import com.stripe.model.Event;
import com.stripe.model.Invoice;
import com.stripe.model.StripeObject;
import com.stripe.model.Subscription;
import com.stripe.model.checkout.Session;
import com.stripe.net.Webhook;
import com.trakio.core.common.ApiException;
import com.trakio.core.config.TrakioProperties;
import java.time.Instant;
import java.util.Map;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/**
 * Turns verified Stripe events into billing changes. The signature check (HMAC with the
 * webhook secret, 5-minute tolerance) means nobody can fake a "payment succeeded".
 */
@Component
@ConditionalOnProperty(name = "trakio.payments.provider", havingValue = "stripe")
class StripeWebhookHandler {

    private static final Logger log = LoggerFactory.getLogger(StripeWebhookHandler.class);

    private final BillingService billing;
    private final String secret;

    StripeWebhookHandler(BillingService billing, TrakioProperties properties) {
        this.billing = billing;
        this.secret = properties.payments().stripe().webhookSecret();
    }

    Event verify(String payload, String signature) {
        try {
            return Webhook.constructEvent(payload, signature, secret);
        } catch (SignatureVerificationException | RuntimeException e) {
            log.warn("Rejected Stripe webhook with an invalid signature");
            throw ApiException.badRequest("invalid-signature", "Assinatura inválida.");
        }
    }

    @Transactional
    public void handle(Event event) {
        if (!billing.firstDelivery(event.getId())) {
            return;
        }
        StripeObject object = object(event);
        switch (event.getType()) {
            case "checkout.session.completed" -> {
                Session s = (Session) object;
                Map<String, String> meta = s.getMetadata() == null ? Map.of() : s.getMetadata();
                if ("subscription".equals(s.getMode()) && meta.containsKey("userId") && meta.containsKey("kind")) {
                    UUID userId = UUID.fromString(meta.get("userId"));
                    SubscriptionKind kind = SubscriptionKind.valueOf(meta.get("kind"));
                    // Only money that arrived grants access; otherwise wait for invoice/subscription events.
                    if ("paid".equals(s.getPaymentStatus()) || "no_payment_required".equals(s.getPaymentStatus())) {
                        billing.subscriptionStarted(userId, kind, s.getSubscription(), s.getCustomer(), null);
                    } else {
                        billing.subscriptionPending(userId, kind, s.getSubscription(), s.getCustomer());
                    }
                } else if ("payment".equals(s.getMode()) && "paid".equals(s.getPaymentStatus()) && meta.containsKey("paymentId")) {
                    billing.coachingPaid(UUID.fromString(meta.get("paymentId")), s.getPaymentIntent());
                } else {
                    // Not one of ours (e.g. created in the Stripe dashboard): acknowledge, don't retry forever.
                    log.warn("Ignoring checkout session {} without Trakio metadata", s.getId());
                }
            }
            case "checkout.session.expired" -> {
                Session s = (Session) object;
                String paymentId = s.getMetadata() == null ? null : s.getMetadata().get("paymentId");
                if (paymentId != null) {
                    billing.coachingCheckoutFailed(UUID.fromString(paymentId));
                }
            }
            case "customer.subscription.created", "customer.subscription.updated", "customer.subscription.deleted" -> {
                Subscription sub = (Subscription) object;
                Instant periodEnd = sub.getItems() == null || sub.getItems().getData().isEmpty() ? null
                        : epoch(sub.getItems().getData().getFirst().getCurrentPeriodEnd());
                SubscriptionStatus status = event.getType().endsWith("deleted") ? SubscriptionStatus.CANCELED : status(sub.getStatus());
                Map<String, String> meta = sub.getMetadata() == null ? Map.of() : sub.getMetadata();
                UUID userId = meta.containsKey("userId") ? UUID.fromString(meta.get("userId")) : null;
                SubscriptionKind kind = meta.containsKey("kind") ? SubscriptionKind.valueOf(meta.get("kind")) : null;
                billing.subscriptionChanged(sub.getId(), status, periodEnd, sub.getCancelAtPeriodEnd(), userId, kind);
            }
            case "invoice.paid" -> {
                Invoice invoice = (Invoice) object;
                String subscriptionId = invoice.getParent() == null || invoice.getParent().getSubscriptionDetails() == null ? null
                        : invoice.getParent().getSubscriptionDetails().getSubscription();
                if (subscriptionId != null) {
                    billing.subscriptionInvoicePaid(subscriptionId, invoice.getId(), invoice.getAmountPaid());
                }
            }
            case "charge.refunded" -> billing.refunded(((Charge) object).getPaymentIntent());
            case "charge.dispute.created" -> billing.disputed(((Dispute) object).getPaymentIntent());
            case "account.updated" -> {
                Account account = (Account) object;
                billing.payoutAccountUpdated(account.getId(), Boolean.TRUE.equals(account.getPayoutsEnabled()));
            }
            default -> log.debug("Ignoring Stripe event {}", event.getType());
        }
    }

    private static StripeObject object(Event event) {
        var deserializer = event.getDataObjectDeserializer();
        return deserializer.getObject().orElseGet(() -> {
            try {
                // API version differs from the library's: parse anyway, the fields we read are stable.
                return deserializer.deserializeUnsafe();
            } catch (EventDataObjectDeserializationException e) {
                throw new IllegalStateException("Unreadable Stripe event " + event.getId(), e);
            }
        });
    }

    private static SubscriptionStatus status(String stripe) {
        return switch (stripe) {
            case "active", "trialing" -> SubscriptionStatus.ACTIVE;
            case "past_due", "unpaid" -> SubscriptionStatus.PAST_DUE;
            case "canceled", "incomplete_expired" -> SubscriptionStatus.CANCELED;
            default -> SubscriptionStatus.INCOMPLETE;
        };
    }

    private static Instant epoch(Long seconds) {
        return seconds == null ? null : Instant.ofEpochSecond(seconds);
    }
}
