package com.moove.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.Data;

@Data
@JsonIgnoreProperties(ignoreUnknown = true)
public class SignalDto {
    private String crossroadName;
    private int bestPedestrianRemainSec;
    private String bestPedestrianStatus;
}
