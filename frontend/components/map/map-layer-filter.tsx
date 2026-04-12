'use client'

import { Train, AlertTriangle, Bus, Car } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { LayerFilters } from '@/types/transportation'

interface MapLayerFilterProps {
  filters: LayerFilters
  onChange: (filters: LayerFilters) => void
}

interface LayerOption {
  key: keyof LayerFilters
  label: string
  icon: React.ReactNode
  activeColor: string
}

const LAYER_OPTIONS: LayerOption[] = [
  {
    key: 'subwayStation',
    label: '지하철역',
    icon: <Train className="h-4 w-4" />,
    activeColor: 'bg-purple-500 text-white',
  },
  {
    key: 'accidentSpot',
    label: '사고지점',
    icon: <AlertTriangle className="h-4 w-4" />,
    activeColor: 'bg-warning text-warning-foreground',
  },
  {
    key: 'busStop',
    label: '정류장',
    icon: <Bus className="h-4 w-4" />,
    activeColor: 'bg-primary text-primary-foreground',
  },
  {
    key: 'mobilityCenter',
    label: '콜택시',
    icon: <Car className="h-4 w-4" />,
    activeColor: 'bg-chart-4 text-foreground',
  },
]

export function MapLayerFilter({ filters, onChange }: MapLayerFilterProps) {
  const toggleFilter = (key: keyof LayerFilters) => {
    onChange({
      ...filters,
      [key]: !filters[key],
    })
  }

  return (
    <div className="flex flex-wrap gap-2">
      {LAYER_OPTIONS.map((option) => {
        const isActive = filters[option.key]
        return (
          <Button
            key={option.key}
            variant={isActive ? 'default' : 'outline'}
            size="sm"
            onClick={() => toggleFilter(option.key)}
            className={`h-9 gap-1.5 ${isActive ? option.activeColor : ''}`}
            aria-pressed={isActive}
          >
            {option.icon}
            <span>{option.label}</span>
          </Button>
        )
      })}
    </div>
  )
}
