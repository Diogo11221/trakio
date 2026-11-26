package com.trakio.core.chat;

import com.fasterxml.jackson.annotation.JsonInclude;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

public final class ChatDtos {

    private ChatDtos() {}

    @JsonInclude(JsonInclude.Include.NON_NULL)
    public record MessageView(long id, String from, MessageKind kind, String text, String fileUrl, String fileName,
            Long fileSize, String title, String detail, Instant createdAt) {}

    public record Person(UUID id, String name, String photoUrl) {}

    public record ConversationView(UUID id, Person other, MessageView lastMessage, long unread, boolean canSend,
            Instant updatedAt) {}

    public record MessagesPage(List<MessageView> messages, long lastReadByOther) {}

    /** Text, a photo/file already uploaded with purpose "chat", or (student only) a finished workout. */
    public record SendInput(
            @NotNull MessageKind kind,
            @Size(max = 2000) String text,
            UUID fileId,
            UUID sessionId) {}

    public record ReadInput(long upTo) {}
}
