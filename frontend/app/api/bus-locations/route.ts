// cspell:disable
import { NextResponse } from 'next/server'
import type { BusLocation } from '@/types/transportation'
import { haversineDistance } from '@/lib/geo'

const KAKAO_REST_API_KEY = process.env.KAKAO_REST_API_KEY
const PUBLIC_DATA_API_KEY = process.env.PUBLIC_DATA_API_KEY

const BUS_STOP_URL =
  'https://apis.data.go.kr/1613000/BusSttnInfoInqireService/getCrdntPrxmtSttnList'

// ─── 공공데이터 API (getCrdntPrxmtSttnList) ─────────────────────────────────

interface BusStopRaw {
  citycode?: number | string
  gpslati?: number | string
  gpslong?: number | string
  nodeid?: string
  nodenm?: string
  nodeno?: string
}

function normalizeItems(items: unknown): BusStopRaw[] {
  if (!items || items === '') return []
  const raw = (items as { item?: BusStopRaw | BusStopRaw[] })?.item
  if (!raw) return []
  return Array.isArray(raw) ? raw : [raw]
}

async function fetchBusStopsPublicApi(
  lat: number,
  lng: number,
): Promise<BusLocation[]> {
  if (!PUBLIC_DATA_API_KEY) throw new Error('PUBLIC_DATA_API_KEY 미설정')

  const params = new URLSearchParams({
    gpsLati: String(lat),
    gpsLong: String(lng),
    numOfRows: '30',
    pageNo: '1',
    _type: 'json',
  })

  const res = await fetch(
    `${BUS_STOP_URL}?serviceKey=${PUBLIC_DATA_API_KEY}&${params}`,
    { signal: AbortSignal.timeout(8000) },
  )
  if (!res.ok) throw new Error(`버스 정류소 API HTTP ${res.status}`)

  const json = await res.json()
  const header = json?.response?.header

  if (header?.resultCode === '03' || json?.response?.body?.totalCount === 0) return []
  if (header?.resultCode !== '00') {
    throw new Error(`버스 정류소 API [${header?.resultCode}]: ${header?.resultMsg ?? 'unknown'}`)
  }

  const rows = normalizeItems(json.response.body.items)
  return rows
    .map((r): BusLocation | null => {
      const stopLat = Number(r.gpslati)
      const stopLng = Number(r.gpslong)
      if (!stopLat || !stopLng) return null
      return {
        id: r.nodeid ?? `stop-${stopLat}-${stopLng}`,
        routeId: r.nodeid ?? '',
        routeName: r.nodenm ?? '버스정류장',
        currentStop: r.nodenm ?? '버스정류장',
        nextStop: '',
        lat: stopLat,
        lng: stopLng,
      }
    })
    .filter((b): b is BusLocation => b !== null)
}

// ─── 카카오 로컬 API (폴백) ───────────────────────────────────────────────────

interface KakaoPlace {
  id: string
  place_name: string
  category_name: string
  x: string  // 경도
  y: string  // 위도
}

async function fetchBusStopsKakao(
  lat: number,
  lng: number,
  radius: number,
): Promise<BusLocation[]> {
  if (!KAKAO_REST_API_KEY) throw new Error('KAKAO_REST_API_KEY 미설정')

  // category_group_code=BK9 → 버스 정류장 전용 카테고리로 서울 포함 전국 조회
  // 별도 category_name 필터 불필요
  const params = new URLSearchParams({
    category_group_code: 'BK9',
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
  if (!res.ok) throw new Error(`카카오 로컬 API HTTP ${res.status}`)

  const json = await res.json()
  return (json.documents as KakaoPlace[]).map((p): BusLocation => ({
    id: `kakao-${p.id}`,
    routeId: `kakao-${p.id}`,
    routeName: p.place_name,
    currentStop: p.place_name,
    nextStop: '',
    lat: parseFloat(p.y),
    lng: parseFloat(p.x),
  }))
}

// ─── GET handler ─────────────────────────────────────────────────────────────

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const lat = parseFloat(searchParams.get('lat') || '37.5665')
  const lng = parseFloat(searchParams.get('lng') || '126.978')
  const radius = parseInt(searchParams.get('radius') || '1000')

  // 우선순위 1: 카카오 카테고리 검색 BK9 — 서울 포함 전국 커버
  try {
    const stops = await fetchBusStopsKakao(lat, lng, radius)
    if (stops.length > 0) return NextResponse.json(stops)
  } catch (err) {
    console.error('카카오 버스정류장 API 오류:', err)
  }

  // 우선순위 2: TAGO 공공데이터 API — 경기·지방 등 보조 (서울 미지원)
  try {
    const stops = await fetchBusStopsPublicApi(lat, lng)
    if (stops.length > 0) {
      const filtered = stops.filter(
        (s) => haversineDistance(lat, lng, s.lat, s.lng) <= radius,
      )
      return NextResponse.json(filtered)
    }
  } catch (err) {
    console.error('버스 정류소 공공 API 오류:', err)
  }

  // 폴백: 목업
  console.warn('버스 정류소 목업 데이터 사용')
  return NextResponse.json(generateMockBusLocations(lat, lng, radius))
}

// ─── 목업 (폴백용) ────────────────────────────────────────────────────────────

function generateMockBusLocations(
  centerLat: number,
  centerLng: number,
  radius: number,
): BusLocation[] {
  const stops = [
    { id: 'mock-1', name: '버스정류장 1' },
    { id: 'mock-2', name: '버스정류장 2' },
    { id: 'mock-3', name: '버스정류장 3' },
  ]
  return stops
    .map((stop, index) => {
      const angle = (index / stops.length) * 2 * Math.PI
      const distance = 0.4 * (radius / 111000)
      const lat = centerLat + distance * Math.cos(angle)
      const lng =
        centerLng +
        (distance * Math.sin(angle)) / Math.cos((centerLat * Math.PI) / 180)
      return {
        id: stop.id,
        routeId: stop.id,
        routeName: stop.name,
        currentStop: stop.name,
        nextStop: '',
        lat,
        lng,
      }
    })
    .filter((b) => haversineDistance(centerLat, centerLng, b.lat, b.lng) <= radius)
}
