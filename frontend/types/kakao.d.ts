/* eslint-disable @typescript-eslint/no-explicit-any */
declare namespace kakao.maps {
  class Map {
    constructor(container: HTMLElement, options: MapOptions)
    setCenter(latlng: LatLng): void
    getCenter(): LatLng
    setLevel(level: number): void
    getLevel(): number
    panTo(latlng: LatLng): void
    addOverlayMapTypeId(mapTypeId: MapTypeId): void
    removeOverlayMapTypeId(mapTypeId: MapTypeId): void
    setBounds(bounds: LatLngBounds): void
  }

  interface MapOptions {
    center: LatLng
    level?: number
    mapTypeId?: MapTypeId
    draggable?: boolean
    scrollwheel?: boolean
    disableDoubleClick?: boolean
    disableDoubleClickZoom?: boolean
  }

  class LatLng {
    constructor(lat: number, lng: number)
    getLat(): number
    getLng(): number
  }

  class LatLngBounds {
    constructor(sw?: LatLng, ne?: LatLng)
    extend(latlng: LatLng): void
    getSouthWest(): LatLng
    getNorthEast(): LatLng
  }

  class Marker {
    constructor(options: MarkerOptions)
    setMap(map: Map | null): void
    getPosition(): LatLng
    setPosition(position: LatLng): void
    setImage(image: MarkerImage): void
  }

  interface MarkerOptions {
    position: LatLng
    map?: Map
    image?: MarkerImage
    title?: string
    clickable?: boolean
  }

  class MarkerImage {
    constructor(src: string, size: Size, options?: MarkerImageOptions)
  }

  interface MarkerImageOptions {
    offset?: Point
    alt?: string
    coords?: string
    shape?: string
    spriteOrigin?: Point
    spriteSize?: Size
  }

  class Size {
    constructor(width: number, height: number)
  }

  class Point {
    constructor(x: number, y: number)
  }

  class CustomOverlay {
    constructor(options: CustomOverlayOptions)
    setMap(map: Map | null): void
    getPosition(): LatLng
    setPosition(position: LatLng): void
    setContent(content: string | HTMLElement): void
  }

  interface CustomOverlayOptions {
    position: LatLng
    content: string | HTMLElement
    map?: Map
    xAnchor?: number
    yAnchor?: number
    zIndex?: number
    clickable?: boolean
  }

  class Circle {
    constructor(options: CircleOptions)
    setMap(map: Map | null): void
    setRadius(radius: number): void
    setOptions(options: Partial<CircleOptions>): void
  }

  interface CircleOptions {
    center: LatLng
    radius: number
    strokeWeight?: number
    strokeColor?: string
    strokeOpacity?: number
    strokeStyle?: string
    fillColor?: string
    fillOpacity?: number
    map?: Map
  }

  class InfoWindow {
    constructor(options: InfoWindowOptions)
    open(map: Map, marker?: Marker): void
    close(): void
    setContent(content: string | HTMLElement): void
    setPosition(position: LatLng): void
  }

  interface InfoWindowOptions {
    content: string | HTMLElement
    position?: LatLng
    removable?: boolean
    zIndex?: number
  }

  class MarkerClusterer {
    constructor(options: MarkerClustererOptions)
    addMarker(marker: Marker): void
    addMarkers(markers: Marker[]): void
    removeMarker(marker: Marker): void
    removeMarkers(markers: Marker[]): void
    clear(): void
    redraw(): void
  }

  interface MarkerClustererOptions {
    map: Map
    averageCenter?: boolean
    minLevel?: number
    disableClickZoom?: boolean
    styles?: ClusterStyle[]
    gridSize?: number
    minClusterSize?: number
  }

  interface ClusterStyle {
    width?: string
    height?: string
    background?: string
    color?: string
    textAlign?: string
    lineHeight?: string
    fontSize?: string
    borderRadius?: string
  }

