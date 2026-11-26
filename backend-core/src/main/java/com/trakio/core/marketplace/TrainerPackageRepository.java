package com.trakio.core.marketplace;

import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface TrainerPackageRepository extends JpaRepository<TrainerPackage, UUID> {

    List<TrainerPackage> findByTrainerIdAndActiveTrueOrderByPosition(UUID trainerId);

    List<TrainerPackage> findByTrainerIdInAndActiveTrue(Collection<UUID> trainerIds);

    Optional<TrainerPackage> findByIdAndTrainerId(UUID id, UUID trainerId);

    long countByTrainerIdAndActiveTrue(UUID trainerId);
}
