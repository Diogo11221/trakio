package com.trakio.core.verification;

import com.trakio.core.common.BaseEntity;
import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.OneToMany;
import jakarta.persistence.Table;
import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Entity
@Table(name = "verification_requests")
public class VerificationRequest extends BaseEntity {

    @Column(nullable = false, unique = true)
    private UUID trainerId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 16)
    private VerificationStatus status = VerificationStatus.DRAFT;

    @Column(nullable = false, length = 1000)
    private String adminNote = "";

    private Instant submittedAt;

    private Instant decidedAt;

    private UUID decidedBy;

    @OneToMany(mappedBy = "request", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<VerificationDocument> documents = new ArrayList<>();

    protected VerificationRequest() {}

    public VerificationRequest(UUID trainerId) {
        this.trainerId = trainerId;
    }

    public boolean isEditable() {
        return status == VerificationStatus.DRAFT || status == VerificationStatus.INFO_REQUESTED
                || status == VerificationStatus.REFUSED;
    }

    public Optional<VerificationDocument> document(DocumentType type) {
        return documents.stream().filter(d -> d.getType() == type).findFirst();
    }

    public void putDocument(DocumentType type, UUID fileId, LocalDate validUntil, Instant now) {
        document(type).ifPresentOrElse(d -> d.replace(fileId, validUntil, now),
                () -> documents.add(new VerificationDocument(this, type, fileId, validUntil, now)));
        if (status == VerificationStatus.REFUSED) {
            status = VerificationStatus.DRAFT;
        }
    }

    public void submit(Instant now) {
        this.status = VerificationStatus.SUBMITTED;
        this.submittedAt = now;
    }

    public void decide(VerificationStatus outcome, String note, UUID adminId, Instant now) {
        this.status = outcome;
        this.adminNote = note == null ? "" : note;
        this.decidedBy = adminId;
        this.decidedAt = now;
    }

    public UUID getTrainerId() {
        return trainerId;
    }

    public VerificationStatus getStatus() {
        return status;
    }

    public String getAdminNote() {
        return adminNote;
    }

    public Instant getSubmittedAt() {
        return submittedAt;
    }

    public Instant getDecidedAt() {
        return decidedAt;
    }

    public List<VerificationDocument> getDocuments() {
        return documents;
    }
}
