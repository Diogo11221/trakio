package com.trakio.core.billing;

import com.trakio.core.common.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;

/** Premium (client) or marketplace listing (PT). Only payment events change its status. */
@Entity
@Table(name = "subscriptions")
public class Subscription extends BaseEntity {

    @Column(nullable = false)
    private UUID userId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 16)
    private SubscriptionKind kind;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 16)
    private SubscriptionStatus status = SubscriptionStatus.INCOMPLETE;

    @Column(unique = true, length = 64)
    private String providerSubscriptionId;

    @Column(length = 64)
    private String providerCustomerId;

    private Instant currentPeriodEnd;

    @Column(nullable = false)
    private boolean cancelAtPeriodEnd;

    protected Subscription() {}

    public Subscription(UUID userId, SubscriptionKind kind) {
        this.userId = userId;
        this.kind = kind;
    }

    /** Paid and current. A failed renewal keeps access during Stripe's retry period. */
    public boolean grantsAccess() {
        return status == SubscriptionStatus.ACTIVE || status == SubscriptionStatus.PAST_DUE;
    }

    public void started(String subscriptionId, String customerId, Instant periodEnd) {
        this.providerSubscriptionId = subscriptionId;
        this.providerCustomerId = customerId;
        this.status = SubscriptionStatus.ACTIVE;
        this.cancelAtPeriodEnd = false;
        if (periodEnd != null) {
            this.currentPeriodEnd = periodEnd;
        }
    }

    public void changed(SubscriptionStatus status, Instant periodEnd, Boolean cancelAtPeriodEnd) {
        this.status = status;
        if (periodEnd != null) {
            this.currentPeriodEnd = periodEnd;
        }
        if (cancelAtPeriodEnd != null) {
            this.cancelAtPeriodEnd = cancelAtPeriodEnd;
        }
    }

    public void cancelAtPeriodEnd() {
        this.cancelAtPeriodEnd = true;
    }

    public void ended() {
        this.status = SubscriptionStatus.CANCELED;
        this.cancelAtPeriodEnd = false;
    }

    public UUID getUserId() {
        return userId;
    }

    public SubscriptionKind getKind() {
        return kind;
    }

    public SubscriptionStatus getStatus() {
        return status;
    }

    public String getProviderSubscriptionId() {
        return providerSubscriptionId;
    }

    public Instant getCurrentPeriodEnd() {
        return currentPeriodEnd;
    }

    public boolean isCancelAtPeriodEnd() {
        return cancelAtPeriodEnd;
    }
}