  namespace event {
    function addListener(target: any, type: string, handler: (...args: any[]) => void): void
    function removeListener(target: any, type: string, handler: (...args: any[]) => void): void
    function trigger(target: any, type: string, data?: any): void
  }

  namespace services {
    class Places {
      keywordSearch(
        keyword: string,
        callback: (result: PlacesSearchResult, status: Status, pagination?: Pagination) => void,
        options?: PlacesSearchOptions
      ): void
      categorySearch(
        code: string,
        callback: (result: PlacesSearchResult, status: Status, pagination?: Pagination) => void,
        options?: PlacesSearchOptions
      ): void
    }

    class Geocoder {
      addressSearch(
        address: string,
        callback: (result: GeocoderResult[], status: Status) => void
      ): void
      coord2Address(
        lng: number,
        lat: number,
        callback: (result: Coord2AddressResult[], status: Status) => void
      ): void
      coord2RegionCode(
        lng: number,
        lat: number,
        callback: (result: RegionCodeResult[], status: Status) => void
      ): void
    }

    type PlacesSearchResult = PlaceResult[]

    interface PlaceResult {
      id: string
      place_name: string
      category_name: string
      category_group_code: string
      category_group_name: string
      phone: string
      address_name: string
      road_address_name: string
      x: string
      y: string
      place_url: string
      distance: string
    }

    interface GeocoderResult {
      address_name: string
      address_type: string
      x: string
      y: string
      address: {
        address_name: string
        region_1depth_name: string
        region_2depth_name: string
        region_3depth_name: string
        mountain_yn: string
        main_address_no: string
        sub_address_no: string
      }
      road_address: {
        address_name: string
        region_1depth_name: string
        region_2depth_name: string
        region_3depth_name: string
        road_name: string
        underground_yn: string
        main_building_no: string
        sub_building_no: string
        building_name: string
        zone_no: string
      } | null
    }

    interface Coord2AddressResult {
      address: {
        address_name: string
        region_1depth_name: string
        region_2depth_name: string
        region_3depth_name: string
        mountain_yn: string
        main_address_no: string
        sub_address_no: string
      }
      road_address: {
        address_name: string
        region_1depth_name: string
        region_2depth_name: string
        region_3depth_name: string
        road_name: string
        underground_yn: string
        main_building_no: string
        sub_building_no: string
        building_name: string
        zone_no: string
      } | null
    }

    interface RegionCodeResult {
      region_type: string
      address_name: string
      region_1depth_name: string
      region_2depth_name: string
      region_3depth_name: string
      region_4depth_name: string
      code: string
      x: number
      y: number
    }

    interface Pagination {
      totalCount: number
      hasNextPage: boolean
      hasPrevPage: boolean
      current: number
      first: number
      last: number
      perPage: number
      nextPage(): void
      prevPage(): void
      gotoPage(page: number): void
      gotoFirst(): void
      gotoLast(): void
    }

    interface PlacesSearchOptions {
      location?: kakao.maps.LatLng
      x?: number
      y?: number
      radius?: number
      bounds?: kakao.maps.LatLngBounds
      rect?: string
      size?: number
      page?: number
      sort?: SortBy
      category_group_code?: string
      useMapCenter?: boolean
      useMapBounds?: boolean
    }

    enum Status {
      OK = 'OK',
      ZERO_RESULT = 'ZERO_RESULT',
      ERROR = 'ERROR',
    }

    enum SortBy {
      ACCURACY = 'accuracy',
      DISTANCE = 'distance',
    }
  }

  type MapTypeId = 'ROADMAP' | 'SKYVIEW' | 'HYBRID' | 'ROADVIEW' | 'OVERLAY' | 'TRAFFIC' | 'TERRAIN' | 'BICYCLE' | 'BICYCLE_HYBRID' | 'USE_DISTRICT'

  function load(callback: () => void): void
}

interface Window {
  kakao: {
    maps: typeof kakao.maps
    Link?: {
      sendDefault(options: any): void
    }
  }
  Kakao?: {
    Link?: {
      sendDefault(options: any): void
    }
  }
}
