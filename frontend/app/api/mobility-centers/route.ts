import { NextResponse } from 'next/server'
import type { MobilityCenter } from '@/types/transportation'
import { haversineDistance } from '@/lib/geo'
import { haengjeongToApiStdgCd } from '@/lib/sigungu-codes'

const MOBILITY_API_KEY = process.env.PUBLIC_DATA_API_KEY
const BASE_URL = 'https://apis.data.go.kr/B551982/tsdo_v2'

// API 응답 원본 타입
interface CenterInfoRaw {
  centerNm?: string
  telNo?: string
  rdnmaAdr?: string   // 도로명 주소
  lnmaAdr?: string    // 지번 주소
  lat?: string | number
  lon?: string | number
  operHrCn?: string   // 운영 시간
}

interface VehicleUseRaw {
  centerNm?: string
  ableVhclCo?: string | number  // 이용 가능 차량 수
  waitNocs?: string | number    // 대기 건수
}

function normalizeItems<T>(items: unknown): T[] {
  if (!items || items === '') return []
  const raw = (items as { item?: T | T[] })?.item
  if (!raw) return []
  return Array.isArray(raw) ? raw : [raw]
}

async function fetchMobilityCenters(stdgCd: string): Promise<MobilityCenter[]> {
  if (!MOBILITY_API_KEY) throw new Error('PUBLIC_DATA_API_KEY 미설정')

  const params = new URLSearchParams({
    pageNo: '1',
    numOfRows: '50',
    type: 'json',
    stdgCd,
  })

  // 센터 정보 + 차량 이용현황 병렬 조회
  const [centerRes, vehicleRes] = await Promise.allSettled([
    fetch(`${BASE_URL}/center_info_v2?serviceKey=${MOBILITY_API_KEY}&${params}`, {
      signal: AbortSignal.timeout(8000),
    }),
    fetch(`${BASE_URL}/info_vehicle_use_v2?serviceKey=${MOBILITY_API_KEY}&${params}`, {
      signal: AbortSignal.timeout(8000),
    }),
  ])

  // 센터 정보 파싱
  let centerRows: CenterInfoRaw[] = []
  if (centerRes.status === 'fulfilled' && centerRes.value.ok) {
    const json = await centerRes.value.json()
    if (json?.response?.header?.resultCode === '00') {
      centerRows = normalizeItems<CenterInfoRaw>(json.response.body.items)
    }
  }

  // 차량 이용현황 파싱 (센터명으로 매핑)
  const vehicleUseMap = new Map<string, VehicleUseRaw>()
  if (vehicleRes.status === 'fulfilled' && vehicleRes.value.ok) {
    const json = await vehicleRes.value.json()
    if (json?.response?.header?.resultCode === '00') {
      const rows = normalizeItems<VehicleUseRaw>(json.response.body.items)
      for (const row of rows) {
        if (row.centerNm) vehicleUseMap.set(row.centerNm, row)
      }
    }
  }

  return centerRows
    .filter((row) => row.lat && row.lon)
    .map((row, index) => {
      const use = row.centerNm ? vehicleUseMap.get(row.centerNm) : undefined
      const availableTaxis = Number(use?.ableVhclCo) || 0
      const waitingCount = Number(use?.waitNocs) || 0

      return {
        id: `mc-${stdgCd}-${index}`,
        centerName: row.centerNm || '이동지원센터',
        address: row.rdnmaAdr || row.lnmaAdr || '',
        phone: row.telNo || '',
        availableTaxis,
        waitTime: Math.max(5, waitingCount * 5),
        lat: Number(row.lat),
        lng: Number(row.lon),
        operatingHours: row.operHrCn,
      }
    })
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const lat = parseFloat(searchParams.get('lat') || '37.5665')
  const lng = parseFloat(searchParams.get('lng') || '126.978')
  const radius = parseInt(searchParams.get('radius') || '1000')
  const stdgCd = searchParams.get('stdgCd') || ''

  if (!stdgCd) return NextResponse.json([])

  // 행정동 10자리 → 시군구 10자리(API 형식) 변환
  const region = haengjeongToApiStdgCd(stdgCd)
  const apiStdgCd = region?.apiCode ?? stdgCd

  try {
    const all = await fetchMobilityCenters(apiStdgCd)

    const filtered = all.filter(
      (c) => haversineDistance(lat, lng, c.lat, c.lng) <= radius
    )

    return NextResponse.json(filtered)
  } catch (error) {
    console.error('이동지원센터 API 오류, 목업 사용:', error)
    return NextResponse.json(generateMockMobilityCenters(lat, lng, radius))
  }
}

// ─── 목업 (폴백용) ─────────────────────────────────────────────────────────────
function generateMockMobilityCenters(
  centerLat: number,
  centerLng: number,
  radius: number
): MobilityCenter[] {
  const centers = [
    { name: '교통약자 이동지원센터', phone: '1588-4388' },
    { name: '장애인 콜택시 센터', phone: '02-120' },
  ]

  return centers.map((center, index) => {
    const angle = (index / centers.length) * 2 * Math.PI + Math.PI / 4
    const distance = (0.4 + index * 0.2) * (radius / 111000)
    const lat = centerLat + distance * Math.cos(angle)
    const lng =
      centerLng +
      (distance * Math.sin(angle)) / Math.cos((centerLat * Math.PI) / 180)

    return {
      id: `mc-mock-${index + 1}`,
      centerName: center.name,
      address: '',
      phone: center.phone,
      availableTaxis: 3,
      waitTime: 10,
      lat,
      lng,
      operatingHours: '06:00 - 22:00',
    }
  })
}
