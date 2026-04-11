'use client'

import { X, ArrowUpDown, AlertTriangle, Bus, Car, Phone, Clock, MapPin } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { Elevator, AccidentSpot, MobilityCenter, BusStop } from '@/types/transportation'

interface MarkerPopupProps {
  type: 'elevator' | 'accidentSpot' | 'busStop' | 'mobilityCenter'
  data: Elevator | AccidentSpot | MobilityCenter | BusStop
  onClose: () => void
}

export function MarkerPopup({ type, data, onClose }: MarkerPopupProps) {
  return (
    <div className="absolute bottom-4 left-4 right-4 z-50">
      <Card className="shadow-lg">
        <CardHeader className="pb-2 flex flex-row items-start justify-between">
          <div className="flex items-center gap-2">
            {type === 'elevator' && <ArrowUpDown className="h-5 w-5 text-success" />}
            {type === 'accidentSpot' && <AlertTriangle className="h-5 w-5 text-warning" />}
            {type === 'busStop' && <Bus className="h-5 w-5 text-primary" />}
            {type === 'mobilityCenter' && <Car className="h-5 w-5 text-chart-4" />}
            <CardTitle className="text-lg">
              {type === 'elevator' && '승강기 정보'}
              {type === 'accidentSpot' && '사고다발지점'}
              {type === 'busStop' && '정류장 정보'}
              {type === 'mobilityCenter' && '이동지원센터'}
            </CardTitle>
          </div>
          <Button variant="ghost" size="icon" className="h-8 w-8 -mt-1 -mr-2" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent className="pt-0">
          {type === 'elevator' && <ElevatorInfo data={data as Elevator} />}
          {type === 'accidentSpot' && <AccidentSpotInfo data={data as AccidentSpot} />}
          {type === 'busStop' && <BusStopInfo data={data as BusStop} />}
          {type === 'mobilityCenter' && <MobilityCenterInfo data={data as MobilityCenter} />}
        </CardContent>
      </Card>
    </div>
  )
}

function ElevatorInfo({ data }: { data: Elevator }) {
  const statusText = {
    normal: '정상 운행',
    maintenance: '점검 중',
    error: '운행 중단',
  }

  const statusColor = {
    normal: 'bg-success text-success-foreground',
    maintenance: 'bg-warning text-warning-foreground',
    error: 'bg-destructive text-destructive-foreground',
  }

  return (
    <div className="space-y-3">
      <div>
        <h4 className="font-semibold text-lg">{data.stationName}</h4>
        <p className="text-sm text-muted-foreground">{data.lineNum}</p>
      </div>

      <div className="flex items-center gap-2">
        <MapPin className="h-4 w-4 text-muted-foreground shrink-0" />
        <span className="text-sm">{data.location}</span>
      </div>

      <div className="flex items-center justify-between">
        <span className={`px-3 py-1 rounded-full text-sm font-medium ${statusColor[data.status]}`}>
          {statusText[data.status]}
        </span>
        {data.lastUpdated && (
          <span className="text-xs text-muted-foreground flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {data.lastUpdated}
          </span>
        )}
      </div>
    </div>
  )
}

function AccidentSpotInfo({ data }: { data: AccidentSpot }) {
  const riskColor = {
    high: 'bg-destructive text-destructive-foreground',
    medium: 'bg-warning text-warning-foreground',
    low: 'bg-muted text-muted-foreground',
  }

  const riskText = {
    high: '위험',
    medium: '주의',
    low: '낮음',
  }

  return (
    <div className="space-y-3">
      <div className="flex items-start gap-2">
        <MapPin className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
        <span className="text-sm">{data.address}</span>
      </div>

      <div className="flex items-center gap-4">
        <span className={`px-3 py-1 rounded-full text-sm font-medium ${riskColor[data.riskLevel]}`}>
          위험도: {riskText[data.riskLevel]}
        </span>
        <span className="text-sm text-muted-foreground">사고 {data.accidentCount}건 발생</span>
      </div>

      {data.description && <p className="text-sm text-muted-foreground bg-muted p-2 rounded">{data.description}</p>}

      <p className="text-xs text-muted-foreground">이동 시 각별한 주의가 필요합니다.</p>
    </div>
  )
}

function BusStopInfo({ data }: { data: BusStop }) {
  return (
    <div className="space-y-3">
      <h4 className="font-semibold text-lg">{data.name}</h4>

      {data.routes && data.routes.length > 0 && (
        <div>
          <p className="text-sm text-muted-foreground mb-2">운행 노선</p>
          <div className="flex flex-wrap gap-2">
            {data.routes.map((route, index) => (
              <span key={index} className="px-2 py-1 bg-primary/10 text-primary rounded text-sm font-medium">
                {route}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function MobilityCenterInfo({ data }: { data: MobilityCenter }) {
  return (
    <div className="space-y-3">
      <h4 className="font-semibold text-lg">{data.centerName}</h4>

      <div className="flex items-start gap-2">
        <MapPin className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
        <span className="text-sm">{data.address}</span>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="p-2 bg-muted rounded">
          <p className="text-xs text-muted-foreground">대기 차량</p>
          <p className="text-lg font-bold text-primary">{data.availableTaxis}대</p>
        </div>
        <div className="p-2 bg-muted rounded">
          <p className="text-xs text-muted-foreground">예상 대기</p>
          <p className="text-lg font-bold">{data.waitTime}분</p>
        </div>
      </div>

      {data.operatingHours && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Clock className="h-4 w-4" />
          <span>{data.operatingHours}</span>
        </div>
      )}

      <Button className="w-full" onClick={() => (window.location.href = `tel:${data.phone}`)}>
        <Phone className="h-4 w-4 mr-2" />
        전화 연결: {data.phone}
      </Button>
    </div>
  )
}
