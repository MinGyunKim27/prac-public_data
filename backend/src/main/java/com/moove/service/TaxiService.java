package com.moove.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.moove.dto.TaxiDto;
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
import java.util.Objects;
import java.util.Optional;

@Slf4j
@Service
@RequiredArgsConstructor
public class TaxiService {

    private static final String BASE_URL = "https://apis.data.go.kr";
    private static final String STATUS_PATH = "/B551982/tsdo_v2/info_vehicle_use_v2";
    private static final String VEHICLE_PATH = "/B551982/tsdo_v2/info_vehicle_v2";
    private static final String CENTER_PATH = "/B551982/tsdo_v2/center_info_v2";

    private final OkHttpClient httpClient;
    private final ObjectMapper objectMapper;
    private final CacheService cacheService;

    @Value("${public.data.api-key}")
    private String apiKey;

    public TaxiDto getTaxiStatus(String stdgCd) {
        String cacheKey = "taxi:" + stdgCd;
        Optional<TaxiDto> cached = cacheService.get(cacheKey, TaxiDto.class);
        if (cached.isPresent()) {
            log.debug("택시 캐시 히트: stdgCd={}", stdgCd);
            return cached.get();
        }

        try {
            TaxiDto dto = fetchTaxiStatus(stdgCd);
            cacheService.put(cacheKey, ApiCache.DataType.TAXI, dto, stdgCd);
            return dto;
        } catch (Exception e) {
            log.error("택시 API 호출 실패: stdgCd={}", stdgCd, e);
            return cached.orElseGet(TaxiDto::new);
        }
    }

    private TaxiDto fetchTaxiStatus(String stdgCd) throws IOException {
        HttpUrl url = Objects.requireNonNull(HttpUrl.parse(BASE_URL + STATUS_PATH))
                .newBuilder()
                .addQueryParameter("serviceKey", apiKey)
                .addQueryParameter("stdgCd", stdgCd)
                .addQueryParameter("numOfRows", "1")
                .addQueryParameter("type", "json")
                .build();

        String body = executeGet(url);
        log.info("택시 API 응답: {}", body);
        JsonNode root = objectMapper.readTree(body);
        JsonNode item = parseSingleItem(root.path("body").path("item"));

        TaxiDto dto = new TaxiDto();
        dto.setCenterName(item.path("cntrNm").asText(""));
        dto.setAvailableVehicleCount(item.path("avlVhclCntom").asText("0"));
        dto.setWaitingCount(item.path("wtngNocs").asText("0"));
        dto.setWheelchairCapableVehicles(fetchWheelchairCount(stdgCd));
        return dto;
    }

    private int fetchWheelchairCount(String stdgCd) {
        try {
            HttpUrl url = Objects.requireNonNull(HttpUrl.parse(BASE_URL + VEHICLE_PATH))
                    .newBuilder()
                    .addQueryParameter("serviceKey", apiKey)
                    .addQueryParameter("stdgCd", stdgCd)
                    .addQueryParameter("numOfRows", "100")
                    .addQueryParameter("type", "json")
                    .build();

            String body = executeGet(url);
            JsonNode root = objectMapper.readTree(body);
            JsonNode items = root.path("body").path("item");

            if (items.isArray()) {
                int count = 0;
                for (JsonNode item : items) {
                    int wchr = item.path("wchrActcCntom").asInt(0);
                    if (wchr > 0) count++;
                }
                return count;
            } else if (!items.isMissingNode()) {
                return items.path("wchrActcCntom").asInt(0) > 0 ? 1 : 0;
            }
        } catch (Exception e) {
            log.warn("휠체어 차량 수 조회 실패: stdgCd={}", stdgCd, e);
        }
        return 0;
    }

    private String executeGet(HttpUrl url) throws IOException {
        log.info("택시 API 요청 URL: {}", url);
        Request request = new Request.Builder().url(url).get().build();
        try (Response response = httpClient.newCall(request).execute()) {
            String body = Objects.requireNonNull(response.body()).string();
            if (!response.isSuccessful()) {
                log.error("택시 API 응답 실패 {}: {}", response.code(), body);
                throw new IOException("HTTP " + response.code());
            }
            return body;
        }
    }

    // 개발 가이드 6장: item 단건/복수 분기 필수
    private JsonNode parseSingleItem(JsonNode node) {
        if (node.isArray() && node.size() > 0) {
            return node.get(0);
        }
        return node;
    }
}
