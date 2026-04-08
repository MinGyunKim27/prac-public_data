package com.moove.controller;

import com.moove.dto.ChatDto;
import com.moove.service.ChatSessionService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/chat")
@RequiredArgsConstructor
public class ChatController {

    private final ChatSessionService chatSessionService;

    /**
     * POST /api/chat/sessions
     * 챗봇 세션 생성
     */
    @PostMapping("/sessions")
    public ResponseEntity<ChatDto.SessionCreateResponse> createSession(
            @RequestBody ChatDto.SessionCreateRequest request) {

        ChatDto.SessionCreateResponse response =
                chatSessionService.createSession(request.getDeviceId());
        return ResponseEntity.ok(response);
    }
}
