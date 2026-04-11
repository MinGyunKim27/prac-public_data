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

// 이동지원센터 현황 타입
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
export type MarkerType = 'elevator' | 'accidentSpot' | 'mobilityCenter' | 'busStop' | 'busLocation'

export interface MapMarker {
  id: string
  type: MarkerType
  lat: number
  lng: number
  data: Elevator | AccidentSpot | MobilityCenter | BusStop | BusLocation
}

// 레이어 필터 상태
export interface LayerFilters {
  elevator: boolean
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
  nearbyElevators: Elevator[]
  nearbyAccidentSpots: AccidentSpot[]
  nearbyMobilityCenters: MobilityCenter[]
  nearbyBusStops: BusStop[]
}
