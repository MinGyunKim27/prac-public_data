'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { Loader2 } from 'lucide-react'
import { useAllTransportData } from '@/hooks/use-real-time-data'
import { MarkerPopup } from './marker-popup'
import type { Location, RadiusOption, LayerFilters, AccidentSpot, MobilityCenter, BusStop, SubwayStation } from '@/types/transportation'

interface KakaoMapProps {
  center: Location | null
  radius: RadiusOption
  layerFilters: LayerFilters
  onCenterChange?: (location: Location) => void
  onStdgCdChange?: (stdgCd: string) => void
}

// 마커 이미지 SVG 데이터
const MARKER_ICONS = {
  // 지하철역: 승강기 있으면 보라, 없으면 회색
  subwayStation: {
    withElevator: `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="40" viewBox="0 0 32 40"><path d="M16 0C7.164 0 0 7.164 0 16c0 8.837 16 24 16 24s16-15.163 16-24C32 7.164 24.836 0 16 0z" fill="#8b5cf6"/><rect x="9" y="8" width="14" height="11" rx="2" fill="white"/><rect x="11" y="10" width="4" height="3" rx="1" fill="#8b5cf6"/><rect x="17" y="10" width="4" height="3" rx="1" fill="#8b5cf6"/><rect x="9" y="19" width="14" height="1.5" fill="white"/><circle cx="12" cy="22" r="1.5" fill="white"/><circle cx="20" cy="22" r="1.5" fill="white"/></svg>`,
    noElevator:   `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="40" viewBox="0 0 32 40"><path d="M16 0C7.164 0 0 7.164 0 16c0 8.837 16 24 16 24s16-15.163 16-24C32 7.164 24.836 0 16 0z" fill="#9ca3af"/><rect x="9" y="8" width="14" height="11" rx="2" fill="white"/><rect x="11" y="10" width="4" height="3" rx="1" fill="#9ca3af"/><rect x="17" y="10" width="4" height="3" rx="1" fill="#9ca3af"/><rect x="9" y="19" width="14" height="1.5" fill="white"/><circle cx="12" cy="22" r="1.5" fill="white"/><circle cx="20" cy="22" r="1.5" fill="white"/></svg>`,
  },
  accidentSpot: `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="40" viewBox="0 0 32 40"><path d="M16 0C7.164 0 0 7.164 0 16c0 8.837 16 24 16 24s16-15.163 16-24C32 7.164 24.836 0 16 0z" fill="#f97316"/><path d="M16 8l-6 12h12L16 8zm0 3.5l3.5 7h-7l3.5-7z" fill="white"/><circle cx="16" cy="18" r="1" fill="white"/></svg>`,
  busStop: `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="40" viewBox="0 0 32 40"><path d="M16 0C7.164 0 0 7.164 0 16c0 8.837 16 24 16 24s16-15.163 16-24C32 7.164 24.836 0 16 0z" fill="#3b82f6"/><rect x="9" y="8" width="14" height="14" rx="2" fill="white"/><rect x="11" y="10" width="10" height="5" fill="#3b82f6"/><circle cx="12" cy="19" r="1.5" fill="#3b82f6"/><circle cx="20" cy="19" r="1.5" fill="#3b82f6"/></svg>`,
  mobilityCenter: `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="40" viewBox="0 0 32 40"><path d="M16 0C7.164 0 0 7.164 0 16c0 8.837 16 24 16 24s16-15.163 16-24C32 7.164 24.836 0 16 0z" fill="#eab308"/><rect x="8" y="11" width="16" height="8" rx="2" fill="white"/><rect x="10" y="13" width="4" height="3" fill="#eab308"/><rect x="18" y="13" width="4" height="3" fill="#eab308"/><circle cx="11" cy="20" r="1.5" fill="#1f2937"/><circle cx="21" cy="20" r="1.5" fill="#1f2937"/></svg>`,
  currentLocation: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" fill="#3b82f6" opacity="0.2"/><circle cx="12" cy="12" r="6" fill="#3b82f6"/><circle cx="12" cy="12" r="3" fill="white"/></svg>`,
}

