package com.trakio.core.ai;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

/**
 * backend-ai, seen from backend-core. Every call can come back empty (AI switched off, down or
 * slow): callers always have a non-AI fallback, so the app keeps working.
 */
public interface AiGateway {

    record Per100(double kcal, double protein, double carbs, double fat) {}

    record CatalogFood(String id, String name, Per100 per100) {}

    record EstimatedItem(String foodId, String name, double grams, Per100 per100, String confidence) {}

    record MealEstimate(List<EstimatedItem> items, List<String> unrecognised, String note, String source) {}

    record SessionPoint(Instant finishedAt, double volumeKg, int sets, String feeling) {}

    record Factor(String kind, double value) {}

    record Readiness(int score, String level, Integer daysSinceLast, Double acwr, List<Factor> factors, String model) {}

    record Suggestion(String kind, String title, String body, String action, int priority) {}

    record Insights(int readiness, List<Suggestion> suggestions) {}

    Optional<MealEstimate> estimateMeal(String text, byte[] image, String mediaType, List<CatalogFood> catalog);

    Optional<String> transcribe(byte[] audio);

    Optional<Readiness> readiness(Instant now, List<SessionPoint> sessions);

    Optional<Insights> insights(String firstName, Instant now, List<SessionPoint> sessions, int done, int expected,
            List<String> stalled);
}
