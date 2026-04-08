package com.moove.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.moove.dto.SignalDto;
import com.moove.entity.ApiCache;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import okhttp3.HttpUrl;
import okhttp3.OkHttpClient;
import okhttp3.Request;
import okhttp3.Response;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.util.ArrayList;
import java.util.List;
import java.util.Objects;
import java.util.Optional;

@Slf4j
@Service
@RequiredArgsConstructor
public class SignalService {

    private static final String BASE_URL = "https://apis.data.go.kr";
    private static final String SIGNAL_PATH = "/B551982/rti/tl_drct_info";
    private static final String CROSSROAD_PATH = "/B551982/rti/crsrd_map_info";

    // 개발 가이드: 신호등은 AI 컨텍스트 전용, 지도 마커 없음
    private static final String STATUS_WALK = "protected-Movement-Allowed";
    private static final String STATUS_STOP = "stop-And-Remain";

    private final OkHttpClient httpClient;
    private final ObjectMapper objectMapper;
    private final CacheService cacheService;

    @Value("${public.data.api-key}")
    private String apiKey;

    public SignalDto getSignalInfo(double userLat, double userLng, String stdgCd) {
        String cacheKey = "signal:" + stdgCd;
        Optional<SignalDto> cached = cacheService.get(cacheKey, SignalDto.class);
        if (cached.isPresent()) {
            log.debug("신호등 캐시 히트: stdgCd={}", stdgCd);
            return cached.get();
        }

        try {
            SignalDto dto = fetchSignalInfo(userLat, userLng, stdgCd);
            cacheService.put(cacheKey, ApiCache.DataType.SIGNAL, dto, stdgCd);
            return dto;
        } catch (Exception e) {
            log.error("신호등 API 호출 실패: stdgCd={}", stdgCd, e);
            return cached.orElseGet(SignalDto::new);
        }
    }

    private SignalDto fetchSignalInfo(double userLat, double userLng, String stdgCd) throws IOException {
        // 교차로 목록 조회
        List<CrossroadInfo> crossroads = fetchCrossroads(stdgCd);
        if (crossroads.isEmpty()) {
            return new SignalDto();
        }

        // 가장 가까운 교차로
        CrossroadInfo nearest = crossroads.stream()
                .min((a, b) -> Double.compare(
                        BusService.haversineDistanceM(userLat, userLng, a.lat, a.lng),
                        BusService.haversineDistanceM(userLat, userLng, b.lat, b.lng)))
                .orElse(crossroads.get(0));

        // 신호 잔여시간 조회
        return fetchSignalStatus(nearest);
    }

    private List<CrossroadInfo> fetchCrossroads(String stdgCd) throws IOException {
        HttpUrl url = Objects.requireNonNull(HttpUrl.parse(BASE_URL + CROSSROAD_PATH))
                .newBuilder()
                .addQueryParameter("serviceKey", apiKey)
                .addQueryParameter("stdgCd", stdgCd)
                .addQueryParameter("numOfRows", "50")
                .addQueryParameter("type", "json")
                .build();

        String body = executeGet(url);
        log.info("교차로 API 응답: {}", body);
        JsonNode root = objectMapper.readTree(body);
        JsonNode items = root.path("body").path("items").path("item");

        List<CrossroadInfo> list = new ArrayList<>();
        if (items.isArray()) {
            for (JsonNode item : items) list.add(parseCrossroad(item));
        } else if (!items.isMissingNode()) {
            list.add(parseCrossroad(items));
        }
        return list;
    }

    private SignalDto fetchSignalStatus(CrossroadInfo crossroad) throws IOException {
        HttpUrl url = Objects.requireNonNull(HttpUrl.parse(BASE_URL + SIGNAL_PATH))
                .newBuilder()
                .addQueryParameter("serviceKey", apiKey)
                .addQueryParameter("crsrdId", crossroad.id)
                .addQueryParameter("type", "json")
                .build();

        String body = executeGet(url);
        JsonNode root = objectMapper.readTree(body);
        JsonNode items = root.path("body").path("items").path("item");
        JsonNode item = items.isArray() && items.size() > 0 ? items.get(0) : items;

        SignalDto dto = new SignalDto();
        dto.setCrossroadName(crossroad.name);

        // 개발 가이드 6장: 센티초(1/100초) → 100으로 나눔
        int bestRemainSec = 0;
        String bestStatus = "";

        String[] dirPrefixes = {"et", "wt", "nt", "st"};
        for (String dir : dirPrefixes) {
            String statusRaw = item.path(dir + "PdsgSttsNm").asText("");
            if (statusRaw.isBlank()) continue; // 빈 문자열: 해당 방향 신호 없음

            String statusText = translateStatus(statusRaw);
            String rmndCsStr = item.path(dir + "PdsgRmndCs").asText("0");
            int remainSec = 0;
            try {
                remainSec = Integer.parseInt(rmndCsStr) / 100;
            } catch (NumberFormatException ignored) {}

            if (STATUS_WALK.equals(statusRaw) && remainSec > bestRemainSec) {
                bestRemainSec = remainSec;
                bestStatus = statusText;
            } else if (bestStatus.isBlank()) {
                bestRemainSec = remainSec;
                bestStatus = statusText;
            }
        }

        dto.setBestPedestrianRemainSec(bestRemainSec);
        dto.setBestPedestrianStatus(bestStatus);
        return dto;
    }

    private String translateStatus(String raw) {
        return switch (raw) {
            case STATUS_WALK -> "보행 가능";
            case STATUS_STOP -> "정지중";
            default -> raw;
        };
    }

    private CrossroadInfo parseCrossroad(JsonNode item) {
        CrossroadInfo c = new CrossroadInfo();
        c.id = item.path("crsrdId").asText("");
        c.name = item.path("crsrdNm").asText("");
        c.lat = item.path("mapCtptIntLat").asDouble();
        c.lng = item.path("mapCtptIntLot").asDouble();
        return c;
    }

    private String executeGet(HttpUrl url) throws IOException {
        log.info("신호등 API 요청 URL: {}", url);
        Request request = new Request.Builder().url(url).get().build();
        try (Response response = httpClient.newCall(request).execute()) {
            String body = Objects.requireNonNull(response.body()).string();
            if (!response.isSuccessful()) {
                log.error("신호등 API 응답 실패 {}: {}", response.code(), body);
                throw new IOException("HTTP " + response.code());
            }
            return body;
        }
    }

    private static class CrossroadInfo {
        String id;
        String name;
        double lat;
        double lng;
    }
}
