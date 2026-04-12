'use client'

import useSWR from 'swr'
import type { Location, RadiusOption } from '@/types/transportation'

interface UseRealTimeDataOptions {
  center: Location | null
  radius: RadiusOption
  stdgCd?: string
  refreshInterval?: number
  enabled?: boolean
}

const fetcher = async (url: string) => {
  const res = await fetch(url)
  if (!res.ok) throw new Error('데이터를 불러오는데 실패했습니다.')
  return res.json()
}

// 지하철역 + 승강기 통합 훅 (Kakao SW8 + 서울메트로 API)
export function useSubwayStationData({
  center,
  radius,
  refreshInterval = 60000,
  enabled = true,
}: UseRealTimeDataOptions) {
  const key =
    center && enabled
      ? `/api/subway-stations?lat=${center.lat}&lng=${center.lng}&radius=${radius}`
      : null

  return useSWR(key, fetcher, {
    refreshInterval,
    revalidateOnFocus: false,
    dedupingInterval: 30000,
  })
}

// 이동지원센터 데이터 훅
export function useMobilityCenterData({
  center,
  radius,
  stdgCd,
  refreshInterval = 30000,
  enabled = true,
}: UseRealTimeDataOptions) {
  const stdgParam = stdgCd ? `&stdgCd=${stdgCd}` : ''
  const key =
    center && enabled
      ? `/api/mobility-centers?lat=${center.lat}&lng=${center.lng}&radius=${radius}${stdgParam}`
      : null

  return useSWR(key, fetcher, {
    refreshInterval,
    revalidateOnFocus: false,
    dedupingInterval: 5000,
  })
}

// 사고다발지점 데이터 훅
export function useAccidentSpotData({
  center,
  radius,
  stdgCd,
  refreshInterval = 60000,
  enabled = true,
}: UseRealTimeDataOptions) {
  const stdgParam = stdgCd ? `&stdgCd=${stdgCd}` : ''
  const key =
    center && enabled
      ? `/api/accident-spots?lat=${center.lat}&lng=${center.lng}&radius=${radius}${stdgParam}`
      : null

  return useSWR(key, fetcher, {
    refreshInterval,
    revalidateOnFocus: false,
    dedupingInterval: 10000,
  })
}

// 버스 정류소 데이터 훅
export function useBusLocationData({
  center,
  radius,
  stdgCd,
  refreshInterval = 15000,
  enabled = true,
}: UseRealTimeDataOptions) {
  const stdgParam = stdgCd ? `&stdgCd=${stdgCd}` : ''
  const key =
    center && enabled
      ? `/api/bus-locations?lat=${center.lat}&lng=${center.lng}&radius=${radius}${stdgParam}`
      : null

  return useSWR(key, fetcher, {
    refreshInterval,
    revalidateOnFocus: false,
    dedupingInterval: 5000,
  })
}

// 통합 데이터 훅 (모든 레이어 데이터)
export function useAllTransportData(options: UseRealTimeDataOptions) {
  const subwayStations = useSubwayStationData(options)
  const mobilityCenters = useMobilityCenterData(options)
  const accidentSpots = useAccidentSpotData(options)
  const busLocations = useBusLocationData(options)

  const isLoading =
    subwayStations.isLoading ||
    mobilityCenters.isLoading ||
    accidentSpots.isLoading ||
    busLocations.isLoading

  const isError =
    subwayStations.error ||
    mobilityCenters.error ||
    accidentSpots.error ||
    busLocations.error

  const refetchAll = () => {
    subwayStations.mutate()
    mobilityCenters.mutate()
    accidentSpots.mutate()
    busLocations.mutate()
  }

  return {
    subwayStations: subwayStations.data || [],
    mobilityCenters: mobilityCenters.data || [],
    accidentSpots: accidentSpots.data || [],
    busLocations: busLocations.data || [],
    isLoading,
    isError,
    refetchAll,
  }
}
