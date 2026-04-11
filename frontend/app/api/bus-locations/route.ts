// cspell:disable
import { NextResponse } from 'next/server';
import type { BusLocation } from '@/types/transportation';
import { haversineDistance } from '@/lib/geo';

const KAKAO_REST_API_KEY = process.env.KAKAO_REST_API_KEY;
const PUBLIC_DATA_API_KEY = process.env.PUBLIC_DATA_API_KEY;
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8080';

// 좌표기반 근접 정류소 목록 조회 (반경 500m 내)
const BUS_STOP_URL =
  'https://apis.data.go.kr/1613000/BusSttnInfoInqireService/getCrdntPrxmtSttnList';

// ─── 카카오 로컬 API (키워드 검색) ───────────────────────────────────────────────

interface KakaoPlace {
  id: string;
  place_name: string;
  category_name: string;
  x: string; // longitude
  y: string; // latitude
  distance?: string; // meters
  address_name?: string;
}

interface KakaoKeywordResponse {
  documents: KakaoPlace[];
  meta: { total_count: number; is_end: boolean };
}

async function fetchBusStopsKakao(
  lat: number,
  lng: number,
  radius: number,
): Promise<BusLocation[]> {
  if (!KAKAO_REST_API_KEY) throw new Error('KAKAO_REST_API_KEY 미설정');

  const params = new URLSearchParams({
    query: '버스정류장',
    x: String(lng),
    y: String(lat),
    radius: String(Math.min(radius, 20000)),
    sort: 'distance',
    size: '15',
  });

  const res = await fetch(
    `https://dapi.kakao.com/v2/local/search/keyword.json?${params}`,
    {
      headers: { Authorization: `KakaoAK ${KAKAO_REST_API_KEY}` },
      signal: AbortSignal.timeout(8000),
    },
  );

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`카카오 로컬 API HTTP ${res.status}: ${body}`);
  }

  const json: KakaoKeywordResponse = await res.json();
  return json.documents
    .filter((p) => p.category_name.includes('버스정류장'))
    .map((p): BusLocation => ({
      id: `kakao-${p.id}`,
      routeId: `kakao-${p.id}`,
      routeName: p.place_name,
      currentStop: p.place_name,
      nextStop: '',
      lat: parseFloat(p.y),
      lng: parseFloat(p.x),
    }));
}

// ─── 공공데이터 API (getCrdntPrxmtSttnList) ────────────────────────────────────

interface BusStopRaw {
  citycode: number | string;
  gpslati: number | string;
  gpslong: number | string;
  nodeid: string;
  nodenm: string;
  nodeno?: string;
}

interface BusStopApiResponse {
  response: {
    header: { resultCode: string; resultMsg: string };
    body: {
      items: { item: BusStopRaw | BusStopRaw[] } | '';
      numOfRows: number;
      pageNo: number;
      totalCount: number;
    };
  };
}

function normalizeItems(
  items: BusStopApiResponse['response']['body']['items'],
): BusStopRaw[] {
  if (!items) return [];
  const raw = items.item;
  if (!raw) return [];
  return Array.isArray(raw) ? raw : [raw];
}

async function fetchBusStopsPublicApi(
  lat: number,
  lng: number,
): Promise<BusLocation[]> {
  if (!PUBLIC_DATA_API_KEY) throw new Error('PUBLIC_DATA_API_KEY 미설정');

  const params = new URLSearchParams({
    gpsLati: String(lat),
    gpsLong: String(lng),
    numOfRows: '30',
    pageNo: '1',
    _type: 'json',
  });

  const res = await fetch(
    `${BUS_STOP_URL}?serviceKey=${PUBLIC_DATA_API_KEY}&${params}`,
    { signal: AbortSignal.timeout(8000) },
  );

  if (!res.ok) throw new Error(`버스 정류소 API HTTP ${res.status}`);

  const json: BusStopApiResponse = await res.json();
  const header = json?.response?.header;
  const resultCode = header?.resultCode;

  if (resultCode === '03' || json?.response?.body?.totalCount === 0) return [];
  if (resultCode !== '00') {
    throw new Error(
      `버스 정류소 API [${resultCode}]: ${header?.resultMsg ?? 'unknown'}`,
    );
  }

  const rows = normalizeItems(json.response.body.items);
  return rows
    .map((r): BusLocation | null => {
      const stopLat = Number(r.gpslati);
      const stopLng = Number(r.gpslong);
      if (!stopLat || !stopLng) return null;
      return {
        id: r.nodeid,
        routeId: r.nodeid,
        routeName: r.nodenm,
        currentStop: r.nodenm,
        nextStop: '',
        lat: stopLat,
        lng: stopLng,
      };
    })
    .filter((b): b is BusLocation => b !== null);
}

