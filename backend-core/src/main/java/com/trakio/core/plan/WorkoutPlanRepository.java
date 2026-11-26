package com.trakio.core.plan;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface WorkoutPlanRepository extends JpaRepository<WorkoutPlan, UUID> {

    @Query("select p from WorkoutPlan p where p.ownerId is null and p.clientId is null order by p.name")
    List<WorkoutPlan> findTemplates();

    List<WorkoutPlan> findByOwnerIdAndClientIdIsNullOrderByCreatedAtDesc(UUID ownerId);

    Optional<WorkoutPlan> findByOwnerIdAndClientId(UUID ownerId, UUID clientId);

    /** The template every new client starts on. */
    @Query("select p from WorkoutPlan p where p.ownerId is null and p.clientId is null order by p.createdAt")
    List<WorkoutPlan> findTemplatesOldestFirst();
}
