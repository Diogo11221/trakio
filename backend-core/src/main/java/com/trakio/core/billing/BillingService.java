package com.trakio.core.billing;

import com.trakio.core.account.ClientProfile;
import com.trakio.core.account.ClientProfileRepository;
import com.trakio.core.account.TrainerProfile;
import com.trakio.core.account.TrainerProfileRepository;
import com.trakio.core.auth.UserRepository;
import com.trakio.core.billing.BillingDtos.CheckoutView;
import com.trakio.core.billing.BillingDtos.EarningPayment;
import com.trakio.core.billing.BillingDtos.Earnings;
import com.trakio.core.billing.BillingDtos.PaymentView;
import com.trakio.core.billing.BillingDtos.PayoutAccountView;
import com.trakio.core.billing.BillingDtos.SubscriptionView;
import com.trakio.core.coaching.CoachingRelationship;
import com.trakio.core.common.ApiException;
import com.trakio.core.common.PageResponse;
import com.trakio.core.common.Pages;
import com.trakio.core.config.TrakioProperties;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.YearMonth;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class BillingService {

    private static final Logger log = LoggerFactory.getLogger(BillingService.class);
    private static final Duration REFUND_WINDOW = Duration.ofDays(14);

    private final SubscriptionRepository subscriptions;
    private final PaymentRepository payments;
    private final ProcessedWebhookEventRepository processedEvents;
    private final TrainerProfileRepository trainers;
    private final ClientProfileRepository clients;
    private final UserRepository users;
    private final PaymentGateway gateway;
    private final ApplicationEventPublisher events;
    private final TrakioProperties properties;
    private final Clock clock;

    public BillingService(SubscriptionRepository subscriptions, PaymentRepository payments,
            ProcessedWebhookEventRepository processedEvents, TrainerProfileRepository trainers,
            ClientProfileRepository clients, UserRepository users, PaymentGateway gateway, ApplicationEventPublisher events,
            TrakioProperties properties, Clock clock) {
        this.subscriptions = subscriptions;
        this.payments = payments;
        this.processedEvents = processedEvents;
        this.trainers = trainers;
        this.clients = clients;
        this.users = users;
        this.gateway = gateway;
        this.events = events;
        this.properties = properties;
        this.clock = clock;
    }

    private int priceOf(SubscriptionKind kind) {
        return kind == SubscriptionKind.PREMIUM ? properties.payments().premiumPriceCents()
                : properties.payments().marketplacePriceCents();
    }

    // ── Subscriptions (Premium, marketplace) ────────────────────────────────

    @Transactional(readOnly = true)
    public List<SubscriptionView> subscriptions(UUID userId) {
        return subscriptions.findByUserId(userId).stream().map(this::view).toList();
    }

    @Transactional(readOnly = true)
    public SubscriptionView subscription(UUID userId, SubscriptionKind kind) {
        return subscriptions.findByUserIdAndKind(userId, kind).map(this::view)
                .orElse(new SubscriptionView(kind, SubscriptionStatus.CANCELED, false, null, false, priceOf(kind)));
    }

    private SubscriptionView view(Subscription s) {
        return new SubscriptionView(s.getKind(), s.getStatus(), s.grantsAccess(), s.getCurrentPeriodEnd(),
                s.isCancelAtPeriodEnd(), priceOf(s.getKind()));
    }

    @Transactional
    public CheckoutView startSubscription(UUID userId, SubscriptionKind kind) {
        if (kind == SubscriptionKind.MARKETPLACE) {
            TrainerProfile trainer = trainers.findByUserId(userId)
                    .orElseThrow(() -> ApiException.conflict("no-profile", "Cria o teu perfil primeiro."));
            if (!trainer.isVerified()) {
                throw ApiException.conflict("not-verified", "O teu perfil tem de estar verificado para aparecer no marketplace.");
            }
        }
        Subscription sub = subscriptions.findByUserIdAndKind(userId, kind).orElseGet(() -> new Subscription(userId, kind));
        if (sub.grantsAccess()) {
            if (sub.isCancelAtPeriodEnd()) {
                throw ApiException.conflict("already-subscribed",
                        "A subscrição ainda está ativa até ao fim do período. Volta a ativá-la depois dessa data.");
            }
            throw ApiException.conflict("already-subscribed", "Já tens esta subscrição ativa.");
        }
        subscriptions.save(sub);
        String email = users.findById(userId).orElseThrow().getEmail();
        // One checkout per user/kind per 10 minutes: a double tap doesn't open two.
        String idempotency = "sub-" + kind + "-" + userId + "-" + clock.instant().truncatedTo(ChronoUnit.MINUTES).getEpochSecond() / 600;
        PaymentGateway.Checkout checkout = gateway.subscriptionCheckout(userId, email, kind, idempotency);
        if (checkout.completed()) {
            subscriptionStarted(userId, kind, checkout.reference(), null, clock.instant().plus(30, ChronoUnit.DAYS));
            recordSubscriptionPayment(sub, "fake_inv_" + UUID.randomUUID(), priceOf(kind));
            return new CheckoutView("active", null);
        }
        return new CheckoutView("pending", checkout.url());
    }

    /** Ends at the end of the paid period. Explicit confirmation is checked in the request. */
    @Transactional
    public SubscriptionView cancelSubscription(UUID userId, SubscriptionKind kind) {
        Subscription sub = subscriptions.findByUserIdAndKind(userId, kind).filter(Subscription::grantsAccess)
                .orElseThrow(() -> ApiException.notFound("Esta subscrição"));
        if (sub.getProviderSubscriptionId() != null) {
            gateway.cancelAtPeriodEnd(sub.getProviderSubscriptionId());
        }
        sub.cancelAtPeriodEnd();
        return view(sub);
    }

    @Transactional
    public void subscriptionStarted(UUID userId, SubscriptionKind kind, String subscriptionId, String customerId,
            Instant periodEnd) {
        if (!users.existsById(userId)) {
            // Account deleted while paying: stop the subscription instead of charging nobody's account.
            log.warn("Subscription {} for a deleted account; cancelling", subscriptionId);
            if (subscriptionId != null) {
                gateway.cancelNow(subscriptionId);
            }
            return;
        }
        Subscription sub = subscriptions.findByUserIdAndKind(userId, kind).orElseGet(() -> new Subscription(userId, kind));
        sub.started(subscriptionId, customerId, periodEnd);
        subscriptions.save(sub);
        log.info("Subscription active user={} kind={}", userId, kind);
    }

    /** Checkout completed with the payment still pending: remember the subscription, grant nothing yet. */
    @Transactional
    public void subscriptionPending(UUID userId, SubscriptionKind kind, String subscriptionId, String customerId) {
        if (!users.existsById(userId)) {
            return;
        }
        Subscription sub = subscriptions.findByUserIdAndKind(userId, kind).orElseGet(() -> new Subscription(userId, kind));
        sub.linkPending(subscriptionId, customerId);
        subscriptions.save(sub);
    }

    /**
     * Status from Stripe. Events can arrive before checkout completion, so an unknown subscription is
     * linked through the metadata we put on it ({@code userId}, {@code kind}) instead of being dropped.
     */
    @Transactional
    public void subscriptionChanged(String subscriptionId, SubscriptionStatus status, Instant periodEnd, Boolean cancelAtPeriodEnd,
            UUID userId, SubscriptionKind kind) {
        Subscription sub = subscriptions.findByProviderSubscriptionId(subscriptionId).orElse(null);
        if (sub == null) {
            if (userId == null || kind == null || !users.existsById(userId)) {
                log.warn("Subscription {} has no Trakio metadata; ignoring", subscriptionId);
                return;
            }
            sub = subscriptions.findByUserIdAndKind(userId, kind).orElseGet(() -> new Subscription(userId, kind));
            sub.linkPending(subscriptionId, null);
        }
        sub.changed(status, periodEnd, cancelAtPeriodEnd);
        subscriptions.save(sub);
    }

    @Transactional
    public void subscriptionInvoicePaid(String subscriptionId, String invoiceId, Long amountCents) {
        subscriptions.findByProviderSubscriptionId(subscriptionId).ifPresent(sub -> {
            if (payments.findByProviderRef(invoiceId).isEmpty()) {
                recordSubscriptionPayment(sub, invoiceId, amountCents == null ? priceOf(sub.getKind()) : amountCents);
            }
        });
    }

    private void recordSubscriptionPayment(Subscription sub, String reference, long amountCents) {
        PaymentKind kind = sub.getKind() == SubscriptionKind.PREMIUM ? PaymentKind.PREMIUM : PaymentKind.MARKETPLACE;
        String description = kind == PaymentKind.PREMIUM ? "Trakio Premium" : "Subscrição do marketplace";
        Payment payment = new Payment(sub.getUserId(), null, null, kind, description, amountCents, 0);
        payment.paid(reference, clock.instant());
        payments.save(payment);
    }

    /** Fake mode has no webhooks: end subscriptions whose cancelled period is over. */
    @Scheduled(fixedDelay = 3_600_000)
    @Transactional
    public void endLapsedSubscriptions() {
        subscriptions.findByCancelAtPeriodEndTrueAndCurrentPeriodEndBefore(clock.instant()).forEach(Subscription::ended);
    }

    // ── PT payout account (Stripe Connect) ──────────────────────────────────

    @Transactional
    public PayoutAccountView payoutOnboarding(UUID trainerId) {
        TrainerProfile trainer = trainers.findByUserId(trainerId)
                .orElseThrow(() -> ApiException.conflict("no-profile", "Cria o teu perfil primeiro."));
        String email = users.findById(trainerId).orElseThrow().getEmail();
        PaymentGateway.ConnectLink link = gateway.connectOnboarding(trainerId, trainer.getStripeAccountId(), email);
        trainer.setStripeAccountId(link.accountId());
        if (link.payoutsEnabled()) {
            trainer.setPayoutsEnabled(true);
        }
        return new PayoutAccountView(true, trainer.isPayoutsEnabled(), link.url());
    }

    @Transactional(readOnly = true)
    public PayoutAccountView payoutAccount(UUID trainerId) {
        return trainers.findByUserId(trainerId)
                .map(t -> new PayoutAccountView(t.getStripeAccountId() != null, t.isPayoutsEnabled(), null))
                .orElse(new PayoutAccountView(false, false, null));
    }

    @Transactional
    public void payoutAccountUpdated(String accountId, boolean payoutsEnabled) {
        trainers.findByStripeAccountId(accountId).ifPresent(t -> t.setPayoutsEnabled(payoutsEnabled));
    }

    // ── Student → PT payments ───────────────────────────────────────────────

    @Transactional
    public CheckoutView startCoachingPayment(CoachingRelationship rel, String payerEmail) {
        TrainerProfile trainer = trainers.findByUserId(rel.getTrainerId()).orElseThrow(() -> ApiException.notFound("Este PT"));
        if (gateway.requiresPayoutAccount() && (trainer.getStripeAccountId() == null || !trainer.isPayoutsEnabled())) {
            throw ApiException.conflict("trainer-cannot-receive", "Este PT ainda não pode receber pagamentos.");
        }
        long amount = rel.getPriceCents();
        long fee = Math.round(amount * properties.payments().platformFeePercent() / 100.0);
        Payment payment = payments.save(new Payment(rel.getClientId(), rel.getTrainerId(), rel.getId(), PaymentKind.COACHING,
                rel.getPackageName() + " · " + trainer.getName(), amount, fee));
        PaymentGateway.Checkout checkout = gateway.coachingCheckout(payment, trainer.getStripeAccountId(), payerEmail,
                "pay-" + payment.getId());
        if (checkout.completed()) {
            coachingPaid(payment.getId(), checkout.reference());
            return new CheckoutView("active", null);
        }
        payment.checkoutStarted(checkout.reference());
        return new CheckoutView("pending", checkout.url());
    }

    @Transactional
    public void coachingPaid(UUID paymentId, String paymentIntentId) {
        payments.findById(paymentId).filter(p -> p.getStatus() == PaymentStatus.PENDING).ifPresent(p -> {
            p.paid(paymentIntentId, clock.instant());
            events.publishEvent(new PaymentEvents.CoachingPaid(p.getRelationshipId()));
        });
    }

    @Transactional
    public void coachingCheckoutFailed(UUID paymentId) {
        payments.findById(paymentId).filter(p -> p.getStatus() == PaymentStatus.PENDING).ifPresent(p -> {
            p.failed();
            events.publishEvent(new PaymentEvents.CoachingCheckoutFailed(p.getRelationshipId()));
        });
    }

    /** An abandoned checkout replaced by a new one. */
    @Transactional
    public void cancelPendingFor(UUID relationshipId) {
        payments.findByRelationshipIdAndStatus(relationshipId, PaymentStatus.PENDING).forEach(Payment::failed);
    }

    @Transactional(readOnly = true)
    public PageResponse<PaymentView> myPayments(UUID userId, int page, int size) {
        return PageResponse.of(payments.findByPayerIdOrderByCreatedAtDesc(userId, Pages.of(page, size, Sort.unsorted())),
                PaymentView::of);
    }

    /** A student asks for their money back; an admin decides. */
    @Transactional
    public PaymentView requestRefund(UUID payerId, UUID paymentId, String reason) {
        Payment p = payments.findById(paymentId).filter(x -> payerId.equals(x.getPayerId()))
                .orElseThrow(() -> ApiException.notFound("Este pagamento"));
        if (p.getKind() != PaymentKind.COACHING || p.getStatus() != PaymentStatus.PAID) {
            throw ApiException.conflict("not-refundable", "Este pagamento não pode ser reembolsado.");
        }
        if (p.getPaidAt().plus(REFUND_WINDOW).isBefore(clock.instant())) {
            throw ApiException.conflict("refund-window", "Só é possível pedir reembolso até 14 dias depois do pagamento.");
        }
        p.refundRequested(reason.trim());
        return PaymentView.of(p);
    }

    public enum RefundDecision {
        APPROVE, DECLINE, RESCHEDULE;

        @com.fasterxml.jackson.annotation.JsonValue
        public String json() {
            return com.trakio.core.common.Enums.json(this);
        }
    }

    @Transactional
    public PaymentView decideRefund(UUID paymentId, RefundDecision decision) {
        Payment p = payments.findById(paymentId).orElseThrow(() -> ApiException.notFound("Este pagamento"));
        if (p.getStatus() != PaymentStatus.REFUND_REQUESTED && p.getStatus() != PaymentStatus.DISPUTED) {
            throw ApiException.conflict("no-refund-request", "Não há pedido de reembolso para este pagamento.");
        }
        switch (decision) {
            case APPROVE -> {
                gateway.refund(p.getProviderRef(), "refund-" + p.getId());
                markRefunded(p);
            }
            case DECLINE -> p.setStatus(PaymentStatus.REFUND_DECLINED);
            case RESCHEDULE -> p.setStatus(PaymentStatus.RESCHEDULED);
        }
        return PaymentView.of(p);
    }

    @Transactional
    public void refunded(String paymentIntentId) {
        payments.findByProviderRef(paymentIntentId).filter(p -> p.getStatus() != PaymentStatus.REFUNDED).ifPresent(this::markRefunded);
    }

    private void markRefunded(Payment p) {
        p.setStatus(PaymentStatus.REFUNDED);
        if (p.getRelationshipId() != null) {
            events.publishEvent(new PaymentEvents.CoachingRefunded(p.getRelationshipId()));
        }
    }

    @Transactional
    public void disputed(String paymentIntentId) {
        payments.findByProviderRef(paymentIntentId).ifPresent(p -> p.setStatus(PaymentStatus.DISPUTED));
    }

    /** Records a webhook id; false when it was already handled. */
    @Transactional
    public boolean firstDelivery(String eventId) {
        if (processedEvents.existsById(eventId)) {
            return false;
        }
        processedEvents.saveAndFlush(new ProcessedWebhookEvent(eventId, clock.instant()));
        return true;
    }

    // ── PT earnings ─────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public Earnings earnings(UUID trainerId, YearMonth month) {
        var zone = properties.zone();
        List<Payment> current = paymentsIn(trainerId, month);
        List<Payment> previous = paymentsIn(trainerId, month.minusMonths(1));
        long received = current.stream().mapToLong(Payment::getAmountCents).sum();
        long fee = current.stream().mapToLong(Payment::getFeeCents).sum();
        long before = previous.stream().mapToLong(Payment::getAmountCents).sum();
        Double change = before == 0 ? null : Math.round((received - before) * 1000.0 / before) / 10.0;
        Map<UUID, String> names = clients.findByUserIdIn(current.stream().map(Payment::getPayerId).filter(id -> id != null).toList())
                .stream().collect(Collectors.toMap(ClientProfile::getUserId, ClientProfile::getName));
        return new Earnings(month.toString(), received, fee, received - fee, change, current.stream()
                .map(p -> new EarningPayment(p.getId(), names.getOrDefault(p.getPayerId(), "Conta removida"), p.getDescription(),
                        p.getAmountCents(), p.getFeeCents(), p.netCents(), p.getStatus(), p.getPaidAt()))
                .toList());
    }

    private List<Payment> paymentsIn(UUID trainerId, YearMonth month) {
        var zone = properties.zone();
        Instant from = month.atDay(1).atStartOfDay(zone).toInstant();
        Instant to = month.plusMonths(1).atDay(1).atStartOfDay(zone).toInstant();
        return payments.findByTrainerIdAndKindAndStatusInAndPaidAtGreaterThanEqualAndPaidAtLessThanOrderByPaidAtDesc(trainerId,
                PaymentKind.COACHING, PaymentRepository.COUNTED, from, to);
    }

    // ── Account deletion ────────────────────────────────────────────────────

    /** Stops future charges before the account disappears. Best effort: a provider error doesn't block erasure. */
    @Transactional
    public void cancelEverythingFor(UUID userId) {
        for (Subscription sub : subscriptions.findByUserId(userId)) {
            if (sub.grantsAccess() && sub.getProviderSubscriptionId() != null) {
                try {
                    gateway.cancelNow(sub.getProviderSubscriptionId());
                } catch (ApiException e) {
                    log.error("Could not cancel subscription {} for deleted user {}", sub.getProviderSubscriptionId(), userId);
                }
            }
            sub.ended();
        }
    }

    static ApiException paymentRequired() {
        return new ApiException(HttpStatus.PAYMENT_REQUIRED, "payment-required", "É preciso pagar para continuar.");
    }
}
