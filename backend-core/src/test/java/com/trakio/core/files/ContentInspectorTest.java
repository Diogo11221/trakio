package com.trakio.core.files;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.trakio.core.Fixtures;
import com.trakio.core.common.ApiException;
import org.junit.jupiter.api.Test;

class ContentInspectorTest {

    @Test
    void detectsTypesFromBytes() {
        assertThat(ContentInspector.detect(Fixtures.jpeg())).isEqualTo(FileType.JPEG);
        assertThat(ContentInspector.detect(Fixtures.png())).isEqualTo(FileType.PNG);
        assertThat(ContentInspector.detect("%PDF-1.7".getBytes())).isEqualTo(FileType.PDF);
        assertThat(ContentInspector.detect("GIF89a".getBytes())).isNull();
        assertThat(ContentInspector.detect(new byte[0])).isNull();
    }

    @Test
    void truncatedImagesAreRejected() {
        byte[] jpeg = Fixtures.jpeg();
        byte[] broken = java.util.Arrays.copyOf(jpeg, 8);
        assertThatThrownBy(() -> ContentInspector.stripMetadata(FileType.JPEG, broken)).isInstanceOf(ApiException.class);
    }

    @Test
    void safeNamesDropPaths() {
        assertThat(FileService.safeName("../../etc/passwd")).isEqualTo("passwd");
        assertThat(FileService.safeName("C:\\fotos\\eu.png")).isEqualTo("eu.png");
        assertThat(FileService.safeName("a\"b<c>.pdf")).isEqualTo("a_b_c_.pdf");
    }
}
