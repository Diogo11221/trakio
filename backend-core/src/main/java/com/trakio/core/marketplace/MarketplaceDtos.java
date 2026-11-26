package com.trakio.core.marketplace;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

public final class MarketplaceDtos {

    private MarketplaceDtos() {}

    public record PackageView(UUID id, String name, String description, int priceCents, PackagePeriod period) {

        public static PackageView of(TrainerPackage p) {
            return new PackageView(p.getId(), p.getName(), p.getDescription(), p.getPriceCents(), p.getPeriod());
        }
    }

    public record TrainerCard(UUID id, String name, String article, String photoUrl, boolean verified,
            List<String> specialties, String city, String where, boolean online, Double rating, long reviews,
            Integer fromPriceCents, long students) {}

    public record TrainerDetail(TrainerCard trainer, String bio, List<PackageView> packages) {}

    /** Reviews show the author's first name only. */
    public record ReviewView(UUID id, String author, int rating, String comment, Instant createdAt) {}

    public record ReviewInput(@Min(1) @Max(5) int rating, @Size(max = 1000) String comment) {}

    public record PackageInput(
            @NotBlank @Size(max = 80) String name,
            @Size(max = 300) String description,
            @Min(100) @Max(100000) int priceCents,
            @NotNull PackagePeriod period,
            @Min(0) @Max(50) int position) {}

    public record HireInput(@NotNull UUID packageId) {}
}
