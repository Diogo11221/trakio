package com.trakio.core.coaching;

import com.trakio.core.account.Goal;
import com.trakio.core.marketplace.PackagePeriod;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

public final class CoachingDtos {

    private CoachingDtos() {}

    /**
     * {@code tag}: "new" in the first week, "attention" when there's an open suggestion.
     * {@code suggestion}: the most important one (all of them are in the student detail).
     */
    public record StudentView(UUID clientId, UUID relationshipId, String name, String photoUrl, Goal goal, int week,
            int weeks, Double adherence, String tag, Integer readiness, SuggestionService.SuggestionView suggestion,
            String pack, int priceCents, PackagePeriod period, Instant since, UUID conversationId) {}

    public record TopLift(String exercise, String name, double currentMax, double changePercent) {}

    public record StudentDetail(StudentView student, int age, com.trakio.core.account.Sex sex, double heightCm,
            double weightKg, Double goalWeightKg, com.trakio.core.account.ActivityLevel activity, int workoutsDone,
            int workoutsExpected, TopLift topLift, List<SuggestionService.SuggestionView> suggestions) {}
}
