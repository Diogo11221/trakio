package com.trakio.core.account;

import com.trakio.core.account.AccountDtos.ClientProfileInput;
import com.trakio.core.account.AccountDtos.ClientProfileView;
import com.trakio.core.account.AccountDtos.MeResponse;
import com.trakio.core.account.AccountDtos.PreferencesInput;
import com.trakio.core.account.AccountDtos.PreferencesView;
import com.trakio.core.account.AccountDtos.ProfileInput;
import com.trakio.core.account.AccountDtos.ProfileView;
import com.trakio.core.account.AccountDtos.TrainerLink;
import com.trakio.core.account.AccountDtos.TrainerProfileInput;
import com.trakio.core.account.AccountDtos.TrainerProfileView;
import com.trakio.core.auth.Role;
import com.trakio.core.auth.User;
import com.trakio.core.auth.UserRepository;
import com.trakio.core.billing.SubscriptionKind;
import com.trakio.core.billing.SubscriptionRepository;
import com.trakio.core.chat.ConversationRepository;
import com.trakio.core.coaching.CoachingRelationshipRepository;
import com.trakio.core.common.ApiException;
import com.trakio.core.common.Enums;
import com.trakio.core.files.FilePurpose;
import com.trakio.core.files.FileService;
import java.util.List;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AccountService {

    private final UserRepository users;
    private final ClientProfileRepository clients;
    private final TrainerProfileRepository trainers;
    private final PreferencesRepository preferences;
    private final CoachingRelationshipRepository coaching;
    private final ConversationRepository conversations;
    private final SubscriptionRepository subscriptions;
    private final FileService files;

    public AccountService(UserRepository users, ClientProfileRepository clients, TrainerProfileRepository trainers,
            PreferencesRepository preferences, CoachingRelationshipRepository coaching,
            ConversationRepository conversations, SubscriptionRepository subscriptions, FileService files) {
        this.users = users;
        this.clients = clients;
        this.trainers = trainers;
        this.preferences = preferences;
        this.coaching = coaching;
        this.conversations = conversations;
        this.subscriptions = subscriptions;
        this.files = files;
    }

    @Transactional(readOnly = true)
    public MeResponse me(UUID userId) {
        User user = users.findById(userId).orElseThrow(() -> ApiException.notFound("Esta conta"));
        ProfileView profile = switch (user.getRole()) {
            case CLIENT -> clients.findByUserId(userId).map(AccountService::view).orElse(null);
            case TRAINER -> trainers.findByUserId(userId).map(AccountService::view).orElse(null);
            case ADMIN -> null;
        };
        Preferences prefs = preferences.findById(userId).orElseGet(() -> new Preferences(userId));
        boolean premium = subscriptions.findByUserIdAndKind(userId, SubscriptionKind.PREMIUM)
                .map(s -> s.grantsAccess()).orElse(false);
        TrainerLink trainer = user.getRole() == Role.CLIENT ? trainerLink(userId) : null;
        return new MeResponse(user.getId(), user.getEmail(), user.getRole(), user.getCreatedAt(), profile,
                new PreferencesView(prefs.isVibration(), prefs.isLockScreenAlert(), prefs.isRestSound()), premium, trainer);
    }

    private TrainerLink trainerLink(UUID clientId) {
        return coaching.findActiveForClient(clientId).flatMap(rel -> trainers.findByUserId(rel.getTrainerId()).map(t -> {
            UUID conversationId = conversations.findByTrainerIdAndClientId(rel.getTrainerId(), clientId)
                    .map(c -> c.getId()).orElse(null);
            return new TrainerLink(rel.getId(), rel.getTrainerId(), t.getName(), t.getArticle(),
                    FileService.url(t.getPhotoFileId()), rel.getPackageName(), rel.getPriceCents(),
                    Enums.json(rel.getPeriod()), conversationId);
        })).orElse(null);
    }

    /** Onboarding and "Editar perfil". The profile kind must match the account's role. */
    @Transactional
    public MeResponse saveProfile(UUID userId, Role role, ProfileInput input) {
        switch (input) {
            case ClientProfileInput in -> {
                if (role != Role.CLIENT) {
                    throw ApiException.badRequest("wrong-profile-kind", "Esta conta não é de cliente.");
                }
                files.requireOwned(userId, in.photoFileId(), FilePurpose.AVATAR);
                ClientProfile profile = clients.findByUserId(userId).orElseGet(() -> new ClientProfile(userId));
                profile.update(in);
                profile.setCoached(coaching.findActiveForClient(userId).isPresent());
                clients.save(profile);
            }
            case TrainerProfileInput in -> {
                if (role != Role.TRAINER) {
                    throw ApiException.badRequest("wrong-profile-kind", "Esta conta não é de Personal Trainer.");
                }
                files.requireOwned(userId, in.photoFileId(), FilePurpose.AVATAR);
                List<String> unknown = in.specialties().stream().filter(s -> !AccountDtos.SPECIALTIES.contains(s)).toList();
                if (!unknown.isEmpty()) {
                    throw ApiException.badRequest("invalid-specialty", "Especialidade desconhecida: " + unknown.getFirst());
                }
                TrainerProfile profile = trainers.findByUserId(userId).orElseGet(() -> new TrainerProfile(userId));
                profile.update(in);
                trainers.save(profile);
            }
        }
        return me(userId);
    }

    @Transactional
    public PreferencesView savePreferences(UUID userId, PreferencesInput in) {
        Preferences prefs = preferences.findById(userId).orElseGet(() -> new Preferences(userId));
        prefs.update(in.vibration(), in.lockScreenAlert(), in.restSound());
        preferences.save(prefs);
        return new PreferencesView(prefs.isVibration(), prefs.isLockScreenAlert(), prefs.isRestSound());
    }

    public static ClientProfileView view(ClientProfile p) {
        return new ClientProfileView(p.getName(), p.getPhotoFileId(), FileService.url(p.getPhotoFileId()), p.getSex(),
                p.getBirthYear(), p.getHeightCm(), p.getWeightKg(), p.getGoalWeightKg(), p.getGoal(), p.getActivity(),
                p.getDaysPerWeek(), p.getExperience(), p.isCoached());
    }

    public static TrainerProfileView view(TrainerProfile p) {
        return new TrainerProfileView(p.getName(), p.getPhotoFileId(), FileService.url(p.getPhotoFileId()), p.getArticle(),
                p.getCity(), p.getArea(), p.isOnline(), p.getBio(), List.copyOf(p.getSpecialties()), p.isVerified());
    }
}
