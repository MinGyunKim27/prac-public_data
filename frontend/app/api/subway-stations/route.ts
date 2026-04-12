import { NextResponse } from 'next/server'
import type { SubwayStation, ElevatorStatus } from '@/types/transportation'
import { haversineDistance } from '@/lib/geo'

const KAKAO_REST_API_KEY = process.env.KAKAO_REST_API_KEY
const SEOUL_METRO_API_KEY = process.env.SEOUL_METRO_API_KEY
const PAGE_SIZE = 1000

interface KakaoPlace {
  id: string
  place_name: string
  category_name: string  // e.g. "교통,수송 > 지하철,전철 > 수도권 2호선"
  x: string  // 경도
  y: string  // 위도
}

interface SeoulMetroRow {
  STN_NM?: string    // 역명
  ELVTR_NM?: string  // 승강기명
  OPR_SEC?: string   // 운행구간
  INSTL_PSTN?: string // 설치위치
  USE_YN?: string    // 운영상태 (Y/N)
  ELVTR_SE?: string  // 승강기 구분
}

// "서울역", "강남역" → "서울", "강남"
function normalize(name: string): string {
  return name.replace(/역$/, '').replace(/\(.*?\)/g, '').trim()
}

// Kakao category_name에서 호선 추출
// e.g. "교통,수송 > 지하철,전철 > 수도권 2호선" → "2호선"
function extractLine(categoryName: string): string {
  const numbered = categoryName.match(/(\d+)호선/)
  if (numbered) return `${numbered[1]}호선`
  for (const name of ['분당선', '경의중앙선', '신분당선', '경춘선', '공항철도', 'GTX-A', 'GTX-B', 'GTX-C', '수인선', '경강선', '서해선', '우이신설선']) {
    if (categoryName.includes(name)) return name
  }
  return ''
}

async function fetchNearbyStations(
  lat: number,
  lng: number,
  radius: number,
): Promise<KakaoPlace[]> {
  if (!KAKAO_REST_API_KEY) throw new Error('KAKAO_REST_API_KEY 미설정')

  // category search 엔드포인트 + SW8 — 버스 정류장(BK9)과 동일 방식
  // keyword search에 query+category_group_code를 혼용하면 이름 매칭이 우선돼 거리 기준이 흐려짐
  const params = new URLSearchParams({
    category_group_code: 'SW8',
    x: String(lng),
    y: String(lat),
    radius: String(Math.min(radius, 20000)),
    sort: 'distance',
    size: '15',
  })

  const res = await fetch(
    `https://dapi.kakao.com/v2/local/search/category.json?${params}`,
    {
      headers: { Authorization: `KakaoAK ${KAKAO_REST_API_KEY}` },
      signal: AbortSignal.timeout(8000),
    },
  )
  if (!res.ok) throw new Error(`카카오 지하철역 검색 HTTP ${res.status}`)

  const json = await res.json()
  return (json.documents ?? []) as KakaoPlace[]
}

async function fetchSeoulMetroElevators(): Promise<SeoulMetroRow[]> {
  if (!SEOUL_METRO_API_KEY) return []

  const url = `http://openapi.seoul.go.kr:8088/${SEOUL_METRO_API_KEY}/json/SeoulMetroFaciInfo/1/${PAGE_SIZE}/`
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) })
    if (!res.ok) return []

    const json = await res.json()
    const meta = json?.SeoulMetroFaciInfo
    if (!meta || meta.RESULT?.CODE !== 'INFO-000') return []
    return meta.row ?? []
  } catch {
    return []
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const lat = parseFloat(searchParams.get('lat') || '37.5665')
  const lng = parseFloat(searchParams.get('lng') || '126.978')
  const radius = parseInt(searchParams.get('radius') || '1000')

  try {
    // 카카오 역 목록 + 서울메트로 승강기 데이터 병렬 조회
    const [kakaoStations, elevatorRows] = await Promise.all([
      fetchNearbyStations(lat, lng, radius),
      fetchSeoulMetroElevators(),
    ])

    // 정규화된 역명 → 승강기 목록 맵
    const elevatorMap = new Map<string, ElevatorStatus[]>()
    for (const row of elevatorRows) {
      if (!row.STN_NM) continue
      const key = normalize(row.STN_NM)
      if (!elevatorMap.has(key)) elevatorMap.set(key, [])
      elevatorMap.get(key)!.push({
        name: row.ELVTR_NM ?? '',
        location: row.INSTL_PSTN ?? '',
        section: row.OPR_SEC ?? '',
        type: row.ELVTR_SE ?? '',
        status: row.USE_YN === 'Y' ? 'normal' : 'error',
      })
    }

    // Kakao 역 + 승강기 데이터 조인
    const stations: SubwayStation[] = kakaoStations
      .filter((s) => {
        const sLat = parseFloat(s.y)
        const sLng = parseFloat(s.x)
        return haversineDistance(lat, lng, sLat, sLng) <= radius
      })
      .map((s): SubwayStation => {
        const stationLat = parseFloat(s.y)
        const stationLng = parseFloat(s.x)
        const key = normalize(s.place_name)
        const elevators = elevatorMap.get(key) ?? []

        return {
          id: `subway-${s.id}`,
          name: s.place_name,
          line: extractLine(s.category_name),
          lat: stationLat,
          lng: stationLng,
          elevators,
        }
      })

    return NextResponse.json(stations)
  } catch (error) {
    console.error('지하철역 API 오류:', error)
    return NextResponse.json([])
  }
}
