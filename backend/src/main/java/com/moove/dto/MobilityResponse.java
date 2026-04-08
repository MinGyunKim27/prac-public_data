package com.moove.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@Builder
@JsonInclude(JsonInclude.Include.NON_NULL)
public class MobilityResponse {

    private boolean success;
    private Data data;
    private String error;

    @lombok.Data
    @Builder
    @JsonInclude(JsonInclude.Include.NON_NULL)
    public static class Data {
        private TaxiDto taxi;
        private BusDto bus;
        private SignalDto signal;
        private LocalDateTime cachedAt;
    }

    public static MobilityResponse ok(TaxiDto taxi, BusDto bus, SignalDto signal) {
        return MobilityResponse.builder()
                .success(true)
                .data(Data.builder()
                        .taxi(taxi)
                        .bus(bus)
                        .signal(signal)
                        .build())
                .build();
    }

    public static MobilityResponse cached(TaxiDto taxi, BusDto bus, SignalDto signal, LocalDateTime cachedAt) {
        return MobilityResponse.builder()
                .success(true)
                .data(Data.builder()
                        .taxi(taxi)
                        .bus(bus)
                        .signal(signal)
                        .cachedAt(cachedAt)
                        .build())
                .build();
    }

    public static MobilityResponse error(String message) {
        return MobilityResponse.builder()
                .success(false)
                .error(message)
                .build();
    }
}
