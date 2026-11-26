package com.trakio.core.files;

import com.trakio.core.auth.AuthUser;
import com.trakio.core.chat.MessageRepository;
import com.trakio.core.coaching.CoachingRelationshipRepository;
import com.trakio.core.common.ApiException;
import java.io.IOException;
import java.io.InputStream;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Clock;
import java.util.HexFormat;
import java.util.List;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.springframework.web.multipart.MultipartFile;

@Service
public class FileService {

    private static final Logger log = LoggerFactory.getLogger(FileService.class);

    private final StoredFileRepository files;
    private final FileStorage storage;
    private final MessageRepository messages;
    private final CoachingRelationshipRepository coaching;
    private final Clock clock;

    public FileService(StoredFileRepository files, FileStorage storage, MessageRepository messages,
            CoachingRelationshipRepository coaching, Clock clock) {
        this.files = files;
        this.storage = storage;
        this.messages = messages;
        this.coaching = coaching;
        this.clock = clock;
    }

    /** Relative URL the apps use to show a file (served with an access check). */
    public static String url(UUID fileId) {
        return fileId == null ? null : "/api/v1/files/" + fileId;
    }

    @Transactional
    public StoredFile upload(UUID ownerId, FilePurpose purpose, MultipartFile upload) {
        if (upload.isEmpty()) {
            throw ApiException.badRequest("empty-file", "O ficheiro está vazio.");
        }
        if (upload.getSize() > purpose.maxBytes()) {
            throw new ApiException(HttpStatus.CONTENT_TOO_LARGE, "file-too-large", "O ficheiro é demasiado grande.");
        }
        byte[] data;
        try {
            data = upload.getBytes();
        } catch (IOException e) {
            throw ApiException.badRequest("invalid-file", "Não foi possível ler o ficheiro.");
        }
        FileType type = ContentInspector.detect(data);
        if (type == null || !purpose.allowed().contains(type)) {
            throw new ApiException(HttpStatus.UNSUPPORTED_MEDIA_TYPE, "unsupported-file",
                    purpose == FilePurpose.AVATAR || purpose == FilePurpose.MEAL
                            ? "Envia uma foto em JPEG ou PNG."
                            : "Envia uma foto (JPEG ou PNG) ou um PDF.");
        }
        byte[] clean = ContentInspector.stripMetadata(type, data);
        String key = UUID.randomUUID().toString().replace("-", "");
        try {
            storage.write(key, clean);
        } catch (IOException e) {
            log.error("Could not store upload", e);
            throw new ApiException(HttpStatus.INTERNAL_SERVER_ERROR, "storage", "Não foi possível guardar o ficheiro.");
        }
        afterRollback(() -> deleteQuietly(key));
        StoredFile file = new StoredFile(ownerId, purpose, type, clean.length, safeName(upload.getOriginalFilename()), key,
                sha256(clean), clock.instant());
        return files.save(file);
    }

    /** For ids sent in a request body: the file must exist, belong to the caller and have the right purpose. */
    @Transactional(readOnly = true)
    public void requireOwned(UUID ownerId, UUID fileId, FilePurpose purpose) {
        if (fileId == null) {
            return;
        }
        StoredFile file = files.findById(fileId).orElseThrow(() -> ApiException.badRequest("invalid-file", "Ficheiro inválido."));
        if (!file.getOwnerId().equals(ownerId) || file.getPurpose() != purpose) {
            throw ApiException.badRequest("invalid-file", "Ficheiro inválido.");
        }
    }

    @Transactional(readOnly = true)
    public StoredFile authorizeRead(AuthUser caller, UUID fileId) {
        StoredFile file = files.findById(fileId).orElseThrow(() -> ApiException.notFound("Este ficheiro"));
        if (!canRead(caller, file)) {
            // Same answer as "doesn't exist": don't confirm that someone else's file is there.
            throw ApiException.notFound("Este ficheiro");
        }
        return file;
    }

    private boolean canRead(AuthUser caller, StoredFile file) {
        if (file.getOwnerId().equals(caller.id()) || caller.isAdmin()) {
            return true;
        }
        return switch (file.getPurpose()) {
            case AVATAR -> true;
            case CHAT -> messages.existsFileInConversationOf(file.getId(), caller.id());
            case MEAL -> caller.isTrainer() && coaching.findActiveForClient(file.getOwnerId())
                    .filter(rel -> rel.getTrainerId().equals(caller.id())).isPresent();
            case VERIFICATION -> false;
        };
    }

    public InputStream open(StoredFile file) throws IOException {
        return storage.read(file.getStorageKey());
    }

    /** Removes the bytes from disk once the account deletion has committed. */
    @Transactional
    public void deleteAllOwnedBy(UUID ownerId) {
        List<String> keys = files.findByOwnerId(ownerId).stream().map(StoredFile::getStorageKey).toList();
        afterCommit(() -> keys.forEach(this::deleteQuietly));
    }

    private void deleteQuietly(String key) {
        try {
            storage.delete(key);
        } catch (IOException e) {
            log.warn("Could not delete stored file {}", key, e);
        }
    }

    private static void afterCommit(Runnable action) {
        if (TransactionSynchronizationManager.isSynchronizationActive()) {
            TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                @Override
                public void afterCommit() {
                    action.run();
                }
            });
        } else {
            action.run();
        }
    }

    private static void afterRollback(Runnable action) {
        if (TransactionSynchronizationManager.isSynchronizationActive()) {
            TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                @Override
                public void afterCompletion(int status) {
                    if (status == STATUS_ROLLED_BACK) {
                        action.run();
                    }
                }
            });
        }
    }

    static String safeName(String name) {
        if (name == null || name.isBlank()) {
            return null;
        }
        String base = name.replace('\\', '/');
        base = base.substring(base.lastIndexOf('/') + 1).replaceAll("[\\p{Cntrl}\"<>|:*?]", "_").trim();
        return base.isEmpty() ? null : base.substring(0, Math.min(base.length(), 255));
    }

    private static String sha256(byte[] data) {
        try {
            return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(data));
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException(e);
        }
    }
}
