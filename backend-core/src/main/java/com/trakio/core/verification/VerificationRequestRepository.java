package com.trakio.core.verification;

import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface VerificationRequestRepository extends JpaRepository<VerificationRequest, UUID> {

    Optional<VerificationRequest> findByTrainerId(UUID trainerId);

    List<VerificationRequest> findByStatusInOrderBySubmittedAtAsc(Collection<VerificationStatus> statuses);

    long countByStatusIn(Collection<VerificationStatus> statuses);

    @Query("select d from VerificationDocument d where d.id = :id")
    Optional<VerificationDocument> findDocument(UUID id);
}
