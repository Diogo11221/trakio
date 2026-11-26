package com.trakio.core.moderation;

import com.trakio.core.account.ClientProfileRepository;
import com.trakio.core.account.TrainerProfile;
import com.trakio.core.account.TrainerProfileRepository;
import com.trakio.core.admin.AuditService;
import com.trakio.core.auth.User;
import com.trakio.core.auth.UserRepository;
import com.trakio.core.coaching.CoachingRelationshipRepository;
import com.trakio.core.coaching.RelationshipStatus;
import com.trakio.core.common.ApiException;
import com.trakio.core.common.Enums;
import com.trakio.core.marketplace.Review;
import com.trakio.core.marketplace.ReviewRepository;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ModerationService {

    private static final int MAX_REPORTS_PER_DAY = 10;

    public record ReportInput(@NotNull ReportKind kind, UUID reviewId, UUID trainerId,
            @NotNull @Size(min = 3, max = 1000) String reason) {}

    public record ReportCreated(UUID id, ReportStatus status) {}

    /** Facts that help an admin decide, worked out from the data rather than typed by anyone. */
    public record Signals(boolean authorTrainedWithTrainer, Long authorAccountAgeDays) {}

    public record ReportView(UUID id, ReportKind kind, ReportStatus status, ReportResolution resolution, String reason,
            Instant createdAt, String reporterName, UUID trainerId, String trainerName, UUID reviewId, Integer reviewRating,
            String reviewComment, String reviewAuthorName, String trainerBio, Signals signals) {}

    private final ReportRepository reports;
    private final ReviewRepository reviews;
    private final TrainerProfileRepository trainers;
    private final ClientProfileRepository clients;
    private final UserRepository users;
    private final CoachingRelationshipRepository coaching;
    private final AuditService audit;
    private final Clock clock;

    public ModerationService(ReportRepository reports, ReviewRepository reviews, TrainerProfileRepository trainers,
            ClientProfileRepository clients, UserRepository users, CoachingRelationshipRepository coaching, AuditService audit,
            Clock clock) {
        this.reports = reports;
        this.reviews = reviews;
        this.trainers = trainers;
        this.clients = clients;
        this.users = users;
        this.coaching = coaching;
        this.audit = audit;
        this.clock = clock;
    }

    @Transactional
    public ReportCreated report(UUID reporterId, ReportInput in) {
        if (reports.countRecentBy(reporterId, clock.instant().minus(Duration.ofDays(1))) >= MAX_REPORTS_PER_DAY) {
            throw new ApiException(HttpStatus.TOO_MANY_REQUESTS, "too-many-reports", "Já enviaste muitas denúncias hoje.");
        }
        UUID reviewId = null;
        UUID trainerId;
        if (in.kind() == ReportKind.REVIEW) {
            Review review = in.reviewId() == null ? null : reviews.findById(in.reviewId()).filter(r -> r.getRemovedAt() == null).orElse(null);
            if (review == null) {
                throw ApiException.notFound("Esta avaliação");
            }
            reviewId = review.getId();
            trainerId = review.getTrainerId();
        } else {
            trainerId = in.trainerId();
            if (trainerId == null || trainers.findByUserId(trainerId).isEmpty()) {
                throw ApiException.notFound("Este PT");
            }
        }
        var duplicate = reports.findOpenDuplicate(reporterId, in.kind(), reviewId, trainerId);
        if (duplicate.isPresent()) {
            return new ReportCreated(duplicate.get().getId(), duplicate.get().getStatus());
        }
        Report report = reports.save(new Report(reporterId, in.kind(), reviewId, trainerId, in.reason().trim()));
        return new ReportCreated(report.getId(), report.getStatus());
    }

    @Transactional(readOnly = true)
    public List<ReportView> open() {
        return reports.findByStatusOrderByCreatedAtAsc(ReportStatus.OPEN).stream().map(this::view).toList();
    }

    public long openCount() {
        return reports.countByStatus(ReportStatus.OPEN);
    }

    @Transactional
    public ReportView resolve(UUID adminId, UUID reportId, ReportResolution resolution) {
        Report report = reports.findById(reportId).orElseThrow(() -> ApiException.notFound("Esta denúncia"));
        if (report.getStatus() == ReportStatus.RESOLVED) {
            throw ApiException.conflict("already-resolved", "Esta denúncia já foi resolvida.");
        }
        if (resolution == ReportResolution.REMOVE_REVIEW) {
            if (report.getKind() != ReportKind.REVIEW) {
                throw ApiException.badRequest("invalid-resolution", "Esta denúncia não é sobre uma avaliação.");
            }
            reviews.findById(report.getReviewId()).ifPresent(r -> r.remove(clock.instant()));
        }
        report.resolve(resolution, adminId, clock.instant());
        audit.record(adminId, "report." + Enums.json(resolution), "report", reportId.toString(), "");
        return view(report);
    }

    private ReportView view(Report r) {
        String reporter = r.getReporterId() == null ? null : name(r.getReporterId());
        TrainerProfile trainer = r.getTrainerId() == null ? null : trainers.findByUserId(r.getTrainerId()).orElse(null);
        Review review = r.getReviewId() == null ? null : reviews.findById(r.getReviewId()).orElse(null);
        Signals signals = null;
        if (review != null) {
            Instant now = clock.instant();
            User author = users.findById(review.getAuthorId()).orElse(null);
            boolean trained = coaching.existsByClientIdAndTrainerIdAndStatusIn(review.getAuthorId(), review.getTrainerId(),
                    List.of(RelationshipStatus.ACTIVE, RelationshipStatus.ENDED));
            Long ageDays = author == null ? null : Duration.between(author.getCreatedAt(), now).toDays();
            signals = new Signals(trained, ageDays);
        }
        return new ReportView(r.getId(), r.getKind(), r.getStatus(), r.getResolution(), r.getReason(), r.getCreatedAt(),
                reporter, r.getTrainerId(), trainer == null ? null : trainer.getName(), r.getReviewId(),
                review == null ? null : review.getRating(), review == null ? null : review.getComment(),
                review == null ? null : name(review.getAuthorId()), trainer == null ? null : trainer.getBio(), signals);
    }

    private String name(UUID userId) {
        return clients.findByUserId(userId).map(c -> c.getName())
                .or(() -> trainers.findByUserId(userId).map(TrainerProfile::getName)).orElse("Conta removida");
    }
}
