package com.trakio.core.files;

/** Recognised from the first bytes of the file — the name and the declared type are never trusted. */
public enum FileType {
    JPEG("image/jpeg"),
    PNG("image/png"),
    PDF("application/pdf");

    private final String mediaType;

    FileType(String mediaType) {
        this.mediaType = mediaType;
    }

    public String mediaType() {
        return mediaType;
    }

    public boolean isImage() {
        return this != PDF;
    }
}
