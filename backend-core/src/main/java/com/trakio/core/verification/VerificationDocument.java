package com.trakio.core.verification;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

@Entity
@Table(name = "verification_documents")
public class VerificationDocument {

    @Id
    private UUID id = UUID.randomUUID();

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "request_id")
    private VerificationRequest request;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 24)
    private DocumentType type;

    @Column(nullable = false)
    private UUID fileId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 16)
    private DocumentStatus status = DocumentStatus.SUBMITTED;

    private LocalDate validUntil;

    @Column(nullable = false)
    private Instant uploadedAt;

    protected VerificationDocument() {}

    VerificationDocument(VerificationRequest request, DocumentType type, UUID fileId, LocalDate validUntil, Instant now) {
        this.request = request;
        this.type = type;
        this.fileId = fileId;
        this.validUntil = validUntil;
        this.uploadedAt = now;
    }

    void replace(UUID fileId, LocalDate validUntil, Instant now) {
        this.fileId = fileId;
        this.validUntil = validUntil;
        this.uploadedAt = now;
        this.status = DocumentStatus.SUBMITTED;
    }

    public UUID getId() {
        return id;
    }

    public VerificationRequest getRequest() {
        return request;
    }

    public DocumentType getType() {
        return type;
    }

    public UUID getFileId() {
        return fileId;
    }

    public DocumentStatus getStatus() {
        return status;
    }

    public void setStatus(DocumentStatus status) {
        this.status = status;
    }

    public LocalDate getValidUntil() {
        return validUntil;
    }

    public Instant getUploadedAt() {
        return uploadedAt;
    }
}
