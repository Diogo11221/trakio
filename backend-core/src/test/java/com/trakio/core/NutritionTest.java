package com.trakio.core;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;

import java.time.LocalDate;
import java.time.ZoneId;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;
import tools.jackson.databind.JsonNode;

class NutritionTest extends IntegrationTest {

    @Test
    void readsMealsWrittenInPlainPortuguese() throws Exception {
        Session s = client();
        JsonNode parsed = call(post("/api/v1/nutrition/parse"), s, Map.of("text", "2 ovos, 150 g de frango e arroz com azeite e unicórnio"), 200);
        assertThat(parsed.findValuesAsString("foodId")).containsExactly("ovo", "frango", "arroz", "azeite");
        assertThat(parsed.get("items").get(0).get("grams").asDouble()).isEqualTo(110);
        assertThat(parsed.get("items").get(1).get("grams").asDouble()).isEqualTo(150);
        assertThat(parsed.get("unknown").get(0).asText()).isEqualTo("unicórnio");
    }

    @Test
    void theServerSetsTheNutritionValuesOfKnownFoods() throws Exception {
        Session s = client();
        String today = LocalDate.now(ZoneId.of("Europe/Lisbon")).toString();
        // The app claims chicken has no calories: the food table wins.
        JsonNode meal = call(post("/api/v1/me/meals"), s, Map.of("day", today, "slot", "lunch", "time", "13:00", "source", "manual",
                "items", List.of(Map.of("foodId", "frango", "grams", 100, "per", Map.of("kcal", 0, "protein", 0, "carbs", 0, "fat", 0)))), 201);
        assertThat(meal.get("totals").get("kcal").asInt()).isEqualTo(165);

        // Estimates without a known food must be physically possible.
        call(post("/api/v1/me/meals"), s, Map.of("day", today, "slot", "lunch", "time", "13:00", "source", "manual",
                "items", List.of(Map.of("name", "Bolo", "grams", 100, "per", Map.of("kcal", 0.1, "protein", 0.9, "carbs", 0.9, "fat", 0.9)))), 400);

        JsonNode day = call(get("/api/v1/me/meals?day=" + today), s, null, 200);
        assertThat(day.get("eaten").get("kcal").asInt()).isEqualTo(165);
        // Goals from the profile: male, 178 cm, 78 kg, moderate, gain → same maths as the app.
        assertThat(day.get("goals").get("kcal").asInt()).isGreaterThan(2500);

        call(delete("/api/v1/me/meals/" + meal.get("id").asText()), client(), null, 404);
        call(delete("/api/v1/me/meals/" + meal.get("id").asText()), s, null, 204);
    }

    @Test
    void aiLoggedMealsNeedPremium() throws Exception {
        Session s = client();
        String today = LocalDate.now(ZoneId.of("Europe/Lisbon")).toString();
        Map<String, Object> meal = Map.of("day", today, "slot", "dinner", "time", "20:30", "source", "ai",
                "items", List.of(Map.of("foodId", "salmao", "grams", 150)));
        assertThat(call(post("/api/v1/me/meals"), s, meal, 402).get("code").asText()).isEqualTo("premium-required");
        call(post("/api/v1/me/premium/checkout"), s, null, 200);
        call(post("/api/v1/me/meals"), s, meal, 201);
    }
}
