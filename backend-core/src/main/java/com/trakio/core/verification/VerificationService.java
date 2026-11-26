package com.trakio.core.verification;

import com.trakio.core.account.TrainerProfile;
import com.trakio.core.account.TrainerProfileRepository;
import com.trakio.core.admin.AuditService;
import com.trakio.core.auth.UserRepository;
import com.trakio.core.common.ApiException;
import com.trakio.core.common.Enums;
import com.trakio.core.files.FilePurpose;
import com.trakio.core.files.FileService;
import com.trakio.core.marketplace.MarketplaceDtos.PackageView;
import com.trakio.core.marketplace.TrainerPackageRepository;
import com.trakio.core.verification.VerificationDtos.AdminDetail;
import com.trakio.core.verification.VerificationDtos.Decision;
import com.trakio.core.verification.VerificationDtos.DocumentView;
import com.trakio.core.verification.VerificationDtos.PayoutStep;
import com.trakio.core.verification.VerificationDtos.QueueItem;
import com.trakio.core.verification.VerificationDtos.VerificationView;
import java.time.Clock;
import java.time.LocalDate;
import java.util.Arrays;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class VerificationService {

    /** Insurance is asked for but an admin may approve without it (as in the admin design). */
    private static final Set<DocumentType> REQUIRED = Set.of(DocumentType.IDENTITY, DocumentType.PROFESSIONAL_TITLE);
    private static final List<VerificationStatus> QUEUE = List.of(VerificationStatus.SUBMITTED, VerificationStatus.INFO_REQUESTED);

    private final VerificationRequestRepository requests;
    private final TrainerProfileRepository trainers;
    private final TrainerPackageRepository packages;
    private final UserRepository users;
    private final FileService files;
    private final AuditService audit;
    private final Clock clock;

    public VerificationService(VerificationRequestRepository requests, TrainerProfileRepository trainers,
            TrainerPackageRepository packages, UserRepository users, FileService files, AuditService audit, Clock clock) {
        this.requests = requests;
        this.trainers = trainers;
        this.packages = packages;
        this.users = users;
        this.files = files;
        this.audit = audit;
        this.clock = clock;
    }

    // ── PT side ─────────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public VerificationView mine(UUID trainerId) {
        VerificationRequest request = requests.findByTrainerId(trainerId).orElseGet(() -> new VerificationRequest(trainerId));
        return view(request);
    }

    @Transactional
    public VerificationView putDocument(UUID trainerId, DocumentType type, UUID fileId, LocalDate validUntil) {
        files.requireOwned(trainerId, fileId, FilePurpose.VERIFICATION);
        if (validUntil != null && validUntil.isBefore(LocalDate.now(clock))) {
            throw ApiException.badRequest("expired-document", "Este documento já não está válido.");
        }
        VerificationRequest request = requests.findByTrainerId(trainerId).orElseGet(() -> new VerificationRequest(trainerId));
        if (!request.isEditable()) {
            throw ApiException.conflict("verification-locked", "O pedido já foi enviado. Espera pela resposta.");
        }
        request.putDocument(type, fileId, validUntil, clock.instant());
        return view(requests.saveAndFlush(request));
    }

    @Transactional
    public VerificationView submit(UUID trainerId) {
        trainers.findByUserId(trainerId).orElseThrow(() -> ApiException.conflict("no-profile", "Cria o teu perfil primeiro."));
        VerificationRequest request = requests.findByTrainerId(trainerId)
                .orElseThrow(() -> ApiException.conflict("missing-documents", "Envia os documentos primeiro."));
        if (!request.isEditable()) {
            throw ApiException.conflict("verification-locked", "O pedido já foi enviado. Espera pela resposta.");
        }
        if (!canSubmit(request)) {
            throw ApiException.conflict("missing-documents", "Falta o documento de identificação ou o título profissional.");
        }
        request.submit(clock.instant());
        return view(request);
    }

    private static boolean canSubmit(VerificationRequest request) {
        return REQUIRED.stream().allMatch(t -> request.document(t).isPresent());
    }

    private VerificationView view(VerificationRequest request) {
        PayoutStep payouts = trainers.findByUserId(request.getTrainerId())
                .map(t -> new PayoutStep(t.getStripeAccountId() != null, t.isPayoutsEnabled())).orElse(new PayoutStep(false, false));
        return new VerificationView(request.getStatus(), request.getAdminNote(), documents(request), payouts,
                request.isEditable() && canSubmit(request));
    }

    private static List<DocumentView> documents(VerificationRequest request) {
        return Arrays.stream(DocumentType.values()).map(type -> request.document(type)
                .map(d -> new DocumentView(d.getId(), type, Enums.json(d.getStatus()), FileService.url(d.getFileId()),
                        d.getValidUntil(), d.getUploadedAt()))
                .orElse(new DocumentView(null, type, "missing", null, null, null))).toList();
    }

    // ── Admin side ──────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public List<QueueItem> queue() {
        return requests.findByStatusInOrderBySubmittedAtAsc(QUEUE).stream().map(r -> {
            TrainerProfile t = trainers.findByUserId(r.getTrainerId()).orElse(null);
            long pending = r.getDocuments().stream().filter(d -> d.getStatus() != DocumentStatus.CONFIRMED).count();
            boolean payoutsReady = t != null && t.isPayoutsEnabled();
            return new QueueItem(r.getId(), r.getTrainerId(), t == null ? "—" : t.getName(), t == null ? "" : t.getCity(),
                    t == null ? List.of() : List.copyOf(t.getSpecialties()), r.getStatus(), r.getSubmittedAt(),
                    pending == 0 && payoutsReady && r.getDocuments().size() == DocumentType.values().length, pending);
        }).toList();
    }

    public long pendingCount() {
        return requests.countByStatusIn(QUEUE);
    }

    @Transactional(readOnly = true)
    public AdminDetail detail(UUID requestId) {
        VerificationRequest r = requests.findById(requestId).orElseThrow(() -> ApiException.notFound("Este pedido"));
        TrainerProfile t = trainers.findByUserId(r.getTrainerId()).orElseThrow(() -> ApiException.notFound("Este PT"));
        String email = users.findById(r.getTrainerId()).map(u -> u.getEmail()).orElse("");
        return new AdminDetail(r.getId(), r.getTrainerId(), t.getName(), email, t.getCity(), t.where(),
                List.copyOf(t.getSpecialties()), t.getBio(),
                packages.findByTrainerIdAndActiveTrueOrderByPosition(r.getTrainerId()).stream().map(PackageView::of).toList(),
                r.getStatus(), r.getAdminNote(), r.getSubmittedAt(), documents(r),
                new PayoutStep(t.getStripeAccountId() != null, t.isPayoutsEnabled()));
    }

    @Transactional
    public AdminDetail decide(UUID adminId, UUID requestId, Decision decision, String note) {
        VerificationRequest r = requests.findById(requestId).orElseThrow(() -> ApiException.notFound("Este pedido"));
        if (!QUEUE.contains(r.getStatus()) && r.getStatus() != VerificationStatus.APPROVED) {
            throw ApiException.conflict("not-pending", "Este pedido não está à espera de decisão.");
        }
        TrainerProfile t = trainers.findByUserId(r.getTrainerId()).orElseThrow(() -> ApiException.notFound("Este PT"));
        String clean = note == null ? "" : note.trim();
        switch (decision) {
            case APPROVE -> {
                r.decide(VerificationStatus.APPROVED, clean, adminId, clock.instant());
                t.setVerified(true);
            }
            case REFUSE -> {
                r.decide(VerificationStatus.REFUSED, clean, adminId, clock.instant());
                t.setVerified(false);
            }
            case REQUEST_INFO -> {
                if (clean.isEmpty()) {
                    throw ApiException.badRequest("note-required", "Explica ao PT o que falta.");
                }
                r.decide(VerificationStatus.INFO_REQUESTED, clean, adminId, clock.instant());
            }
        }
        audit.record(adminId, "verification." + Enums.json(decision), "trainer", r.getTrainerId().toString(), clean);
        return detail(requestId);
    }

    @Transactional
    public AdminDetail setDocumentStatus(UUID adminId, UUID documentId, DocumentStatus status) {
        VerificationDocument d = requests.findDocument(documentId).orElseThrow(() -> ApiException.notFound("Este documento"));
        d.setStatus(status);
        audit.record(adminId, "verification.document." + Enums.json(status), "trainer",
                d.getRequest().getTrainerId().toString(), Enums.json(d.getType()));
        return detail(d.getRequest().getId());
    }
}
