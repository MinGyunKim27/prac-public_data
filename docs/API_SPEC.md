# MOOVE API 명세서

프론트엔드와 백엔드 협업을 위한 현재 기준 API 문서입니다.

기본 주소:

```text
http://localhost:8080
```

## 공통 사항

- 응답 포맷은 REST와 SSE가 섞여 있습니다.
- REST API는 JSON을 반환합니다.
- AI 관련 API는 `text/event-stream` 기반 SSE를 반환합니다.
- `userType` 허용 값:
  - `WHEELCHAIR`
  - `VISUAL`
  - `HEARING`
  - `ELDERLY`
  - `STROLLER`

## 1. 통합 이동 정보 조회

### `GET /api/mobility`

교통약자이동지원, 버스, 신호등 정보를 통합 조회합니다.

#### Query Parameters

| 이름 | 타입 | 필수 | 설명 |
|---|---|---|---|
| `lat` | `double` | Y | 사용자 위도 |
| `lng` | `double` | Y | 사용자 경도 |
| `stdgCd` | `string` | Y | 10자리 행정동 코드 |

#### 요청 예시

```http
GET /api/mobility?lat=35.1595&lng=126.8526&stdgCd=2917010600
```

#### 응답 예시

```json
{
  "success": true,
  "data": {
    "taxi": {
      "centerName": "광주 교통약자이동지원센터",
      "availableVehicleCount": "3",
      "waitingCount": "2",
      "wheelchairCapableVehicles": 5
    },
    "bus": {
      "nearestStop": {
        "stopName": "시청 정류장",
        "distanceM": 132.4
      },
      "arrivals": [
        {
          "routeNo": "지원15",
          "busLat": 35.1601,
          "busLon": 126.8518,
          "distanceFromStopM": 84.2
        }
      ]
    },
    "signal": {
      "crossroadName": "시청 사거리",
      "bestPedestrianRemainSec": 18,
      "bestPedestrianStatus": "보행 가능"
    }
  }
}
```

#### 실패 응답 예시

```json
{
  "success": false,
  "error": "데이터 조회에 실패했습니다. 잠시 후 다시 시도해주세요."
}
```

## 2. AI 이동 추천 스트리밍

### `GET /api/ai/recommend`

사용자 위치, 행정동 코드, 사용자 유형을 바탕으로 AI 이동 추천을 SSE로 반환합니다.

#### Query Parameters

| 이름 | 타입 | 필수 | 설명 |
|---|---|---|---|
| `lat` | `double` | Y | 사용자 위도 |
| `lng` | `double` | Y | 사용자 경도 |
| `stdgCd` | `string` | Y | 10자리 행정동 코드 |
| `userType` | `string` | Y | 사용자 유형 |

#### 요청 예시

```http
GET /api/ai/recommend?lat=35.1595&lng=126.8526&stdgCd=2917010600&userType=ELDERLY
Accept: text/event-stream
```

#### SSE 응답 예시

```text
data: 지금은 콜택시 대기와 버스 접근성을 함께 확인하는 것이 좋습니다.

data: 가까운 정류장이 100m 안쪽이라면 버스를 먼저 검토하고,

data: 횡단보도 보행 가능 시간이 짧으면 다음 신호를 기다리도록 안내하세요.

event: done
data: [DONE]
```

## 3. 챗봇 세션 생성

### `POST /api/chat/sessions`

챗봇 대화 세션을 생성합니다.

#### Request Body

```json
{
  "deviceId": "web-local-device-001"
}
```

#### 응답 예시

```json
{
  "sessionId": 1,
  "deviceId": "web-local-device-001"
}
```

## 4. AI 챗봇 스트리밍

### `POST /api/ai/chat`

이전 대화 이력과 현재 위치 정보를 반영한 AI 챗봇 응답을 SSE로 반환합니다.

#### Request Body

```json
{
  "sessionId": 1,
  "message": "강남역 어떻게 가?",
  "userType": "ELDERLY",
  "lat": 35.06,
  "lng": 126.52,
  "stdgCd": "4682025300"
}
```

#### 요청 헤더

```http
Content-Type: application/json
Accept: text/event-stream
```

#### SSE 응답 예시

```text
data: 현재 위치 기준으로는

data: 저상버스가 더 가까우면 버스를 먼저 이용하는 것이 좋습니다.

data: 횡단보도 신호 시간이 짧으면 무리하지 말고 다음 신호를 기다리세요.

event: done
data: [DONE]
```

## DTO 기준 응답 필드

### MobilityResponse

| 필드 | 타입 | 설명 |
|---|---|---|
| `success` | `boolean` | 성공 여부 |
| `data` | `object` | 성공 시 데이터 |
| `error` | `string` | 실패 시 메시지 |

### TaxiDto

| 필드 | 타입 | 설명 |
|---|---|---|
| `centerName` | `string` | 센터 이름 |
| `availableVehicleCount` | `string` | 가용 차량 수 |
| `waitingCount` | `string` | 대기 건수 |
| `wheelchairCapableVehicles` | `int` | 휠체어 탑승 가능 차량 수 |

### BusDto

| 필드 | 타입 | 설명 |
|---|---|---|
| `nearestStop.stopName` | `string` | 가장 가까운 정류장 이름 |
| `nearestStop.distanceM` | `double` | 정류장까지 거리(m) |
| `arrivals[].routeNo` | `string` | 버스 노선 번호 |
| `arrivals[].busLat` | `double` | 버스 위도 |
| `arrivals[].busLon` | `double` | 버스 경도 |
| `arrivals[].distanceFromStopM` | `double` | 정류장 기준 버스 거리(m) |

### SignalDto

| 필드 | 타입 | 설명 |
|---|---|---|
| `crossroadName` | `string` | 교차로 이름 |
| `bestPedestrianRemainSec` | `int` | 추천 보행 신호 잔여 시간(초) |
| `bestPedestrianStatus` | `string` | 추천 보행 신호 상태 |

## 프론트 협업 메모

- `stdgCd`는 프론트가 Kakao Map `coord2regioncode` 결과를 사용해 전달해야 합니다.
- 공공데이터 원본 응답 구조와 달리, 프론트는 백엔드가 가공한 DTO만 사용하면 됩니다.
- 신호등 정보는 지도 마커 표시가 아니라 AI 문맥용으로 사용합니다.
- 버스 데이터는 현재 지도 마커 및 주변 상황 파악 용도이며, 정식 경로 탐색은 추후 ODsay 연동 이후 강화될 예정입니다.
