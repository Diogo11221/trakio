package com.trakio.core;

import java.io.ByteArrayOutputStream;
import java.nio.charset.StandardCharsets;
import java.util.zip.CRC32;

/** Tiny but valid image files, with metadata that must be stripped. */
public final class Fixtures {

    private Fixtures() {}

    /** 1×1 PNG with a tEXt chunk carrying a fake GPS position. */
    public static byte[] png() {
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        out.writeBytes(new byte[] {(byte) 0x89, 'P', 'N', 'G', 0x0D, 0x0A, 0x1A, 0x0A});
        chunk(out, "IHDR", new byte[] {0, 0, 0, 1, 0, 0, 0, 1, 8, 2, 0, 0, 0});
        chunk(out, "tEXt", "GPS\0lat=38.7223,lon=-9.1393".getBytes(StandardCharsets.ISO_8859_1));
        chunk(out, "IDAT", new byte[] {0x78, (byte) 0x9C, 0x63, (byte) 0xF8, (byte) 0xCF, (byte) 0xC0, 0, 0, 0x03, 0x01, 0x01, 0});
        chunk(out, "IEND", new byte[0]);
        return out.toByteArray();
    }

    /** Minimal JPEG structure with an EXIF (APP1) segment. */
    public static byte[] jpeg() {
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        out.writeBytes(new byte[] {(byte) 0xFF, (byte) 0xD8});
        byte[] exif = "Exif\0\0GPSLatitude=38.7223".getBytes(StandardCharsets.ISO_8859_1);
        out.writeBytes(new byte[] {(byte) 0xFF, (byte) 0xE1, 0, (byte) (exif.length + 2)});
        out.writeBytes(exif);
        byte[] jfif = "JFIF\0\1\1\0\0\1\0\1\0\0".getBytes(StandardCharsets.ISO_8859_1);
        out.writeBytes(new byte[] {(byte) 0xFF, (byte) 0xE0, 0, (byte) (jfif.length + 2)});
        out.writeBytes(jfif);
        out.writeBytes(new byte[] {(byte) 0xFF, (byte) 0xDA, 0, 2, 1, 2, 3, (byte) 0xFF, (byte) 0xD9});
        return out.toByteArray();
    }

    private static void chunk(ByteArrayOutputStream out, String type, byte[] data) {
        out.writeBytes(new byte[] {(byte) (data.length >>> 24), (byte) (data.length >>> 16), (byte) (data.length >>> 8), (byte) data.length});
        byte[] t = type.getBytes(StandardCharsets.US_ASCII);
        out.writeBytes(t);
        out.writeBytes(data);
        CRC32 crc = new CRC32();
        crc.update(t);
        crc.update(data);
        long c = crc.getValue();
        out.writeBytes(new byte[] {(byte) (c >>> 24), (byte) (c >>> 16), (byte) (c >>> 8), (byte) c});
    }
}
