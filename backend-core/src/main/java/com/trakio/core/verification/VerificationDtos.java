package com.trakio.core.verification;

import com.trakio.core.marketplace.MarketplaceDtos.PackageView;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public final class VerificationDtos {

    private VerificationDtos() {}

    /** "missing" when nothing was sent yet. */
    public record DocumentView(UUID id, DocumentType type, String status, String fileUrl, LocalDate validUntil,
            Instant uploadedAt) {}

    public record PayoutStep(boolean connected, boolean payoutsEnabled) {}

    public record VerificationView(VerificationStatus status, String adminNote, List<DocumentView> documents,
            PayoutStep payouts, boolean canSubmit) {}

    public record DocumentInput(@NotNull UUID fileId, LocalDate validUntil) {}

    /** Admin queue row. */
    public record QueueItem(UUID id, UUID trainerId, String name, String city, List<String> specialties,
            VerificationStatus status, Instant submittedAt, boolean ready, long pendingDocuments) {}

    public record AdminDetail(UUID id, UUID trainerId, String name, String email, String city, String where,
            List<String> specialties, String bio, List<PackageView> packages, VerificationStatus status, String adminNote,
            Instant submittedAt, List<DocumentView> documents, PayoutStep payouts) {}

    public enum Decision {
        APPROVE, REFUSE, REQUEST_INFO;

        @com.fasterxml.jackson.annotation.JsonValue
        public String json() {
            return com.trakio.core.common.Enums.json(this);
        }
    }

    public record DecisionInput(@NotNull Decision decision, @Size(max = 1000) String note) {}

    public record DocumentStatusInput(@NotNull DocumentStatus status) {}
}
