package com.trakio.core.marketplace;

import com.trakio.core.account.ClientProfile;
import com.trakio.core.account.ClientProfileRepository;
import com.trakio.core.account.TrainerProfile;
import com.trakio.core.account.TrainerProfileRepository;
import com.trakio.core.coaching.CoachingRelationshipRepository;
import com.trakio.core.coaching.RelationshipStatus;
import com.trakio.core.common.ApiException;
import com.trakio.core.common.PageResponse;
import com.trakio.core.common.Pages;
import com.trakio.core.files.FileService;
import com.trakio.core.marketplace.MarketplaceDtos.PackageInput;
import com.trakio.core.marketplace.MarketplaceDtos.PackageView;
import com.trakio.core.marketplace.MarketplaceDtos.ReviewInput;
import com.trakio.core.marketplace.MarketplaceDtos.ReviewView;
import com.trakio.core.marketplace.MarketplaceDtos.TrainerCard;
import com.trakio.core.marketplace.MarketplaceDtos.TrainerDetail;
import java.time.Clock;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class MarketplaceService {

    private static final int MAX_PACKAGES = 6;

    private final TrainerProfileRepository trainers;
    private final TrainerPackageRepository packages;
    private final ReviewRepository reviews;
    private final CoachingRelationshipRepository coaching;
    private final ClientProfileRepository clients;
    private final Clock clock;

    public MarketplaceService(TrainerProfileRepository trainers, TrainerPackageRepository packages, ReviewRepository reviews,
            CoachingRelationshipRepository coaching, ClientProfileRepository clients, Clock clock) {
        this.trainers = trainers;
        this.packages = packages;
        this.reviews = reviews;
        this.coaching = coaching;
        this.clients = clients;
        this.clock = clock;
    }

    @Transactional(readOnly = true)
    public List<TrainerCard> list(String city, String specialty) {
        List<TrainerProfile> listed = trainers.findListed(blankToNull(city), blankToNull(specialty));
        return cards(listed);
    }

    @Transactional(readOnly = true)
    public boolean isListed(UUID trainerId) {
        return trainers.findListed(null, null).stream().anyMatch(t -> t.getUserId().equals(trainerId));
    }

    @Transactional(readOnly = true)
    public TrainerDetail detail(UUID trainerId) {
        TrainerProfile trainer = trainers.findListed(null, null).stream().filter(t -> t.getUserId().equals(trainerId))
                .findFirst().orElseThrow(() -> ApiException.notFound("Este PT"));
        return new TrainerDetail(cards(List.of(trainer)).getFirst(), trainer.getBio(),
                packages.findByTrainerIdAndActiveTrueOrderByPosition(trainerId).stream().map(PackageView::of).toList());
    }

    private List<TrainerCard> cards(List<TrainerProfile> listed) {
        Set<UUID> ids = listed.stream().map(TrainerProfile::getUserId).collect(Collectors.toSet());
        if (ids.isEmpty()) {
            return List.of();
        }
        Map<UUID, ReviewRepository.RatingSummary> ratings = reviews.summarise(ids).stream()
                .collect(Collectors.toMap(ReviewRepository.RatingSummary::getTrainerId, Function.identity()));
        Map<UUID, Integer> fromPrice = packages.findByTrainerIdInAndActiveTrue(ids).stream()
                .collect(Collectors.toMap(TrainerPackage::getTrainerId, TrainerPackage::getPriceCents, Math::min));
        return listed.stream().map(t -> {
            var r = ratings.get(t.getUserId());
            Double rating = r == null ? null : Math.round(r.getAverage() * 10) / 10.0;
            return new TrainerCard(t.getUserId(), t.getName(), t.getArticle(), FileService.url(t.getPhotoFileId()),
                    t.isVerified(), List.copyOf(t.getSpecialties()), t.getCity(), t.where(), t.isOnline(), rating,
                    r == null ? 0 : r.getCount(), fromPrice.get(t.getUserId()),
                    coaching.countByTrainerIdAndStatus(t.getUserId(), RelationshipStatus.ACTIVE));
        }).toList();
    }

    // ── Reviews ─────────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public PageResponse<ReviewView> reviews(UUID trainerId, int page, int size) {
        var result = reviews.findByTrainerIdAndRemovedAtIsNullOrderByCreatedAtDesc(trainerId, Pages.of(page, size, Sort.unsorted()));
        Map<UUID, String> names = clients.findByUserIdIn(result.getContent().stream().map(Review::getAuthorId).toList())
                .stream().collect(Collectors.toMap(ClientProfile::getUserId, c -> firstName(c.getName())));
        return PageResponse.of(result, r -> new ReviewView(r.getId(), names.getOrDefault(r.getAuthorId(), "Aluno"),
                r.getRating(), r.getComment(), r.getCreatedAt()));
    }

    /** Only someone who actually trained with this PT (paid relationship) can review — one review each, editable. */
    @Transactional
    public ReviewView review(UUID clientId, UUID trainerId, ReviewInput in) {
        boolean trained = coaching.existsByClientIdAndTrainerIdAndStatusIn(clientId, trainerId,
                List.of(RelationshipStatus.ACTIVE, RelationshipStatus.ENDED));
        if (!trained) {
            throw ApiException.forbidden("Só podes avaliar um PT com quem treinaste.");
        }
        String comment = in.comment() == null ? "" : in.comment().trim();
        Review review = reviews.findByTrainerIdAndAuthorId(trainerId, clientId)
                .map(r -> {
                    r.edit(in.rating(), comment);
                    return r;
                })
                .orElseGet(() -> new Review(trainerId, clientId, in.rating(), comment, clock.instant()));
        reviews.save(review);
        String name = clients.findByUserId(clientId).map(c -> firstName(c.getName())).orElse("Aluno");
        return new ReviewView(review.getId(), name, review.getRating(), review.getComment(), review.getCreatedAt());
    }

    // ── A PT's packages ─────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public List<PackageView> myPackages(UUID trainerId) {
        return packages.findByTrainerIdAndActiveTrueOrderByPosition(trainerId).stream().map(PackageView::of).toList();
    }

    @Transactional
    public PackageView createPackage(UUID trainerId, PackageInput in) {
        if (packages.countByTrainerIdAndActiveTrue(trainerId) >= MAX_PACKAGES) {
            throw ApiException.conflict("too-many-packages", "Podes ter até 6 pacotes.");
        }
        TrainerPackage p = new TrainerPackage(trainerId);
        p.update(in.name().trim(), trim(in.description()), in.priceCents(), in.period(), in.position());
        return PackageView.of(packages.save(p));
    }

    @Transactional
    public PackageView updatePackage(UUID trainerId, UUID packageId, PackageInput in) {
        TrainerPackage p = packages.findByIdAndTrainerId(packageId, trainerId).filter(TrainerPackage::isActive)
                .orElseThrow(() -> ApiException.notFound("Este pacote"));
        p.update(in.name().trim(), trim(in.description()), in.priceCents(), in.period(), in.position());
        return PackageView.of(p);
    }

    @Transactional
    public void removePackage(UUID trainerId, UUID packageId) {
        packages.findByIdAndTrainerId(packageId, trainerId).orElseThrow(() -> ApiException.notFound("Este pacote")).deactivate();
    }

    static String firstName(String name) {
        String trimmed = name.trim();
        int space = trimmed.indexOf(' ');
        return space < 0 ? trimmed : trimmed.substring(0, space);
    }

    private static String trim(String s) {
        return s == null ? "" : s.trim();
    }

    private static String blankToNull(String s) {
        return s == null || s.isBlank() ? null : s.trim();
    }

    static final Comparator<TrainerCard> BY_NAME = Comparator.comparing(TrainerCard::name);
}
