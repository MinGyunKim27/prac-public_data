package com.moove.repository;

import com.moove.entity.ChatMessage;
import com.moove.entity.ChatSession;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.test.context.ActiveProfiles;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;

@DataJpaTest
@ActiveProfiles("test")
class ChatSessionRepositoryTest {

    @Autowired
    private ChatSessionRepository chatSessionRepository;

    @Autowired
    private ChatMessageRepository chatMessageRepository;

    @Test
    @DisplayName("세션 저장 및 device_id로 조회")
    void saveAndFindByDeviceId() {
        ChatSession session = ChatSession.of("device-abc");
        chatSessionRepository.save(session);

        Optional<ChatSession> found = chatSessionRepository.findTopByDeviceIdOrderByCreatedAtDesc("device-abc");

        assertThat(found).isPresent();
        assertThat(found.get().getDeviceId()).isEqualTo("device-abc");
    }

    @Test
    @DisplayName("메시지 저장 및 세션 ID로 조회")
    void saveMessageAndFindBySessionId() {
        ChatSession session = chatSessionRepository.save(ChatSession.of("device-xyz"));

        chatMessageRepository.save(ChatMessage.of(session, ChatMessage.Role.user, "안녕하세요"));
        chatMessageRepository.save(ChatMessage.of(session, ChatMessage.Role.assistant, "안녕하세요! 무엇을 도와드릴까요?"));

        List<ChatMessage> messages = chatMessageRepository
                .findTop10BySessionSessionIdOrderByCreatedAtAsc(session.getSessionId());

        assertThat(messages).hasSize(2);
        assertThat(messages.get(0).getRole()).isEqualTo(ChatMessage.Role.user);
        assertThat(messages.get(1).getRole()).isEqualTo(ChatMessage.Role.assistant);
    }
}
