package com.trakio.core.chat;

import com.trakio.core.common.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;

/** One thread per PT and student. Read markers are the id of the last message each side has seen. */
@Entity
@Table(name = "conversations")
public class Conversation extends BaseEntity {

    @Column(nullable = false)
    private UUID trainerId;

    @Column(nullable = false)
    private UUID clientId;

    @Column(nullable = false)
    private long trainerLastReadId;

    @Column(nullable = false)
    private long clientLastReadId;

    private Instant lastMessageAt;

    protected Conversation() {}

    public Conversation(UUID trainerId, UUID clientId) {
        this.trainerId = trainerId;
        this.clientId = clientId;
    }

    public boolean hasParticipant(UUID userId) {
        return trainerId.equals(userId) || clientId.equals(userId);
    }

    public UUID otherThan(UUID userId) {
        return trainerId.equals(userId) ? clientId : trainerId;
    }

    public long lastReadBy(UUID userId) {
        return trainerId.equals(userId) ? trainerLastReadId : clientLastReadId;
    }

    public void markRead(UUID userId, long messageId) {
        if (trainerId.equals(userId)) {
            trainerLastReadId = Math.max(trainerLastReadId, messageId);
        } else if (clientId.equals(userId)) {
            clientLastReadId = Math.max(clientLastReadId, messageId);
        }
    }

    public void touched(Instant at) {
        this.lastMessageAt = at;
    }

    public UUID getTrainerId() {
        return trainerId;
    }

    public UUID getClientId() {
        return clientId;
    }

    public Instant getLastMessageAt() {
        return lastMessageAt;
    }
}
