package com.moove.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.Data;

public class ChatDto {

    @Data
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class SessionCreateRequest {
        private String deviceId;
    }

    @Data
    public static class SessionCreateResponse {
        private Long sessionId;
        private String deviceId;

        public SessionCreateResponse(Long sessionId, String deviceId) {
            this.sessionId = sessionId;
            this.deviceId = deviceId;
        }
    }

    @Data
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class ChatRequest {
        private Long sessionId;
        private String userType;
        private String message;
        private double lat;
        private double lng;
        private String stdgCd;
    }
}
