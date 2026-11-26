package com.trakio.core.files;

import java.nio.charset.StandardCharsets;
import java.security.InvalidKeyException;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.Base64;
import java.util.UUID;
import javax.crypto.Mac;
import javax.crypto.SecretKey;
import javax.crypto.spec.SecretKeySpec;
import org.springframework.stereotype.Component;

/**
 * Short-lived signed download links, for when a bearer header can't be sent (opening a PDF in
 * the phone's browser). Only handed to someone who passed the normal access check; valid 5 min.
 */
@Component
public class FileLinks {

    public static final Duration TTL = Duration.ofMinutes(5);

    private final SecretKeySpec key;
    private final Clock clock;

    public FileLinks(SecretKey jwtKey, Clock clock) {
        try {
            // Separate key derived from the JWT key: a link signature can never be mistaken for a token.
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(jwtKey);
            this.key = new SecretKeySpec(mac.doFinal("trakio-file-links".getBytes(StandardCharsets.UTF_8)), "HmacSHA256");
        } catch (NoSuchAlgorithmException | InvalidKeyException e) {
            throw new IllegalStateException(e);
        }
        this.clock = clock;
    }

    public record Link(String url, Instant expiresAt) {}

    public Link create(UUID fileId) {
        long exp = clock.instant().plus(TTL).getEpochSecond();
        return new Link(FileService.url(fileId) + "?exp=" + exp + "&sig=" + sign(fileId, exp), Instant.ofEpochSecond(exp));
    }

    public boolean valid(UUID fileId, long exp, String sig) {
        if (sig == null || clock.instant().getEpochSecond() > exp) {
            return false;
        }
        return MessageDigest.isEqual(sign(fileId, exp).getBytes(StandardCharsets.US_ASCII), sig.getBytes(StandardCharsets.US_ASCII));
    }

    private String sign(UUID fileId, long exp) {
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(key);
            byte[] digest = mac.doFinal((fileId + ":" + exp).getBytes(StandardCharsets.UTF_8));
            return Base64.getUrlEncoder().withoutPadding().encodeToString(digest);
        } catch (NoSuchAlgorithmException | InvalidKeyException e) {
            throw new IllegalStateException(e);
        }
    }
}
