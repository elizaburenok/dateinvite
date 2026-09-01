import type { EnrichmentStatus, PlaceSource } from '@invite/shared';
import type { GeoPoint, NominatimClient } from './nominatim.js';
import { heuristicExtractor, type NameExtractor } from './textCandidates.js';
import {
  isYandexMapsUrl,
  resolveYandexLink,
  slugToQuery,
  type ExpandOptions,
} from './yandexLink.js';

/** Что бот вытащил из сообщения и отдаёт резолверу. */
export interface ResolverInput {
  text?: string | null;
  urls?: string[];
  location?: { lat: number; lng: number } | null;
  venue?: { title: string; address: string; lat: number; lng: number } | null;
  /** Названия, размеченные человеком (текст ссылки) — доверяем им как кавычкам. */
  nameHints?: string[];
  city?: string | null;
  sourceRef?: string | null;
}

export interface ResolvedDraft {
  name: string;
  address: string;
  district: string | null;
  category: string | null;
  lat: number | null;
  lng: number | null;
  maps_url: string | null;
  source: PlaceSource;
}

export type ResolveResult =
  | { status: Extract<EnrichmentStatus, 'resolved'>; place: ResolvedDraft }
  | {
      status: Extract<EnrichmentStatus, 'needs_confirmation'>;
      draft: ResolvedDraft;
      candidates: ResolvedDraft[];
    }
  | { status: Extract<EnrichmentStatus, 'failed'>; reason: string };

export interface ResolverDeps {
  nominatim: NominatimClient;
  extractor?: NameExtractor;
  expandOptions?: ExpandOptions;
}

const MAX_CANDIDATES = 3;
/** Вес подсказки, взятой из кавычек, — см. textCandidates. */
const QUOTED_WEIGHT = 100;

function yandexUrlFor(lat: number, lng: number, name?: string): string {
  const params = new URLSearchParams({ ll: `${lng},${lat}`, z: '17' });
  if (name) params.set('text', name);
  return `https://yandex.ru/maps/?${params.toString()}`;
}

function fromGeoPoint(point: GeoPoint, source: PlaceSource, mapsUrl?: string | null): ResolvedDraft {
  return {
    name: point.name,
    address: point.address,
    district: point.district,
    category: point.category,
    lat: point.lat,
    lng: point.lng,
    maps_url: mapsUrl ?? yandexUrlFor(point.lat, point.lng, point.name),
    source,
  };
}

/**
 * Резолвер по веткам §7. Единственное правило, которое нельзя нарушать:
 * всё, что не подтверждено данными (координатой или явным названием от Telegram),
 * уходит хосту как кандидаты, а не сохраняется молча как resolved (§3).
 */
