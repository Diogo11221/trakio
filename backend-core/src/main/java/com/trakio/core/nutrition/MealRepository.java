package com.trakio.core.nutrition;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface MealRepository extends JpaRepository<Meal, UUID> {

    List<Meal> findByUserIdAndDayOrderByEatenAt(UUID userId, LocalDate day);

    Optional<Meal> findByIdAndUserId(UUID id, UUID userId);

    long countBySourceAndCreatedAtAfter(MealSource source, Instant after);
}
