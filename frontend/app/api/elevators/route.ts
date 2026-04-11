import { NextResponse } from 'next/server'
import type { Elevator } from '@/types/transportation'
import { getStationCoords } from '@/lib/station-coords'
import { haversineDistance } from '@/lib/geo'

const SEOUL_METRO_API_KEY = process.env.SEOUL_METRO_API_KEY
const PAGE_SIZE = 1000 // 한 번에 최대 조회 건수

// 서울교통공사 SeoulMetroFaciInfo API 응답 원본 타입
interface SeoulMetroFaciRow {
  STATION_CD: string
  STATION_NM: string
  LINE_NUM: string
  FACI_ID: string
  FACI_NM: string
  FACI_TYPE_NM: string    // 엘리베이터 / 에스컬레이터 / 수직형 리프트 등
  FACI_STAT: string       // 정상 / 고장 / 점검중
  FACI_STAT_MSG?: string
  FLOOR_INFO?: string
  UPDT_DT?: string
}

interface SeoulMetroApiResponse {
  SeoulMetroFaciInfo: {
    list_total_count: number
    RESULT: { CODE: string; MESSAGE: string }
    row: SeoulMetroFaciRow[]
  }
}

function mapStatus(faci_stat: string): 'normal' | 'maintenance' | 'error' {
  if (faci_stat === '정상') return 'normal'
  if (faci_stat === '점검중') return 'maintenance'
  return 'error'
}

function rowToElevator(row: SeoulMetroFaciRow): Elevator | null {
  const coords = getStationCoords(row.STATION_NM)
  // 좌표를 찾을 수 없으면 지도 마커에는 표시하지 않으므로 null 반환
  if (!coords) return null

  return {
    id: row.FACI_ID || `${row.STATION_CD}-${row.FACI_NM}`,
    stationName: row.STATION_NM,
    lineNum: row.LINE_NUM,
    location: [row.FLOOR_INFO, row.FACI_NM].filter(Boolean).join(' '),
    status: mapStatus(row.FACI_STAT),
    lat: coords.lat,
    lng: coords.lng,
    lastUpdated: row.UPDT_DT,
  }
}

async function fetchAllElevators(): Promise<Elevator[]> {
  if (!SEOUL_METRO_API_KEY) throw new Error('SEOUL_METRO_API_KEY 미설정')

  // 전체 데이터 조회 (1~1000번째)
  const url = `http://openapi.seoul.go.kr:8088/${SEOUL_METRO_API_KEY}/json/SeoulMetroFaciInfo/1/${PAGE_SIZE}/`
  const res = await fetch(url, { signal: AbortSignal.timeout(8000) })
  if (!res.ok) throw new Error(`서울 승강기 API HTTP ${res.status}`)

  const json: SeoulMetroApiResponse = await res.json()
  const meta = json.SeoulMetroFaciInfo
  if (!meta || meta.RESULT?.CODE !== 'INFO-000') {
    throw new Error(`서울 승강기 API 오류: ${meta?.RESULT?.MESSAGE}`)
  }

  return (meta.row ?? [])
    .map(rowToElevator)
    .filter((e): e is Elevator => e !== null)
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const lat = parseFloat(searchParams.get('lat') || '37.5665')
  const lng = parseFloat(searchParams.get('lng') || '126.978')
  const radius = parseInt(searchParams.get('radius') || '1000')

  try {
    const all = await fetchAllElevators()

    // 반경 내 필터링
    const filtered = all.filter(
      (e) => haversineDistance(lat, lng, e.lat, e.lng) <= radius
    )

    console.log(`[승강기] 실제 API 사용: 전체 ${all.length}건 → 반경 ${radius}m 내 ${filtered.length}건`)
    return NextResponse.json(filtered)
  } catch (error) {
    console.error('승강기 API 오류, 목업 사용:', error)
    return NextResponse.json(generateMockElevators(lat, lng, radius))
  }
}

// ─── 목업 (폴백용) ─────────────────────────────────────────────────────────────
function generateMockElevators(centerLat: number, centerLng: number, radius: number): Elevator[] {
  const stations = [
    { name: '시청역', line: '1호선' }, { name: '을지로입구역', line: '2호선' },
    { name: '광화문역', line: '5호선' }, { name: '종각역', line: '1호선' },
    { name: '안국역', line: '3호선' }, { name: '경복궁역', line: '3호선' },
    { name: '서대문역', line: '5호선' }, { name: '충정로역', line: '2호선' },
  ]
  const locations = ['1번 출구', '2번 출구', '3번 출구', '대합실', '승강장', '환승통로']
  const statuses: Array<'normal' | 'maintenance' | 'error'> = [
    'normal', 'normal', 'normal', 'normal', 'maintenance', 'error',
  ]

  return stations.map((station, index) => {
    const angle = (index / stations.length) * 2 * Math.PI
    const distance = (Math.random() * 0.8 + 0.2) * (radius / 111000)
    const lat = centerLat + distance * Math.cos(angle)
    const lng = centerLng + (distance * Math.sin(angle)) / Math.cos((centerLat * Math.PI) / 180)
    return {
      id: `elv-${index + 1}`,
      stationName: station.name,
      lineNum: station.line,
      location: locations[index % locations.length],
      status: statuses[Math.floor(Math.random() * statuses.length)],
      lat,
      lng,
      lastUpdated: new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }),
    }
  })
}