// ─── 백엔드 폴백 ────────────────────────────────────────────────────────────────

async function fetchFromBackend(
  stdgCd: string,
  lat: number,
  lng: number,
): Promise<BusLocation[] | null> {
  try {
    const res = await fetch(
      `${BACKEND_URL}/api/mobility?lat=${lat}&lng=${lng}&stdgCd=${stdgCd}`,
      { signal: AbortSignal.timeout(5000) },
    );
    const data = await res.json();
    if (!data.success || !data.data?.bus?.arrivals?.length) return null;
    const bus = data.data.bus;
    return bus.arrivals.map(
      (a: any, i: number): BusLocation => ({
        id: `bus-backend-${i}`,
        routeId: `route-${a.routeNo}`,
        routeName: a.routeNo,
        currentStop: bus.nearestStop?.stopName ?? '정류장',
        nextStop: '',
        lat: a.busLat,
        lng: a.busLon,
        arrivalTime: Math.max(1, Math.ceil(a.distanceFromStopM / 200)),
      }),
    );
  } catch {
    return null;
  }
}

// ─── GET handler ───────────────────────────────────────────────────────────────

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const lat = parseFloat(searchParams.get('lat') || '37.5665');
  const lng = parseFloat(searchParams.get('lng') || '126.978');
  const radius = parseInt(searchParams.get('radius') || '1000');
  const stdgCd = searchParams.get('stdgCd') || '';

  // 우선순위 1: 카카오 로컬 API 키워드 검색 (버스정류장)
  try {
    const stops = await fetchBusStopsKakao(lat, lng, radius);
    if (stops.length > 0) return NextResponse.json(stops);
  } catch (err) {
    console.error('카카오 로컬 API 오류:', err);
  }

  // 우선순위 2: 공공데이터 좌표기반 근접 정류소 API
  try {
    const stops = await fetchBusStopsPublicApi(lat, lng);
    if (stops.length > 0) {
      const filtered = stops.filter(
        (s) => haversineDistance(lat, lng, s.lat, s.lng) <= radius,
      );
      return NextResponse.json(filtered);
    }
  } catch (err) {
    console.error('버스 정류소 공공 API 오류:', err);
  }

  // 우선순위 3: 백엔드 /api/mobility
  if (stdgCd) {
    const backendBuses = await fetchFromBackend(stdgCd, lat, lng);
    if (backendBuses && backendBuses.length > 0) {
      return NextResponse.json(backendBuses);
    }
  }

  // 폴백: 목업
  console.warn('버스 정류소 목업 데이터 사용');
  return NextResponse.json(generateMockBusLocations(lat, lng, radius));
}

// ─── 목업 (폴백용) ──────────────────────────────────────────────────────────────
function generateMockBusLocations(
  centerLat: number,
  centerLng: number,
  radius: number,
): BusLocation[] {
  const routes = [
    { id: 'route-1', name: '101번', stops: ['광화문', '시청', '을지로입구'] },
    { id: 'route-2', name: '273번', stops: ['종각', '종로3가', '안국'] },
    { id: 'route-3', name: '402번', stops: ['경복궁', '세종문화회관', '덕수궁'] },
    { id: 'route-4', name: '마을버스 종로08', stops: ['인사동', '낙원상가', '창덕궁'] },
    { id: 'route-5', name: '7016번', stops: ['서울역', '숭례문', '시청'] },
    { id: 'route-6', name: '저상버스 171번', stops: ['을지로4가', '을지로3가', '을지로입구'] },
  ];
  return routes
    .map((route, index) => {
      const angle = (index / routes.length) * 2 * Math.PI;
      const distance = (Math.random() * 0.7 + 0.2) * (radius / 111000);
      const lat = centerLat + distance * Math.cos(angle);
      const lng =
        centerLng +
        (distance * Math.sin(angle)) / Math.cos((centerLat * Math.PI) / 180);
      const si = Math.floor(Math.random() * route.stops.length);
      return {
        id: `bus-${index + 1}`,
        routeId: route.id,
        routeName: route.name,
        currentStop: route.stops[si],
        nextStop: route.stops[(si + 1) % route.stops.length],
        lat,
        lng,
        arrivalTime: Math.floor(Math.random() * 10) + 1,
      };
    })
    .filter(
      (b) => haversineDistance(centerLat, centerLng, b.lat, b.lng) <= radius,
    );
}
