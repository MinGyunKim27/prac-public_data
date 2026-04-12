// 승강기 데이터 타입
export interface Elevator {
  id: string
  stationName: string
  lineNum: string
  location: string
  status: 'normal' | 'maintenance' | 'error'
  lat: number
  lng: number
  lastUpdated?: string
}

// 지하철역 승강기 상태 (SubwayStation에 내장)
export interface ElevatorStatus {
  name: string      // 승강기명 (ELVTR_NM)
  location: string  // 설치위치 (INSTL_PSTN)
  section: string   // 운행구간 (OPR_SEC)
  type: string      // 승강기 구분 (ELVTR_SE)
  status: 'normal' | 'error'
}

// 지하철역 타입
export interface SubwayStation {
  id: string
  name: string         // 역명 (e.g. "강남역")
  line: string         // 호선 (e.g. "2호선")
  lat: number
  lng: number
  elevators: ElevatorStatus[]
}

// 교통약자 사고다발지점 타입
export interface AccidentSpot {
  id: string
  address: string
  accidentCount: number
  riskLevel: 'high' | 'medium' | 'low'
  lat: number
  lng: number
  description?: string
}

// 이동지원센터 현황 타입 (지도 마커용 경량 타입)
export interface MobilityCenter {
  id: string
  centerName: string
  address: string
  phone: string
  availableTaxis: number
  waitTime: number // 분 단위
  lat: number
  lng: number
  operatingHours?: string
}

// 이동지원센터 상태
export type MobilityCenterStatus = 'available' | 'busy' | 'unavailable' | 'unknown'

// 이동지원센터 상세 정보 (패널/카드용)
export interface MobilityCenterDetail {
  id: string
  name: string
  address: string
  phone: string
  lat: number | null
  lng: number | null
  operatingHours?: string
  website?: string
  app?: string
  operatingVehicleCount: number   // 운영 차량 수
  availableVehicleCount: number   // 가용 차량 수
  reservationCount: number        // 예약 건수
  waitingCount: number            // 대기 건수
  status: MobilityCenterStatus
}

// 지역 이동지원 서비스 요약 (메인 화면 패널용)
export interface MobilityServiceSummary {
  regionName: string              // "서울 종로구"
  stdgCd: string                  // API stdgCd (10자리)
  centerCount: number
  totalOperatingVehicles: number
  totalAvailableVehicles: number
  totalWaitingCount: number
  totalReservationCount: number
  status: MobilityCenterStatus
  centers: MobilityCenterDetail[]
}

// 버스 실시간 위치 타입
export interface BusLocation {
  id: string
  routeId: string
  routeName: string
  currentStop: string
  nextStop: string
  lat: number
  lng: number
  arrivalTime?: number // 분 단위
}

// 정류장 타입
export interface BusStop {
  id: string
  name: string
  lat: number
  lng: number
  routes: string[]
}

// 지도 마커 공통 타입
export type MarkerType = 'elevator' | 'accidentSpot' | 'mobilityCenter' | 'busStop' | 'busLocation' | 'subwayStation'

export interface MapMarker {
  id: string
  type: MarkerType
  lat: number
  lng: number
  data: Elevator | AccidentSpot | MobilityCenter | BusStop | BusLocation | SubwayStation
}

// 레이어 필터 상태
export interface LayerFilters {
  subwayStation: boolean
  accidentSpot: boolean
  mobilityCenter: boolean
  busStop: boolean
}

// 반경 설정
export type RadiusOption = 500 | 1000 | 2000

// 이동 보조기구 종류
export type MobilityAid = 'wheelchair' | 'stroller' | 'walkingCane' | 'electricWheelchair' | 'none'

// 사용자 유형
export type UserType = 'pregnant' | 'withStroller' | 'disabled' | 'elderly' | 'general'

// 위치 정보
export interface Location {
  lat: number
  lng: number
  address?: string
  name?: string
}

// 경로 정보
export interface RouteInfo {
  origin: Location | null
  destination: Location | null
  mobilityAid: MobilityAid
  userType: UserType
}

// AI 추천 컨텍스트
export interface RecommendationContext {
  route: RouteInfo
  nearbySubwayStations: SubwayStation[]
  nearbyAccidentSpots: AccidentSpot[]
  nearbyMobilityCenters: MobilityCenter[]
  nearbyBusStops: BusStop[]
}
