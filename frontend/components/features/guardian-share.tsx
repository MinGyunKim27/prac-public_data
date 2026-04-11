'use client'

import { useState } from 'react'
import { Copy, MessageCircle, Phone, Check, Share2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import type { Location } from '@/types/transportation'

interface GuardianShareProps {
  currentLocation: Location | null
}

export function GuardianShareContent({ currentLocation }: GuardianShareProps) {
  const [copied, setCopied] = useState(false)
  const [phoneNumber, setPhoneNumber] = useState('')

  const shareUrl = currentLocation
    ? `https://map.kakao.com/link/map/${encodeURIComponent(currentLocation.name || '내 위치')},${currentLocation.lat},${currentLocation.lng}`
    : ''

  const shareMessage = currentLocation
    ? `[위치 공유] ${currentLocation.name || '현재 위치'}\n${currentLocation.address || ''}\n지도 보기: ${shareUrl}`
    : '위치 정보를 가져오는 중입니다...'

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareMessage)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('복사 실패:', err)
    }
  }

  const handleKakaoShare = () => {
    if (!currentLocation) return

    // 카카오톡 공유 API (실제 구현 시 카카오 SDK 사용)
    if (typeof window !== 'undefined' && window.Kakao?.Link) {
      window.Kakao.Link.sendDefault({
        objectType: 'location',
        address: currentLocation.address || '현재 위치',
        addressTitle: currentLocation.name || '내 위치',
        content: {
          title: '위치 공유',
          description: currentLocation.address || '',
          imageUrl: 'https://example.com/map-icon.png',
          link: {
            webUrl: shareUrl,
            mobileWebUrl: shareUrl,
          },
        },
      })
    } else {
      // 카카오 SDK 없을 때 대체
      window.open(`https://sharer.kakao.com/talk/friends/picker/link?url=${encodeURIComponent(shareUrl)}`, '_blank')
    }
  }

  const handleSmsShare = () => {
    if (!currentLocation) return
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
        <p className="font-medium">{currentLocation?.name || '위치를 가져오는 중...'}</p>
        {currentLocation?.address && <p className="text-sm text-muted-foreground">{currentLocation.address}</p>}
      </div>

      {/* 공유 버튼들 */}
      <div className="space-y-3">
        <Button variant="outline" className="w-full h-12 justify-start gap-3" onClick={handleCopy}>
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
          <Button variant="secondary" className="h-12 px-4" onClick={handleSmsShare} disabled={!phoneNumber}>
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
