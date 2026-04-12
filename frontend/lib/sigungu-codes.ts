/**
 * 전국시군구코드.csv 기반 시군구 코드 ↔ 지역명 매핑
 *
 * CSV 포맷:  ADM_SECT_C (5자리), SGG_NM ("서울 종로구")
 * API stdgCd: 10자리 → ADM_SECT_C.padEnd(10, '0')
 *   e.g. "11110" → "1111000000"
 *
 * 앱 내 행정동 코드(10자리)와의 관계:
 *   "1111051500" (행정동) → substring(0, 5) = "11110" (시군구) → API stdgCd
 */

import fs from 'fs'
import path from 'path'

export interface SigunguEntry {
  code5: string       // 5자리 시군구 코드 (CSV 원본)
  apiCode: string     // 10자리 API stdgCd  (code5 + '00000')
  fullName: string    // "서울 종로구"
  sidoName: string    // "서울"
  sigunguName: string // "종로구"
}

function loadMap(): Map<string, SigunguEntry> {
  const csvPath = path.join(process.cwd(), '전국시군구코드.csv')
  const content = fs.readFileSync(csvPath, 'utf-8')
  const lines = content.trim().split('\n').slice(1) // 헤더 스킵

  const map = new Map<string, SigunguEntry>()
  for (const line of lines) {
    const [rawCode, rawName] = line.split(',')
    if (!rawCode || !rawName) continue

    const code5 = rawCode.trim()
    const fullName = rawName.trim()
    const spaceIdx = fullName.indexOf(' ')
    const sidoName = spaceIdx > -1 ? fullName.slice(0, spaceIdx) : fullName
    const sigunguName = spaceIdx > -1 ? fullName.slice(spaceIdx + 1) : fullName

    map.set(code5, {
      code5,
      apiCode: code5.padEnd(10, '0'),
      fullName,
      sidoName,
      sigunguName,
    })
  }
  return map
}

// 서버 인스턴스에서 한 번만 로드
const SIGUNGU_MAP = loadMap()

/**
 * 행정동 10자리 코드 → API용 시군구 10자리 코드 + 지역명
 *
 * Kakao coord2RegionCode 'H'타입이 반환하는 행정동 코드를 변환.
 * e.g. "1111051500" → { apiCode: "1111000000", fullName: "서울 종로구" }
 */
export function haengjeongToApiStdgCd(
  haengjeongCd: string,
): { apiCode: string; fullName: string; sigunguName: string } | null {
  if (!haengjeongCd || haengjeongCd.length < 5) return null
  const code5 = haengjeongCd.substring(0, 5)
  const entry = SIGUNGU_MAP.get(code5)
  if (!entry) return null
  return {
    apiCode: entry.apiCode,
    fullName: entry.fullName,
    sigunguName: entry.sigunguName,
  }
}

/**
 * 시군구명 부분 검색 → API stdgCd
 * e.g. "종로구" → "1111000000"
 */
export function findApiCodeByName(searchName: string): string | null {
  for (const entry of SIGUNGU_MAP.values()) {
    if (entry.fullName.includes(searchName) || entry.sigunguName === searchName) {
      return entry.apiCode
    }
  }
  return null
}

export { SIGUNGU_MAP }
