package com.moove.service;

import com.moove.dto.ChatDto;
import com.moove.entity.ChatSession;
import com.moove.repository.ChatSessionRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;

@ExtendWith(MockitoExtension.class)
class ChatSessionServiceTest {

    @Mock
    private ChatSessionRepository chatSessionRepository;

    @InjectMocks
    private ChatSessionService chatSessionService;

    @Test
    @DisplayName("세션 생성 시 deviceId 포함된 응답 반환")
    void createSession_returnsSessionWithDeviceId() {
        String deviceId = "test-device-uuid";
        ChatSession mockSession = ChatSession.of(deviceId);

        given(chatSessionRepository.save(any(ChatSession.class))).willAnswer(inv -> {
            ChatSession s = inv.getArgument(0);
            return s;
        });

        ChatDto.SessionCreateResponse response = chatSessionService.createSession(deviceId);

        assertThat(response.getDeviceId()).isEqualTo(deviceId);
    }
}
