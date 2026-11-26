package com.trakio.core.admin;

import com.trakio.core.auth.Role;
import com.trakio.core.auth.UserStatus;
import com.trakio.core.exercise.DemoStatus;
import com.trakio.core.exercise.MuscleGroup;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

public final class AdminDtos {

    private AdminDtos() {}

    public record MonthRevenue(String month, long feesCents, long subscriptionsCents) {}

    public record Overview(String month, long activeUsers, long totalUsers, long clients, long trainers, long marketplaceTrainers,
            long newTrainersThisMonth, long premiumSubscribers, long revenueCents, Double revenueChangePercent,
            long processedCents, List<MonthRevenue> revenueByMonth, long aiMealsThisMonth, long pendingVerifications,
            long openReports, long refundRequests, long disputes) {}

    public record Settings(int platformFeePercent, int premiumPriceCents, int marketplacePriceCents, String paymentsProvider,
            boolean aiEnabled, List<TeamMember> admins) {}

    public record TeamMember(UUID id, String email, Instant since, Instant lastSeenAt) {}

    public record Totals(long all, long clients, long trainers, long premium, long suspended) {}

    public record UserRow(UUID id, String name, String photoUrl, String email, Role role, String city, boolean premium, boolean coached,
            Boolean verified, Boolean listed, Instant since, Instant lastSeenAt, UserStatus status) {}

    public record PaymentRow(UUID id, Instant date, String payer, String payerPhotoUrl, String trainer, com.trakio.core.billing.PaymentKind kind,
            String description, long amountCents, long feeCents, com.trakio.core.billing.PaymentStatus status,
            String refundReason) {}

    public record RefundDecisionInput(@NotNull com.trakio.core.billing.BillingService.RefundDecision decision) {}

    public record ExerciseRow(UUID id, String slug, String name, MuscleGroup group, String muscles, String equipment,
            DemoStatus demoStatus, long usedIn) {}

    public record ExerciseInput(
            @Pattern(regexp = "[a-z0-9]+(-[a-z0-9]+)*") @Size(max = 64) String slug,
            @NotBlank @Size(max = 120) String name,
            @NotNull MuscleGroup group,
            @Size(max = 200) String muscles,
            @Size(max = 120) String equipment) {}

    public record DemoStatusInput(@NotNull DemoStatus demoStatus) {}

    public record AuditRow(long id, UUID actorId, String action, String targetType, String targetId, String detail,
            Instant createdAt) {}
}
