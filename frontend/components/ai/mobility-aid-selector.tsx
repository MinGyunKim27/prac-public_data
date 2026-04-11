'use client'

import { Accessibility, Baby, Heart, User } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { MobilityAid, UserType } from '@/types/transportation'

interface MobilityAidSelectorProps {
  mobilityAid: MobilityAid
  userType: UserType
  onMobilityAidChange: (aid: MobilityAid) => void
  onUserTypeChange: (type: UserType) => void
}

const MOBILITY_AIDS: { value: MobilityAid; label: string }[] = [
  { value: 'none', label: '없음' },
  { value: 'wheelchair', label: '휠체어' },
  { value: 'electricWheelchair', label: '전동휠체어' },
  { value: 'stroller', label: '유모차' },
  { value: 'walkingCane', label: '지팡이/보행기' },
]

const USER_TYPES: { value: UserType; label: string; icon: React.ReactNode }[] = [
  { value: 'general', label: '일반', icon: <User className="h-4 w-4" /> },
  { value: 'pregnant', label: '임산부', icon: <Heart className="h-4 w-4" /> },
  { value: 'withStroller', label: '유모차', icon: <Baby className="h-4 w-4" /> },
  { value: 'disabled', label: '장애인', icon: <Accessibility className="h-4 w-4" /> },
  { value: 'elderly', label: '고령자', icon: <User className="h-4 w-4" /> },
]

export function MobilityAidSelector({
  mobilityAid,
  userType,
  onMobilityAidChange,
  onUserTypeChange,
}: MobilityAidSelectorProps) {
  return (
    <div className="space-y-4 p-4 bg-card rounded-xl border border-border">
      {/* 사용자 유형 */}
      <div>
        <label className="text-sm font-medium text-muted-foreground mb-2 block">사용자 유형</label>
        <div className="flex flex-wrap gap-2">
          {USER_TYPES.map((type) => (
            <Button
              key={type.value}
              variant={userType === type.value ? 'default' : 'outline'}
              size="sm"
              onClick={() => onUserTypeChange(type.value)}
              className="h-9 gap-1.5"
            >
              {type.icon}
              <span>{type.label}</span>
            </Button>
          ))}
        </div>
      </div>

      {/* 이동 보조기구 */}
      <div>
        <label className="text-sm font-medium text-muted-foreground mb-2 block">이동 보조기구</label>
        <div className="flex flex-wrap gap-2">
          {MOBILITY_AIDS.map((aid) => (
            <Button
              key={aid.value}
              variant={mobilityAid === aid.value ? 'default' : 'outline'}
              size="sm"
              onClick={() => onMobilityAidChange(aid.value)}
              className="h-9"
            >
              {aid.label}
            </Button>
          ))}
        </div>
      </div>
    </div>
  )
}
