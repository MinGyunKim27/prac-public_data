'use client'

import { Bus, Share2 } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface QuickActionsProps {
  onNearbyStops: () => void
  onGuardianShare: () => void
}

export function QuickActions({ onNearbyStops, onGuardianShare }: QuickActionsProps) {
  return (
    <div className="flex flex-wrap gap-2">
      <Button variant="secondary" className="flex-1 min-w-[120px] h-12 gap-2" onClick={onNearbyStops}>
        <Bus className="h-5 w-5 text-primary" />
        <span className="font-medium">가까운 정류장</span>
      </Button>

      <Button variant="secondary" className="flex-1 min-w-[120px] h-12 gap-2" onClick={onGuardianShare}>
        <Share2 className="h-5 w-5 text-warning" />
        <span className="font-medium">보호자 위치 공유</span>
      </Button>
    </div>
  )
}

// 가까운 정류장 시트 내용
export function NearbyStopsContent() {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 p-4 bg-accent rounded-lg">
        <div className="flex items-center justify-center w-12 h-12 rounded-full bg-primary text-primary-foreground">
          <Bus className="h-6 w-6" />
        </div>
        <div className="flex-1">
          <h3 className="font-semibold">광화문역 3번 출구</h3>
          <p className="text-sm text-muted-foreground">150m 거리 | 승강기 있음</p>
        </div>
        <Button size="sm" variant="outline">
          상세보기
        </Button>
      </div>

      <div className="flex items-center gap-3 p-4 bg-accent rounded-lg">
        <div className="flex items-center justify-center w-12 h-12 rounded-full bg-primary text-primary-foreground">
          <Bus className="h-6 w-6" />
        </div>
        <div className="flex-1">
          <h3 className="font-semibold">세종문화회관 정류장</h3>
          <p className="text-sm text-muted-foreground">230m 거리 | 저상버스 운행</p>
        </div>
        <Button size="sm" variant="outline">
          상세보기
        </Button>
      </div>

      <div className="flex items-center gap-3 p-4 bg-accent rounded-lg">
        <div className="flex items-center justify-center w-12 h-12 rounded-full bg-primary text-primary-foreground">
          <Bus className="h-6 w-6" />
        </div>
        <div className="flex-1">
          <h3 className="font-semibold">시청역 1번 출구</h3>
          <p className="text-sm text-muted-foreground">350m 거리 | 승강기 있음</p>
        </div>
        <Button size="sm" variant="outline">
          상세보기
        </Button>
      </div>
    </div>
  )
}

