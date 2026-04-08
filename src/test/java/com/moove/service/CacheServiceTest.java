package com.moove.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.moove.dto.TaxiDto;
import com.moove.entity.ApiCache;
import com.moove.repository.ApiCacheRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.Spy;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.verify;

@ExtendWith(MockitoExtension.class)
class CacheServiceTest {

    @Mock
    private ApiCacheRepository apiCacheRepository;

    @Spy
    private ObjectMapper objectMapper = new ObjectMapper();

    @InjectMocks
    private CacheService cacheService;

    @Test
    @DisplayName("캐시 미스 시 empty 반환")
    void get_cacheMiss_returnsEmpty() {
        given(apiCacheRepository.findByCacheKey("taxi:11110")).willReturn(Optional.empty());

        Optional<TaxiDto> result = cacheService.get("taxi:11110", TaxiDto.class);

        assertThat(result).isEmpty();
    }

    @Test
    @DisplayName("만료된 캐시는 empty 반환")
    void get_expiredCache_returnsEmpty() {
        ApiCache expired = ApiCache.of("taxi:11110", ApiCache.DataType.TAXI, "{}", "11110", -1);
        given(apiCacheRepository.findByCacheKey("taxi:11110")).willReturn(Optional.of(expired));

        Optional<TaxiDto> result = cacheService.get("taxi:11110", TaxiDto.class);

        assertThat(result).isEmpty();
    }

    @Test
    @DisplayName("새 캐시 저장 시 save 호출")
    void put_newCache_callsSave() {
        TaxiDto dto = new TaxiDto();
        dto.setCenterName("테스트센터");
        given(apiCacheRepository.findByCacheKey(any())).willReturn(Optional.empty());

        cacheService.put("taxi:11110", ApiCache.DataType.TAXI, dto, "11110");

        ArgumentCaptor<ApiCache> captor = ArgumentCaptor.forClass(ApiCache.class);
        verify(apiCacheRepository).save(captor.capture());
        assertThat(captor.getValue().getCacheKey()).isEqualTo("taxi:11110");
    }
}
