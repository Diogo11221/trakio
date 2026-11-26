package com.trakio.core.files;

import com.trakio.core.common.ApiException;
import java.io.ByteArrayOutputStream;
import java.util.Set;

/**
 * Detects the real file type from magic bytes and strips metadata from photos (EXIF can carry
 * the GPS position of where the photo was taken).
 */
public final class ContentInspector {

    private static final byte[] PNG_SIGNATURE = {(byte) 0x89, 'P', 'N', 'G', 0x0D, 0x0A, 0x1A, 0x0A};
    /** PNG chunks that can hold text, EXIF or timestamps. */
    private static final Set<String> PNG_METADATA = Set.of("tEXt", "zTXt", "iTXt", "eXIf", "tIME");

    private ContentInspector() {}

    public static FileType detect(byte[] data) {
        if (data.length >= 3 && (data[0] & 0xFF) == 0xFF && (data[1] & 0xFF) == 0xD8 && (data[2] & 0xFF) == 0xFF) {
            return FileType.JPEG;
        }
        if (startsWith(data, PNG_SIGNATURE)) {
            return FileType.PNG;
        }
        if (startsWith(data, new byte[] {'%', 'P', 'D', 'F', '-'})) {
            return FileType.PDF;
        }
        return null;
    }

    public static byte[] stripMetadata(FileType type, byte[] data) {
        try {
            return switch (type) {
                case JPEG -> stripJpeg(data);
                case PNG -> stripPng(data);
                case PDF -> data;
            };
        } catch (IndexOutOfBoundsException e) {
            throw ApiException.badRequest("invalid-file", "O ficheiro parece estar danificado.");
        }
    }

    /** Drops APP1 (EXIF/XMP), APP13 (IPTC) and comments; keeps everything needed to show the image. */
    private static byte[] stripJpeg(byte[] data) {
        ByteArrayOutputStream out = new ByteArrayOutputStream(data.length);
        out.write(data, 0, 2);
        int i = 2;
        while (i < data.length) {
            if ((data[i] & 0xFF) != 0xFF) {
                throw ApiException.badRequest("invalid-file", "O ficheiro parece estar danificado.");
            }
            int marker = data[i + 1] & 0xFF;
            if (marker == 0xFF) {
                i++;
                continue;
            }
            if (marker == 0xD9 || marker == 0x01 || (marker >= 0xD0 && marker <= 0xD7)) {
                out.write(data, i, 2);
                i += 2;
                continue;
            }
            if (marker == 0xDA) {
                // Start of scan: the compressed image follows until the end.
                out.write(data, i, data.length - i);
                break;
            }
            int length = ((data[i + 2] & 0xFF) << 8) | (data[i + 3] & 0xFF);
            int end = i + 2 + length;
            if (length < 2 || end > data.length) {
                throw ApiException.badRequest("invalid-file", "O ficheiro parece estar danificado.");
            }
            boolean metadata = marker == 0xE1 || marker == 0xED || marker == 0xFE;
            if (!metadata) {
                out.write(data, i, end - i);
            }
            i = end;
        }
        return out.toByteArray();
    }

    private static byte[] stripPng(byte[] data) {
        ByteArrayOutputStream out = new ByteArrayOutputStream(data.length);
        out.write(data, 0, PNG_SIGNATURE.length);
        int i = PNG_SIGNATURE.length;
        while (i + 8 <= data.length) {
            long length = ((long) (data[i] & 0xFF) << 24) | ((data[i + 1] & 0xFF) << 16) | ((data[i + 2] & 0xFF) << 8)
                    | (data[i + 3] & 0xFF);
            String chunk = new String(data, i + 4, 4, java.nio.charset.StandardCharsets.US_ASCII);
            long end = i + 12 + length;
            if (end > data.length) {
                throw ApiException.badRequest("invalid-file", "O ficheiro parece estar danificado.");
            }
            if (!PNG_METADATA.contains(chunk)) {
                out.write(data, i, (int) (end - i));
            }
            i = (int) end;
            if (chunk.equals("IEND")) {
                break;
            }
        }
        return out.toByteArray();
    }

    private static boolean startsWith(byte[] data, byte[] prefix) {
        if (data.length < prefix.length) {
            return false;
        }
        for (int i = 0; i < prefix.length; i++) {
            if (data[i] != prefix[i]) {
                return false;
            }
        }
        return true;
    }
}
