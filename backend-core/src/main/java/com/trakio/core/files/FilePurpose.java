package com.trakio.core.files;

import com.fasterxml.jackson.annotation.JsonValue;
import com.trakio.core.common.Enums;
import java.util.Set;

/** Why a file was uploaded — decides which types are accepted and who may read it. */
public enum FilePurpose {
    /** Profile photo: any signed-in user can see it. */
    AVATAR(Set.of(FileType.JPEG, FileType.PNG), 5L * 1024 * 1024),
    /** Chat photo or document: the two people in the conversation. */
    CHAT(Set.of(FileType.JPEG, FileType.PNG, FileType.PDF), 10L * 1024 * 1024),
    /** PT documents for verification: the PT and admins only. */
    VERIFICATION(Set.of(FileType.JPEG, FileType.PNG, FileType.PDF), 10L * 1024 * 1024),
    /** Meal photo: the client and their current PT. */
    MEAL(Set.of(FileType.JPEG, FileType.PNG), 8L * 1024 * 1024);

    private final Set<FileType> allowed;
    private final long maxBytes;

    FilePurpose(Set<FileType> allowed, long maxBytes) {
        this.allowed = allowed;
        this.maxBytes = maxBytes;
    }

    public Set<FileType> allowed() {
        return allowed;
    }

    public long maxBytes() {
        return maxBytes;
    }

    @JsonValue
    public String json() {
        return Enums.json(this);
    }
}
