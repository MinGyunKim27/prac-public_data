package com.moove.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table(name = "api_cache", indexes = {
        @Index(name = "idx_cache_key", columnList = "cache_key"),
        @Index(name = "idx_expires_at", columnList = "expires_at")
})
@Getter
@NoArgsConstructor
public class ApiCache {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "cache_id")
    private Long cacheId;

    @Column(name = "cache_key", nullable = false, unique = true, length = 128)
    private String cacheKey;

    @Enumerated(EnumType.STRING)
    @Column(name = "data_type", nullable = false, length = 10)
    private DataType dataType;

    @Column(name = "response_data", nullable = false, columnDefinition = "JSON")
    private String responseData;

    @Column(name = "region_code", nullable = false, length = 10)
    private String regionCode;

    @Column(name = "cached_at", nullable = false)
    private LocalDateTime cachedAt;

    @Column(name = "expires_at", nullable = false)
    private LocalDateTime expiresAt;

    public enum DataType {
        TAXI, BUS, SIGNAL
    }

    public static ApiCache of(String cacheKey, DataType dataType, String responseData,
                               String regionCode, int ttlMinutes) {
        ApiCache c = new ApiCache();
        c.cacheKey = cacheKey;
        c.dataType = dataType;
        c.responseData = responseData;
        c.regionCode = regionCode;
        c.cachedAt = LocalDateTime.now();
        c.expiresAt = LocalDateTime.now().plusMinutes(ttlMinutes);
        return c;
    }

    public boolean isExpired() {
        return LocalDateTime.now().isAfter(this.expiresAt);
    }

    public void refresh(String responseData, int ttlMinutes) {
        this.responseData = responseData;
        this.cachedAt = LocalDateTime.now();
        this.expiresAt = LocalDateTime.now().plusMinutes(ttlMinutes);
    }
}
