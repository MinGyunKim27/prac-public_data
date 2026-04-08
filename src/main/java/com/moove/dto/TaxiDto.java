package com.moove.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.Data;

@Data
@JsonIgnoreProperties(ignoreUnknown = true)
public class TaxiDto {
    private String centerName;
    private String availableVehicleCount;
    private String waitingCount;
    private int wheelchairCapableVehicles;
}
