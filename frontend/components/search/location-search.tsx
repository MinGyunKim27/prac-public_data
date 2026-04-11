'use client'

import { useState, useCallback } from 'react'
import { Search, MapPin, Loader2 } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import type { Location } from '@/types/transportation'

interface LocationSearchProps {
  onLocationSelect: (location: Location) => void
  placeholder?: string
  value?: string
  onChange?: (value: string) => void
}

interface SearchResult {
  id: string
  placeName: string
  addressName: string
  lat: number
  lng: number
}

export function LocationSearch({
  onLocationSelect,
  placeholder = '위치를 검색하세요',
  value: externalValue,
  onChange: externalOnChange,
}: LocationSearchProps) {
  const [internalValue, setInternalValue] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [showResults, setShowResults] = useState(false)

  const value = externalValue !== undefined ? externalValue : internalValue
  const setValue = externalOnChange || setInternalValue

  const handleSearch = useCallback(async () => {
    if (!value.trim()) return

    setIsSearching(true)
    setShowResults(true)

    try {
      // 카카오 주소 검색 API 사용
      if (typeof window !== 'undefined' && window.kakao?.maps?.services) {
        const ps = new window.kakao.maps.services.Places()
        ps.keywordSearch(value, (data: kakao.maps.services.PlacesSearchResult, status: kakao.maps.services.Status) => {
          if (status === window.kakao.maps.services.Status.OK) {
            const searchResults: SearchResult[] = data.slice(0, 5).map((place) => ({
              id: place.id,
              placeName: place.place_name,
              addressName: place.address_name,
              lat: parseFloat(place.y),
              lng: parseFloat(place.x),
            }))
            setResults(searchResults)
          } else {
            setResults([])
          }
          setIsSearching(false)
        })
      } else {
        // 카카오맵 API가 없는 경우 목업 데이터
        setResults([
          { id: '1', placeName: `${value} 검색 결과`, addressName: '서울특별시', lat: 37.5665, lng: 126.978 },
        ])
        setIsSearching(false)
      }
    } catch {
      setIsSearching(false)
      setResults([])
    }
  }, [value])

  const handleSelect = (result: SearchResult) => {
    onLocationSelect({
      lat: result.lat,
      lng: result.lng,
      address: result.addressName,
      name: result.placeName,
    })
    setValue(result.placeName)
    setShowResults(false)
    setResults([])
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleSearch()
    }
  }

  return (
    <div className="relative w-full">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input
            type="text"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => results.length > 0 && setShowResults(true)}
            placeholder={placeholder}
            className="pl-10 h-12 text-base"
            aria-label={placeholder}
          />
        </div>
        <Button onClick={handleSearch} disabled={isSearching || !value.trim()} className="h-12 px-4" aria-label="검색">
          {isSearching ? <Loader2 className="h-5 w-5 animate-spin" /> : <Search className="h-5 w-5" />}
        </Button>
      </div>

      {/* 검색 결과 드롭다운 */}
      {showResults && results.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-card border border-border rounded-lg shadow-lg z-50 overflow-hidden">
          {results.map((result) => (
            <button
              key={result.id}
              onClick={() => handleSelect(result)}
              className="w-full flex items-start gap-3 p-3 hover:bg-accent transition-colors text-left border-b border-border last:border-b-0"
            >
              <MapPin className="h-5 w-5 text-primary shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="font-medium text-foreground truncate">{result.placeName}</p>
                <p className="text-sm text-muted-foreground truncate">{result.addressName}</p>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* 검색 결과 없음 */}
      {showResults && !isSearching && results.length === 0 && value.trim() && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-card border border-border rounded-lg shadow-lg z-50 p-4 text-center text-muted-foreground">
          검색 결과가 없습니다
        </div>
      )}

      {/* 배경 클릭 시 닫기 */}
      {showResults && <div className="fixed inset-0 z-40" onClick={() => setShowResults(false)} />}
    </div>
  )
}
