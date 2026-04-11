'use client'

import { useState, useEffect, useCallback } from 'react'
import type { Location } from '@/types/transportation'

interface GeolocationState {
  location: Location | null
  error: string | null
  loading: boolean
}

// 서울시청 좌표 (기본값)
const DEFAULT_LOCATION: Location = {
  lat: 37.5665,
  lng: 126.978,
  name: '서울시청',
}

export function useGeolocation() {
  const [state, setState] = useState<GeolocationState>({
    location: null,
    error: null,
    loading: true,
  })

  const getCurrentPosition = useCallback(() => {
    if (!navigator.geolocation) {
      setState({
        location: DEFAULT_LOCATION,
        error: '이 브라우저에서는 위치 서비스를 지원하지 않습니다.',
        loading: false,
      })
      return
    }

    setState((prev) => ({ ...prev, loading: true }))

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setState({
          location: {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          },
          error: null,
          loading: false,
        })
      },
      (error) => {
        let errorMessage = '위치를 가져올 수 없습니다.'
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = '위치 권한이 거부되었습니다. 설정에서 위치 권한을 허용해주세요.'
            break
          case error.POSITION_UNAVAILABLE:
            errorMessage = '위치 정보를 사용할 수 없습니다.'
            break
          case error.TIMEOUT:
            errorMessage = '위치 요청 시간이 초과되었습니다.'
            break
        }
        setState({
          location: DEFAULT_LOCATION,
          error: errorMessage,
          loading: false,
        })
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000,
      }
    )
  }, [])

  useEffect(() => {
    getCurrentPosition()
  }, [getCurrentPosition])

  return {
    ...state,
    refresh: getCurrentPosition,
    defaultLocation: DEFAULT_LOCATION,
  }
}
