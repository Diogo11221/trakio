package com.trakio.core.coaching;

import com.trakio.core.account.Goal;
import com.trakio.core.marketplace.PackagePeriod;
import java.time.Instant;
import java.util.UUID;

public final class CoachingDtos {

    private CoachingDtos() {}

    /** Why a student needs the PT's attention, as data the app turns into words. */
    public record Attention(String kind, Integer done, Integer expected, String exercise) {}

    public record StudentView(UUID clientId, UUID relationshipId, String name, String photoUrl, Goal goal, int week,
            int weeks, Double adherence, String tag, Attention attention, String pack, int priceCents,
            PackagePeriod period, Instant since, UUID conversationId) {}

    public record TopLift(String exercise, String name, double currentMax, double changePercent) {}

    public record StudentDetail(StudentView student, int age, double heightCm, double weightKg, Double goalWeightKg,
            int workoutsDone, int workoutsExpected, TopLift topLift) {}
}
