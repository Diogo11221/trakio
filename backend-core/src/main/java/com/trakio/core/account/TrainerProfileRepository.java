package com.trakio.core.account;

import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface TrainerProfileRepository extends JpaRepository<TrainerProfile, UUID> {

    Optional<TrainerProfile> findByUserId(UUID userId);

    Optional<TrainerProfile> findByStripeAccountId(String stripeAccountId);

    List<TrainerProfile> findByUserIdIn(Collection<UUID> userIds);

    /**
     * Who shows up in the marketplace: verified, active account, and a paid marketplace
     * subscription. Filters are optional.
     */
    @Query("""
            select distinct t from TrainerProfile t
            join User u on u.id = t.userId
            join Subscription s on s.userId = t.userId
            left join t.specialties sp
            where t.verified = true
              and u.status = com.trakio.core.auth.UserStatus.ACTIVE
              and s.kind = com.trakio.core.billing.SubscriptionKind.MARKETPLACE
              and s.status in (com.trakio.core.billing.SubscriptionStatus.ACTIVE, com.trakio.core.billing.SubscriptionStatus.PAST_DUE)
              and (:city = '' or lower(t.city) = :city or (:city = 'online' and t.online = true))
              and (:specialty = '' or lower(sp) = :specialty)
            order by t.name
            """)
    List<TrainerProfile> findListedMatching(String city, String specialty);

    /** Filters are optional: null or blank means "any". Never binds a null (PostgreSQL can't type it). */
    default List<TrainerProfile> findListed(String city, String specialty) {
        return findListedMatching(city == null ? "" : city.trim().toLowerCase(java.util.Locale.ROOT),
                specialty == null ? "" : specialty.trim().toLowerCase(java.util.Locale.ROOT));
    }
}
