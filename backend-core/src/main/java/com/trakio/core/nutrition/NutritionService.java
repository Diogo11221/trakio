package com.trakio.core.nutrition;

import com.trakio.core.account.ClientProfile;
import com.trakio.core.account.ClientProfileRepository;
import com.trakio.core.billing.SubscriptionKind;
import com.trakio.core.billing.SubscriptionRepository;
import com.trakio.core.common.ApiException;
import com.trakio.core.common.Formulas;
import com.trakio.core.config.TrakioProperties;
import com.trakio.core.files.FilePurpose;
import com.trakio.core.files.FileService;
import com.trakio.core.nutrition.NutritionDtos.DayView;
import com.trakio.core.nutrition.NutritionDtos.FoodView;
import com.trakio.core.nutrition.NutritionDtos.ItemInput;
import com.trakio.core.nutrition.NutritionDtos.ItemView;
import com.trakio.core.nutrition.NutritionDtos.MealInput;
import com.trakio.core.nutrition.NutritionDtos.MealView;
import com.trakio.core.nutrition.NutritionDtos.ParseResult;
import com.trakio.core.nutrition.NutritionDtos.Per;
import com.trakio.core.nutrition.NutritionDtos.Totals;
import java.time.Clock;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class NutritionService {

    private final FoodRepository foods;
    private final MealRepository meals;
    private final MealParser parser;
    private final ClientProfileRepository clients;
    private final SubscriptionRepository subscriptions;
    private final FileService files;
    private final TrakioProperties properties;
    private final Clock clock;

    public NutritionService(FoodRepository foods, MealRepository meals, MealParser parser, ClientProfileRepository clients,
            SubscriptionRepository subscriptions, FileService files, TrakioProperties properties, Clock clock) {
        this.foods = foods;
        this.meals = meals;
        this.parser = parser;
        this.clients = clients;
        this.subscriptions = subscriptions;
        this.files = files;
        this.properties = properties;
        this.clock = clock;
    }

    @Transactional(readOnly = true)
    public List<FoodView> foods(String query) {
        String q = query == null ? "" : query.trim().toLowerCase(Locale.ROOT);
        return foods.findAll().stream()
                .filter(f -> q.isEmpty() || f.getName().toLowerCase(Locale.ROOT).contains(q)
                        || f.getAliases().stream().anyMatch(a -> a.contains(q)))
                .sorted(Comparator.comparing(Food::getName))
                .map(f -> new FoodView(f.getId(), f.getName(), new Per(f.getKcal(), f.getProtein(), f.getCarbs(), f.getFat()),
                        f.getUnitGrams(), f.getPortionGrams()))
                .toList();
    }

    @Transactional(readOnly = true)
    public ParseResult parse(String text) {
        MealParser.Parsed parsed = parser.parse(text);
        return new ParseResult(parsed.items().stream().map(ItemView::of).toList(), parsed.unknown(), totals(parsed.items()));
    }

    @Transactional(readOnly = true)
    public DayView day(UUID userId, LocalDate day) {
        List<MealView> list = meals.findByUserIdAndDayOrderByEatenAt(userId, day).stream().map(NutritionService::view).toList();
        int kcal = 0, protein = 0, carbs = 0, fat = 0;
        for (MealView m : list) {
            kcal += m.totals().kcal();
            protein += m.totals().protein();
            carbs += m.totals().carbs();
            fat += m.totals().fat();
        }
        Totals goals = clients.findByUserId(userId).map(NutritionService::goalsFor).orElse(null);
        return new DayView(day, goals, new Totals(kcal, protein, carbs, fat), list);
    }

    /** Daily targets from the profile — the same maths as the "Calorias por dia" calculator. */
    public static Totals goalsFor(ClientProfile p) {
        double maintenance = Formulas.restingCalories(p.getSex().name().equals("MALE"), p.getWeightKg(), p.getHeightCm(),
                p.age()) * Formulas.activityFactor(p.getActivity().name());
        int kcal = Formulas.caloriesForGoal(maintenance, p.getGoal().name());
        int[] macros = Formulas.macros(kcal, p.getWeightKg(), p.getGoal().name());
        return new Totals(kcal, macros[0], macros[1], macros[2]);
    }

    @Transactional
    public MealView addMeal(UUID userId, MealInput in) {
        LocalDate today = LocalDate.now(clock.withZone(properties.zone()));
        if (in.day().isAfter(today.plusDays(1)) || in.day().isBefore(today.minusDays(90))) {
            throw ApiException.badRequest("invalid-day", "Só podes registar refeições dos últimos 90 dias.");
        }
        if (in.source() == MealSource.AI && !subscriptions.findByUserIdAndKind(userId, SubscriptionKind.PREMIUM)
                .map(s -> s.grantsAccess()).orElse(false)) {
            throw new ApiException(HttpStatus.PAYMENT_REQUIRED, "premium-required",
                    "O registo de refeições com IA faz parte do Premium.");
        }
        files.requireOwned(userId, in.photoFileId(), FilePurpose.MEAL);

        var ids = in.items().stream().map(ItemInput::foodId).filter(id -> id != null && !id.isBlank()).collect(Collectors.toSet());
        Map<String, Food> known = foods.findAllById(ids).stream().collect(Collectors.toMap(Food::getId, Function.identity()));
        List<MealItem> items = new ArrayList<>();
        for (ItemInput item : in.items()) {
            if (item.foodId() != null && !item.foodId().isBlank()) {
                Food food = known.get(item.foodId());
                if (food == null) {
                    throw ApiException.badRequest("unknown-food", "Alimento desconhecido.");
                }
                items.add(MealItem.of(food, item.grams()));
            } else {
                if (item.name() == null || item.name().isBlank() || item.per() == null) {
                    throw ApiException.badRequest("invalid-item", "Falta o nome ou os valores de um alimento.");
                }
                var per = item.per();
                // Energy can't be lower than what the macros alone add up to (with some rounding slack).
                double fromMacros = per.protein() * 4 + per.carbs() * 4 + per.fat() * 9;
                if (fromMacros > per.kcal() * 1.25 + 0.2 || per.protein() + per.carbs() + per.fat() > 1.0) {
                    throw ApiException.badRequest("invalid-item", "Os valores de \"" + item.name().trim() + "\" não batem certo.");
                }
                items.add(new MealItem(null, item.name().trim(), item.grams(), per.kcal(), per.protein(), per.carbs(), per.fat()));
            }
        }
        Meal meal = new Meal(userId, in.day(), in.slot(), in.time().withSecond(0).withNano(0), in.source(), in.photoFileId(),
                items, clock.instant());
        return view(meals.save(meal));
    }

    @Transactional
    public void deleteMeal(UUID userId, UUID mealId) {
        meals.delete(meals.findByIdAndUserId(mealId, userId).orElseThrow(() -> ApiException.notFound("Esta refeição")));
    }

    static MealView view(Meal m) {
        return new MealView(m.getId(), m.getDay(), m.getSlot(), m.getEatenAt(), m.getSource(), FileService.url(m.getPhotoFileId()),
                m.getItems().stream().map(ItemView::of).toList(), totals(m.getItems()));
    }

    static Totals totals(List<MealItem> items) {
        double kcal = 0, protein = 0, carbs = 0, fat = 0;
        for (MealItem i : items) {
            kcal += i.getGrams() * i.getKcalPerG();
            protein += i.getGrams() * i.getProteinPerG();
            carbs += i.getGrams() * i.getCarbsPerG();
            fat += i.getGrams() * i.getFatPerG();
        }
        return new Totals((int) Math.round(kcal), (int) Math.round(protein), (int) Math.round(carbs), (int) Math.round(fat));
    }
}
