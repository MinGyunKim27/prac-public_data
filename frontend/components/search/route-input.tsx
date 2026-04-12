'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { MapPin, Navigation, RotateCcw, Bus, PersonStanding, Car, ExternalLink } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import type { Location } from '@/types/transportation'

type TransportMode = 'traffic' | 'walk' | 'car'

const MODES: { value: TransportMode; label: string; Icon: React.ElementType }[] = [
  { value: 'traffic', label: '대중교통', Icon: Bus },
  { value: 'walk', label: '도보', Icon: PersonStanding },
  { value: 'car', label: '자동차', Icon: Car },
]

interface RouteInputProps {
  origin: Location | null
  destination: Location | null
  onOriginChange: (location: Location | null) => void
  onDestinationChange: (location: Location | null) => void
  onSearch: () => void
  onUseCurrentLocation: () => void
}

interface PlaceResult {
  place_name: string
  address_name: string
  lat: number
  lng: number
}

function kakaoKeywordSearch(query: string, callback: (results: PlaceResult[]) => void) {
  if (!query.trim() || typeof window === 'undefined') return
  const kakao = (window as Window & { kakao?: { maps?: { services?: { Places: new () => { keywordSearch: (q: string, cb: (d: kakao.maps.services.PlacesSearchResult, s: kakao.maps.services.Status) => void) => void }; Status: { OK: string } } } } }).kakao
  if (!kakao?.maps?.services) return

  const ps = new kakao.maps.services.Places()
  ps.keywordSearch(query, (data, status) => {
    if (status === kakao.maps.services.Status.OK) {
      callback(
        data.slice(0, 5).map((p) => ({
          place_name: p.place_name,
          address_name: p.address_name,
          lat: parseFloat(p.y),
          lng: parseFloat(p.x),
        })),
      )
    }
  })
}

