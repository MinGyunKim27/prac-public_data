'use client'

import { useState, useEffect } from 'react'
import { Copy, Phone, Check, Share2, MessageCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import type { Location } from '@/types/transportation'

interface GuardianShareProps {
  currentLocation: Location | null
}

// Kakao JS SDK 초기화 (한 번만)
function initKakao() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const Kakao = (window as any).Kakao
  if (!Kakao) return null
  if (!Kakao.isInitialized()) {
    Kakao.init(process.env.NEXT_PUBLIC_KAKAO_MAP_KEY)
  }
  return Kakao
}

export function GuardianShareContent({ currentLocation }: GuardianShareProps) {
  const [copied, setCopied] = useState(false)
  const [phoneNumber, setPhoneNumber] = useState('')
  const [address, setAddress] = useState<string | null>(null)

  // 좌표 → 주소 역지오코딩 (Kakao Maps geocoder)
  useEffect(() => {
    if (!currentLocation) return
    if (typeof window === 'undefined') return

    const tryGeocode = () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const kakao = (window as any).kakao
      if (!kakao?.maps?.services) return false

      const geocoder = new kakao.maps.services.Geocoder()
      geocoder.coord2Address(
        currentLocation.lng,
        currentLocation.lat,
        (result: { address: { address_name: string }; road_address: { address_name: string } | null }[], status: string) => {
          if (status === kakao.maps.services.Status.OK && result[0]) {
            const road = result[0].road_address?.address_name
            const jibun = result[0].address?.address_name
            setAddress(road || jibun || null)
          }
        },
      )
      return true
    }

    if (!tryGeocode()) {
      // Map SDK 로드 대기
      const timer = setInterval(() => {
        if (tryGeocode()) clearInterval(timer)
      }, 300)
      return () => clearInterval(timer)
    }
  }, [currentLocation])

  const locationLabel = address
    || currentLocation?.name
    || (currentLocation ? `위도 ${currentLocation.lat.toFixed(5)}, 경도 ${currentLocation.lng.toFixed(5)}` : null)

  const shareUrl = currentLocation
    ? `https://map.kakao.com/link/map/${encodeURIComponent(locationLabel ?? '내 위치')},${currentLocation.lat},${currentLocation.lng}`
    : ''

  const shareMessage = currentLocation
    ? `[위치 공유] ${locationLabel}\n지도 보기: ${shareUrl}`
    : ''

  const handleKakaoShare = async () => {
    if (!currentLocation) {
      alert('위치 정보를 가져오는 중입니다. 잠시 후 다시 시도해주세요.')
      return
    }

    const Kakao = initKakao()

    // Kakao SDK 사용 가능하면 카카오톡 공유
    if (Kakao?.Share) {
      try {
        Kakao.Share.sendDefault({
          objectType: 'feed',
          content: {
            title: '현재 위치 공유',
            description: locationLabel ?? '',
            link: {
              webUrl: shareUrl,
              mobileWebUrl: shareUrl,
            },
          },
          buttons: [
            {
              title: '지도에서 보기',
              link: {
                webUrl: shareUrl,
                mobileWebUrl: shareUrl,
              },
            },
          ],
          installTalk: true,
        })
        return
      } catch (e) {
        console.error('카카오톡 공유 실패:', e)
      }
    }

    // 폴백: Web Share API
    if (navigator.share) {
      try {
        await navigator.share({ title: '현재 위치 공유', text: shareMessage, url: shareUrl })
        return
      } catch {
        // 취소 등
      }
    }

    // 최종 폴백: 클립보드 복사
    try {
      await navigator.clipboard.writeText(shareMessage)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      alert('공유에 실패했습니다. 링크 복사 버튼을 이용해주세요.')
    }
  }

  const handleCopy = async () => {
    if (!shareMessage) return
    try {
      await navigator.clipboard.writeText(shareMessage)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('복사 실패:', err)
    }
  }

  const handleSmsShare = () => {
    if (!currentLocation || !phoneNumber) return
    const smsBody = encodeURIComponent(shareMessage)
    window.location.href = `sms:${phoneNumber}?body=${smsBody}`
  }

  return (
    <div className="space-y-6">
      <div className="text-center pb-4 border-b border-border">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-3">
          <Share2 className="h-8 w-8 text-primary" />
        </div>
        <h3 className="text-lg font-semibold">보호자에게 위치 공유</h3>
        <p className="text-sm text-muted-foreground mt-1">현재 위치를 가족이나 보호자에게 공유할 수 있습니다</p>
      </div>

      {/* 현재 위치 정보 */}
      <div className="p-4 bg-accent rounded-lg">
        <p className="text-sm text-muted-foreground mb-1">현재 위치</p>
        {locationLabel ? (
          <p className="font-medium">{locationLabel}</p>
        ) : (
          <p className="text-sm text-muted-foreground animate-pulse">위치를 가져오는 중...</p>
        )}
      </div>

      {/* 공유 버튼들 */}
      <div className="space-y-3">
        <Button
          variant="outline"
          className="w-full h-12 justify-start gap-3"
          onClick={handleCopy}
          disabled={!currentLocation}
        >
          {copied ? <Check className="h-5 w-5 text-success" /> : <Copy className="h-5 w-5" />}
          <span>{copied ? '복사되었습니다!' : '링크 복사하기'}</span>
        </Button>

        <Button
          className="w-full h-12 justify-start gap-3 bg-[#FEE500] hover:bg-[#FDD835] text-[#3C1E1E]"
          onClick={handleKakaoShare}
        >
          <MessageCircle className="h-5 w-5" />
          <span>카카오톡으로 공유</span>
        </Button>

        <div className="flex gap-2">
          <Input
            type="tel"
            value={phoneNumber}
            onChange={(e) => setPhoneNumber(e.target.value)}
            placeholder="전화번호 입력"
            className="flex-1 h-12"
          />
          <Button
            variant="secondary"
            className="h-12 px-4"
            onClick={handleSmsShare}
            disabled={!phoneNumber || !currentLocation}
          >
            <Phone className="h-5 w-5 mr-2" />
            문자 전송
          </Button>
        </div>
      </div>

      {/* 안내 문구 */}
      <p className="text-xs text-muted-foreground text-center">
        공유된 위치 정보는 링크를 받은 분만 확인할 수 있습니다
      </p>
    </div>
  )
}
