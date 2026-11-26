package com.trakio.core.marketplace;

import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface ReviewRepository extends JpaRepository<Review, UUID> {

    interface RatingSummary {
        UUID getTrainerId();

        Double getAverage();

        Long getCount();
    }

    Page<Review> findByTrainerIdAndRemovedAtIsNullOrderByCreatedAtDesc(UUID trainerId, Pageable pageable);

    Optional<Review> findByTrainerIdAndAuthorId(UUID trainerId, UUID authorId);

    @Query("""
            select r.trainerId as trainerId, avg(r.rating) as average, count(r) as count
            from Review r where r.removedAt is null and r.trainerId in :trainerIds group by r.trainerId
            """)
    List<RatingSummary> summarise(Collection<UUID> trainerIds);
}
