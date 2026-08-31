import type { Db } from '../db/index.js';
import { nowIso } from '../lib/ids.js';
import { humanCategory } from './categories.js';

/**
 * Клиент OpenStreetMap Nominatim.
 *
 * Он выбран как источник названия, адреса, района и категории, потому что его
 * лицензия (ODbL) разрешает кешировать результат — а весь продукт стоит на снапшоте (§3).
 * Взамен политика использования требует: не больше одного запроса в секунду,
 * содержательный User-Agent с контактом и обязательное кеширование. Всё это здесь.
 * Атрибуция «© OpenStreetMap contributors» живёт в UI.
 */

export interface NominatimAddress {
  amenity?: string;
  shop?: string;
  house_number?: string;
  road?: string;
  suburb?: string;
  city_district?: string;
  neighbourhood?: string;
  quarter?: string;
  city?: string;
  town?: string;
  village?: string;
  state?: string;
  country?: string;
}

export interface NominatimPlace {
  place_id: number;
  osm_type?: string;
  osm_id?: number;
  lat: string;
  lon: string;
  name?: string;
  display_name: string;
  category?: string;
  type?: string;
  address?: NominatimAddress;
}

/** Нормализованная точка: то, чем мы заполняем Place и кандидатов. */
export interface GeoPoint {
  name: string;
  address: string;
  district: string | null;
  category: string | null;
  lat: number;
  lng: number;
}

const CACHE_TTL_MS = 30 * 24 * 60 * 60 * 1000;

/** Короткий адрес: «Лялин переулок, 5с1», а не вся простыня display_name до страны. */
export function shortAddress(place: NominatimPlace): string {
  const a = place.address ?? {};
  const street = [a.road, a.house_number].filter(Boolean).join(', ');
  const city = a.city ?? a.town ?? a.village ?? null;
  const parts = [street || null, city].filter(Boolean);
  if (parts.length > 0) return parts.join(', ');
  // Крайний случай: у объекта нет разобранного адреса — обрезаем display_name.
  return place.display_name.split(',').slice(0, 3).join(',').trim();
}

export function districtOf(place: NominatimPlace): string | null {
  const a = place.address ?? {};
  return a.suburb ?? a.quarter ?? a.neighbourhood ?? a.city_district ?? null;
}

export function toGeoPoint(place: NominatimPlace): GeoPoint | null {
  const lat = Number(place.lat);
  const lng = Number(place.lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

  const a = place.address ?? {};
  const name = place.name?.trim() || a.amenity || a.shop || '';
  if (!name) return null;

  return {
    name,
    address: shortAddress(place),
    district: districtOf(place),
    category: humanCategory(place.category, place.type),
    lat,
    lng,
  };
}

export interface NominatimOptions {
  db: Db;
  baseUrl: string;
  userAgent: string;
  fetchImpl?: typeof fetch;
  /** Пауза между запросами; политика Nominatim — не чаще 1 в секунду. */
  minIntervalMs?: number;
}

export class NominatimClient {
  private queue: Promise<unknown> = Promise.resolve();
  private lastCallAt = 0;

  constructor(private readonly options: NominatimOptions) {}

  private get fetchImpl(): typeof fetch {
    return this.options.fetchImpl ?? fetch;
  }

  private readCache(key: string): NominatimPlace[] | null {
    const row = this.options.db
      .prepare<[string], { payload: string; fetched_at: string }>(
        'SELECT payload, fetched_at FROM geo_cache WHERE key = ?',
      )
      .get(key);
    if (!row) return null;
    if (Date.now() - new Date(row.fetched_at).getTime() > CACHE_TTL_MS) return null;
    try {
      return JSON.parse(row.payload) as NominatimPlace[];
    } catch {
      return null;
    }
  }

  private writeCache(key: string, places: NominatimPlace[]): void {
    this.options.db
      .prepare(
        `INSERT INTO geo_cache (key, payload, fetched_at) VALUES (?, ?, ?)
         ON CONFLICT(key) DO UPDATE SET payload = excluded.payload, fetched_at = excluded.fetched_at`,
      )
      .run(key, JSON.stringify(places), nowIso());
  }

  /** Все обращения выстроены в одну очередь — параллельных запросов к Nominatim быть не должно. */
  private schedule<T>(task: () => Promise<T>): Promise<T> {
    const run = this.queue.then(async () => {
      const wait = this.lastCallAt + (this.options.minIntervalMs ?? 1100) - Date.now();
      if (wait > 0) await new Promise((resolve) => setTimeout(resolve, wait));
      this.lastCallAt = Date.now();
      return task();
    });
    // Очередь не должна вставать колом из-за одной упавшей задачи.
    this.queue = run.catch(() => undefined);
    return run;
  }

  private async request(path: string, params: Record<string, string>): Promise<NominatimPlace[]> {
    const url = new URL(path, this.options.baseUrl);
    for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);
    const key = url.toString();

    const cached = this.readCache(key);
    if (cached) return cached;

    const places = await this.schedule(async () => {
      const response = await this.fetchImpl(key, {
        headers: {
          'user-agent': this.options.userAgent,
          'accept-language': 'ru,en',
          accept: 'application/json',
        },
      });
      if (!response.ok) throw new Error(`Nominatim ответил ${response.status}`);
      const payload: unknown = await response.json();
      if (Array.isArray(payload)) return payload as NominatimPlace[];
      if (payload && typeof payload === 'object' && 'lat' in payload) {
        return [payload as NominatimPlace];
      }
      return [];
    });

    this.writeCache(key, places);
    return places;
  }

  async search(query: string, options: { city?: string | null; limit?: number } = {}): Promise<GeoPoint[]> {
    const text = options.city ? `${query}, ${options.city}` : query;
    const places = await this.request('/search', {
      q: text,
      format: 'jsonv2',
      addressdetails: '1',
      limit: String(options.limit ?? 3),
    });
    return places.map(toGeoPoint).filter((p): p is GeoPoint => p !== null);
  }

  async reverse(lat: number, lng: number): Promise<GeoPoint | null> {
    const places = await this.request('/reverse', {
      lat: String(lat),
      lon: String(lng),
      format: 'jsonv2',
      addressdetails: '1',
      zoom: '18',
    });
    const first = places[0];
    return first ? toGeoPoint(first) : null;
  }
}
