package com.moove.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.moove.dto.BusDto;
import com.moove.dto.MobilityResponse;
import com.moove.dto.SignalDto;
import com.moove.dto.TaxiDto;
import com.moove.entity.ChatMessage;
import com.moove.entity.ChatSession;
import com.moove.repository.ChatMessageRepository;
import com.moove.repository.ChatSessionRepository;
import lombok.extern.slf4j.Slf4j;
import okhttp3.*;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStreamReader;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.function.Consumer;

@Slf4j
@Service
public class AiService {

    private static final String CLAUDE_API_URL = "https://api.anthropic.com/v1/messages";
    private static final String ANTHROPIC_VERSION = "2023-06-01";
    private static final MediaType JSON = MediaType.get("application/json; charset=utf-8");

    private static final String SYSTEM_PROMPT = """
            당신은 교통약자(고령자, 장애인, 임산부, 유모차 이용자 등)의 이동을 돕는 친절한 안내 도우미입니다.
            제공된 실시간 공공데이터를 바탕으로 현재 상황에 맞는 최적의 이동 방법을 안내해주세요.
            답변 규칙:
            - 항상 한국어로, 존댓말로 답변
            - 핵심 정보 먼저, 이유 나중에
            - 교통약자 배려 옵션(휠체어 리프트 탑재 콜택시, 저상버스) 우선 안내
            - 보행 신호 잔여시간 15초 미만 시 다음 신호 대기 안내
            - 3~4문장 이내로 간결하게
            """;

    private final OkHttpClient httpClient;
    private final ObjectMapper objectMapper;
    private final MobilityService mobilityService;
    private final ChatSessionRepository chatSessionRepository;
    private final ChatMessageRepository chatMessageRepository;

    public AiService(@Qualifier("claudeHttpClient") OkHttpClient httpClient,
                     ObjectMapper objectMapper,
                     MobilityService mobilityService,
                     ChatSessionRepository chatSessionRepository,
                     ChatMessageRepository chatMessageRepository) {
        this.httpClient = httpClient;
        this.objectMapper = objectMapper;
        this.mobilityService = mobilityService;
        this.chatSessionRepository = chatSessionRepository;
        this.chatMessageRepository = chatMessageRepository;
    }

    @Value("${anthropic.api-key}")
    private String apiKey;

    @Value("${anthropic.model}")
    private String model;

    @Value("${anthropic.max-tokens}")
    private int maxTokens;

    /**
     * GET /api/ai/recommend — 실시간 데이터 기반 이동 추천 (SSE 스트리밍)
     */
    public void streamRecommendation(double lat, double lng, String stdgCd,
                                      String userType, SseEmitter emitter) {
        try {
            MobilityResponse mobility = mobilityService.getMobility(lat, lng, stdgCd);
            String context = buildMobilityContext(mobility.getData(), userType, lat, lng);
            String userMessage = context + "\n현재 위치에서 최적 이동 방법을 안내해주세요.";

            List<Map<String, String>> messages = List.of(
                    Map.of("role", "user", "content", userMessage)
            );
            streamToEmitterWithCallback(messages, emitter, chunk -> {});
        } catch (Exception e) {
            log.error("AI 추천 스트리밍 실패", e);
            emitter.completeWithError(e);
        }
    }

    /**
     * POST /api/ai/chat — 챗봇 5턴 대화 (SSE 스트리밍)
     */
    public void streamChat(Long sessionId, String userType, String userMessage,
                            double lat, double lng, String stdgCd, SseEmitter emitter) {
        ChatSession session = chatSessionRepository.findById(sessionId)
                .orElseThrow(() -> new IllegalArgumentException("세션을 찾을 수 없습니다: " + sessionId));

        // 이전 대화 히스토리 (최근 10개 = 5턴)
        List<ChatMessage> history = chatMessageRepository
                .findTop10BySessionSessionIdOrderByCreatedAtAsc(sessionId);

        // 실시간 데이터 컨텍스트
        MobilityResponse mobility = mobilityService.getMobility(lat, lng, stdgCd);
        String contextPrefix = buildMobilityContext(mobility.getData(), userType, lat, lng);
        String fullMessage = contextPrefix + "\n" + userMessage;

        // Claude 메시지 구성
        List<Map<String, String>> messages = new ArrayList<>();
        for (ChatMessage msg : history) {
            messages.add(Map.of("role", msg.getRole().name(), "content", msg.getContent()));
        }
        messages.add(Map.of("role", "user", "content", fullMessage));

        // 사용자 메시지 저장
        chatMessageRepository.save(ChatMessage.of(session, ChatMessage.Role.user, userMessage));
        session.updateLastActive();
        chatSessionRepository.save(session);

        // AI 응답 스트리밍 + 저장
        StringBuilder assistantResponse = new StringBuilder();
        try {
            streamToEmitterWithCallback(messages, emitter, assistantResponse::append);
            chatMessageRepository.save(
                    ChatMessage.of(session, ChatMessage.Role.assistant, assistantResponse.toString()));
        } catch (Exception e) {
            log.error("AI 챗봇 스트리밍 실패: sessionId={}", sessionId, e);
            emitter.completeWithError(e);
        }
    }

