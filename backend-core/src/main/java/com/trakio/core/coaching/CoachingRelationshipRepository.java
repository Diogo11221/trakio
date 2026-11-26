package com.trakio.core.coaching;

import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface CoachingRelationshipRepository extends JpaRepository<CoachingRelationship, UUID> {

    @Query("select r from CoachingRelationship r where r.clientId = :clientId and r.status = com.trakio.core.coaching.RelationshipStatus.ACTIVE")
    Optional<CoachingRelationship> findActiveForClient(UUID clientId);

    @Query("""
            select r from CoachingRelationship r where r.clientId = :clientId
              and r.status in (com.trakio.core.coaching.RelationshipStatus.ACTIVE, com.trakio.core.coaching.RelationshipStatus.PENDING_PAYMENT)
            """)
    Optional<CoachingRelationship> findOpenForClient(UUID clientId);

    List<CoachingRelationship> findByTrainerIdAndStatusOrderByStartedAtDesc(UUID trainerId, RelationshipStatus status);

    Optional<CoachingRelationship> findByTrainerIdAndClientIdAndStatus(UUID trainerId, UUID clientId, RelationshipStatus status);

    boolean existsByClientIdAndTrainerIdAndStatusIn(UUID clientId, UUID trainerId, Collection<RelationshipStatus> statuses);

    long countByTrainerIdAndStatus(UUID trainerId, RelationshipStatus status);
}
