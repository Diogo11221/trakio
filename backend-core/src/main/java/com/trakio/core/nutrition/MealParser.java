package com.trakio.core.nutrition;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import org.springframework.stereotype.Component;

/**
 * Reads what people type — "2 ovos, 150 g de frango e arroz com azeite" — into foods and grams.
 * Same rules as the app's local parser (mobile-app/src/features/nutrition/foods.ts); unknown
 * pieces come back so the app can ask about them.
 */
@Component
public class MealParser {

    public record Parsed(List<MealItem> items, List<String> unknown) {}

    private record Alias(String alias, Pattern pattern, Food food) {}

    static final int MAX_TEXT = 500;
    private static final double MAX_GRAMS = 3000;

    private static final Map<String, Double> NUMBER_WORDS = Map.ofEntries(
            Map.entry("um", 1.0), Map.entry("uma", 1.0), Map.entry("dois", 2.0), Map.entry("duas", 2.0),
            Map.entry("três", 3.0), Map.entry("tres", 3.0), Map.entry("quatro", 4.0), Map.entry("cinco", 5.0),
            Map.entry("seis", 6.0), Map.entry("meio", 0.5), Map.entry("meia", 0.5));

    private static final Pattern SPLIT = Pattern.compile(",|;|\\+|\\be\\b|\\bcom\\b|\\n");
    private static final Pattern GRAMS = Pattern.compile("(\\d+(?:[.,]\\d+)?)\\s*(g|gr|gramas|ml)\\b");
    private static final Pattern KILOS = Pattern.compile("(\\d+(?:[.,]\\d+)?)\\s*(kg|l|litro|litros)\\b");
    private static final Pattern COUNT = Pattern.compile("^(\\d+(?:[.,]\\d+)?)\\s");

    private final FoodRepository foods;
    private volatile List<Alias> index;

    public MealParser(FoodRepository foods) {
        this.foods = foods;
    }

    /** Longest alias first, so "iogurte grego" wins over "iogurte". */
    private List<Alias> index() {
        List<Alias> current = index;
        if (current == null) {
            current = foods.findAll().stream()
                    .flatMap(food -> food.getAliases().stream().map(alias -> new Alias(alias,
                            Pattern.compile("(^|\\W)" + Pattern.quote(alias) + "(\\W|$)"), food)))
                    .sorted(Comparator.comparingInt((Alias a) -> a.alias().length()).reversed())
                    .toList();
            index = current;
        }
        return current;
    }

    public Parsed parse(String text) {
        String normalised = text.toLowerCase(Locale.ROOT).replaceAll("\\s+", " ").trim();
        List<MealItem> items = new ArrayList<>();
        List<String> unknown = new ArrayList<>();
        for (String raw : SPLIT.split(normalised)) {
            String part = raw.trim();
            if (part.isEmpty()) {
                continue;
            }
            Alias match = index().stream().filter(a -> a.pattern().matcher(part).find()).findFirst().orElse(null);
            if (match == null) {
                unknown.add(part);
                continue;
            }
            Food food = match.food();
            double amount = food.getPortionGrams();
            Matcher grams = GRAMS.matcher(part);
            Matcher kilos = KILOS.matcher(part);
            Matcher count = COUNT.matcher(part);
            String word = part.split(" ")[0];
            if (grams.find()) {
                amount = number(grams.group(1));
            } else if (kilos.find()) {
                amount = number(kilos.group(1)) * 1000;
            } else if (count.find()) {
                amount = number(count.group(1)) * food.getUnitGrams();
            } else if (NUMBER_WORDS.containsKey(word)) {
                amount = NUMBER_WORDS.get(word) * food.getUnitGrams();
            }
            double rounded = Math.min(MAX_GRAMS, Math.round(amount));
            int existing = indexOf(items, food.getId());
            if (existing >= 0) {
                MealItem old = items.get(existing);
                items.set(existing, MealItem.of(food, Math.min(MAX_GRAMS, old.getGrams() + rounded)));
            } else {
                items.add(MealItem.of(food, rounded));
            }
        }
        return new Parsed(items, unknown);
    }

    private static int indexOf(List<MealItem> items, String foodId) {
        for (int i = 0; i < items.size(); i++) {
            if (foodId.equals(items.get(i).getFoodId())) {
                return i;
            }
        }
        return -1;
    }

    private static double number(String raw) {
        return Double.parseDouble(raw.replace(',', '.'));
    }
}