    private void streamToEmitterWithCallback(List<Map<String, String>> messages,
                                               SseEmitter emitter,
                                               Consumer<String> onChunk) throws Exception {
        String requestBody = objectMapper.writeValueAsString(Map.of(
                "model", model,
                "max_tokens", maxTokens,
                "stream", true,
                "system", SYSTEM_PROMPT,
                "messages", messages
        ));

        Request request = new Request.Builder()
                .url(CLAUDE_API_URL)
                .post(RequestBody.create(requestBody, JSON))
                .addHeader("x-api-key", apiKey)
                .addHeader("anthropic-version", ANTHROPIC_VERSION)
                .addHeader("Content-Type", "application/json")
                .build();

        try (Response response = httpClient.newCall(request).execute()) {
            if (!response.isSuccessful()) {
                String errorBody = response.body() != null ? response.body().string() : "(no body)";
                log.error("Claude API 오류: HTTP {} - {}", response.code(), errorBody);
                throw new IOException("Claude API 오류: HTTP " + response.code() + " - " + errorBody);
            }

            // 개발 가이드 9장: SSE 스트리밍 파싱
            try (BufferedReader reader = new BufferedReader(
                    new InputStreamReader(Objects.requireNonNull(response.body()).byteStream()))) {
                String line;
                while ((line = reader.readLine()) != null) {
                    if (!line.startsWith("data: ")) continue;
                    String data = line.substring(6).trim();
                    if (data.equals("[DONE]")) break;

                    var node = objectMapper.readTree(data);
                    if ("content_block_delta".equals(node.path("type").asText())) {
                        String text = node.path("delta").path("text").asText();
                        if (!text.isEmpty()) {
                            onChunk.accept(text);
                            emitter.send(SseEmitter.event().data(text));
                        }
                    }
                }
                emitter.send(SseEmitter.event().name("done").data("[DONE]"));
                emitter.complete();
            }
        }
    }

    private String buildMobilityContext(MobilityResponse.Data data, String userType) {
        return buildMobilityContext(data, userType, 0, 0);
    }

    private String buildMobilityContext(MobilityResponse.Data data, String userType, double lat, double lng) {
        StringBuilder sb = new StringBuilder("[현재 실시간 현황]\n");
        if (lat != 0 && lng != 0) {
            sb.append(String.format("사용자 위치: 위도 %.4f, 경도 %.4f\n", lat, lng));
        }
        if (data == null) {
            sb.append("[공공데이터 없음 — 위치 기반 일반 안내 제공]\n");
            sb.append("\n[사용자 유형]: ").append(userType).append("\n");
            sb.append(getUserTypeInstruction(userType));
            return sb.toString();
        }

        TaxiDto taxi = data.getTaxi();
        if (taxi != null) {
            sb.append(String.format("콜택시: 가용 %s대, 대기 %s건, 휠체어 가능 %d대\n",
                    taxi.getAvailableVehicleCount(), taxi.getWaitingCount(),
                    taxi.getWheelchairCapableVehicles()));
        }

        BusDto bus = data.getBus();
        if (bus != null && bus.getNearestStop() != null) {
            sb.append(String.format("가장 가까운 정류소: %s (%.0fm)\n",
                    bus.getNearestStop().getStopName(), bus.getNearestStop().getDistanceM()));
            if (bus.getArrivals() != null && !bus.getArrivals().isEmpty()) {
                for (BusDto.ArrivalInfo info : bus.getArrivals()) {
                    sb.append(String.format("버스 %s: 정류소까지 %.0fm 위치\n",
                            info.getRouteNo(), info.getDistanceFromStopM()));
                }
            }
        }

        SignalDto signal = data.getSignal();
        if (signal != null) {
            sb.append(String.format("신호등(%s): %s, 잔여 %d초\n",
                    signal.getCrossroadName(), signal.getBestPedestrianStatus(),
                    signal.getBestPedestrianRemainSec()));
        }

        sb.append("\n[사용자 유형]: ").append(userType).append("\n");
        sb.append(getUserTypeInstruction(userType));
        return sb.toString();
    }

    private String getUserTypeInstruction(String userType) {
        return switch (userType) {
            case "WHEELCHAIR" -> "휠체어 수용 콜택시를 최우선으로 안내하세요. 저상버스가 대안입니다.";
            case "VISUAL" -> "콜택시를 우선 안내하고, 버스 이용 시 거리·방향을 구체적으로 알려주세요.";
            case "HEARING" -> "버스를 우선 안내하고, 시각적 확인 방법을 강조하세요.";
            case "ELDERLY" -> "핵심 1가지만, 쉬운 단어로 안내하세요.";
            case "STROLLER" -> "저상버스를 우선 안내하세요.";
            default -> "";
        };
    }
}
