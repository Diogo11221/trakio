package com.trakio.core;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;

import java.nio.charset.StandardCharsets;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockMultipartFile;

class FilesTest extends IntegrationTest {

    @Test
    void photoMetadataIsStrippedOnUpload() throws Exception {
        Session s = client();
        UUID jpeg = upload(s, "avatar", "eu.jpg", Fixtures.jpeg());
        UUID png = upload(s, "avatar", "eu.png", Fixtures.png());
        String jpegBack = download(s, jpeg);
        String pngBack = download(s, png);
        assertThat(jpegBack).doesNotContain("GPSLatitude").doesNotContain("Exif").contains("JFIF");
        assertThat(pngBack).doesNotContain("lat=38").contains("IHDR").contains("IEND");
    }

    @Test
    void theRealFileTypeDecidesNotTheNameOrHeader() throws Exception {
        Session s = client();
        var fake = new MockMultipartFile("file", "foto.jpg", "image/jpeg", "<script>alert(1)</script>".getBytes(StandardCharsets.UTF_8));
        var response = mvc.perform(multipart("/api/v1/files").file(fake).param("purpose", "avatar")
                .header("Authorization", "Bearer " + s.token())).andReturn().getResponse();
        assertThat(response.getStatus()).isEqualTo(415);
        // PDFs are fine for chat but not as a profile photo.
        var pdf = new MockMultipartFile("file", "a.png", "image/png", pdf());
        assertThat(mvc.perform(multipart("/api/v1/files").file(pdf).param("purpose", "avatar")
                .header("Authorization", "Bearer " + s.token())).andReturn().getResponse().getStatus()).isEqualTo(415);
    }

    @Test
    void downloadsAreServedSafely() throws Exception {
        Session s = client();
        UUID id = upload(s, "chat", "../../etc/passwd.pdf", pdf());
        var response = mvc.perform(get("/api/v1/files/" + id).header("Authorization", "Bearer " + s.token())).andReturn().getResponse();
        assertThat(response.getContentType()).isEqualTo("application/pdf");
        assertThat(response.getHeader("Content-Disposition")).startsWith("attachment").doesNotContain("../");
        assertThat(response.getHeader("X-Content-Type-Options")).isEqualTo("nosniff");
    }

    private String download(Session s, UUID id) throws Exception {
        var response = mvc.perform(get("/api/v1/files/" + id).header("Authorization", "Bearer " + s.token())).andReturn().getResponse();
        assertThat(response.getStatus()).isEqualTo(200);
        return new String(response.getContentAsByteArray(), StandardCharsets.ISO_8859_1);
    }
}
