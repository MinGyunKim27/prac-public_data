'use client'

import useSWR from 'swr'
import {
  Car,
  Phone,
  Globe,
  CheckCircle2,
  AlertCircle,
  XCircle,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  Clock,
} from 'lucide-react'
import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import type { MobilityServiceSummary, MobilityCenterStatus } from '@/types/transportation'

// ─── 상태 설정 ────────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<
  MobilityCenterStatus,
  { label: string; color: string; bg: string; Icon: React.ElementType }
> = {
  available:   { label: '이용 가능',  color: 'text-green-700',  bg: 'bg-green-100',  Icon: CheckCircle2 },
  busy:        { label: '혼잡',       color: 'text-yellow-700', bg: 'bg-yellow-100', Icon: AlertCircle  },
  unavailable: { label: '운휴',       color: 'text-red-700',    bg: 'bg-red-100',    Icon: XCircle      },
  unknown:     { label: '정보 없음',  color: 'text-gray-500',   bg: 'bg-gray-100',   Icon: HelpCircle   },
}

// ─── 배지 ─────────────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: MobilityCenterStatus }) {
  const cfg = STATUS_CONFIG[status]
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${cfg.bg} ${cfg.color}`}>
      <cfg.Icon className="h-3 w-3" />
      {cfg.label}
    </span>
  )
}

// ─── 지표 칩 ──────────────────────────────────────────────────────────────────

function Chip({ label, value, highlight }: { label: string; value: number; highlight?: boolean }) {
  return (
    <div className="flex flex-col items-center p-2 bg-muted rounded-lg min-w-[56px]">
      <span className={`text-lg font-bold leading-none ${highlight ? 'text-primary' : ''}`}>
        {value}
      </span>
      <span className="text-[10px] text-muted-foreground mt-0.5 text-center leading-tight">{label}</span>
    </div>
  )
}

// ─── 센터 카드 ────────────────────────────────────────────────────────────────

function CenterCard({ center }: { center: MobilityServiceSummary['centers'][number] }) {
  return (
    <div className="rounded-lg border border-border p-3 space-y-2.5">
      {/* 이름 + 상태 */}
      <div className="flex items-start justify-between gap-2">
        <p className="font-medium text-sm leading-snug">{center.name}</p>
        <StatusBadge status={center.status} />
      </div>

      {/* 지표 칩 */}
      <div className="flex gap-2 flex-wrap">
        <Chip label="운영 차량" value={center.operatingVehicleCount} />
        <Chip label="가용 차량" value={center.availableVehicleCount} highlight />
        <Chip label="예약 건" value={center.reservationCount} />
        <Chip label="대기 건" value={center.waitingCount} />
      </div>

      {/* 운영 시간 */}
      {center.operatingHours && (
        <p className="text-xs text-muted-foreground flex items-center gap-1">
          <Clock className="h-3 w-3 shrink-0" />
          {center.operatingHours}
        </p>
      )}

      {/* 주소 */}
      {center.address && (
        <p className="text-xs text-muted-foreground line-clamp-1">{center.address}</p>
      )}

      {/* 액션 버튼 */}
      <div className="flex gap-2 flex-wrap">
        {center.phone && (
          <Button
            size="sm"
            variant="outline"
            className="h-7 text-xs gap-1 px-2"
            onClick={() => { window.location.href = `tel:${center.phone}` }}
          >
            <Phone className="h-3 w-3" />
            {center.phone}
          </Button>
        )}
        {center.website && (
          <Button
            size="sm"
            variant="outline"
            className="h-7 text-xs gap-1 px-2"
            onClick={() => { window.open(center.website, '_blank', 'noopener') }}
          >
            <Globe className="h-3 w-3" />
            예약 웹
          </Button>
        )}
        {center.app && (
          <Button
            size="sm"
            variant="outline"
            className="h-7 text-xs gap-1 px-2"
          >
            <Car className="h-3 w-3" />
            {center.app}
          </Button>
        )}
      </div>
    </div>
  )
}

// ─── 메인 패널 ────────────────────────────────────────────────────────────────

const fetcher = (url: string) =>
  fetch(url).then((r) => {
    if (!r.ok) throw new Error('API 오류')
    return r.json()
  })

interface MobilityServicePanelProps {
  stdgCd: string
}

export function MobilityServicePanel({ stdgCd }: MobilityServicePanelProps) {
  const [expanded, setExpanded] = useState(false)

  const { data, isLoading } = useSWR<MobilityServiceSummary | null>(
    stdgCd ? `/api/mobility-service?stdgCd=${stdgCd}` : null,
    fetcher,
    { revalidateOnFocus: false, dedupingInterval: 30000 },
  )

  // stdgCd 없으면 패널 숨김
  if (!stdgCd) return null

  const cfg = data ? STATUS_CONFIG[data.status] : STATUS_CONFIG.unknown

  return (
    <Card className="border-border">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Car className="h-4 w-4 text-yellow-500" />
            <CardTitle className="text-base">교통약자 이동지원</CardTitle>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 gap-1 text-xs"
            onClick={() => setExpanded((v) => !v)}
          >
            {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            {expanded ? '접기' : '펼치기'}
          </Button>
        </div>
      </CardHeader>

      <CardContent className="pt-0 space-y-3">
        {/* 로딩 */}
        {isLoading && (
          <p className="text-sm text-muted-foreground animate-pulse">
            이동지원 정보 조회 중…
          </p>
        )}

        {/* 데이터 없음 */}
        {!isLoading && data === null && (
          <p className="text-sm text-muted-foreground">
            해당 지역의 이동지원 정보가 아직 제공되지 않습니다.
          </p>
        )}

        {/* 지역 미등록 */}
        {!isLoading && data?.centerCount === 0 && (
          <p className="text-sm text-muted-foreground">
            <span className="font-medium">{data.regionName}</span>에 등록된 이동지원센터가 없습니다.
          </p>
        )}

        {/* 요약 */}
        {!isLoading && data && data.centerCount > 0 && (
          <>
            {/* 지역명 + 상태 배지 */}
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-foreground">{data.regionName}</p>
              <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-sm font-semibold ${cfg.bg} ${cfg.color}`}>
                <cfg.Icon className="h-4 w-4" />
                {cfg.label}
              </span>
            </div>

            {/* 지역 전체 지표 */}
            <div className="flex gap-2 flex-wrap">
              <Chip label="센터 수" value={data.centerCount} />
              <Chip label="운영 차량" value={data.totalOperatingVehicles} />
              <Chip label="가용 차량" value={data.totalAvailableVehicles} highlight />
              <Chip label="대기 건" value={data.totalWaitingCount} />
              <Chip label="예약 건" value={data.totalReservationCount} />
            </div>

            {/* 센터 목록 (펼치기) */}
            {expanded && (
              <div className="space-y-2 pt-1">
                {data.centers.map((center) => (
                  <CenterCard key={center.id} center={center} />
                ))}
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
}
