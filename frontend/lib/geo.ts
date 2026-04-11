/**
 * Haversine 공식 기반 두 좌표 간 거리 계산 (미터)
 */
export function haversineDistance(
  lat1: number, lng1: number,
  lat2: number, lng2: number
): number {
  const R = 6371000
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLng = ((lng2 - lng1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
    Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

/**
 * EPSG 5181 (Korea 2000 / Central Belt, TM 투영좌표) → WGS84 변환
 * 교통약자 사고다발지점 API 응답의 ACDNT_PNT_X / ACDNT_PNT_Y 에 사용
 *
 * 파라미터 (EPSG 5181):
 *   타원체: GRS80,  a=6378137, f=1/298.257222101
 *   중앙경선: 127°E,  원점위도: 38°N
 *   축척: 1.0,  가산동: FE=200000 FN=500000
 */
export function epsg5181ToWgs84(
  tmX: number,
  tmY: number
): { lat: number; lng: number } {
  const a = 6378137.0
  const f = 1 / 298.257222101
  const k0 = 1.0
  const lon0Deg = 127.0
  const lat0Deg = 38.0
  const FE = 200000.0
  const FN = 500000.0

  const b = a * (1 - f)
  const e2 = 1 - (b / a) ** 2
  const e = Math.sqrt(e2)
  const e1 = (1 - Math.sqrt(1 - e2)) / (1 + Math.sqrt(1 - e2))

  const lat0 = (lat0Deg * Math.PI) / 180
  const lon0 = (lon0Deg * Math.PI) / 180

  const M0 = _meridianArc(lat0, a, e2)
  const x1 = tmX - FE
  const y1 = tmY - FN

  const M = M0 + y1 / k0
  const mu =
    M /
    (a *
      (1 -
        e2 / 4 -
        (3 * e2 ** 2) / 64 -
        (5 * e2 ** 3) / 256))

  const phi1 =
    mu +
    ((3 * e1) / 2 - (27 * e1 ** 3) / 32) * Math.sin(2 * mu) +
    ((21 * e1 ** 2) / 16 - (55 * e1 ** 4) / 32) * Math.sin(4 * mu) +
    ((151 * e1 ** 3) / 96) * Math.sin(6 * mu) +
    ((1097 * e1 ** 4) / 512) * Math.sin(8 * mu)

  const sinPhi1 = Math.sin(phi1)
  const cosPhi1 = Math.cos(phi1)
  const tanPhi1 = Math.tan(phi1)

  const N1 = a / Math.sqrt(1 - e2 * sinPhi1 ** 2)
  const T1 = tanPhi1 ** 2
  const C1 = (e2 / (1 - e2)) * cosPhi1 ** 2
  const R1 = (a * (1 - e2)) / (1 - e2 * sinPhi1 ** 2) ** 1.5
  const D = x1 / (N1 * k0)

  const lat =
    phi1 -
    ((N1 * tanPhi1) / R1) *
      (D ** 2 / 2 -
        ((5 + 3 * T1 + 10 * C1 - 4 * C1 ** 2 - 9 * e2) * D ** 4) / 24 +
        ((61 +
          90 * T1 +
          298 * C1 +
          45 * T1 ** 2 -
          252 * e2 -
          3 * C1 ** 2) *
          D ** 6) /
          720)

  const lng =
    lon0 +
    (D -
      ((1 + 2 * T1 + C1) * D ** 3) / 6 +
      ((5 - 2 * C1 + 28 * T1 - 3 * C1 ** 2 + 8 * e2 + 24 * T1 ** 2) *
        D ** 5) /
        120) /
      cosPhi1

  return {
    lat: (lat * 180) / Math.PI,
    lng: (lng * 180) / Math.PI,
  }
}

function _meridianArc(lat: number, a: number, e2: number): number {
  return (
    a *
    ((1 - e2 / 4 - (3 * e2 ** 2) / 64 - (5 * e2 ** 3) / 256) * lat -
      ((3 * e2) / 8 + (3 * e2 ** 2) / 32 + (45 * e2 ** 3) / 1024) *
        Math.sin(2 * lat) +
      ((15 * e2 ** 2) / 256 + (45 * e2 ** 3) / 1024) * Math.sin(4 * lat) -
      ((35 * e2 ** 3) / 3072) * Math.sin(6 * lat))
  )
}
