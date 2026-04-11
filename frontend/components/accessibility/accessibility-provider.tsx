'use client'

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import {
  type AccessibilitySettings,
  type FontScale,
  DEFAULT_ACCESSIBILITY_SETTINGS,
  FONT_SCALE_VALUES,
} from '@/types/accessibility'

interface AccessibilityContextType {
  settings: AccessibilitySettings
  setFontScale: (scale: FontScale) => void
  toggleHighContrast: () => void
  increaseFontSize: () => void
  decreaseFontSize: () => void
}

const AccessibilityContext = createContext<AccessibilityContextType | undefined>(undefined)

const STORAGE_KEY = 'accessibility-settings'

const FONT_SCALES: FontScale[] = ['sm', 'md', 'lg', 'xl']

export function AccessibilityProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<AccessibilitySettings>(DEFAULT_ACCESSIBILITY_SETTINGS)
  const [mounted, setMounted] = useState(false)

  // 로컬스토리지에서 설정 불러오기
  useEffect(() => {
    setMounted(true)
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      try {
        const parsed = JSON.parse(stored)
        setSettings(parsed)
      } catch {
        // 파싱 실패 시 기본값 사용
      }
    }
  }, [])

  // 설정 변경 시 로컬스토리지에 저장
  useEffect(() => {
    if (mounted) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
    }
  }, [settings, mounted])

  // CSS 변수 및 클래스 적용
  useEffect(() => {
    if (!mounted) return

    const root = document.documentElement
    root.style.setProperty('--font-scale', FONT_SCALE_VALUES[settings.fontScale].toString())

    if (settings.highContrast) {
      root.classList.add('high-contrast')
    } else {
      root.classList.remove('high-contrast')
    }

    // 글자 크기 클래스 적용
    FONT_SCALES.forEach((scale) => {
      root.classList.remove(`font-scale-${scale}`)
    })
    root.classList.add(`font-scale-${settings.fontScale}`)
  }, [settings, mounted])

  const setFontScale = (scale: FontScale) => {
    setSettings((prev) => ({ ...prev, fontScale: scale }))
  }

  const toggleHighContrast = () => {
    setSettings((prev) => ({ ...prev, highContrast: !prev.highContrast }))
  }

  const increaseFontSize = () => {
    const currentIndex = FONT_SCALES.indexOf(settings.fontScale)
    if (currentIndex < FONT_SCALES.length - 1) {
      setFontScale(FONT_SCALES[currentIndex + 1])
    }
  }

  const decreaseFontSize = () => {
    const currentIndex = FONT_SCALES.indexOf(settings.fontScale)
    if (currentIndex > 0) {
      setFontScale(FONT_SCALES[currentIndex - 1])
    }
  }

  return (
    <AccessibilityContext.Provider
      value={{
        settings,
        setFontScale,
        toggleHighContrast,
        increaseFontSize,
        decreaseFontSize,
      }}
    >
      {children}
    </AccessibilityContext.Provider>
  )
}

export function useAccessibility() {
  const context = useContext(AccessibilityContext)
  if (context === undefined) {
    throw new Error('useAccessibility must be used within an AccessibilityProvider')
  }
  return context
}
