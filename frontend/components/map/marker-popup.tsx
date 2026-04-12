'use client'

import { X, AlertTriangle, Bus, Car, Phone, Clock, MapPin, Train, CheckCircle, XCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { SubwayStation, AccidentSpot, MobilityCenter, BusStop } from '@/types/transportation'

interface MarkerPopupProps {
  type: 'subwayStation' | 'accidentSpot' | 'busStop' | 'mobilityCenter'
  data: SubwayStation | AccidentSpot | MobilityCenter | BusStop
  onClose: () => void
}

export function MarkerPopup({ type, data, onClose }: MarkerPopupProps) {
  return (
    <div className="absolute bottom-4 left-4 right-4 z-50">
      <Card className="shadow-lg">
        <CardHeader className="pb-2 flex flex-row items-start justify-between">
          <div className="flex items-center gap-2">
            {type === 'subwayStation' && <Train className="h-5 w-5 text-purple-500" />}
            {type === 'accidentSpot' && <AlertTriangle className="h-5 w-5 text-warning" />}
            {type === 'busStop' && <Bus className="h-5 w-5 text-primary" />}
            {type === 'mobilityCenter' && <Car className="h-5 w-5 text-chart-4" />}
            <CardTitle className="text-lg">
              {type === 'subwayStation' && '지하철역 정보'}
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
          {type === 'subwayStation' && <SubwayStationInfo data={data as SubwayStation} />}
          {type === 'accidentSpot' && <AccidentSpotInfo data={data as AccidentSpot} />}
          {type === 'busStop' && <BusStopInfo data={data as BusStop} />}
          {type === 'mobilityCenter' && <MobilityCenterInfo data={data as MobilityCenter} />}
        </CardContent>
      </Card>
    </div>
  )
}

function SubwayStationInfo({ data }: { data: SubwayStation }) {
  const normalCount = data.elevators.filter((e) => e.status === 'normal').length
  const errorCount = data.elevators.filter((e) => e.status === 'error').length

  return (
    <div className="space-y-3">
      <div>
        <h4 className="font-semibold text-lg">{data.name}</h4>
        {data.line && <p className="text-sm text-muted-foreground">{data.line}</p>}
      </div>

      {data.elevators.length === 0 ? (
        <p className="text-sm text-muted-foreground">승강기 정보 없음 (서울메트로 미운영 역)</p>
      ) : (
        <>
          <div className="flex gap-3">
            <span className="flex items-center gap-1 text-sm text-green-600 font-medium">
              <CheckCircle className="h-4 w-4" />
              정상 {normalCount}대
            </span>
            {errorCount > 0 && (
              <span className="flex items-center gap-1 text-sm text-destructive font-medium">
                <XCircle className="h-4 w-4" />
                중단 {errorCount}대
              </span>
            )}
          </div>

          <div className="space-y-1.5 max-h-40 overflow-y-auto">
            {data.elevators.map((elev, i) => (
              <div
                key={i}
                className={`flex items-start justify-between text-sm p-2 rounded ${
                  elev.status === 'normal' ? 'bg-green-50' : 'bg-red-50'
                }`}
              >
                <div className="space-y-0.5">
                  <p className="font-medium">{elev.name || elev.type}</p>
                  {elev.location && (
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {elev.location}
                    </p>
                  )}
                  {elev.section && (
                    <p className="text-xs text-muted-foreground">{elev.section}</p>
                  )}
                </div>
                <span
                  className={`shrink-0 ml-2 px-2 py-0.5 rounded-full text-xs font-medium ${
                    elev.status === 'normal'
                      ? 'bg-green-100 text-green-700'
                      : 'bg-red-100 text-red-700'
                  }`}
                >
                  {elev.status === 'normal' ? '정상' : '중단'}
                </span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

function AccidentSpotInfo({ data }: { data: AccidentSpot }) {
  const riskColor = {
    high: 'bg-destructive text-destructive-foreground',
    medium: 'bg-warning text-warning-foreground',
    low: 'bg-muted text-muted-foreground',
  }
  const riskText = { high: '위험', medium: '주의', low: '낮음' }

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
      {data.description && (
        <p className="text-sm text-muted-foreground bg-muted p-2 rounded">{data.description}</p>
      )}
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
            {data.routes.map((route, i) => (
              <span key={i} className="px-2 py-1 bg-primary/10 text-primary rounded text-sm font-medium">
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
