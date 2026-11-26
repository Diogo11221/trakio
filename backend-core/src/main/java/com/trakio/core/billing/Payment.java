package com.trakio.core.billing;

import com.trakio.core.common.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;

/** Money in cents. Fee = the platform's commission, kept by Stripe Connect on the PT's payment. */
@Entity
@Table(name = "payments")
public class Payment extends BaseEntity {

    private UUID payerId;

    private UUID trainerId;

    private UUID relationshipId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 16)
    private PaymentKind kind;

    @Column(nullable = false, length = 160)
    private String description;

    @Column(nullable = false)
    private long amountCents;

    @Column(nullable = false)
    private long feeCents;

    @Column(nullable = false, length = 3)
    private String currency = "EUR";

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 24)
    private PaymentStatus status = PaymentStatus.PENDING;

    @Column(unique = true, length = 128)
    private String providerRef;

    @Column(length = 1000)
    private String refundReason;

    private Instant paidAt;

    protected Payment() {}

    public Payment(UUID payerId, UUID trainerId, UUID relationshipId, PaymentKind kind, String description, long amountCents,
            long feeCents) {
        this.payerId = payerId;
        this.trainerId = trainerId;
        this.relationshipId = relationshipId;
        this.kind = kind;
        this.description = description;
        this.amountCents = amountCents;
        this.feeCents = feeCents;
    }

    public void checkoutStarted(String reference) {
        this.providerRef = reference;
    }

    public void paid(String reference, Instant now) {
        if (reference != null) {
            this.providerRef = reference;
        }
        this.status = PaymentStatus.PAID;
        this.paidAt = now;
    }

    public void failed() {
        if (status == PaymentStatus.PENDING) {
            this.status = PaymentStatus.FAILED;
        }
    }

    public void refundRequested(String reason) {
        this.status = PaymentStatus.REFUND_REQUESTED;
        this.refundReason = reason;
    }

    public void setStatus(PaymentStatus status) {
        this.status = status;
    }

    public long netCents() {
        return amountCents - feeCents;
    }

    public UUID getPayerId() {
        return payerId;
    }

    public UUID getTrainerId() {
        return trainerId;
    }

    public UUID getRelationshipId() {
        return relationshipId;
    }

    public PaymentKind getKind() {
        return kind;
    }

    public String getDescription() {
        return description;
    }

    public long getAmountCents() {
        return amountCents;
    }

    public long getFeeCents() {
        return feeCents;
    }

    public String getCurrency() {
        return currency;
    }

    public PaymentStatus getStatus() {
        return status;
    }

    public String getProviderRef() {
        return providerRef;
    }

    public String getRefundReason() {
        return refundReason;
    }

    public Instant getPaidAt() {
        return paidAt;
    }
}
