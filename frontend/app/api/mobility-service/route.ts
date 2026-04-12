/**
 * 교통약자 이동지원 서비스 종합 API
 *
 * 호출 순서:
 *   1. center_info_v2   — 센터 목록·연락처·좌표·예약수단
 *   2. info_vehicle_use_v2 — 운영차량수·가용차량수·예약건수·대기건수
 *
 * stdgCd 변환:
 *   앱의 행정동 10자리 → lib/sigungu-codes 로 시군구 10자리(API 형식) 변환
 */

import { NextResponse } from 'next/server'
import type {
  MobilityCenterDetail,
  MobilityCenterStatus,
  MobilityServiceSummary,
} from '@/types/transportation'
import { haengjeongToApiStdgCd } from '@/lib/sigungu-codes'

const API_KEY = process.env.PUBLIC_DATA_API_KEY
const BASE_URL = 'https://apis.data.go.kr/B551982/tsdo_v2'

// ─── 원본 API 타입 ────────────────────────────────────────────────────────────

interface CenterInfoRaw {
  centerId?: string
  centerNm?: string
  telNo?: string
  rdnmaAdr?: string
  lnmaAdr?: string
  lat?: string | number
  lon?: string | number
  operHrCn?: string
  wbstAdr?: string   // 웹사이트
  appNm?: string     // 앱 이름
}

interface VehicleUseRaw {
  centerNm?: string
  opeVhclCo?: string | number   // 운영 차량 수
  ableVhclCo?: string | number  // 가용 차량 수
  rsvtNocs?: string | number    // 예약 건수
  waitNocs?: string | number    // 대기 건수
}

// ─── 유틸 ─────────────────────────────────────────────────────────────────────

function normalizeItems<T>(items: unknown): T[] {
  if (!items || items === '') return []
  const raw = (items as { item?: T | T[] })?.item
  if (!raw) return []
  return Array.isArray(raw) ? raw : [raw]
}

function toNum(v: string | number | undefined): number {
  return Number(v) || 0
}

function calcStatus(available: number, operating: number, hasData: boolean): MobilityCenterStatus {
  if (!hasData) return 'unknown'
  if (operating === 0) return 'unavailable'
  if (available > 0) return 'available'
  return 'busy'
}

function calcOverallStatus(centers: MobilityCenterDetail[]): MobilityCenterStatus {
  if (centers.length === 0) return 'unknown'
  if (centers.some((c) => c.status === 'available')) return 'available'
  if (centers.some((c) => c.status === 'busy')) return 'busy'
  if (centers.every((c) => c.status === 'unavailable')) return 'unavailable'
  return 'unknown'
}

// ─── API 호출 ───────────────────────────────���───────────────────────────────���─

async function fetchCenters(apiStdgCd: string): Promise<CenterInfoRaw[]> {
  if (!API_KEY) return []

  const params = new URLSearchParams({
    pageNo: '1',
    numOfRows: '50',
    type: 'JSON',
    stdgCd: apiStdgCd,
  })

  try {
    const res = await fetch(
      `${BASE_URL}/center_info_v2?serviceKey=${API_KEY}&${params}`,
      { signal: AbortSignal.timeout(8000) },
    )
    if (!res.ok) return []

    const json = await res.json()
    if (json?.response?.header?.resultCode !== '00') return []
    return normalizeItems<CenterInfoRaw>(json.response.body.items)
  } catch {
    return []
  }
}

async function fetchVehicleUse(apiStdgCd: string): Promise<Map<string, VehicleUseRaw>> {
  const map = new Map<string, VehicleUseRaw>()
  if (!API_KEY) return map

  const params = new URLSearchParams({
    pageNo: '1',
    numOfRows: '50',
    type: 'JSON',
    stdgCd: apiStdgCd,
  })

  try {
    const res = await fetch(
      `${BASE_URL}/info_vehicle_use_v2?serviceKey=${API_KEY}&${params}`,
      { signal: AbortSignal.timeout(8000) },
    )
    if (!res.ok) return map

    const json = await res.json()
    if (json?.response?.header?.resultCode !== '00') return map

    const rows = normalizeItems<VehicleUseRaw>(json.response.body.items)
    for (const row of rows) {
      if (row.centerNm) map.set(row.centerNm, row)
    }
  } catch {
    // 무시
  }
  return map
}

// ─── GET handler ──────────────────────────────────────────────────────────────

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const stdgCd = searchParams.get('stdgCd') || ''

  if (!stdgCd) {
    return NextResponse.json(null)
  }

  // 행정동 코드 → 시군구 API 코드 변환
  const region = haengjeongToApiStdgCd(stdgCd)
  if (!region) {
    return NextResponse.json(null)
  }

  const { apiCode, fullName } = region

  // 센터 정보 + 차량 이용 현황 병렬 조회
  const [centerRows, vehicleUseMap] = await Promise.all([
    fetchCenters(apiCode),
    fetchVehicleUse(apiCode),
  ])

  // 데이터 없는 지역
  if (centerRows.length === 0) {
    const empty: MobilityServiceSummary = {
      regionName: fullName,
      stdgCd: apiCode,
      centerCount: 0,
      totalOperatingVehicles: 0,
      totalAvailableVehicles: 0,
      totalWaitingCount: 0,
      totalReservationCount: 0,
      status: 'unknown',
      centers: [],
    }
    return NextResponse.json(empty)
  }

  // 센터별 상세 데이터 조합
  const centers: MobilityCenterDetail[] = centerRows.map((c, i) => {
    const use = c.centerNm ? vehicleUseMap.get(c.centerNm) : undefined
    const operating = toNum(use?.opeVhclCo)
    const available = toNum(use?.ableVhclCo)
    const reservation = toNum(use?.rsvtNocs)
    const waiting = toNum(use?.waitNocs)

    return {
      id: c.centerId ?? `center-${apiCode}-${i}`,
      name: c.centerNm ?? '이동지원센터',
      address: c.rdnmaAdr ?? c.lnmaAdr ?? '',
      phone: c.telNo ?? '',
      lat: c.lat ? Number(c.lat) : null,
      lng: c.lon ? Number(c.lon) : null,
      operatingHours: c.operHrCn,
      website: c.wbstAdr,
      app: c.appNm,
      operatingVehicleCount: operating,
      availableVehicleCount: available,
      reservationCount: reservation,
      waitingCount: waiting,
      status: calcStatus(available, operating, use !== undefined),
    }
  })

  // 전체 합산
  const totalOperating = centers.reduce((s, c) => s + c.operatingVehicleCount, 0)
  const totalAvailable = centers.reduce((s, c) => s + c.availableVehicleCount, 0)
  const totalWaiting = centers.reduce((s, c) => s + c.waitingCount, 0)
  const totalReservation = centers.reduce((s, c) => s + c.reservationCount, 0)

  const summary: MobilityServiceSummary = {
    regionName: fullName,
    stdgCd: apiCode,
    centerCount: centers.length,
    totalOperatingVehicles: totalOperating,
    totalAvailableVehicles: totalAvailable,
    totalWaitingCount: totalWaiting,
    totalReservationCount: totalReservation,
    status: calcOverallStatus(centers),
    centers,
  }

  return NextResponse.json(summary)
}
