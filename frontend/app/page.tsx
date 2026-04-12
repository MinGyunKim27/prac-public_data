'use client'

import { useState, useCallback } from 'react'
import { RefreshCw, Clock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet'
import { FontSizeControl } from '@/components/accessibility/font-size-control'
import { HighContrastToggle } from '@/components/accessibility/high-contrast-toggle'
import { LocationSearch } from '@/components/search/location-search'
import { RouteInput } from '@/components/search/route-input'
import { QuickActions, NearbyStopsContent } from '@/components/features/quick-actions'
import { GuardianShareContent } from '@/components/features/guardian-share'
import { MobilityServicePanel } from '@/components/features/mobility-service-panel'
import { RadiusSelector } from '@/components/map/radius-selector'
import { MapLayerFilter } from '@/components/map/map-layer-filter'
import { MobilityAidSelector } from '@/components/ai/mobility-aid-selector'
import { KakaoMap } from '@/components/map/kakao-map'
import { AIRecommendation } from '@/components/ai/ai-recommendation'
import { useGeolocation } from '@/hooks/use-geolocation'
import type { Location, RadiusOption, LayerFilters, MobilityAid, UserType } from '@/types/transportation'

type SheetType = 'nearbyStops' | 'guardianShare' | null

export default function Home() {
  // 위치 관련 상태
  const { location: currentLocation, refresh: refreshLocation } = useGeolocation()
  const [origin, setOrigin] = useState<Location | null>(null)
  const [destination, setDestination] = useState<Location | null>(null)
  const [mapCenter, setMapCenter] = useState<Location | null>(null)

  // 지도 설정 상태
  const [radius, setRadius] = useState<RadiusOption>(1000)
  const [layerFilters, setLayerFilters] = useState<LayerFilters>({
    subwayStation: true,
    accidentSpot: true,
    busStop: true,
    mobilityCenter: true,
  })

  // 사용자 설정 상태
  const [mobilityAid, setMobilityAid] = useState<MobilityAid>('none')
  const [userType, setUserType] = useState<UserType>('general')

  // 시트 상태
  const [activeSheet, setActiveSheet] = useState<SheetType>(null)

  // 행정동 코드 (Kakao coord2RegionCode)
  const [stdgCd, setStdgCd] = useState<string>('')

  // AI 추천 상태
  const [showRecommendation, setShowRecommendation] = useState(false)
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date())

  // 검색된 위치로 지도 이동
  const handleLocationSelect = useCallback((location: Location) => {
    setMapCenter(location)
  }, [])

  // 현재 위치를 출발지로 설정
  const handleUseCurrentLocation = useCallback(() => {
    if (currentLocation) {
      setOrigin({
        ...currentLocation,
        name: '현재 위치',
      })
    }
  }, [currentLocation])

  // 경로 검색 실행
  const handleRouteSearch = useCallback(() => {
    if (origin && destination) {
      setShowRecommendation(true)
    }
  }, [origin, destination])

  // 데이터 새로고침
  const handleRefresh = useCallback(() => {
    refreshLocation()
    setLastUpdate(new Date())
  }, [refreshLocation])

  // 지도 중심 결정
  const effectiveMapCenter = mapCenter || currentLocation

  return (
    <main className="min-h-screen bg-background flex flex-col">
      {/* 상단 헤더 - 접근성 컨트롤 */}
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-border">
        <div className="container max-w-lg mx-auto px-4 py-3">
          <div className="flex items-center justify-between gap-2">
            <h1 className="text-lg font-bold text-foreground truncate">서울 교통약자 이동 지원</h1>
            <div className="flex items-center gap-2">
              <FontSizeControl />
              <HighContrastToggle />
            </div>
          </div>
        </div>
      </header>

      {/* 메인 콘텐츠 */}
      <div className="flex-1 container max-w-lg mx-auto px-4 py-4 space-y-4">
        {/* 위치 검색 */}
        <section aria-label="위치 검색">
          <LocationSearch onLocationSelect={handleLocationSelect} placeholder="장소, 주소 검색" />
        </section>

        {/* 출발지 → 목적지 입력 */}
        <section aria-label="경로 설정">
          <RouteInput
            origin={origin}
            destination={destination}
            onOriginChange={setOrigin}
            onDestinationChange={setDestination}
            onSearch={handleRouteSearch}
            onUseCurrentLocation={handleUseCurrentLocation}
          />
        </section>

        {/* 퀵 액션 버튼 */}
        <section aria-label="빠른 기능">
          <QuickActions
            onNearbyStops={() => setActiveSheet('nearbyStops')}
            onGuardianShare={() => setActiveSheet('guardianShare')}
          />
        </section>

        {/* 사용자 유형 및 이동 보조기구 선택 */}
        <section aria-label="사용자 설정">
          <MobilityAidSelector
            mobilityAid={mobilityAid}
            userType={userType}
            onMobilityAidChange={setMobilityAid}
            onUserTypeChange={setUserType}
          />
        </section>

        {/* 반경 선택 + 마지막 업데이트 시간 */}
        <section aria-label="지도 설정" className="flex items-center justify-between">
          <RadiusSelector value={radius} onChange={setRadius} />
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="h-4 w-4" />
            <span>{lastUpdate.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}</span>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleRefresh} aria-label="새로고침">
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </section>

        {/* 카카오맵 지도 */}
        <section aria-label="지도" className="rounded-xl overflow-hidden border border-border shadow-sm">
          <div className="h-[400px] bg-muted">
            <KakaoMap
              center={effectiveMapCenter}
              radius={radius}
              layerFilters={layerFilters}
              onCenterChange={setMapCenter}
              onStdgCdChange={setStdgCd}
            />
          </div>
        </section>

        {/* 레이어 필터 */}
        <section aria-label="레이어 필터">
          <MapLayerFilter filters={layerFilters} onChange={setLayerFilters} />
        </section>

        {/* 교통약자 이동지원 서비스 패널 */}
        <section aria-label="교통약자 이동지원 서비스">
          <MobilityServicePanel stdgCd={stdgCd} />
        </section>

        {/* AI 추천 결과 */}
        {showRecommendation && origin && destination && (
          <section aria-label="AI 경로 추천">
            <AIRecommendation
              origin={origin}
              destination={destination}
              mobilityAid={mobilityAid}
              userType={userType}
              stdgCd={stdgCd}
              currentLocation={currentLocation}
              onClose={() => setShowRecommendation(false)}
            />
          </section>
        )}
      </div>

      {/* 하단 시트들 */}
      <Sheet open={activeSheet === 'nearbyStops'} onOpenChange={(open) => !open && setActiveSheet(null)}>
        <SheetContent side="bottom" className="h-[70vh] rounded-t-2xl">
          <SheetHeader>
            <SheetTitle>가까운 정류장</SheetTitle>
            <SheetDescription>현재 위치에서 가까운 정류장과 승강기 정보를 확인하세요</SheetDescription>
          </SheetHeader>
          <div className="flex-1 overflow-auto px-4 pb-4">
            <NearbyStopsContent />
          </div>
        </SheetContent>
      </Sheet>

<Sheet open={activeSheet === 'guardianShare'} onOpenChange={(open) => !open && setActiveSheet(null)}>
        <SheetContent side="bottom" className="h-[70vh] rounded-t-2xl">
          <SheetHeader>
            <SheetTitle>보호자 위치 공유</SheetTitle>
            <SheetDescription>현재 위치를 보호자에게 공유합니다</SheetDescription>
          </SheetHeader>
          <div className="flex-1 overflow-auto px-4 pb-4">
            <GuardianShareContent currentLocation={currentLocation} />
          </div>
        </SheetContent>
      </Sheet>
    </main>
  )
}
