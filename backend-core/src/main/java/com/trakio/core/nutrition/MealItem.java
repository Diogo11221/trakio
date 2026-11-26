package com.trakio.core.nutrition;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;

/** One food in a meal, with per-gram values so the grams can be edited later. */
@Embeddable
public class MealItem {

    @Column(length = 40)
    private String foodId;

    @Column(nullable = false, length = 80)
    private String name;

    @Column(nullable = false)
    private double grams;

    @Column(name = "kcal_per_g", nullable = false)
    private double kcalPerG;

    @Column(name = "protein_per_g", nullable = false)
    private double proteinPerG;

    @Column(name = "carbs_per_g", nullable = false)
    private double carbsPerG;

    @Column(name = "fat_per_g", nullable = false)
    private double fatPerG;

    protected MealItem() {}

    public MealItem(String foodId, String name, double grams, double kcalPerG, double proteinPerG, double carbsPerG,
            double fatPerG) {
        this.foodId = foodId;
        this.name = name;
        this.grams = grams;
        this.kcalPerG = kcalPerG;
        this.proteinPerG = proteinPerG;
        this.carbsPerG = carbsPerG;
        this.fatPerG = fatPerG;
    }

    public static MealItem of(Food food, double grams) {
        return new MealItem(food.getId(), food.getName(), grams, food.getKcal() / 100, food.getProtein() / 100,
                food.getCarbs() / 100, food.getFat() / 100);
    }

    public String getFoodId() {
        return foodId;
    }

    public String getName() {
        return name;
    }

    public double getGrams() {
        return grams;
    }

    public double getKcalPerG() {
        return kcalPerG;
    }

    public double getProteinPerG() {
        return proteinPerG;
    }

    public double getCarbsPerG() {
        return carbsPerG;
    }

    public double getFatPerG() {
        return fatPerG;
    }
}
