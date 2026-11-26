package com.trakio.core.account;

import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ClientProfileRepository extends JpaRepository<ClientProfile, UUID> {

    Optional<ClientProfile> findByUserId(UUID userId);

    List<ClientProfile> findByUserIdIn(Collection<UUID> userIds);

    long countByPlanId(UUID planId);
}
