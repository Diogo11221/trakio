package com.trakio.core.files;

import java.io.IOException;
import java.io.InputStream;

/** Where file bytes live. Local disk today; an S3-compatible bucket is a drop-in later. */
public interface FileStorage {

    void write(String key, byte[] data) throws IOException;

    InputStream read(String key) throws IOException;

    void delete(String key) throws IOException;
}
