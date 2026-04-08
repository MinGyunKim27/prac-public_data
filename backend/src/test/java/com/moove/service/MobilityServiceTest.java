package com.moove.service;

import com.moove.dto.BusDto;
import com.moove.dto.MobilityResponse;
import com.moove.dto.SignalDto;
import com.moove.dto.TaxiDto;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.BDDMockito.given;

@ExtendWith(MockitoExtension.class)
class MobilityServiceTest {

    @Mock
    private TaxiService taxiService;
    @Mock
    private BusService busService;
    @Mock
    private SignalService signalService;

    @InjectMocks
    private MobilityService mobilityService;

    @Test
    @DisplayName("통합 현황 조회 성공")
    void getMobility_success() {
        TaxiDto taxi = new TaxiDto();
        taxi.setCenterName("서울시 교통약자이동지원센터");
        taxi.setAvailableVehicleCount("3");
        taxi.setWaitingCount("2");
        taxi.setWheelchairCapableVehicles(5);

        BusDto bus = new BusDto();
        SignalDto signal = new SignalDto();
        signal.setCrossroadName("시청앞 교차로");
        signal.setBestPedestrianRemainSec(22);
        signal.setBestPedestrianStatus("보행 가능");

        given(taxiService.getTaxiStatus("11110")).willReturn(taxi);
        given(busService.getBusInfo(37.5665, 126.9780, "11110")).willReturn(bus);
        given(signalService.getSignalInfo(37.5665, 126.9780, "11110")).willReturn(signal);

        MobilityResponse result = mobilityService.getMobility(37.5665, 126.9780, "11110");

        assertThat(result.isSuccess()).isTrue();
        assertThat(result.getData().getTaxi().getCenterName()).isEqualTo("서울시 교통약자이동지원센터");
        assertThat(result.getData().getSignal().getBestPedestrianRemainSec()).isEqualTo(22);
    }

    @Test
    @DisplayName("서비스 예외 발생 시 에러 응답 반환")
    void getMobility_whenServiceThrows_returnsError() {
        given(taxiService.getTaxiStatus("11110")).willThrow(new RuntimeException("API 오류"));

        MobilityResponse result = mobilityService.getMobility(37.5665, 126.9780, "11110");

        assertThat(result.isSuccess()).isFalse();
        assertThat(result.getError()).isNotBlank();
    }
}
