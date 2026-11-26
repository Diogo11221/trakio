package com.trakio.core.admin;

import java.time.Clock;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AuditService {

    private static final Logger log = LoggerFactory.getLogger("audit");

    private final AuditLogRepository entries;
    private final Clock clock;

    public AuditService(AuditLogRepository entries, Clock clock) {
        this.entries = entries;
        this.clock = clock;
    }

    /** Joins the caller's transaction: the entry exists only if the action happened. */
    @Transactional(propagation = Propagation.MANDATORY)
    public void record(UUID actorId, String action, String targetType, String targetId, String detail) {
        entries.save(new AuditLog(actorId, action, targetType, targetId, detail == null ? "" : detail, clock.instant()));
        log.info("actor={} action={} target={}:{}", actorId, action, targetType, targetId);
    }
}
