package com.trakio.core.marketplace;

import com.trakio.core.auth.AuthUser;
import com.trakio.core.billing.BillingDtos.CheckoutView;
import com.trakio.core.coaching.CoachingService;
import com.trakio.core.common.PageResponse;
import com.trakio.core.marketplace.MarketplaceDtos.HireInput;
import com.trakio.core.marketplace.MarketplaceDtos.PackageInput;
import com.trakio.core.marketplace.MarketplaceDtos.PackageView;
import com.trakio.core.marketplace.MarketplaceDtos.ReviewInput;
import com.trakio.core.marketplace.MarketplaceDtos.ReviewView;
import com.trakio.core.marketplace.MarketplaceDtos.TrainerCard;
import com.trakio.core.marketplace.MarketplaceDtos.TrainerDetail;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Size;
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
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@Validated
class MarketplaceController {

    private final MarketplaceService marketplace;
    private final CoachingService coaching;

    MarketplaceController(MarketplaceService marketplace, CoachingService coaching) {
        this.marketplace = marketplace;
        this.coaching = coaching;
    }

    /** Public directory: verified PTs with an active marketplace subscription. */
    @GetMapping("/api/v1/trainers")
    List<TrainerCard> list(@RequestParam(required = false) @Size(max = 60) String city,
            @RequestParam(required = false) @Size(max = 40) String specialty) {
        return marketplace.list(city, specialty);
    }

    @GetMapping("/api/v1/trainers/{id}")
    TrainerDetail detail(@PathVariable UUID id) {
        return marketplace.detail(id);
    }

    @GetMapping("/api/v1/trainers/{id}/reviews")
    PageResponse<ReviewView> reviews(@PathVariable UUID id, @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return marketplace.reviews(id, page, size);
    }

    @PostMapping("/api/v1/trainers/{id}/reviews")
    @PreAuthorize("hasRole('CLIENT')")
    ReviewView review(@AuthenticationPrincipal AuthUser me, @PathVariable UUID id, @Valid @RequestBody ReviewInput input) {
        return marketplace.review(me.id(), id, input);
    }

    /** Starts paying a PT. Returns where to pay; the link to the PT only exists once the payment succeeds. */
    @PostMapping("/api/v1/trainers/{id}/hire")
    @PreAuthorize("hasRole('CLIENT')")
    CheckoutView hire(@AuthenticationPrincipal AuthUser me, @PathVariable UUID id, @Valid @RequestBody HireInput input) {
        return coaching.hire(me.id(), id, input.packageId());
    }

    // ── PT packages ─────────────────────────────────────────────────────────

    @GetMapping("/api/v1/trainer/packages")
    List<PackageView> myPackages(@AuthenticationPrincipal AuthUser me) {
        return marketplace.myPackages(me.id());
    }

    @PostMapping("/api/v1/trainer/packages")
    @ResponseStatus(HttpStatus.CREATED)
    PackageView create(@AuthenticationPrincipal AuthUser me, @Valid @RequestBody PackageInput input) {
        return marketplace.createPackage(me.id(), input);
    }

    @PutMapping("/api/v1/trainer/packages/{id}")
    PackageView update(@AuthenticationPrincipal AuthUser me, @PathVariable UUID id, @Valid @RequestBody PackageInput input) {
        return marketplace.updatePackage(me.id(), id, input);
    }

    @DeleteMapping("/api/v1/trainer/packages/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    void remove(@AuthenticationPrincipal AuthUser me, @PathVariable UUID id) {
        marketplace.removePackage(me.id(), id);
    }
}
