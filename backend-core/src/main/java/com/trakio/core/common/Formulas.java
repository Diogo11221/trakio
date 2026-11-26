package com.trakio.core.common;

/**
 * Health and training maths — the same formulas as the app's calculators
 * (mobile-app/src/features/tools/calc.ts), so the server and the phone agree.
 */
public final class Formulas {

    private Formulas() {}

    /** Estimated one-repetition max: average of Epley and Brzycki (reliable up to ~10 reps). */
    public static double oneRepMax(double kg, int reps) {
        if (reps <= 1) {
            return kg;
        }
        double epley = kg * (1 + reps / 30.0);
        double brzycki = reps < 37 ? (kg * 36) / (37 - reps) : epley;
        return (epley + brzycki) / 2;
    }

    /** Resting calories (Mifflin–St Jeor). */
    public static double restingCalories(boolean male, double weightKg, double heightCm, int age) {
        return 10 * weightKg + 6.25 * heightCm - 5 * age + (male ? 5 : -161);
    }

    public static double activityFactor(String activity) {
        return switch (activity) {
            case "SEDENTARY" -> 1.2;
            case "LIGHT" -> 1.375;
            case "MODERATE" -> 1.55;
            case "HIGH" -> 1.725;
            case "ATHLETE" -> 1.9;
            default -> 1.2;
        };
    }

    /** −20 % to lose fat, +10 % to build muscle, rounded to 10 kcal. */
    public static int caloriesForGoal(double maintenance, String goal) {
        double factor = switch (goal) {
            case "LOSE" -> 0.8;
            case "GAIN" -> 1.1;
            default -> 1.0;
        };
        return (int) Math.round(maintenance * factor / 10) * 10;
    }

    /** Protein 1,8–2,2 g/kg, fat 25 % of calories, carbohydrates the rest. Grams. */
    public static int[] macros(int calories, double weightKg, String goal) {
        int protein = (int) Math.round(weightKg * ("LOSE".equals(goal) ? 2.2 : 1.8));
        int fat = (int) Math.round(calories * 0.25 / 9);
        int carbs = (int) Math.max(0, Math.round((calories - protein * 4 - fat * 9) / 4.0));
        return new int[] {protein, carbs, fat};
    }
}
