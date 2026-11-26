package com.trakio.core.nutrition;

import com.trakio.core.auth.AuthUser;
import com.trakio.core.coaching.CoachingService;
import com.trakio.core.nutrition.NutritionDtos.DayView;
import com.trakio.core.nutrition.NutritionDtos.FoodView;
import com.trakio.core.nutrition.NutritionDtos.MealInput;
import com.trakio.core.nutrition.NutritionDtos.MealView;
import com.trakio.core.nutrition.NutritionDtos.ParseInput;
import com.trakio.core.nutrition.NutritionDtos.ParseResult;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Size;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@Validated
class NutritionController {

    private final NutritionService nutrition;
    private final CoachingService coaching;

    NutritionController(NutritionService nutrition, CoachingService coaching) {
        this.nutrition = nutrition;
        this.coaching = coaching;
    }

    @GetMapping("/api/v1/foods")
    List<FoodView> foods(@RequestParam(required = false) @Size(max = 60) String q) {
        return nutrition.foods(q);
    }

    /** "2 ovos, 150 g de frango e arroz" → foods and grams, to confirm before saving. */
    @PostMapping("/api/v1/nutrition/parse")
    ParseResult parse(@Valid @RequestBody ParseInput input) {
        return nutrition.parse(input.text());
    }

    @GetMapping("/api/v1/me/meals")
    @PreAuthorize("hasRole('CLIENT')")
    DayView day(@AuthenticationPrincipal AuthUser me, @RequestParam LocalDate day) {
        return nutrition.day(me.id(), day);
    }

    @PostMapping("/api/v1/me/meals")
    @PreAuthorize("hasRole('CLIENT')")
    @ResponseStatus(HttpStatus.CREATED)
    MealView add(@AuthenticationPrincipal AuthUser me, @Valid @RequestBody MealInput input) {
        return nutrition.addMeal(me.id(), input);
    }

    @DeleteMapping("/api/v1/me/meals/{id}")
    @PreAuthorize("hasRole('CLIENT')")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    void delete(@AuthenticationPrincipal AuthUser me, @PathVariable UUID id) {
        nutrition.deleteMeal(me.id(), id);
    }

    @GetMapping("/api/v1/trainer/students/{clientId}/meals")
    DayView studentDay(@AuthenticationPrincipal AuthUser me, @PathVariable UUID clientId, @RequestParam LocalDate day) {
        coaching.requireActiveStudent(me.id(), clientId);
        return nutrition.day(clientId, day);
    }
}
