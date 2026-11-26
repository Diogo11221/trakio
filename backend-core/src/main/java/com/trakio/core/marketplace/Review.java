package com.trakio.core.marketplace;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "reviews")
public class Review {

    @Id
    private UUID id = UUID.randomUUID();

    @Column(nullable = false)
    private UUID trainerId;

    @Column(nullable = false)
    private UUID authorId;

    @Column(nullable = false)
    private short rating;

    @Column(nullable = false, length = 1000)
    private String comment = "";

    /** Set by moderation; the review stays for the audit trail but is no longer shown or counted. */
    private Instant removedAt;

    @Column(nullable = false)
    private Instant createdAt;

    protected Review() {}

    public Review(UUID trainerId, UUID authorId, int rating, String comment, Instant now) {
        this.trainerId = trainerId;
        this.authorId = authorId;
        this.rating = (short) rating;
        this.comment = comment == null ? "" : comment;
        this.createdAt = now;
    }

    public void edit(int rating, String comment) {
        this.rating = (short) rating;
        this.comment = comment == null ? "" : comment;
    }

    public void remove(Instant now) {
        this.removedAt = now;
    }

    public UUID getId() {
        return id;
    }

    public UUID getTrainerId() {
        return trainerId;
    }

    public UUID getAuthorId() {
        return authorId;
    }

    public int getRating() {
        return rating;
    }

    public String getComment() {
        return comment;
    }

    public Instant getRemovedAt() {
        return removedAt;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }
}
