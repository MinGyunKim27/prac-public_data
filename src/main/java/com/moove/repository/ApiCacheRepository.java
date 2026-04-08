package com.moove.repository;

import com.moove.entity.ApiCache;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Optional;

public interface ApiCacheRepository extends JpaRepository<ApiCache, Long> {

    Optional<ApiCache> findByCacheKey(String cacheKey);

    @Modifying
    @Transactional
    @Query("DELETE FROM ApiCache c WHERE c.expiresAt < :now")
    void deleteExpired(LocalDateTime now);
}
