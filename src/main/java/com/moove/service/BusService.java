package com.moove.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.moove.dto.BusDto;
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
import java.util.Comparator;
import java.util.List;
import java.util.Objects;
import java.util.Optional;

@Slf4j
@Service
@RequiredArgsConstructor
public class BusService {

    private static final String BASE_URL = "https://apis.data.go.kr";
    private static final String BUS_LOC_PATH = "/B551982/rte/rtm_loc_info";
    private static final String STOP_PATH = "/B551982/rte/ps_info";

    private final OkHttpClient httpClient;
    private final ObjectMapper objectMapper;
    private final CacheService cacheService;

    @Value("${public.data.api-key}")
    private String apiKey;

    public BusDto getBusInfo(double userLat, double userLng, String stdgCd) {
        String cacheKey = "bus:" + stdgCd;
        Optional<BusDto> cached = cacheService.get(cacheKey, BusDto.class);
        if (cached.isPresent()) {
            log.debug("버스 캐시 히트: stdgCd={}", stdgCd);
            return cached.get();
        }

        try {
            BusDto dto = fetchBusInfo(userLat, userLng, stdgCd);
            cacheService.put(cacheKey, ApiCache.DataType.BUS, dto, stdgCd);
            return dto;
        } catch (Exception e) {
            log.error("버스 API 호출 실패: stdgCd={}", stdgCd, e);
            return cached.orElseGet(BusDto::new);
        }
    }

    private BusDto fetchBusInfo(double userLat, double userLng, String stdgCd) throws IOException {
        // 정류소 목록 조회
        List<StopInfo> stops = fetchNearbyStops(stdgCd);
        if (stops.isEmpty()) {
            return new BusDto();
        }

        // 가장 가까운 정류소 찾기
        StopInfo nearestStop = stops.stream()
                .min(Comparator.comparingDouble(s -> haversineDistanceM(userLat, userLng, s.lat, s.lng)))
                .orElse(stops.get(0));

        double distM = haversineDistanceM(userLat, userLng, nearestStop.lat, nearestStop.lng);

        // 버스 실시간 위치 조회 → 도착시간 추정
        List<BusDto.ArrivalInfo> arrivals = fetchArrivals(nearestStop, stdgCd);

        BusDto.NearestStop nearestStopDto = new BusDto.NearestStop();
        nearestStopDto.setStopName(nearestStop.name);
        nearestStopDto.setDistanceM(Math.round(distM * 10.0) / 10.0);

        BusDto dto = new BusDto();
        dto.setNearestStop(nearestStopDto);
        dto.setArrivals(arrivals);
        return dto;
    }

    private List<StopInfo> fetchNearbyStops(String stdgCd) throws IOException {
        HttpUrl url = Objects.requireNonNull(HttpUrl.parse(BASE_URL + STOP_PATH))
                .newBuilder()
                .addQueryParameter("serviceKey", apiKey)
                .addQueryParameter("stdgCd", stdgCd)
                .addQueryParameter("numOfRows", "50")
                .addQueryParameter("type", "json")
                .build();

        String body = executeGet(url);
        log.info("버스 정류소 API 응답: {}", body);
        JsonNode root = objectMapper.readTree(body);
        JsonNode items = root.path("body").path("items").path("item");

        List<StopInfo> stops = new ArrayList<>();
        if (items.isArray()) {
            for (JsonNode item : items) {
                stops.add(parseStop(item));
            }
        } else if (!items.isMissingNode()) {
            stops.add(parseStop(items));
        }
        return stops;
    }

    private List<BusDto.ArrivalInfo> fetchArrivals(StopInfo stop, String stdgCd) throws IOException {
        HttpUrl url = Objects.requireNonNull(HttpUrl.parse(BASE_URL + BUS_LOC_PATH))
                .newBuilder()
                .addQueryParameter("serviceKey", apiKey)
                .addQueryParameter("stdgCd", stdgCd)
                .addQueryParameter("numOfRows", "50")
                .addQueryParameter("type", "json")
                .build();

        String body = executeGet(url);
        JsonNode root = objectMapper.readTree(body);
        JsonNode items = root.path("body").path("items").path("item");

        List<BusDto.ArrivalInfo> arrivals = new ArrayList<>();
        if (items.isArray()) {
            for (JsonNode item : items) {
                BusDto.ArrivalInfo info = parseBusLocation(item, stop);
                if (info != null) arrivals.add(info);
            }
        } else if (!items.isMissingNode()) {
            BusDto.ArrivalInfo info = parseBusLocation(items, stop);
            if (info != null) arrivals.add(info);
        }

        // 정류소에 가장 가까운 버스 순으로 정렬, 노선별 1대만
        arrivals.sort(Comparator.comparingDouble(BusDto.ArrivalInfo::getDistanceFromStopM));
        java.util.LinkedHashMap<String, BusDto.ArrivalInfo> deduped = new java.util.LinkedHashMap<>();
        for (BusDto.ArrivalInfo a : arrivals) {
            deduped.putIfAbsent(a.getRouteNo(), a);
        }
        return deduped.values().stream().limit(5).toList();
    }

    private BusDto.ArrivalInfo parseBusLocation(JsonNode item, StopInfo stop) {
        try {
            double busLat = item.path("lat").asDouble();
            double busLng = item.path("lot").asDouble();
            String routeNo = item.path("rteNo").asText("");

            if (routeNo.isBlank()) return null;

            double distM = haversineDistanceM(busLat, busLng, stop.lat, stop.lng);

            BusDto.ArrivalInfo info = new BusDto.ArrivalInfo();
            info.setRouteNo(routeNo);
            info.setBusLat(busLat);
            info.setBusLon(busLng);
            info.setDistanceFromStopM(Math.round(distM * 10.0) / 10.0);
            return info;
        } catch (Exception e) {
            return null;
        }
    }

    private StopInfo parseStop(JsonNode item) {
        StopInfo s = new StopInfo();
        s.id = item.path("bstaId").asText("");
        s.name = item.path("bstaNm").asText("");
        s.lat = item.path("bstaLat").asDouble();
        s.lng = item.path("bstaLot").asDouble();
        return s;
    }

    // Haversine 공식으로 두 좌표 간 거리(m) 계산
    public static double haversineDistanceM(double lat1, double lon1, double lat2, double lon2) {
        double R = 6371000;
        double dLat = Math.toRadians(lat2 - lat1);
        double dLon = Math.toRadians(lon2 - lon1);
        double a = Math.sin(dLat / 2) * Math.sin(dLat / 2)
                + Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians(lat2))
                * Math.sin(dLon / 2) * Math.sin(dLon / 2);
        double c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    }

    private String executeGet(HttpUrl url) throws IOException {
        log.info("버스 API 요청 URL: {}", url);
        Request request = new Request.Builder().url(url).get().build();
        try (Response response = httpClient.newCall(request).execute()) {
            String body = Objects.requireNonNull(response.body()).string();
            if (!response.isSuccessful()) {
                log.error("버스 API 응답 실패 {}: {}", response.code(), body);
                throw new IOException("HTTP " + response.code());
            }
            return body;
        }
    }

    private static class StopInfo {
        String id;
        String name;
        double lat;
        double lng;
    }
}
