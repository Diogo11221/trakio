package com.trakio.core.moderation;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface ReportRepository extends JpaRepository<Report, UUID> {

    List<Report> findByStatusOrderByCreatedAtAsc(ReportStatus status);

    List<Report> findTop50ByStatusOrderByResolvedAtDesc(ReportStatus status);

    long countByStatus(ReportStatus status);

    @Query("""
            select r from Report r where r.reporterId = :reporterId and r.status = com.trakio.core.moderation.ReportStatus.OPEN
              and r.kind = :kind and (r.reviewId = :reviewId or (r.reviewId is null and r.trainerId = :trainerId))
            """)
    Optional<Report> findOpenDuplicate(UUID reporterId, ReportKind kind, UUID reviewId, UUID trainerId);

    @Query("select count(r) from Report r where r.reporterId = :reporterId and r.createdAt > :since")
    long countRecentBy(UUID reporterId, Instant since);
}
