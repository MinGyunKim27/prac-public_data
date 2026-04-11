'use client'

import { Minus, Plus, Type } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useAccessibility } from './accessibility-provider'
import { FONT_SCALE_LABELS } from '@/types/accessibility'

export function FontSizeControl() {
  const { settings, increaseFontSize, decreaseFontSize } = useAccessibility()
  const isSmallest = settings.fontScale === 'sm'
  const isLargest = settings.fontScale === 'xl'

  return (
    <div className="flex items-center gap-1">
      <Button
        variant="outline"
        size="icon"
        onClick={decreaseFontSize}
        disabled={isSmallest}
        className="h-11 w-11 min-h-[44px] min-w-[44px]"
        aria-label="글자 크기 줄이기"
      >
        <Minus className="h-5 w-5" />
      </Button>
      <div className="flex items-center gap-1 px-2 min-w-[80px] justify-center">
        <Type className="h-5 w-5" />
        <span className="text-sm font-medium">{FONT_SCALE_LABELS[settings.fontScale]}</span>
      </div>
      <Button
        variant="outline"
        size="icon"
        onClick={increaseFontSize}
        disabled={isLargest}
        className="h-11 w-11 min-h-[44px] min-w-[44px]"
        aria-label="글자 크기 키우기"
      >
        <Plus className="h-5 w-5" />
      </Button>
    </div>
  )
}
