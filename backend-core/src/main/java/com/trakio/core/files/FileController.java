package com.trakio.core.files;

import com.trakio.core.auth.AuthUser;
import com.trakio.core.common.ApiException;
import com.trakio.core.common.Enums;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.UUID;
import org.springframework.core.io.InputStreamResource;
import org.springframework.http.CacheControl;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

@RestController
class FileController {

    record FileView(UUID id, String purpose, String contentType, long sizeBytes, String name, String url, Instant createdAt) {

        static FileView of(StoredFile f) {
            return new FileView(f.getId(), Enums.json(f.getPurpose()), f.getContentType(), f.getSizeBytes(),
                    f.getOriginalName(), FileService.url(f.getId()), f.getCreatedAt());
        }
    }

    private final FileService files;
    private final FileLinks links;
    private final StoredFileRepository repository;

    FileController(FileService files, FileLinks links, StoredFileRepository repository) {
        this.files = files;
        this.links = links;
        this.repository = repository;
    }

    /** A 5-minute link to open the file without the bearer header (e.g. a PDF in the browser). */
    @PostMapping("/api/v1/files/{id}/link")
    FileLinks.Link link(@AuthenticationPrincipal AuthUser me, @PathVariable UUID id) {
        files.authorizeRead(me, id);
        return links.create(id);
    }

    @PostMapping(path = "/api/v1/files", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @ResponseStatus(HttpStatus.CREATED)
    FileView upload(@AuthenticationPrincipal AuthUser me, @RequestParam("purpose") String purpose,
            @RequestPart("file") MultipartFile file) {
        FilePurpose kind = Enums.parse(FilePurpose.class, purpose, "purpose");
        if (kind == null) {
            throw ApiException.badRequest("invalid-purpose", "Indica para que é o ficheiro.");
        }
        if (kind == FilePurpose.VERIFICATION && !me.isTrainer()) {
            throw ApiException.forbidden("Só Personal Trainers enviam documentos de verificação.");
        }
        return FileView.of(files.upload(me.id(), kind, file));
    }

    @GetMapping("/api/v1/files/{id}")
    ResponseEntity<InputStreamResource> download(@AuthenticationPrincipal AuthUser me, @PathVariable UUID id,
            @RequestParam(required = false) Long exp, @RequestParam(required = false) String sig) throws IOException {
        StoredFile file;
        if (me != null) {
            file = files.authorizeRead(me, id);
        } else if (exp != null && links.valid(id, exp, sig)) {
            file = repository.findById(id).orElseThrow(() -> ApiException.notFound("Este ficheiro"));
        } else {
            throw new ApiException(HttpStatus.UNAUTHORIZED, "unauthenticated", "Inicia sessão para continuar.");
        }
        MediaType type = MediaType.parseMediaType(file.getContentType());
        boolean image = type.getType().equals("image");
        ContentDisposition disposition = (image ? ContentDisposition.inline() : ContentDisposition.attachment())
                .filename(file.getOriginalName() == null ? id.toString() : file.getOriginalName(), StandardCharsets.UTF_8)
                .build();
        return ResponseEntity.ok()
                .contentType(type)
                .contentLength(file.getSizeBytes())
                .header(HttpHeaders.CONTENT_DISPOSITION, disposition.toString())
                .cacheControl(CacheControl.noStore())
                .body(new InputStreamResource(files.open(file)));
    }
}
