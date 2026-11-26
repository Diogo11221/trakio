package com.trakio.core.moderation;

import com.trakio.core.common.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "reports")
public class Report extends BaseEntity {

    private UUID reporterId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 8)
    private ReportKind kind;

    private UUID reviewId;

    private UUID trainerId;

    @Column(nullable = false, length = 1000)
    private String reason;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 8)
    private ReportStatus status = ReportStatus.OPEN;

    @Enumerated(EnumType.STRING)
    @Column(length = 24)
    private ReportResolution resolution;

    private UUID resolvedBy;

    private Instant resolvedAt;

    protected Report() {}

    public Report(UUID reporterId, ReportKind kind, UUID reviewId, UUID trainerId, String reason) {
        this.reporterId = reporterId;
        this.kind = kind;
        this.reviewId = reviewId;
        this.trainerId = trainerId;
        this.reason = reason;
    }

    public void resolve(ReportResolution resolution, UUID adminId, Instant now) {
        this.status = ReportStatus.RESOLVED;
        this.resolution = resolution;
        this.resolvedBy = adminId;
        this.resolvedAt = now;
    }

    public UUID getReporterId() {
        return reporterId;
    }

    public ReportKind getKind() {
        return kind;
    }

    public UUID getReviewId() {
        return reviewId;
    }

    public UUID getTrainerId() {
        return trainerId;
    }

    public String getReason() {
        return reason;
    }

    public ReportStatus getStatus() {
        return status;
    }

    public ReportResolution getResolution() {
        return resolution;
    }

    public Instant getResolvedAt() {
        return resolvedAt;
    }
}