function svgToDataUrl(svg: string): string {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
}

export function KakaoMap({ center, radius, layerFilters, onCenterChange, onStdgCdChange }: KakaoMapProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<kakao.maps.Map | null>(null)
  const markersRef = useRef<kakao.maps.Marker[]>([])
  const circleRef = useRef<kakao.maps.Circle | null>(null)
  const currentLocationMarkerRef = useRef<kakao.maps.Marker | null>(null)

  const [isLoaded, setIsLoaded] = useState(false)
  const [stdgCdLocal, setStdgCdLocal] = useState<string>('')
  const hasInitializedRef = useRef(false)
  const [selectedMarker, setSelectedMarker] = useState<{
    type: 'subwayStation' | 'accidentSpot' | 'busStop' | 'mobilityCenter'
    data: SubwayStation | AccidentSpot | MobilityCenter | BusStop
    position: { x: number; y: number }
  } | null>(null)

  const { subwayStations, accidentSpots, mobilityCenters, busLocations } = useAllTransportData({
    center,
    radius,
    stdgCd: stdgCdLocal,
    enabled: isLoaded,
  })

  // 카카오맵 초기화 (center가 처음 유효해지는 순간 한 번만 실행)
  useEffect(() => {
    if (!mapRef.current || !center || hasInitializedRef.current) return
    hasInitializedRef.current = true

    const initMap = () => {
      if (!window.kakao?.maps) {
        setTimeout(initMap, 100)
        return
      }

      window.kakao.maps.load(() => {
        if (!mapRef.current) return

        const mapOptions = {
          center: new window.kakao.maps.LatLng(center.lat, center.lng),
          level: getZoomLevelForRadius(radius),
        }

        const map = new window.kakao.maps.Map(mapRef.current, mapOptions)
        mapInstanceRef.current = map

        const fetchStdgCd = (lat: number, lng: number) => {
          try {
            const geocoder = new window.kakao.maps.services.Geocoder()
            geocoder.coord2RegionCode(lng, lat, (result: any, status: any) => {
              if (status === window.kakao.maps.services.Status.OK) {
                const haengjeong = result.find((r: any) => r.region_type === 'H')
                if (haengjeong?.code) {
                  setStdgCdLocal(haengjeong.code)
                  onStdgCdChange?.(haengjeong.code)
                }
              }
            })
          } catch {
            // services 라이브러리 미로드 시 무시
          }
        }

        fetchStdgCd(center.lat, center.lng)

        window.kakao.maps.event.addListener(map, 'dragend', () => {
          const latlng = map.getCenter()
          const newLat = latlng.getLat()
          const newLng = latlng.getLng()
          onCenterChange?.({ lat: newLat, lng: newLng })
          fetchStdgCd(newLat, newLng)
        })

        const circle = new window.kakao.maps.Circle({
          center: new window.kakao.maps.LatLng(center.lat, center.lng),
          radius: radius,
          strokeWeight: 2,
          strokeColor: '#3b82f6',
          strokeOpacity: 0.8,
          strokeStyle: 'dashed',
          fillColor: '#3b82f6',
          fillOpacity: 0.1,
        })
        circle.setMap(map)
        circleRef.current = circle

        const currentMarker = new window.kakao.maps.Marker({
          position: new window.kakao.maps.LatLng(center.lat, center.lng),
          map: map,
          image: new window.kakao.maps.MarkerImage(
            svgToDataUrl(MARKER_ICONS.currentLocation),
            new window.kakao.maps.Size(24, 24),
            { offset: new window.kakao.maps.Point(12, 12) }
          ),
        })
        currentLocationMarkerRef.current = currentMarker

        setIsLoaded(true)
      })
    }

    initMap()

    return () => {
      markersRef.current.forEach((marker) => marker.setMap(null))
      markersRef.current = []
    }
  }, [center])

  // 중심 변경 시 지도 이동
  useEffect(() => {
    if (!mapInstanceRef.current || !center) return
    const latlng = new window.kakao.maps.LatLng(center.lat, center.lng)
    mapInstanceRef.current.panTo(latlng)
    if (circleRef.current) circleRef.current.setOptions({ center: latlng, radius })
    if (currentLocationMarkerRef.current) currentLocationMarkerRef.current.setPosition(latlng)
  }, [center, radius])

  // 줌 레벨 업데이트
  useEffect(() => {
    if (!mapInstanceRef.current) return
    mapInstanceRef.current.setLevel(getZoomLevelForRadius(radius))
    if (circleRef.current) circleRef.current.setRadius(radius)
  }, [radius])

  // 마커 업데이트
  useEffect(() => {
    if (!mapInstanceRef.current || !isLoaded) return

    markersRef.current.forEach((marker) => marker.setMap(null))
    markersRef.current = []

    const map = mapInstanceRef.current

    const addMarker = (
      lat: number,
      lng: number,
      iconSvg: string,
      title: string,
      onClick: () => void,
    ) => {
      const marker = new window.kakao.maps.Marker({
        position: new window.kakao.maps.LatLng(lat, lng),
        map,
        image: new window.kakao.maps.MarkerImage(
          svgToDataUrl(iconSvg),
          new window.kakao.maps.Size(32, 40),
          { offset: new window.kakao.maps.Point(16, 40) }
        ),
        title,
      })
      window.kakao.maps.event.addListener(marker, 'click', onClick)
      markersRef.current.push(marker)
    }

    // ── 지하철역 마커
    if (layerFilters.subwayStation && subwayStations) {
      subwayStations.forEach((station: SubwayStation) => {
        const hasWorkingElevator = station.elevators.some((e) => e.status === 'normal')
        const icon = station.elevators.length > 0
          ? (hasWorkingElevator ? MARKER_ICONS.subwayStation.withElevator : MARKER_ICONS.subwayStation.noElevator)
          : MARKER_ICONS.subwayStation.noElevator

        addMarker(station.lat, station.lng, icon, station.name, () => {
          setSelectedMarker({ type: 'subwayStation', data: station, position: { x: 200, y: 200 } })
        })
      })
    }

    // ── 사고다발지점 마커
    if (layerFilters.accidentSpot && accidentSpots) {
      accidentSpots.forEach((spot: AccidentSpot) => {
        addMarker(spot.lat, spot.lng, MARKER_ICONS.accidentSpot, spot.address, () => {
          setSelectedMarker({ type: 'accidentSpot', data: spot, position: { x: 200, y: 200 } })
        })
      })
    }

    // ── 버스 정류장 마커
    if (layerFilters.busStop && busLocations) {
      busLocations.forEach((bus: { id: string; currentStop: string; lat: number; lng: number; routeName: string }) => {
        const stop: BusStop = { id: bus.id, name: bus.currentStop, lat: bus.lat, lng: bus.lng, routes: [bus.routeName] }
        addMarker(stop.lat, stop.lng, MARKER_ICONS.busStop, stop.name, () => {
          setSelectedMarker({ type: 'busStop', data: stop, position: { x: 200, y: 200 } })
        })
      })
    }

    // ── 이동지원센터(콜택시) 마커
    if (layerFilters.mobilityCenter && mobilityCenters) {
      mobilityCenters.forEach((mc: MobilityCenter) => {
        addMarker(mc.lat, mc.lng, MARKER_ICONS.mobilityCenter, mc.centerName, () => {
          setSelectedMarker({ type: 'mobilityCenter', data: mc, position: { x: 200, y: 200 } })
        })
      })
    }
  }, [isLoaded, layerFilters, subwayStations, accidentSpots, busLocations, mobilityCenters])

  const handleClosePopup = useCallback(() => setSelectedMarker(null), [])

  return (
    <div className="relative w-full h-full">
      <div ref={mapRef} className="w-full h-full" />

      {!isLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-muted">
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">지도를 불러오는 중...</p>
          </div>
        </div>
      )}

      {selectedMarker && (
        <MarkerPopup
          type={selectedMarker.type}
          data={selectedMarker.data}
          onClose={handleClosePopup}
        />
      )}
    </div>
  )
}

function getZoomLevelForRadius(radius: number): number {
  if (radius <= 500) return 5
  if (radius <= 1000) return 6
  return 7
}
