package com.trakio.core.coaching;

import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AiDecisionRepository extends JpaRepository<AiDecision, UUID> {

    List<AiDecision> findByTrainerIdAndClientIdAndCreatedAtAfter(UUID trainerId, UUID clientId, Instant after);
}
