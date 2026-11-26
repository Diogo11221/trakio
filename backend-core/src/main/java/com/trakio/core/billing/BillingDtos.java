package com.trakio.core.billing;

import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

public final class BillingDtos {

    private BillingDtos() {}

    /** {@code url} null + status "active" = already paid (dev); otherwise open the url to pay. */
    public record CheckoutView(String status, String url) {}

    public record SubscriptionView(SubscriptionKind kind, SubscriptionStatus status, boolean active, Instant currentPeriodEnd,
            boolean cancelAtPeriodEnd, int priceCents) {}

    public record PaymentView(UUID id, PaymentKind kind, String description, long amountCents, long feeCents,
            String currency, PaymentStatus status, Instant paidAt, Instant createdAt) {

        public static PaymentView of(Payment p) {
            return new PaymentView(p.getId(), p.getKind(), p.getDescription(), p.getAmountCents(), p.getFeeCents(),
                    p.getCurrency(), p.getStatus(), p.getPaidAt(), p.getCreatedAt());
        }
    }

    /**
     * Cancelling a paid plan is never a toggle: the request has to say so explicitly.
     */
    public record CancelInput(@AssertTrue(message = "Confirma o cancelamento.") boolean confirm) {}

    public record RefundRequestInput(@NotBlank @Size(max = 1000) String reason) {}

    public record EarningPayment(UUID id, String student, String description, long amountCents, long feeCents,
            long netCents, PaymentStatus status, Instant paidAt) {}

    public record Earnings(String month, long receivedCents, long feeCents, long netCents, Double changePercent,
            List<EarningPayment> payments) {}

    public record PayoutAccountView(boolean connected, boolean payoutsEnabled, String onboardingUrl) {}
}
