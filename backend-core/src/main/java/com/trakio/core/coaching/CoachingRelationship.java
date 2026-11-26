package com.trakio.core.coaching;

import com.trakio.core.common.BaseEntity;
import com.trakio.core.marketplace.PackagePeriod;
import com.trakio.core.marketplace.TrainerPackage;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;

/**
 * A student training with a PT. It starts pending and only becomes active when the payment
 * succeeds — nobody can link themselves to a PT by editing their profile.
 */
@Entity
@Table(name = "coaching_relationships")
public class CoachingRelationship extends BaseEntity {

    @Column(nullable = false)
    private UUID clientId;

    @Column(nullable = false)
    private UUID trainerId;

    private UUID packageId;

    /** Snapshot of what was bought, so a later price change doesn't rewrite history. */
    @Column(nullable = false, length = 80)
    private String packageName;

    @Column(nullable = false)
    private int priceCents;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 8)
    private PackagePeriod period;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 16)
    private RelationshipStatus status = RelationshipStatus.PENDING_PAYMENT;

    private Instant startedAt;

    private Instant endedAt;

    protected CoachingRelationship() {}

    public CoachingRelationship(UUID clientId, TrainerPackage pack) {
        this.clientId = clientId;
        this.trainerId = pack.getTrainerId();
        this.packageId = pack.getId();
        this.packageName = pack.getName();
        this.priceCents = pack.getPriceCents();
        this.period = pack.getPeriod();
    }

    public void activate(Instant now) {
        if (status == RelationshipStatus.PENDING_PAYMENT) {
            this.status = RelationshipStatus.ACTIVE;
            this.startedAt = now;
        }
    }

    public void end(Instant now) {
        if (status == RelationshipStatus.ACTIVE) {
            this.status = RelationshipStatus.ENDED;
            this.endedAt = now;
        } else if (status == RelationshipStatus.PENDING_PAYMENT) {
            this.status = RelationshipStatus.CANCELLED;
            this.endedAt = now;
        }
    }

    public UUID getClientId() {
        return clientId;
    }

    public UUID getTrainerId() {
        return trainerId;
    }

    public UUID getPackageId() {
        return packageId;
    }

    public String getPackageName() {
        return packageName;
    }

    public int getPriceCents() {
        return priceCents;
    }

    public PackagePeriod getPeriod() {
        return period;
    }

    public RelationshipStatus getStatus() {
        return status;
    }

    public Instant getStartedAt() {
        return startedAt;
    }

    public Instant getEndedAt() {
        return endedAt;
    }
}
