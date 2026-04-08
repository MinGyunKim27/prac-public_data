package com.moove.controller;

import com.moove.dto.MobilityResponse;
import com.moove.service.MobilityService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.test.web.servlet.MockMvc;

import static org.mockito.BDDMockito.given;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(MobilityController.class)
class MobilityControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private MobilityService mobilityService;

    @Test
    @DisplayName("GET /api/mobility - 정상 응답")
    void getMobility_returnsOk() throws Exception {
        given(mobilityService.getMobility(37.5665, 126.9780, "11110"))
                .willReturn(MobilityResponse.ok(null, null, null));

        mockMvc.perform(get("/api/mobility")
                        .param("lat", "37.5665")
                        .param("lng", "126.9780")
                        .param("stdgCd", "11110"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));
    }

    @Test
    @DisplayName("GET /api/mobility - 필수 파라미터 누락 시 400")
    void getMobility_missingParams_returns400() throws Exception {
        mockMvc.perform(get("/api/mobility")
                        .param("lat", "37.5665"))
                .andExpect(status().isBadRequest());
    }
}
