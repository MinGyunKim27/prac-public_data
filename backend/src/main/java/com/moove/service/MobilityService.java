package com.moove.service;

import com.moove.dto.BusDto;
import com.moove.dto.MobilityResponse;
import com.moove.dto.SignalDto;
import com.moove.dto.TaxiDto;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.concurrent.CompletableFuture;

@Slf4j
@Service
@RequiredArgsConstructor
public class MobilityService {

    private final TaxiService taxiService;
    private final BusService busService;
    private final SignalService signalService;

    public MobilityResponse getMobility(double lat, double lng, String stdgCd) {
        try {
            CompletableFuture<TaxiDto> taxiFuture = CompletableFuture.supplyAsync(
                    () -> taxiService.getTaxiStatus(stdgCd));
            CompletableFuture<BusDto> busFuture = CompletableFuture.supplyAsync(
                    () -> busService.getBusInfo(lat, lng, stdgCd));
            CompletableFuture<SignalDto> signalFuture = CompletableFuture.supplyAsync(
                    () -> signalService.getSignalInfo(lat, lng, stdgCd));

            CompletableFuture.allOf(taxiFuture, busFuture, signalFuture).join();
            return MobilityResponse.ok(taxiFuture.get(), busFuture.get(), signalFuture.get());
        } catch (Exception e) {
            log.error("통합 모빌리티 조회 실패: lat={}, lng={}, stdgCd={}", lat, lng, stdgCd, e);
            return MobilityResponse.error("데이터 조회에 실패했습니다. 잠시 후 다시 시도해주세요.");
        }
    }
}
