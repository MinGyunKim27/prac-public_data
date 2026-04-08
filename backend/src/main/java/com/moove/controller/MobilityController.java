package com.moove.controller;

import com.moove.dto.MobilityResponse;
import com.moove.service.MobilityService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/mobility")
@RequiredArgsConstructor
public class MobilityController {

    private final MobilityService mobilityService;

    /**
     * GET /api/mobility?lat=&lng=&stdgCd=
     * 공공데이터 3종 통합 현황 조회
     */
    @GetMapping
    public ResponseEntity<MobilityResponse> getMobility(
            @RequestParam double lat,
            @RequestParam double lng,
            @RequestParam String stdgCd) {

        MobilityResponse response = mobilityService.getMobility(lat, lng, stdgCd);
        return ResponseEntity.ok(response);
    }
}
