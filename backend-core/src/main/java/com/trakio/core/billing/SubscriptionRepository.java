package com.trakio.core.billing;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface SubscriptionRepository extends JpaRepository<Subscription, UUID> {

    Optional<Subscription> findByUserIdAndKind(UUID userId, SubscriptionKind kind);

    Optional<Subscription> findByProviderSubscriptionId(String providerSubscriptionId);

    List<Subscription> findByUserId(UUID userId);

    @Query("""
            select count(s) from Subscription s where s.kind = :kind
              and s.status in (com.trakio.core.billing.SubscriptionStatus.ACTIVE, com.trakio.core.billing.SubscriptionStatus.PAST_DUE)
            """)
    long countActive(SubscriptionKind kind);

    /** Cancelled subscriptions whose paid period is over (fake mode has no webhook to tell us). */
    List<Subscription> findByCancelAtPeriodEndTrueAndCurrentPeriodEndBefore(Instant now);
}
