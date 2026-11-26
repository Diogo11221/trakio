package com.trakio.core.exercise;

import com.trakio.core.common.Enums;
import com.trakio.core.common.PageResponse;
import com.trakio.core.common.Pages;
import jakarta.validation.constraints.Size;
import org.springframework.data.domain.Sort;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/** The exercise library, for "Treino livre" and the PT plan editor. */
@RestController
@Validated
class ExerciseController {

    private final ExerciseRepository exercises;

    ExerciseController(ExerciseRepository exercises) {
        this.exercises = exercises;
    }

    @GetMapping("/api/v1/exercises")
    PageResponse<ExerciseView> list(@RequestParam(required = false) @Size(max = 60) String q,
            @RequestParam(required = false) String group, @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "100") int size) {
        MuscleGroup muscleGroup = Enums.parse(MuscleGroup.class, group, "group");
        String query = q == null || q.isBlank() ? null : q.trim();
        return PageResponse.of(exercises.search(query, muscleGroup, null, Pages.of(page, size, Sort.by("name"))),
                ExerciseView::of);
    }
}
