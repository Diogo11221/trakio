package com.trakio.core.progress;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface WeightEntryRepository extends JpaRepository<WeightEntry, UUID> {

    List<WeightEntry> findByUserIdAndMeasuredOnGreaterThanEqualOrderByMeasuredOn(UUID userId, LocalDate since);

    Optional<WeightEntry> findByUserIdAndMeasuredOn(UUID userId, LocalDate day);

    Optional<WeightEntry> findFirstByUserIdOrderByMeasuredOnDesc(UUID userId);

    Optional<WeightEntry> findByIdAndUserId(UUID id, UUID userId);
}
