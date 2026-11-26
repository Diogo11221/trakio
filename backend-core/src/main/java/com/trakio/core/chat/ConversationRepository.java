package com.trakio.core.chat;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface ConversationRepository extends JpaRepository<Conversation, UUID> {

    Optional<Conversation> findByTrainerIdAndClientId(UUID trainerId, UUID clientId);

    @Query("""
            select c from Conversation c where c.trainerId = :userId or c.clientId = :userId
            order by c.lastMessageAt desc nulls last
            """)
    List<Conversation> findForUser(UUID userId);
}
