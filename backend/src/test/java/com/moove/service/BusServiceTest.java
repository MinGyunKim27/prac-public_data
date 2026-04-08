package com.moove.service;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.within;

class BusServiceTest {

    @Test
    @DisplayName("haversine 거리 계산 - 서울시청 근방 두 점")
    void haversineDistance_shouldBeAccurate() {
        // 서울시청 (37.5665, 126.9780) ~ 광화문 (37.5759, 126.9769) 약 1km
        double dist = BusService.haversineDistanceM(37.5665, 126.9780, 37.5759, 126.9769);
        assertThat(dist).isCloseTo(1050.0, within(200.0));
    }

    @Test
    @DisplayName("haversine 거리 계산 - 동일 좌표는 0")
    void haversineDistance_samePoint_isZero() {
        double dist = BusService.haversineDistanceM(37.5665, 126.9780, 37.5665, 126.9780);
        assertThat(dist).isCloseTo(0.0, within(0.01));
    }
}
