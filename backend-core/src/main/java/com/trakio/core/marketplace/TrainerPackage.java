package com.trakio.core.marketplace;

import com.trakio.core.common.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Table;
import java.util.UUID;

/** What a PT sells ("Treino + Nutrição · 45 €/mês"). Removing one only hides it: past payments keep pointing at it. */
@Entity
@Table(name = "trainer_packages")
public class TrainerPackage extends BaseEntity {

    @Column(nullable = false)
    private UUID trainerId;

    @Column(nullable = false, length = 80)
    private String name;

    @Column(nullable = false, length = 300)
    private String description = "";

    @Column(nullable = false)
    private int priceCents;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 8)
    private PackagePeriod period;

    @Column(nullable = false)
    private boolean active = true;

    @Column(nullable = false)
    private int position;

    protected TrainerPackage() {}

    public TrainerPackage(UUID trainerId) {
        this.trainerId = trainerId;
    }

    public void update(String name, String description, int priceCents, PackagePeriod period, int position) {
        this.name = name;
        this.description = description == null ? "" : description;
        this.priceCents = priceCents;
        this.period = period;
        this.position = position;
    }

    public UUID getTrainerId() {
        return trainerId;
    }

    public String getName() {
        return name;
    }

    public String getDescription() {
        return description;
    }

    public int getPriceCents() {
        return priceCents;
    }

    public PackagePeriod getPeriod() {
        return period;
    }

    public boolean isActive() {
        return active;
    }

    public void deactivate() {
        this.active = false;
    }

    public int getPosition() {
        return position;
    }
}
