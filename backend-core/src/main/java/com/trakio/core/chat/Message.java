package com.trakio.core.chat;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;

/** Sequential ids give a simple "messages after X" cursor; access is always checked per conversation. */
@Entity
@Table(name = "messages")
public class Message {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private UUID conversationId;

    private UUID senderId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 16)
    private MessageKind kind;

    @Column(length = 2000)
    private String body;

    private UUID fileId;

    @Column(length = 160)
    private String title;

    @Column(length = 300)
    private String detail;

    @Column(nullable = false)
    private Instant createdAt;

    protected Message() {}

    private Message(UUID conversationId, UUID senderId, MessageKind kind, Instant now) {
        this.conversationId = conversationId;
        this.senderId = senderId;
        this.kind = kind;
        this.createdAt = now;
    }

    public static Message text(UUID conversationId, UUID senderId, String text, Instant now) {
        Message m = new Message(conversationId, senderId, MessageKind.TEXT, now);
        m.body = text;
        return m;
    }

    public static Message file(UUID conversationId, UUID senderId, MessageKind kind, UUID fileId, String caption, Instant now) {
        Message m = new Message(conversationId, senderId, kind, now);
        m.fileId = fileId;
        m.body = caption;
        return m;
    }

    public static Message workout(UUID conversationId, UUID senderId, String title, String detail, Instant now) {
        Message m = new Message(conversationId, senderId, MessageKind.WORKOUT, now);
        m.title = title;
        m.detail = detail;
        return m;
    }

    public Long getId() {
        return id;
    }

    public UUID getConversationId() {
        return conversationId;
    }

    public UUID getSenderId() {
        return senderId;
    }

    public MessageKind getKind() {
        return kind;
    }

    public String getBody() {
        return body;
    }

    public UUID getFileId() {
        return fileId;
    }

    public String getTitle() {
        return title;
    }

    public String getDetail() {
        return detail;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }
}
