package com.trakio.core.chat;

import com.trakio.core.account.ClientProfileRepository;
import com.trakio.core.account.TrainerProfileRepository;
import com.trakio.core.auth.AuthUser;
import com.trakio.core.chat.ChatDtos.ConversationView;
import com.trakio.core.chat.ChatDtos.MessageView;
import com.trakio.core.chat.ChatDtos.MessagesPage;
import com.trakio.core.chat.ChatDtos.Person;
import com.trakio.core.chat.ChatDtos.SendInput;
import com.trakio.core.coaching.CoachingRelationshipRepository;
import com.trakio.core.coaching.RelationshipStatus;
import com.trakio.core.common.ApiException;
import com.trakio.core.files.FilePurpose;
import com.trakio.core.files.FileService;
import com.trakio.core.files.StoredFile;
import com.trakio.core.files.StoredFileRepository;
import com.trakio.core.workout.WorkoutSession;
import com.trakio.core.workout.WorkoutSessionRepository;
import java.time.Clock;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ChatService {

    private static final int MAX_PAGE = 100;

    private final ConversationRepository conversations;
    private final MessageRepository messages;
    private final CoachingRelationshipRepository relationships;
    private final ClientProfileRepository clients;
    private final TrainerProfileRepository trainers;
    private final StoredFileRepository files;
    private final WorkoutSessionRepository sessions;
    private final Clock clock;

    public ChatService(ConversationRepository conversations, MessageRepository messages,
            CoachingRelationshipRepository relationships, ClientProfileRepository clients,
            TrainerProfileRepository trainers, StoredFileRepository files, WorkoutSessionRepository sessions, Clock clock) {
        this.conversations = conversations;
        this.messages = messages;
        this.relationships = relationships;
        this.clients = clients;
        this.trainers = trainers;
        this.files = files;
        this.sessions = sessions;
        this.clock = clock;
    }

    @Transactional
    public Conversation ensureConversation(UUID trainerId, UUID clientId) {
        return conversations.findByTrainerIdAndClientId(trainerId, clientId)
                .orElseGet(() -> conversations.saveAndFlush(new Conversation(trainerId, clientId)));
    }

    public Optional<UUID> conversationId(UUID trainerId, UUID clientId) {
        return conversations.findByTrainerIdAndClientId(trainerId, clientId).map(Conversation::getId);
    }

    @Transactional(readOnly = true)
    public List<ConversationView> list(AuthUser me) {
        List<Conversation> mine = conversations.findForUser(me.id());
        List<UUID> others = mine.stream().map(c -> c.otherThan(me.id())).toList();
        Map<UUID, Person> people = people(others);
        return mine.stream().map(c -> {
            UUID other = c.otherThan(me.id());
            MessageView last = messages.findFirstByConversationIdOrderByIdDesc(c.getId()).map(m -> view(m, c, null)).orElse(null);
            long unread = messages.countByConversationIdAndIdGreaterThanAndSenderIdNot(c.getId(), c.lastReadBy(me.id()), me.id());
            return new ConversationView(c.getId(), people.getOrDefault(other, new Person(other, "Conta removida", null)), last,
                    unread, canSend(c), c.getLastMessageAt());
        }).toList();
    }

    /** Newer than {@code after} (polling), or older than {@code before} (scrolling back). */
    @Transactional(readOnly = true)
    public MessagesPage messages(AuthUser me, UUID conversationId, Long after, Long before, int limit) {
        Conversation c = participantOf(me, conversationId);
        int size = Math.clamp(limit, 1, MAX_PAGE);
        List<Message> page;
        if (after != null) {
            page = messages.findByConversationIdAndIdGreaterThanOrderByIdAsc(c.getId(), after, PageRequest.of(0, size));
        } else {
            page = messages.findByConversationIdAndIdLessThanOrderByIdDesc(c.getId(), before == null ? Long.MAX_VALUE : before,
                    PageRequest.of(0, size)).reversed();
        }
        Map<UUID, StoredFile> attached = files.findAllById(page.stream().map(Message::getFileId).filter(id -> id != null).toList())
                .stream().collect(Collectors.toMap(StoredFile::getId, f -> f));
        return new MessagesPage(page.stream().map(m -> view(m, c, attached.get(m.getFileId()))).toList(),
                c.lastReadBy(c.otherThan(me.id())));
    }

    @Transactional
    public MessageView send(AuthUser me, UUID conversationId, SendInput in) {
        Conversation c = participantOf(me, conversationId);
        if (!canSend(c)) {
            throw ApiException.conflict("conversation-closed", "O acompanhamento terminou: já não é possível enviar mensagens.");
        }
        Instant now = clock.instant();
        Message message = switch (in.kind()) {
            case TEXT -> {
                if (in.text() == null || in.text().isBlank()) {
                    throw ApiException.badRequest("empty-message", "Escreve uma mensagem.");
                }
                yield Message.text(c.getId(), me.id(), in.text().trim(), now);
            }
            case PHOTO, FILE -> {
                StoredFile file = in.fileId() == null ? null : files.findById(in.fileId()).orElse(null);
                if (file == null || !file.getOwnerId().equals(me.id()) || file.getPurpose() != FilePurpose.CHAT) {
                    throw ApiException.badRequest("invalid-file", "Ficheiro inválido.");
                }
                if (in.kind() == MessageKind.PHOTO && !file.getContentType().startsWith("image/")) {
                    throw ApiException.badRequest("invalid-file", "Isto não é uma foto.");
                }
                String caption = in.text() == null || in.text().isBlank() ? null : in.text().trim();
                yield Message.file(c.getId(), me.id(), in.kind(), file.getId(), caption, now);
            }
            case WORKOUT -> workoutCard(me, c, in.sessionId(), now);
        };
        messages.save(message);
        c.touched(now);
        c.markRead(me.id(), message.getId());
        return view(message, c, message.getFileId() == null ? null : files.findById(message.getFileId()).orElse(null));
    }

    /** The card text comes from the saved workout, so a student can't send a made-up result. */
    private Message workoutCard(AuthUser me, Conversation c, UUID sessionId, Instant now) {
        if (!c.getClientId().equals(me.id()) || sessionId == null) {
            throw ApiException.badRequest("invalid-workout", "Só podes partilhar um treino teu.");
        }
        WorkoutSession s = sessions.findByIdAndUserId(sessionId, me.id())
                .orElseThrow(() -> ApiException.badRequest("invalid-workout", "Só podes partilhar um treino teu."));
        String title = s.getTitle() + (s.getFocus().isBlank() ? "" : " · " + s.getFocus()) + " concluído";
        String records = s.getExercises().stream().filter(e -> e.isRecord()).map(e -> e.getName()).collect(Collectors.joining(", "));
        String detail = s.minutes() + " min" + (records.isEmpty() ? "" : " · novo recorde: " + records);
        return Message.workout(c.getId(), me.id(), truncate(title, 160), truncate(detail, 300), now);
    }

    @Transactional
    public void markRead(AuthUser me, UUID conversationId, long upTo) {
        Conversation c = participantOf(me, conversationId);
        long newest = messages.findFirstByConversationIdOrderByIdDesc(c.getId()).map(Message::getId).orElse(0L);
        c.markRead(me.id(), Math.min(upTo, newest));
    }

    /** "Guardar e enviar" on a student's plan. */
    @Transactional
    public void postFromTrainer(UUID trainerId, UUID clientId, String text) {
        Conversation c = ensureConversation(trainerId, clientId);
        Instant now = clock.instant();
        Message m = messages.save(Message.text(c.getId(), trainerId, truncate(text, 2000), now));
        c.touched(now);
        c.markRead(trainerId, m.getId());
    }

    private Conversation participantOf(AuthUser me, UUID conversationId) {
        return conversations.findById(conversationId).filter(c -> c.hasParticipant(me.id()))
                .orElseThrow(() -> ApiException.notFound("Esta conversa"));
    }

    private boolean canSend(Conversation c) {
        return relationships.findByTrainerIdAndClientIdAndStatus(c.getTrainerId(), c.getClientId(), RelationshipStatus.ACTIVE)
                .isPresent();
    }

    private Map<UUID, Person> people(List<UUID> ids) {
        Map<UUID, Person> people = new java.util.HashMap<>();
        clients.findByUserIdIn(ids).forEach(p -> people.put(p.getUserId(),
                new Person(p.getUserId(), p.getName(), FileService.url(p.getPhotoFileId()))));
        trainers.findByUserIdIn(ids).forEach(p -> people.put(p.getUserId(),
                new Person(p.getUserId(), p.getName(), FileService.url(p.getPhotoFileId()))));
        return people;
    }

    private static MessageView view(Message m, Conversation c, StoredFile file) {
        String from = m.getSenderId() == null ? "removed" : m.getSenderId().equals(c.getTrainerId()) ? "trainer" : "client";
        return new MessageView(m.getId(), from, m.getKind(), m.getBody(), FileService.url(m.getFileId()),
                file == null ? null : file.getOriginalName(), file == null ? null : file.getSizeBytes(), m.getTitle(),
                m.getDetail(), m.getCreatedAt());
    }

    private static String truncate(String s, int max) {
        return s.length() <= max ? s : s.substring(0, max);
    }
}
