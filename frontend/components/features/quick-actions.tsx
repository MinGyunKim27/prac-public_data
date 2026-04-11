'use client'

import { Bus, MapPinned, Share2, TreePine } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface QuickActionsProps {
  onNearbyStops: () => void
  onOutingCourse: () => void
  onGuardianShare: () => void
}

export function QuickActions({ onNearbyStops, onOutingCourse, onGuardianShare }: QuickActionsProps) {
  return (
    <div className="flex flex-wrap gap-2">
      <Button variant="secondary" className="flex-1 min-w-[120px] h-12 gap-2" onClick={onNearbyStops}>
        <Bus className="h-5 w-5 text-primary" />
        <span className="font-medium">가까운 정류장</span>
      </Button>

      <Button variant="secondary" className="flex-1 min-w-[120px] h-12 gap-2" onClick={onOutingCourse}>
        <TreePine className="h-5 w-5 text-success" />
        <span className="font-medium">나들이 코스</span>
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

// 나들이 코스 시트 내용
export function OutingCourseContent() {
  return (
    <div className="space-y-4">
      <p className="text-muted-foreground">
        현재 위치 기반으로 교통약자가 편하게 이용할 수 있는 나들이 코스를 추천해드립니다.
      </p>

      <div className="p-4 border border-border rounded-lg">
        <div className="flex items-start gap-3">
          <TreePine className="h-6 w-6 text-success shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold">청계천 산책로</h3>
            <p className="text-sm text-muted-foreground mt-1">
              무장애 산책로 | 휠체어 이용 가능 | 화장실 3곳 | 휴게공간 5곳
            </p>
            <div className="flex gap-2 mt-2">
              <span className="text-xs bg-success/10 text-success px-2 py-1 rounded-full">승강기 연결</span>
              <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full">2.5km 코스</span>
            </div>
          </div>
        </div>
      </div>

      <div className="p-4 border border-border rounded-lg">
        <div className="flex items-start gap-3">
          <MapPinned className="h-6 w-6 text-primary shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold">경복궁 무장애 코스</h3>
            <p className="text-sm text-muted-foreground mt-1">
              문화재청 지정 | 휠체어 대여 가능 | 경사로 완비 | 화장실 2곳
            </p>
            <div className="flex gap-2 mt-2">
              <span className="text-xs bg-success/10 text-success px-2 py-1 rounded-full">지하철 연결</span>
              <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full">1.8km 코스</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
