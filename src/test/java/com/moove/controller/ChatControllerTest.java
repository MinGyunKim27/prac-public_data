package com.moove.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.moove.dto.ChatDto;
import com.moove.service.ChatSessionService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.BDDMockito.given;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(ChatController.class)
class ChatControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockBean
    private ChatSessionService chatSessionService;

    @Test
    @DisplayName("POST /api/chat/sessions - 세션 생성 성공")
    void createSession_returnsSessionId() throws Exception {
        String deviceId = "test-device-uuid";
        given(chatSessionService.createSession(anyString()))
                .willReturn(new ChatDto.SessionCreateResponse(1L, deviceId));

        ChatDto.SessionCreateRequest request = new ChatDto.SessionCreateRequest();
        request.setDeviceId(deviceId);

        mockMvc.perform(post("/api/chat/sessions")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.sessionId").value(1L))
                .andExpect(jsonPath("$.deviceId").value(deviceId));
    }
}
