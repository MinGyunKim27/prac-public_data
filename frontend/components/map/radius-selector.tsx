'use client'

import { Button } from '@/components/ui/button'
import type { RadiusOption } from '@/types/transportation'

interface RadiusSelectorProps {
  value: RadiusOption
  onChange: (radius: RadiusOption) => void
}

const RADIUS_OPTIONS: { value: RadiusOption; label: string }[] = [
  { value: 500, label: '500m' },
  { value: 1000, label: '1km' },
  { value: 2000, label: '2km' },
]

export function RadiusSelector({ value, onChange }: RadiusSelectorProps) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-sm font-medium text-muted-foreground shrink-0">반경</span>
      <div className="flex rounded-lg border border-border overflow-hidden">
        {RADIUS_OPTIONS.map((option) => (
          <Button
            key={option.value}
            variant={value === option.value ? 'default' : 'ghost'}
            size="sm"
            onClick={() => onChange(option.value)}
            className={`h-9 px-4 rounded-none border-r border-border last:border-r-0 ${
              value === option.value ? '' : 'hover:bg-accent'
            }`}
            aria-pressed={value === option.value}
          >
            {option.label}
          </Button>
        ))}
      </div>
    </div>
  )
}
