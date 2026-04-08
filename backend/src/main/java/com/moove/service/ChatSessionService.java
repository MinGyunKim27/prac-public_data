package com.moove.service;

import com.moove.dto.ChatDto;
import com.moove.entity.ChatSession;
import com.moove.repository.ChatSessionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class ChatSessionService {

    private final ChatSessionRepository chatSessionRepository;

    @Transactional
    public ChatDto.SessionCreateResponse createSession(String deviceId) {
        ChatSession session = ChatSession.of(deviceId);
        ChatSession saved = chatSessionRepository.save(session);
        return new ChatDto.SessionCreateResponse(saved.getSessionId(), saved.getDeviceId());
    }
}