function buildKakaoRouteUrl(origin: Location, destination: Location, mode: TransportMode) {
  const from = `${encodeURIComponent(origin.name || '출발지')},${origin.lat},${origin.lng}`
  const to = `${encodeURIComponent(destination.name || '목적지')},${destination.lat},${destination.lng}`
  return `https://map.kakao.com/link/by/${mode}/${from}/${to}`
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
  const [originResults, setOriginResults] = useState<PlaceResult[]>([])
  const [destResults, setDestResults] = useState<PlaceResult[]>([])
  const [mode, setMode] = useState<TransportMode>('traffic')

  const originTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const destTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // origin 변경 시 input 동기화
  useEffect(() => {
    if (origin?.name) setOriginInput(origin.name)
  }, [origin?.name])

  const handleOriginInput = useCallback((value: string) => {
    setOriginInput(value)
    onOriginChange(null)
    setOriginResults([])
    if (originTimer.current) clearTimeout(originTimer.current)
    if (!value.trim()) return
    originTimer.current = setTimeout(() => {
      kakaoKeywordSearch(value, setOriginResults)
    }, 400)
  }, [onOriginChange])

  const handleDestInput = useCallback((value: string) => {
    setDestInput(value)
    onDestinationChange(null)
    setDestResults([])
    if (destTimer.current) clearTimeout(destTimer.current)
    if (!value.trim()) return
    destTimer.current = setTimeout(() => {
      kakaoKeywordSearch(value, setDestResults)
    }, 400)
  }, [onDestinationChange])

  const selectOrigin = (place: PlaceResult) => {
    setOriginInput(place.place_name)
    onOriginChange({ lat: place.lat, lng: place.lng, name: place.place_name, address: place.address_name })
    setOriginResults([])
  }

  const selectDest = (place: PlaceResult) => {
    setDestInput(place.place_name)
    onDestinationChange({ lat: place.lat, lng: place.lng, name: place.place_name, address: place.address_name })
    setDestResults([])
  }

  const handleSwap = () => {
    const tmpOrigin = origin
    const tmpInput = originInput
    onOriginChange(destination)
    onDestinationChange(tmpOrigin)
    setOriginInput(destInput)
    setDestInput(tmpInput)
  }

  const handleNavigate = () => {
    if (!origin || !destination) return
    const url = buildKakaoRouteUrl(origin, destination, mode)
    window.open(url, '_blank', 'noopener')
  }

  const canSearch = !!origin && !!destination

  return (
    <div className="bg-card rounded-xl border border-border p-4 shadow-sm space-y-3">
      <div className="flex items-stretch gap-3">
        {/* 출발지 / 목적지 입력 */}
        <div className="flex-1 flex flex-col gap-2">
          {/* 출발지 */}
          <div className="relative">
            <div className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground z-10">
              <Navigation className="h-3.5 w-3.5" />
            </div>
            <Input
              type="text"
              value={originInput}
              onChange={(e) => handleOriginInput(e.target.value)}
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
            {/* 출발지 드롭다운 */}
            {originResults.length > 0 && (
              <ul className="absolute top-full left-0 right-0 z-50 mt-1 bg-card border border-border rounded-lg shadow-lg overflow-hidden">
                {originResults.map((r, i) => (
                  <li key={i}>
                    <button
                      className="w-full text-left px-4 py-2.5 hover:bg-accent transition-colors"
                      onClick={() => selectOrigin(r)}
                    >
                      <p className="text-sm font-medium">{r.place_name}</p>
                      <p className="text-xs text-muted-foreground truncate">{r.address_name}</p>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* 목적지 */}
          <div className="relative">
            <div className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center justify-center w-6 h-6 rounded-full bg-destructive text-destructive-foreground z-10">
              <MapPin className="h-3.5 w-3.5" />
            </div>
            <Input
              type="text"
              value={destInput}
              onChange={(e) => handleDestInput(e.target.value)}
              placeholder="목적지 입력"
              className="pl-12 h-12 text-base"
              aria-label="목적지"
            />
            {/* 목적지 드롭다운 */}
            {destResults.length > 0 && (
              <ul className="absolute top-full left-0 right-0 z-50 mt-1 bg-card border border-border rounded-lg shadow-lg overflow-hidden">
                {destResults.map((r, i) => (
                  <li key={i}>
                    <button
                      className="w-full text-left px-4 py-2.5 hover:bg-accent transition-colors"
                      onClick={() => selectDest(r)}
                    >
                      <p className="text-sm font-medium">{r.place_name}</p>
                      <p className="text-xs text-muted-foreground truncate">{r.address_name}</p>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* 스왑 버튼 */}
        <div className="flex flex-col justify-center">
          <Button
            variant="outline"
            size="icon"
            onClick={handleSwap}
            className="h-11 w-11"
            aria-label="출발지와 목적지 바꾸기"
          >
            <RotateCcw className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* 이동 수단 선택 */}
      <div className="flex gap-2">
        {MODES.map(({ value, label, Icon }) => (
          <button
            key={value}
            onClick={() => setMode(value)}
            className={`flex-1 flex items-center justify-center gap-1.5 h-9 rounded-lg text-sm font-medium border transition-colors ${
              mode === value
                ? 'bg-primary text-primary-foreground border-primary'
                : 'bg-background text-muted-foreground border-border hover:bg-accent'
            }`}
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        ))}
      </div>

      {/* 버튼 행 */}
      <div className="flex gap-2">
        <Button
          onClick={handleNavigate}
          disabled={!canSearch}
          className="flex-1 h-12 text-base font-medium"
        >
          <ExternalLink className="h-5 w-5 mr-2" />
          카카오맵 길찾기
        </Button>
        <Button
          variant="outline"
          onClick={onSearch}
          disabled={!canSearch}
          className="h-12 px-4 text-sm"
          title="AI 경로 추천"
        >
          AI 추천
        </Button>
      </div>
    </div>
  )
}
