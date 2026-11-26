package com.trakio.core.files;

import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface StoredFileRepository extends JpaRepository<StoredFile, UUID> {

    List<StoredFile> findByOwnerId(UUID ownerId);
}
