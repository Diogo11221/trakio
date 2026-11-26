package com.trakio.core.account;

import com.fasterxml.jackson.annotation.JsonSubTypes;
import com.fasterxml.jackson.annotation.JsonTypeInfo;
import com.trakio.core.auth.Role;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

public final class AccountDtos {

    private AccountDtos() {}

    /** What the app gets for the signed-in account — never the password hash or internal flags. */
    public record MeResponse(
            UUID id,
            String email,
            Role role,
            Instant createdAt,
            /** null until onboarding is finished. */
            ProfileView profile,
            PreferencesView preferences,
            /** From a paid subscription only. */
            boolean premium,
            /** The client's current PT, from a paid coaching relationship (null when training alone). */
            TrainerLink trainer) {}

    @JsonTypeInfo(use = JsonTypeInfo.Id.NAME, property = "kind")
    @JsonSubTypes({
        @JsonSubTypes.Type(value = ClientProfileView.class, name = "client"),
        @JsonSubTypes.Type(value = TrainerProfileView.class, name = "trainer")
    })
    public sealed interface ProfileView permits ClientProfileView, TrainerProfileView {}

    public record ClientProfileView(
            String name,
            UUID photoFileId,
            String photoUrl,
            Sex sex,
            int birthYear,
            double heightCm,
            double weightKg,
            Double goalWeightKg,
            Goal goal,
            ActivityLevel activity,
            int daysPerWeek,
            Experience experience,
            boolean coached) implements ProfileView {}

    public record TrainerProfileView(
            String name,
            UUID photoFileId,
            String photoUrl,
            String article,
            String city,
            String area,
            boolean online,
            String bio,
            List<String> specialties,
            boolean verified) implements ProfileView {}

    public record PreferencesView(boolean vibration, boolean lockScreenAlert, boolean restSound) {}

    public record TrainerLink(
            UUID relationshipId,
            UUID trainerId,
            String name,
            String article,
            String photoUrl,
            String pack,
            int priceCents,
            String period,
            UUID conversationId) {}

    // ── Inputs ──────────────────────────────────────────────────────────────

    @JsonTypeInfo(use = JsonTypeInfo.Id.NAME, property = "kind")
    @JsonSubTypes({
        @JsonSubTypes.Type(value = ClientProfileInput.class, name = "client"),
        @JsonSubTypes.Type(value = TrainerProfileInput.class, name = "trainer")
    })
    public sealed interface ProfileInput permits ClientProfileInput, TrainerProfileInput {}

    public record ClientProfileInput(
            @NotBlank @Size(max = 80) String name,
            UUID photoFileId,
            @NotNull Sex sex,
            @Min(1920) @Max(2015) int birthYear,
            @DecimalMin("100") @DecimalMax("250") double heightCm,
            @DecimalMin("30") @DecimalMax("300") double weightKg,
            @DecimalMin("30") @DecimalMax("300") Double goalWeightKg,
            @NotNull Goal goal,
            @NotNull ActivityLevel activity,
            @Min(1) @Max(7) int daysPerWeek,
            @NotNull Experience experience,
            boolean coached) implements ProfileInput {}

    public record TrainerProfileInput(
            @NotBlank @Size(max = 80) String name,
            UUID photoFileId,
            @Pattern(regexp = "[ao]") String article,
            @NotBlank @Size(max = 60) String city,
            @Size(max = 80) String area,
            boolean online,
            @Size(max = 1000) String bio,
            @NotNull @Size(min = 1, max = 4) List<@NotBlank @Size(max = 40) String> specialties) implements ProfileInput {}

    public record PreferencesInput(boolean vibration, boolean lockScreenAlert, boolean restSound) {}

    /** The specialties the app offers; anything else is refused. */
    public static final List<String> SPECIALTIES = List.of(
            "Hipertrofia", "Perda de peso", "Força", "Mobilidade", "Pós-parto", "Corrida", "Powerlifting",
            "Reabilitação", "Nutrição");
}
