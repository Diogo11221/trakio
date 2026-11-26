package com.trakio.core.nutrition;

import jakarta.persistence.CollectionTable;
import jakarta.persistence.Column;
import jakarta.persistence.ElementCollection;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.Table;
import java.util.HashSet;
import java.util.Set;

/** Food composition per 100 g. */
@Entity
@Table(name = "foods")
public class Food {

    @Id
    @Column(length = 40)
    private String id;

    @Column(nullable = false, length = 80)
    private String name;

    @Column(name = "kcal_per_100", nullable = false)
    private double kcal;

    @Column(name = "protein_per_100", nullable = false)
    private double protein;

    @Column(name = "carbs_per_100", nullable = false)
    private double carbs;

    @Column(name = "fat_per_100", nullable = false)
    private double fat;

    /** Grams in one unit ("2 ovos") and in a default portion ("arroz"). */
    @Column(nullable = false)
    private double unitGrams;

    @Column(nullable = false)
    private double portionGrams;

    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "food_aliases", joinColumns = @JoinColumn(name = "food_id"))
    @Column(name = "alias", length = 60)
    private Set<String> aliases = new HashSet<>();

    protected Food() {}

    public String getId() {
        return id;
    }

    public String getName() {
        return name;
    }

    public double getKcal() {
        return kcal;
    }

    public double getProtein() {
        return protein;
    }

    public double getCarbs() {
        return carbs;
    }

    public double getFat() {
        return fat;
    }

    public double getUnitGrams() {
        return unitGrams;
    }

    public double getPortionGrams() {
        return portionGrams;
    }

    public Set<String> getAliases() {
        return aliases;
    }
}
