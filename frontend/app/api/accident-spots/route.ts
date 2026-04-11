import { NextResponse } from 'next/server'
import type { AccidentSpot } from '@/types/transportation'
import { epsg5181ToWgs84, haversineDistance } from '@/lib/geo'
import { getRegionFromStdgCd } from '@/lib/region'

const PUBLIC_DATA_API_KEY = process.env.PUBLIC_DATA_API_KEY
const BASE_URL = 'https://apis.data.go.kr/1613000/WEAK_TRAFFIC/T_OD_WEAK_TRAFFIC_BRN_INFO'

// 교통약자 유형 — 지점 1건당 여러 유형을 합산해 사고건수가 많은 지점을 보여주기 위해 복수 조회
const BRNCH_TYPES = ['고령자', '보행자', '자전거', '어린이'] as const

// API 응답 원본 타입
interface AccidentSpotRaw {
  PLC_NM: string         // 사고다발지점명
  OCRN_NOCS: string | number  // 사고 발생 건수
  DTH_NOCS?: string | number  // 사망자 수
  ACDNT_PNT_X: string | number  // TM X 좌표 (EPSG 5181)
  ACDNT_PNT_Y: string | number  // TM Y 좌표 (EPSG 5181)
  CRTR_YR?: string | number     // 기준연도
  BRNCH_SE_NM?: string          // 교통약자 유형
}

interface AccidentApiResponse {
  response: {
    header: { resultCode: string; resultMsg: string }
    body: {
      items: { item: AccidentSpotRaw | AccidentSpotRaw[] } | ''
      totalCount: number
      pageNo: number
      numOfRows: number
    }
  }
}

function getRiskLevel(count: number): 'high' | 'medium' | 'low' {
  if (count >= 10) return 'high'
  if (count >= 5) return 'medium'
  return 'low'
}

function normalizeItems(
  items: AccidentApiResponse['response']['body']['items']
): AccidentSpotRaw[] {
  if (!items || items === '') return []
  const raw = items.item
  if (!raw) return []
  return Array.isArray(raw) ? raw : [raw]
}

async function fetchAccidentSpots(
  sidoName: string,
  sigunguName: string
): Promise<AccidentSpot[]> {
  if (!PUBLIC_DATA_API_KEY) throw new Error('PUBLIC_DATA_API_KEY 미설정')
  if (!sidoName) throw new Error('시도명 없음 (stdgCd 미전달)')

  const currentYear = new Date().getFullYear()
  // 직전년도부터 역순으로 시도 (최신 연도 데이터가 아직 없을 수 있음)
  const candidateYears = [currentYear - 1, currentYear - 2, currentYear - 3]

  const spotMap = new Map<string, AccidentSpot>()

  for (const crtrYr of candidateYears) {
    spotMap.clear()

    await Promise.allSettled(
      BRNCH_TYPES.map(async (brnch) => {
        // serviceKey는 이미 인코딩된 값이므로 URLSearchParams 밖에서 수동으로 붙임
        const params = new URLSearchParams({
          pageNo: '1',
          numOfRows: '30',
          _type: 'json',
          crtr_yr: String(crtrYr),
          mtrpl_lcgv_nm: sidoName,
          brnch_se_nm: brnch,
          ...(sigunguName ? { basic_lcgv_nm: sigunguName } : {}),
        })

        const res = await fetch(`${BASE_URL}?serviceKey=${PUBLIC_DATA_API_KEY}&${params}`, {
          signal: AbortSignal.timeout(8000),
        })
        if (!res.ok) return

        const json: AccidentApiResponse = await res.json()
        const header = json?.response?.header
        // '03' = NODATA, 그 외 오류도 무시
        if (!header || header.resultCode !== '00') return

        const rows = normalizeItems(json.response.body.items)
      for (const row of rows) {
        const tmX = Number(row.ACDNT_PNT_X)
        const tmY = Number(row.ACDNT_PNT_Y)
        if (!tmX || !tmY) continue

        const { lat, lng } = epsg5181ToWgs84(tmX, tmY)
        // 유효 범위 검사 (한반도 대략 범위)
        if (lat < 33 || lat > 39 || lng < 124 || lng > 132) continue

        const id = `acc-${row.PLC_NM}-${tmX}`
        const count = Number(row.OCRN_NOCS) || 0

        if (spotMap.has(id)) {
          // 동일 지점 여러 유형 → 사고건수 합산
          const existing = spotMap.get(id)!
          existing.accidentCount += count
          existing.riskLevel = getRiskLevel(existing.accidentCount)
        } else {
          spotMap.set(id, {
            id,
            address: row.PLC_NM,
            accidentCount: count,
            riskLevel: getRiskLevel(count),
            lat,
            lng,
            description: row.BRNCH_SE_NM ?? brnch,
          })
        }
      }
      })
    )

    // 해당 연도에 데이터가 있으면 바로 반환
    if (spotMap.size > 0) break
  }

  return Array.from(spotMap.values())
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const lat = parseFloat(searchParams.get('lat') || '37.5665')
  const lng = parseFloat(searchParams.get('lng') || '126.978')
  const radius = parseInt(searchParams.get('radius') || '1000')
  const stdgCd = searchParams.get('stdgCd') || ''

  try {
    const { sidoName, sigunguName } = getRegionFromStdgCd(stdgCd)
    const all = await fetchAccidentSpots(sidoName, sigunguName)

    const filtered = all.filter(
      (s) => haversineDistance(lat, lng, s.lat, s.lng) <= radius
    )

    return NextResponse.json(filtered)
  } catch (error) {
    console.error('사고다발지점 API 오류, 목업 사용:', error)
    return NextResponse.json(generateMockAccidentSpots(lat, lng, radius))
  }
}

// ─── 목업 (폴백용) ─────────────────────────────────────────────────────────────
function generateMockAccidentSpots(centerLat: number, centerLng: number, radius: number): AccidentSpot[] {
  const spots = [
    { address: '종로구 세종대로 사거리', count: 12, desc: '횡단보도 주변 교통약자 사고 다발' },
    { address: '중구 을지로 횡단보도', count: 8, desc: '시각장애인 보행 주의 구역' },
    { address: '종로구 광화문 지하도 입구', count: 5, desc: '휠체어 이용자 주의 필요' },
    { address: '중구 명동 사거리', count: 15, desc: '보행자 밀집 지역 주의' },
  ]
  return spots.map((spot, index) => {
    const angle = (index / spots.length) * 2 * Math.PI + Math.PI / 6
    const distance = (Math.random() * 0.5 + 0.2) * (radius / 111000)
    const lat = centerLat + distance * Math.cos(angle)
    const lng = centerLng + (distance * Math.sin(angle)) / Math.cos((centerLat * Math.PI) / 180)
    return {
      id: `acc-${index + 1}`,
      address: spot.address,
      accidentCount: spot.count,
      riskLevel: spot.count >= 10 ? 'high' : spot.count >= 5 ? 'medium' : 'low' as 'high' | 'medium' | 'low',
      lat,
      lng,
      description: spot.desc,
    }
  })
}
