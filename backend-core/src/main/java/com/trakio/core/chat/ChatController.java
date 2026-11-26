package com.trakio.core.chat;

import com.trakio.core.auth.AuthUser;
import com.trakio.core.chat.ChatDtos.ConversationView;
import com.trakio.core.chat.ChatDtos.MessageView;
import com.trakio.core.chat.ChatDtos.MessagesPage;
import com.trakio.core.chat.ChatDtos.ReadInput;
import com.trakio.core.chat.ChatDtos.SendInput;
import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
class ChatController {

    private final ChatService chat;

    ChatController(ChatService chat) {
        this.chat = chat;
    }

    @GetMapping("/api/v1/conversations")
    List<ConversationView> list(@AuthenticationPrincipal AuthUser me) {
        return chat.list(me);
    }

    @GetMapping("/api/v1/conversations/{id}/messages")
    MessagesPage messages(@AuthenticationPrincipal AuthUser me, @PathVariable UUID id,
            @RequestParam(required = false) Long after, @RequestParam(required = false) Long before,
            @RequestParam(defaultValue = "50") int limit) {
        return chat.messages(me, id, after, before, limit);
    }

    @PostMapping("/api/v1/conversations/{id}/messages")
    @ResponseStatus(HttpStatus.CREATED)
    MessageView send(@AuthenticationPrincipal AuthUser me, @PathVariable UUID id, @Valid @RequestBody SendInput input) {
        return chat.send(me, id, input);
    }

    @PostMapping("/api/v1/conversations/{id}/read")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    void read(@AuthenticationPrincipal AuthUser me, @PathVariable UUID id, @RequestBody ReadInput input) {
        chat.markRead(me, id, input.upTo());
    }
}
