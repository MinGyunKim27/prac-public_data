import { NextResponse } from 'next/server'
import type { Elevator } from '@/types/transportation'
import { haversineDistance } from '@/lib/geo'

const SEOUL_METRO_API_KEY = process.env.SEOUL_METRO_API_KEY
const KAKAO_REST_API_KEY = process.env.KAKAO_REST_API_KEY
const PAGE_SIZE = 1000

// 실제 API 응답 필드명
interface SeoulMetroFaciRow {
  STN_CD?: string    // 역코드
  STN_NM?: string    // 역명
  ELVTR_NM?: string  // 승강기명
  OPR_SEC?: string   // 운행구간
  INSTL_PSTN?: string // 설치위치
  USE_YN?: string    // 운영상태 (Y/N)
  ELVTR_SE?: string  // 승강기 구분 (엘리베이터/에스컬레이터 등)
}

// 모듈 레벨 캐시 — 서버 인스턴스 생존 동안 유지되어 중복 Kakao 호출 방지
const geocodeCache = new Map<string, { lat: number; lng: number } | null>()

async function geocodeStation(
  stationName: string
): Promise<{ lat: number; lng: number } | null> {
  if (geocodeCache.has(stationName)) return geocodeCache.get(stationName)!

  if (!KAKAO_REST_API_KEY) {
    geocodeCache.set(stationName, null)
    return null
  }

  const query = stationName.endsWith('역') ? stationName : `${stationName}역`
  const url = `https://dapi.kakao.com/v2/local/search/keyword.json?query=${encodeURIComponent(query)}&category_group_code=SW8&size=1`

  try {
    const res = await fetch(url, {
      headers: { Authorization: `KakaoAK ${KAKAO_REST_API_KEY}` },
      signal: AbortSignal.timeout(3000),
    })
    if (!res.ok) {
      geocodeCache.set(stationName, null)
      return null
    }
    const json = await res.json()
    const doc = json.documents?.[0]
    const coords = doc ? { lat: parseFloat(doc.y), lng: parseFloat(doc.x) } : null
    geocodeCache.set(stationName, coords)
    return coords
  } catch {
    geocodeCache.set(stationName, null)
    return null
  }
}

async function fetchAllElevators(): Promise<Elevator[]> {
  if (!SEOUL_METRO_API_KEY) throw new Error('SEOUL_METRO_API_KEY 미설정')

  const url = `http://openapi.seoul.go.kr:8088/${SEOUL_METRO_API_KEY}/json/SeoulMetroFaciInfo/1/${PAGE_SIZE}/`
  const res = await fetch(url, { signal: AbortSignal.timeout(8000) })
  if (!res.ok) throw new Error(`서울 승강기 API HTTP ${res.status}`)

  const json = await res.json()
  const meta = json?.SeoulMetroFaciInfo
  if (!meta || meta.RESULT?.CODE !== 'INFO-000') {
    throw new Error(`서울 승강기 API 오류: ${meta?.RESULT?.MESSAGE}`)
  }

  const rows: SeoulMetroFaciRow[] = meta.row ?? []

  // 캐시에 없는 역명만 Kakao 지오코딩 (5개씩 병렬)
  const uncachedNames = [
    ...new Set(rows.map((r) => r.STN_NM).filter((n): n is string => !!n && !geocodeCache.has(n))),
  ]
  for (let i = 0; i < uncachedNames.length; i += 5) {
    await Promise.allSettled(
      uncachedNames.slice(i, i + 5).map((name) => geocodeStation(name))
    )
  }

  return rows
    .map((row, index): Elevator | null => {
      if (!row.STN_NM) return null
      const coords = geocodeCache.get(row.STN_NM)
      if (!coords) return null

      return {
        id: `${row.STN_CD ?? 'unk'}-${row.ELVTR_NM ?? index}`,
        stationName: row.STN_NM,
        lineNum: '',
        location: [row.INSTL_PSTN, row.OPR_SEC].filter(Boolean).join(' '),
        status: row.USE_YN === 'Y' ? 'normal' : 'error',
        lat: coords.lat,
        lng: coords.lng,
      }
    })
    .filter((e): e is Elevator => e !== null)
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const lat = parseFloat(searchParams.get('lat') || '37.5665')
  const lng = parseFloat(searchParams.get('lng') || '126.978')
  const radius = parseInt(searchParams.get('radius') || '1000')

  try {
    const all = await fetchAllElevators()

    const filtered = all.filter(
      (e) => haversineDistance(lat, lng, e.lat, e.lng) <= radius
    )

    console.log(
      `[승강기] 전체 ${all.length}건 → 반경 ${radius}m 내 ${filtered.length}건`
    )
    return NextResponse.json(filtered)
  } catch (error) {
    console.error('승강기 API 오류, 목업 사용:', error)
    return NextResponse.json(generateMockElevators(lat, lng, radius))
  }
}

// ─── 목업 (폴백용) ─────────────────────────────────────────────────────────────
function generateMockElevators(
  centerLat: number,
  centerLng: number,
  radius: number
): Elevator[] {
  const stations = [
    { name: '시청', line: '1' },
    { name: '을지로입구', line: '2' },
  ]
  return stations.map((s, index) => {
    const angle = (index / stations.length) * 2 * Math.PI
    const distance = 0.3 * (radius / 111000)
    return {
      id: `elev-mock-${index + 1}`,
      stationName: s.name,
      lineNum: s.line,
      location: '1번 출구',
      status: 'normal',
      lat: centerLat + distance * Math.cos(angle),
      lng: centerLng + (distance * Math.sin(angle)) / Math.cos((centerLat * Math.PI) / 180),
    }
  })
}
