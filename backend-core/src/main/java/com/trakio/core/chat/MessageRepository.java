package com.trakio.core.chat;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface MessageRepository extends JpaRepository<Message, Long> {

    List<Message> findByConversationIdAndIdGreaterThanOrderByIdAsc(UUID conversationId, long after, Pageable pageable);

    List<Message> findByConversationIdAndIdLessThanOrderByIdDesc(UUID conversationId, long before, Pageable pageable);

    Optional<Message> findFirstByConversationIdOrderByIdDesc(UUID conversationId);

    long countByConversationIdAndIdGreaterThanAndSenderIdNot(UUID conversationId, long after, UUID senderId);

    /** Whether a chat attachment was sent in a conversation this user is part of. */
    @Query("""
            select count(m) > 0 from Message m, Conversation c
            where m.conversationId = c.id and m.fileId = :fileId and (c.trainerId = :userId or c.clientId = :userId)
            """)
    boolean existsFileInConversationOf(UUID fileId, UUID userId);
}
