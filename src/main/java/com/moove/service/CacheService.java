package com.moove.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.moove.entity.ApiCache;
import com.moove.repository.ApiCacheRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Optional;

@Slf4j
@Service
@RequiredArgsConstructor
public class CacheService {

    private static final int CACHE_TTL_MINUTES = 5;

    private final ApiCacheRepository apiCacheRepository;
    private final ObjectMapper objectMapper;

    @Transactional(readOnly = true)
    public <T> Optional<T> get(String cacheKey, Class<T> type) {
        return apiCacheRepository.findByCacheKey(cacheKey)
                .filter(c -> !c.isExpired())
                .map(c -> {
                    try {
                        return objectMapper.readValue(c.getResponseData(), type);
                    } catch (JsonProcessingException e) {
                        log.warn("캐시 역직렬화 실패: key={}", cacheKey, e);
                        return null;
                    }
                });
    }

    @Transactional
    public <T> void put(String cacheKey, ApiCache.DataType dataType, T data, String regionCode) {
        try {
            String json = objectMapper.writeValueAsString(data);
            apiCacheRepository.findByCacheKey(cacheKey).ifPresentOrElse(
                    existing -> existing.refresh(json, CACHE_TTL_MINUTES),
                    () -> apiCacheRepository.save(
                            ApiCache.of(cacheKey, dataType, json, regionCode, CACHE_TTL_MINUTES))
            );
        } catch (JsonProcessingException e) {
            log.warn("캐시 직렬화 실패: key={}", cacheKey, e);
        }
    }

    @Transactional
    public void evictExpired() {
        apiCacheRepository.deleteExpired(LocalDateTime.now());
    }
}
