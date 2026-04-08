package com.moove.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.Data;

import java.util.List;

@Data
@JsonIgnoreProperties(ignoreUnknown = true)
public class BusDto {

    private NearestStop nearestStop;
    private List<ArrivalInfo> arrivals;

    @Data
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class NearestStop {
        private String stopName;
        private double distanceM;
    }

    @Data
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class ArrivalInfo {
        private String routeNo;
        private double busLat;
        private double busLon;
        private double distanceFromStopM;
    }
}
