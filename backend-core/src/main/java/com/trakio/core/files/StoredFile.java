package com.trakio.core.files;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "stored_files")
public class StoredFile {

    @Id
    private UUID id = UUID.randomUUID();

    @Column(nullable = false)
    private UUID ownerId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 16)
    private FilePurpose purpose;

    @Column(nullable = false, length = 64)
    private String contentType;

    @Column(nullable = false)
    private long sizeBytes;

    private String originalName;

    /** Random name on disk — never derived from what the user sent. */
    @Column(nullable = false, unique = true, length = 64)
    private String storageKey;

    @Column(nullable = false, length = 64)
    private String sha256;

    @Column(nullable = false)
    private Instant createdAt;

    protected StoredFile() {}

    public StoredFile(UUID ownerId, FilePurpose purpose, FileType type, long sizeBytes, String originalName,
            String storageKey, String sha256, Instant createdAt) {
        this.ownerId = ownerId;
        this.purpose = purpose;
        this.contentType = type.mediaType();
        this.sizeBytes = sizeBytes;
        this.originalName = originalName;
        this.storageKey = storageKey;
        this.sha256 = sha256;
        this.createdAt = createdAt;
    }

    public UUID getId() {
        return id;
    }

    public UUID getOwnerId() {
        return ownerId;
    }

    public FilePurpose getPurpose() {
        return purpose;
    }

    public String getContentType() {
        return contentType;
    }

    public long getSizeBytes() {
        return sizeBytes;
    }

    public String getOriginalName() {
        return originalName;
    }

    public String getStorageKey() {
        return storageKey;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }
}
