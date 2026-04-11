// 글자 크기 설정
export type FontScale = 'sm' | 'md' | 'lg' | 'xl'

// 접근성 설정 타입
export interface AccessibilitySettings {
  fontScale: FontScale
  highContrast: boolean
}

// 글자 크기 스케일 값 매핑
export const FONT_SCALE_VALUES: Record<FontScale, number> = {
  sm: 0.875,
  md: 1,
  lg: 1.25,
  xl: 1.5,
}

// 글자 크기 라벨
export const FONT_SCALE_LABELS: Record<FontScale, string> = {
  sm: '작게',
  md: '보통',
  lg: '크게',
  xl: '매우 크게',
}

// 기본 접근성 설정
export const DEFAULT_ACCESSIBILITY_SETTINGS: AccessibilitySettings = {
  fontScale: 'md',
  highContrast: false,
}
