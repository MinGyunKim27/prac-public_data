'use client'

import { Contrast } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useAccessibility } from './accessibility-provider'

export function HighContrastToggle() {
  const { settings, toggleHighContrast } = useAccessibility()

  return (
    <Button
      variant={settings.highContrast ? 'default' : 'outline'}
      onClick={toggleHighContrast}
      className="h-11 min-h-[44px] gap-2"
      aria-label={settings.highContrast ? '고대비 모드 끄기' : '고대비 모드 켜기'}
      aria-pressed={settings.highContrast}
    >
      <Contrast className="h-5 w-5" />
      <span className="text-sm font-medium">고대비</span>
    </Button>
  )
}
