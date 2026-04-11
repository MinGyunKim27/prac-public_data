import { NextResponse } from 'next/server'
import type { MobilityCenter } from '@/types/transportation'

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8080'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const lat = parseFloat(searchParams.get('lat') || '37.5665')
  const lng = parseFloat(searchParams.get('lng') || '126.978')
  const radius = parseInt(searchParams.get('radius') || '1000')
  const stdgCd = searchParams.get('stdgCd')

  // stdgCd가 있으면 백엔드에서 실제 콜택시 데이터 조회
  if (stdgCd) {
    try {
      const res = await fetch(
        `${BACKEND_URL}/api/mobility?lat=${lat}&lng=${lng}&stdgCd=${stdgCd}`,
        { signal: AbortSignal.timeout(5000) }
      )
      const data = await res.json()

      if (data.success && data.data?.taxi) {
        const taxi = data.data.taxi
        const availableCount = parseInt(taxi.availableVehicleCount) || 0
        const waitingCount = parseInt(taxi.waitingCount) || 0
        // 대기 건수 기반 대략적인 대기 시간 추정 (건당 약 5분)
        const estimatedWaitMin = Math.max(5, waitingCount * 5)

        const center: MobilityCenter = {
          id: 'mc-backend-1',
          centerName: taxi.centerName,
          address: '교통약자 이동지원센터',
          phone: '1588-4388',
          availableTaxis: availableCount,
          waitTime: estimatedWaitMin,
          // 백엔드는 센터 좌표를 제공하지 않으므로 현재 위치 근방으로 표시
          lat: lat + 0.002,
          lng: lng + 0.002,
          operatingHours: '06:00 - 22:00',
        }
        return NextResponse.json([center])
      }
    } catch (error) {
      console.error('백엔드 이동지원센터 데이터 조회 실패, 목업 사용:', error)
    }
  }

  // 백엔드 미연결 시 목업 데이터 반환
  const mockCenters: MobilityCenter[] = generateMockMobilityCenters(lat, lng, radius)
  const filteredCenters = mockCenters.filter((center) => getDistance(lat, lng, center.lat, center.lng) <= radius)
  return NextResponse.json(filteredCenters)
}

function getDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLng = ((lng2 - lng1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) * Math.sin(dLng / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

function generateMockMobilityCenters(centerLat: number, centerLng: number, radius: number): MobilityCenter[] {
  const centers = [
    { name: '서울시 교통약자 이동지원센터', phone: '02-120' },
    { name: '종로구 이동지원센터', phone: '02-2148-1234' },
    { name: '중구 교통약자콜센터', phone: '02-3396-5678' },
    { name: '용산구 장애인콜택시', phone: '02-797-1234' },
  ]

  return centers.map((center, index) => {
    const angle = (index / centers.length) * 2 * Math.PI + Math.PI / 4
    const distance = (Math.random() * 0.6 + 0.3) * (radius / 111000)
    const lat = centerLat + distance * Math.cos(angle)
    const lng = centerLng + (distance * Math.sin(angle)) / Math.cos((centerLat * Math.PI) / 180)

    return {
      id: `mc-${index + 1}`,
      centerName: center.name,
      address: `서울특별시 ${['종로구', '중구', '용산구', '서대문구'][index % 4]}`,
      phone: center.phone,
      availableTaxis: Math.floor(Math.random() * 10) + 1,
      waitTime: Math.floor(Math.random() * 15) + 5,
      lat,
      lng,
      operatingHours: '06:00 - 22:00',
    }
  })
}
