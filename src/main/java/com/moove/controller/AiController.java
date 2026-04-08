package com.moove.controller;

import com.moove.dto.ChatDto;
import com.moove.service.AiService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

@RestController
@RequestMapping("/api/ai")
@RequiredArgsConstructor
public class AiController {

    private final AiService aiService;

    /**
     * GET /api/ai/recommend?lat=&lng=&stdgCd=&userType=
     * AI 이동 추천 스트리밍 (SSE)
     */
    @GetMapping(value = "/recommend", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter recommend(
            @RequestParam double lat,
            @RequestParam double lng,
            @RequestParam String stdgCd,
            @RequestParam String userType) {

        SseEmitter emitter = new SseEmitter(120_000L);
        aiService.streamRecommendation(lat, lng, stdgCd, userType, emitter);
        return emitter;
    }

    /**
     * POST /api/ai/chat
     * AI 챗봇 스트리밍 (SSE)
     */
    @PostMapping(value = "/chat", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter chat(@RequestBody ChatDto.ChatRequest request) {
        SseEmitter emitter = new SseEmitter(120_000L);
        aiService.streamChat(
                request.getSessionId(),
                request.getUserType(),
                request.getMessage(),
                request.getLat(),
                request.getLng(),
                request.getStdgCd(),
                emitter
        );
        return emitter;
    }
}
