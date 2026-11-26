package com.trakio.core.nutrition;

import jakarta.persistence.CollectionTable;
import jakarta.persistence.Column;
import jakarta.persistence.ElementCollection;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.OrderColumn;
import jakarta.persistence.Table;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "meals")
public class Meal {

    @Id
    private UUID id = UUID.randomUUID();

    @Column(nullable = false)
    private UUID userId;

    /** The person's local calendar day. */
    @Column(nullable = false)
    private LocalDate day;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 16)
    private MealSlot slot;

    @Column(nullable = false)
    private LocalTime eatenAt;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 8)
    private MealSource source;

    private UUID photoFileId;

    @Column(nullable = false)
    private Instant createdAt;

    @ElementCollection
    @CollectionTable(name = "meal_items", joinColumns = @JoinColumn(name = "meal_id"))
    @OrderColumn(name = "position")
    private List<MealItem> items = new ArrayList<>();

    protected Meal() {}

    public Meal(UUID userId, LocalDate day, MealSlot slot, LocalTime eatenAt, MealSource source, UUID photoFileId,
            List<MealItem> items, Instant now) {
        this.userId = userId;
        this.day = day;
        this.slot = slot;
        this.eatenAt = eatenAt;
        this.source = source;
        this.photoFileId = photoFileId;
        this.items.addAll(items);
        this.createdAt = now;
    }

    public UUID getId() {
        return id;
    }

    public UUID getUserId() {
        return userId;
    }

    public LocalDate getDay() {
        return day;
    }

    public MealSlot getSlot() {
        return slot;
    }

    public LocalTime getEatenAt() {
        return eatenAt;
    }

    public MealSource getSource() {
        return source;
    }

    public UUID getPhotoFileId() {
        return photoFileId;
    }

    public List<MealItem> getItems() {
        return items;
    }
}