export async function resolvePlace(
  input: ResolverInput,
  deps: ResolverDeps,
): Promise<ResolveResult> {
  const extractor = deps.extractor ?? heuristicExtractor;
  const yandexUrl = (input.urls ?? []).find(isYandexMapsUrl);

  // 1. Ссылка Яндекс.Карт: разворачиваем и берём координаты — единственное,
  //    что Яндекс отдаёт без ключа. Название и адрес приезжают из OSM.
  if (yandexUrl) {
    const link = await resolveYandexLink(yandexUrl, deps.expandOptions);
    if (link?.lat != null && link.lng != null) {
      const point = await deps.nominatim.reverse(link.lat, link.lng);
      if (point) return { status: 'resolved', place: fromGeoPoint(point, 'yandex', link.url) };
      // Координата есть, а что там — неизвестно. Место всё равно рабочее:
      // сохраняем как точку на карте, чтобы хост дописал название сам.
      return {
        status: 'needs_confirmation',
        draft: {
          name: link.textHint ?? slugToQuery(link.slug) ?? 'Место без названия',
          address: '',
          district: null,
          category: null,
          lat: link.lat,
          lng: link.lng,
          maps_url: link.url,
          source: 'yandex',
        },
        candidates: [],
      };
    }

    // Координат в ссылке не оказалось — остаётся искать по названию,
    // а транслитерированный slug слишком ненадёжен, чтобы верить ему молча.
    const query = link?.textHint ?? slugToQuery(link?.slug ?? null);
    if (query) {
      const found = await deps.nominatim.search(query, {
        city: input.city,
        limit: MAX_CANDIDATES,
      });
      if (found.length > 0) {
        return {
          status: 'needs_confirmation',
          draft: {
            name: query,
            address: '',
            district: null,
            category: null,
            lat: null,
            lng: null,
            maps_url: link?.url ?? yandexUrl,
            source: 'yandex',
          },
          candidates: found.map((p) => fromGeoPoint(p, 'yandex', null)),
        };
      }
    }
    return { status: 'failed', reason: 'Из этой ссылки не удалось достать место' };
  }

  // 2. Telegram отдал venue: название и адрес пришли от платформы, догадываться не нужно.
  if (input.venue) {
    const enriched = await deps.nominatim.reverse(input.venue.lat, input.venue.lng).catch(() => null);
    return {
      status: 'resolved',
      place: {
        name: input.venue.title,
        address: input.venue.address || enriched?.address || '',
        district: enriched?.district ?? null,
        category: enriched?.category ?? null,
        lat: input.venue.lat,
        lng: input.venue.lng,
        maps_url: yandexUrlFor(input.venue.lat, input.venue.lng, input.venue.title),
        source: 'telegram',
      },
    };
  }

  // 3. Голая геометка: координата точная, название спрашиваем у OSM.
  if (input.location) {
    const point = await deps.nominatim.reverse(input.location.lat, input.location.lng);
    if (point) return { status: 'resolved', place: fromGeoPoint(point, 'telegram', null) };
    return {
      status: 'needs_confirmation',
      draft: {
        name: 'Место без названия',
        address: '',
        district: null,
        category: null,
        lat: input.location.lat,
        lng: input.location.lng,
        maps_url: yandexUrlFor(input.location.lat, input.location.lng),
        source: 'telegram',
      },
      candidates: [],
    };
  }

  // 4. Только текст: даём 1–3 кандидата и ждём подтверждения (§7, §12).
  // Размеченное человеком название идёт первым и с тем же весом, что и кавычки.
  const linkHints = (input.nameHints ?? []).map((text) => ({ text, weight: QUOTED_WEIGHT }));
  const hints = [...linkHints, ...extractor.extract(input.text ?? '')];
  if (hints.length === 0) {
    return { status: 'failed', reason: 'В тексте не нашлось названия места' };
  }

  const candidates: ResolvedDraft[] = [];
  const seen = new Set<string>();
  for (const hint of hints.slice(0, MAX_CANDIDATES)) {
    if (candidates.length >= MAX_CANDIDATES) break;
    // Название в кавычках человек обозначил сам. Если по нему что-то нашлось,
    // добирать варианты из соседних заглавных слов — только шуметь:
    // «бар "Профсоюз" на Покровке» иначе притащит театр и школу.
    if (candidates.length > 0 && hint.weight < QUOTED_WEIGHT && hints[0]!.weight >= QUOTED_WEIGHT) {
      break;
    }
    const found = await deps.nominatim
      .search(hint.text, { city: input.city, limit: MAX_CANDIDATES })
      .catch(() => []);
    for (const point of found) {
      const key = `${point.lat.toFixed(5)},${point.lng.toFixed(5)}`;
      if (seen.has(key)) continue;
      seen.add(key);
      candidates.push(fromGeoPoint(point, 'telegram', null));
      if (candidates.length >= MAX_CANDIDATES) break;
    }
  }

  if (candidates.length === 0) {
    return { status: 'failed', reason: 'Не нашли на карте ничего похожего' };
  }

  return {
    status: 'needs_confirmation',
    draft: {
      name: hints[0]!.text,
      address: '',
      district: null,
      category: null,
      lat: null,
      lng: null,
      maps_url: null,
      source: 'telegram',
    },
    candidates,
  };
}
