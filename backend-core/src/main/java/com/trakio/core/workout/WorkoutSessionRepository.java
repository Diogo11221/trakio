package com.trakio.core.workout;

import java.time.Instant;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface WorkoutSessionRepository extends JpaRepository<WorkoutSession, UUID> {

    Page<WorkoutSession> findByUserIdOrderByFinishedAtDesc(UUID userId, Pageable pageable);

    Optional<WorkoutSession> findByUserIdAndClientRef(UUID userId, String clientRef);

    Optional<WorkoutSession> findByIdAndUserId(UUID id, UUID userId);

    List<WorkoutSession> findByUserIdAndFinishedAtAfterOrderByFinishedAtDesc(UUID userId, Instant after);

    long countByUserIdAndFinishedAtAfter(UUID userId, Instant after);

    @Query("""
            select s.planDayId from WorkoutSession s
            where s.userId = :userId and s.planId = :planId and s.planDayId is not null
            order by s.finishedAt desc
            """)
    List<UUID> findLastPlanDay(UUID userId, UUID planId, Pageable pageable);

    /** Earlier sets of these exercises, to tell whether a new workout set a record. */
    @Query("""
            select se from SessionExercise se
            where se.session.userId = :userId and se.exercise.id in :exerciseIds
            """)
    List<SessionExercise> findHistoryOf(UUID userId, Collection<UUID> exerciseIds);
}
