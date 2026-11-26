package com.trakio.core.nutrition;

import jakarta.validation.Valid;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;
import java.util.UUID;

public final class NutritionDtos {

    private NutritionDtos() {}

    public record Per(double kcal, double protein, double carbs, double fat) {}

    public record Totals(int kcal, int protein, int carbs, int fat) {}

    public record FoodView(String id, String name, Per per100, double unitGrams, double portionGrams) {}

    public record ItemView(String foodId, String name, double grams, Per per) {

        static ItemView of(MealItem i) {
            return new ItemView(i.getFoodId(), i.getName(), i.getGrams(),
                    new Per(i.getKcalPerG(), i.getProteinPerG(), i.getCarbsPerG(), i.getFatPerG()));
        }
    }

    public record MealView(UUID id, LocalDate day, MealSlot slot, LocalTime time, MealSource source, String photoUrl,
            List<ItemView> items, Totals totals) {}

    public record DayView(LocalDate day, Totals goals, Totals eaten, List<MealView> meals) {}

    public record ParseInput(@NotBlank @Size(max = MealParser.MAX_TEXT) String text) {}

    public record ParseResult(List<ItemView> items, List<String> unknown, Totals totals) {}

    /**
     * A food in a new meal. With {@code foodId}, the server's food table sets the values; without
     * it (an estimate), the values must be physically possible.
     */
    public record ItemInput(
            @Size(max = 40) String foodId,
            @Size(max = 80) String name,
            @DecimalMin("1") @DecimalMax("3000") double grams,
            @Valid PerInput per) {}

    public record PerInput(
            @DecimalMin("0") @DecimalMax("9.5") double kcal,
            @DecimalMin("0") @DecimalMax("1") double protein,
            @DecimalMin("0") @DecimalMax("1") double carbs,
            @DecimalMin("0") @DecimalMax("1") double fat) {}

    public record MealInput(
            @NotNull LocalDate day,
            @NotNull MealSlot slot,
            @NotNull LocalTime time,
            @NotNull MealSource source,
            UUID photoFileId,
            @NotNull @Size(min = 1, max = 30) List<@Valid @NotNull ItemInput> items) {}
}
