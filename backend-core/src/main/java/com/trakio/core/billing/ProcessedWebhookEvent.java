package com.trakio.core.billing;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;

/** Stripe may deliver an event more than once; each id is handled once. */
@Entity
@Table(name = "processed_webhook_events")
public class ProcessedWebhookEvent {

    @Id
    @Column(length = 255)
    private String eventId;

    @Column(nullable = false)
    private Instant receivedAt;

    protected ProcessedWebhookEvent() {}

    public ProcessedWebhookEvent(String eventId, Instant receivedAt) {
        this.eventId = eventId;
        this.receivedAt = receivedAt;
    }
}
