package com.trakio.core.coaching;

import com.fasterxml.jackson.annotation.JsonValue;
import com.trakio.core.common.Enums;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;

/** What a PT did with an AI suggestion. A decided suggestion stays hidden for a while. */
@Entity
@Table(name = "ai_decisions")
public class AiDecision {

    public enum Kind {
        LIGHT_WEEK, HOME_WORKOUT, VARIATION;

        @JsonValue
        public String json() {
            return Enums.json(this);
        }
    }

    public enum Decision {
        APPLIED, IGNORED;

        @JsonValue
        public String json() {
            return Enums.json(this);
        }
    }

    @Id
    private UUID id = UUID.randomUUID();

    @Column(nullable = false)
    private UUID trainerId;

    @Column(nullable = false)
    private UUID clientId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 16)
    private Kind kind;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 8)
    private Decision decision;

    @Column(nullable = false)
    private Instant createdAt;

    protected AiDecision() {}

    public AiDecision(UUID trainerId, UUID clientId, Kind kind, Decision decision, Instant now) {
        this.trainerId = trainerId;
        this.clientId = clientId;
        this.kind = kind;
        this.decision = decision;
        this.createdAt = now;
    }

    public Kind getKind() {
        return kind;
    }

    public Decision getDecision() {
        return decision;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }
}
