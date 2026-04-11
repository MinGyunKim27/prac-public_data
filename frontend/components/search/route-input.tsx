'use client'

import { useState } from 'react'
import { ArrowRight, MapPin, Navigation, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import type { Location } from '@/types/transportation'

interface RouteInputProps {
  origin: Location | null
  destination: Location | null
  onOriginChange: (location: Location | null) => void
  onDestinationChange: (location: Location | null) => void
  onSearch: () => void
  onUseCurrentLocation: () => void
}

export function RouteInput({
  origin,
  destination,
  onOriginChange,
  onDestinationChange,
  onSearch,
  onUseCurrentLocation,
}: RouteInputProps) {
  const [originInput, setOriginInput] = useState(origin?.name || '')
  const [destInput, setDestInput] = useState(destination?.name || '')

  const handleSwapLocations = () => {
    const tempOrigin = origin
    const tempInput = originInput
    onOriginChange(destination)
    onDestinationChange(tempOrigin)
    setOriginInput(destInput)
    setDestInput(tempInput)
  }

  const handleOriginSearch = (value: string) => {
    setOriginInput(value)
    // 실제로는 카카오맵 검색 API 호출 후 위치 선택
    if (value && typeof window !== 'undefined' && window.kakao?.maps?.services) {
      const ps = new window.kakao.maps.services.Places()
      ps.keywordSearch(value, (data: kakao.maps.services.PlacesSearchResult, status: kakao.maps.services.Status) => {
        if (status === window.kakao.maps.services.Status.OK && data.length > 0) {
          onOriginChange({
            lat: parseFloat(data[0].y),
            lng: parseFloat(data[0].x),
            name: data[0].place_name,
            address: data[0].address_name,
          })
        }
      })
    }
  }

  const handleDestSearch = (value: string) => {
    setDestInput(value)
    if (value && typeof window !== 'undefined' && window.kakao?.maps?.services) {
      const ps = new window.kakao.maps.services.Places()
      ps.keywordSearch(value, (data: kakao.maps.services.PlacesSearchResult, status: kakao.maps.services.Status) => {
        if (status === window.kakao.maps.services.Status.OK && data.length > 0) {
          onDestinationChange({
            lat: parseFloat(data[0].y),
            lng: parseFloat(data[0].x),
            name: data[0].place_name,
            address: data[0].address_name,
          })
        }
      })
    }
  }

  return (
    <div className="bg-card rounded-xl border border-border p-4 shadow-sm">
      <div className="flex items-stretch gap-3">
        {/* 출발지/목적지 입력 */}
        <div className="flex-1 flex flex-col gap-2">
          {/* 출발지 */}
          <div className="relative">
            <div className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground">
              <Navigation className="h-3.5 w-3.5" />
            </div>
            <Input
              type="text"
              value={originInput}
              onChange={(e) => handleOriginSearch(e.target.value)}
              placeholder="출발지 입력"
              className="pl-12 h-12 text-base"
              aria-label="출발지"
            />
            <Button
              variant="ghost"
              size="sm"
              onClick={onUseCurrentLocation}
              className="absolute right-1 top-1/2 -translate-y-1/2 text-xs h-8 px-2 text-primary"
            >
              <MapPin className="h-4 w-4 mr-1" />
              현재 위치
            </Button>
          </div>

          {/* 목적지 */}
          <div className="relative">
            <div className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center justify-center w-6 h-6 rounded-full bg-destructive text-destructive-foreground">
              <MapPin className="h-3.5 w-3.5" />
            </div>
            <Input
              type="text"
              value={destInput}
              onChange={(e) => handleDestSearch(e.target.value)}
              placeholder="목적지 입력"
              className="pl-12 h-12 text-base"
              aria-label="목적지"
            />
          </div>
        </div>

        {/* 스왑 버튼 */}
        <div className="flex flex-col justify-center">
          <Button
            variant="outline"
            size="icon"
            onClick={handleSwapLocations}
            className="h-11 w-11"
            aria-label="출발지와 목적지 바꾸기"
          >
            <RotateCcw className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* 경로 검색 버튼 */}
      <Button onClick={onSearch} disabled={!origin || !destination} className="w-full mt-4 h-12 text-base font-medium">
        <ArrowRight className="h-5 w-5 mr-2" />
        경로 찾기
      </Button>
    </div>
  )
}
