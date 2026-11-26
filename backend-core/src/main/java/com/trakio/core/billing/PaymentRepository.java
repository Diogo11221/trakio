package com.trakio.core.billing;

import java.time.Instant;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface PaymentRepository extends JpaRepository<Payment, UUID> {

    /** Statuses where the money was received (refunds and failures don't count). */
    List<PaymentStatus> COUNTED = List.of(PaymentStatus.PAID, PaymentStatus.REFUND_REQUESTED, PaymentStatus.REFUND_DECLINED,
            PaymentStatus.RESCHEDULED, PaymentStatus.DISPUTED);

    Optional<Payment> findByProviderRef(String providerRef);

    List<Payment> findByRelationshipIdAndStatus(UUID relationshipId, PaymentStatus status);

    Page<Payment> findByPayerIdOrderByCreatedAtDesc(UUID payerId, Pageable pageable);

    List<Payment> findByTrainerIdAndKindAndStatusInAndPaidAtGreaterThanEqualAndPaidAtLessThanOrderByPaidAtDesc(
            UUID trainerId, PaymentKind kind, Collection<PaymentStatus> statuses, Instant from, Instant to);

    @Query("""
            select p from Payment p
            where (:status is null or p.status = :status) and (:kind is null or p.kind = :kind)
              and p.status <> com.trakio.core.billing.PaymentStatus.PENDING
            order by p.createdAt desc
            """)
    Page<Payment> search(PaymentStatus status, PaymentKind kind, Pageable pageable);

    @Query("""
            select coalesce(sum(p.feeCents), 0) from Payment p
            where p.kind = com.trakio.core.billing.PaymentKind.COACHING and p.status in :statuses
              and p.paidAt >= :from and p.paidAt < :to
            """)
    long sumFees(Collection<PaymentStatus> statuses, Instant from, Instant to);

    @Query("""
            select coalesce(sum(p.amountCents), 0) from Payment p
            where p.kind in (com.trakio.core.billing.PaymentKind.PREMIUM, com.trakio.core.billing.PaymentKind.MARKETPLACE)
              and p.status in :statuses and p.paidAt >= :from and p.paidAt < :to
            """)
    long sumSubscriptions(Collection<PaymentStatus> statuses, Instant from, Instant to);

    @Query("""
            select coalesce(sum(p.amountCents), 0) from Payment p
            where p.status in :statuses and p.paidAt >= :from and p.paidAt < :to
            """)
    long sumProcessed(Collection<PaymentStatus> statuses, Instant from, Instant to);
}
