import type { EnrichmentStatus, PlaceSource } from '@invite/shared';
import type { GeoPoint, NominatimClient } from './nominatim.js';
import { passthroughLocale, type Locale } from '../locale/index.js';
import { extractAddress } from './address.js';
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

/**
 * Готовое место. Название, адрес и район — по-английски: посты русские,
 * а библиотека и конверт англоязычные. Оригинал едет рядом в *_ru, чтобы
 * перевод можно было переделать, ничего не потеряв.
 */
export interface ResolvedDraft {
  name: string;
  address: string;
  district: string | null;
  category: string | null;
  name_ru: string | null;
  address_ru: string | null;
  district_ru: string | null;
  lat: number | null;
  lng: number | null;
  maps_url: string | null;
  source: PlaceSource;
}

/** То же место до перевода — так его собирают ветки резолвера. */
type RawDraft = Omit<ResolvedDraft, 'name_ru' | 'address_ru' | 'district_ru'>;

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
  /** Перевод на английский. По умолчанию выключен — место сохраняется как есть. */
  locale?: Locale;
}

const MAX_CANDIDATES = 3;
/** Вес подсказки, взятой из кавычек, — см. textCandidates. */
const QUOTED_WEIGHT = 100;

function yandexUrlFor(lat: number, lng: number, name?: string): string {
  const params = new URLSearchParams({ ll: `${lng},${lat}`, z: '17' });
  if (name) params.set('text', name);
  return `https://yandex.ru/maps/?${params.toString()}`;
}

/**
 * Место до перевода плюс то, что уже известно по-английски: тег name:en из OSM
 * и адрес, собранный из разобранных частей. Эти подсказки надёжнее перевода,
 * поэтому едут вместе с черновиком до самой локализации.
 */
interface Pending {
  draft: RawDraft;
  nameEn?: string | null;
  addressEn?: string | null;
}

/**
 * Улицы в OSM нарезаны на сегменты: «Провиантская улица» приходит тремя записями
 * с разными координатами и одинаковым адресом. Для человека это один вариант,
 * а список из трёх одинаковых строк — не выбор, а недоумение.
 * Поэтому дубли схлопываем по тому, что видно на экране.
 *
 * Схлопывание идёт до перевода: переводить три одинаковые строки, чтобы потом
 * выбросить две, — трата запросов на пустом месте.
 */
function dedupeDrafts(items: Pending[]): Pending[] {
  const seen = new Set<string>();
  return items.filter(({ draft }) => {
    const key = `${draft.name}|${draft.address}`.toLowerCase().replace(/\s+/g, ' ').trim();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function fromGeoPoint(point: GeoPoint, source: PlaceSource, mapsUrl?: string | null): Pending {
  return {
    draft: {
      name: point.name,
      address: point.address,
      district: point.district,
      category: point.category,
      lat: point.lat,
      lng: point.lng,
      maps_url: mapsUrl ?? yandexUrlFor(point.lat, point.lng, point.name),
      source,
    },
    nameEn: point.nameEn,
    addressEn: point.addressEn,
  };
}

/** Последний шаг любой ветки: место становится английским, оригинал уезжает в *_ru. */
async function localize(item: Pending, locale: Locale, city?: string | null): Promise<ResolvedDraft> {
  const english = await locale.place({
    name: item.draft.name,
    address: item.draft.address,
    district: item.draft.district,
    nameEn: item.nameEn,
    addressEn: item.addressEn,
    city,
  });
  return { ...item.draft, ...english };
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
  const locale = deps.locale ?? passthroughLocale;
  const english = (item: Pending) => localize(item, locale, input.city);
  const yandexUrl = (input.urls ?? []).find(isYandexMapsUrl);

  // 1. Ссылка Яндекс.Карт: разворачиваем и берём координаты — единственное,
  //    что Яндекс отдаёт без ключа. Название и адрес приезжают из OSM.
  if (yandexUrl) {
    const link = await resolveYandexLink(yandexUrl, deps.expandOptions);
    if (link?.lat != null && link.lng != null) {
      const point = await deps.nominatim.reverse(link.lat, link.lng);
      if (point) {
        return { status: 'resolved', place: await english(fromGeoPoint(point, 'yandex', link.url)) };
      }
      // Координата есть, а что там — неизвестно. Место всё равно рабочее:
      // сохраняем как точку на карте, чтобы хост дописал название сам.
      return {
        status: 'needs_confirmation',
        draft: await english({
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
        }),
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
          draft: await english({
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
          }),
          candidates: await Promise.all(
            found.map((p) => english(fromGeoPoint(p, 'yandex', null))),
          ),
        };
      }
    }
    return { status: 'failed', reason: 'Из этой ссылки не удалось достать место' };
  }

  // 2. Telegram отдал venue: название и адрес пришли от платформы, догадываться не нужно.
  if (input.venue) {
    const enriched = await deps.nominatim.reverse(input.venue.lat, input.venue.lng).catch(() => null);
    // Адрес от Telegram — строка без разбора, а из OSM он приходит по частям:
    // если берём вариант OSM, забираем и его английскую сборку.
    const useEnriched = !input.venue.address && Boolean(enriched?.address);
    return {
      status: 'resolved',
      place: await english({
        draft: {
          name: input.venue.title,
          address: input.venue.address || enriched?.address || '',
          district: enriched?.district ?? null,
          category: enriched?.category ?? null,
          lat: input.venue.lat,
          lng: input.venue.lng,
          maps_url: yandexUrlFor(input.venue.lat, input.venue.lng, input.venue.title),
          source: 'telegram',
        },
        addressEn: useEnriched ? enriched?.addressEn : null,
      }),
    };
  }

  // 3. Голая геометка: координата точная, название спрашиваем у OSM.
  if (input.location) {
    const point = await deps.nominatim.reverse(input.location.lat, input.location.lng);
    if (point) return { status: 'resolved', place: await english(fromGeoPoint(point, 'telegram', null)) };
    return {
      status: 'needs_confirmation',
      draft: await english({
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
      }),
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

  // Если человек сам обозначил название — кавычками или ссылкой, — гадать по
  // словам с заглавной запрещено, даже когда размеченное название не нашлось.
  // Иначе «завтраки в Баски & Монегаски» дают салон красоты по слову «Красота»,
  // а «бар "Профсоюз" на Покровке» — театр и школу.
  const hasMarkedName = hints.some((hint) => hint.weight >= QUOTED_WEIGHT);
  const searchHints = hasMarkedName
    ? hints.filter((hint) => hint.weight >= QUOTED_WEIGHT)
    : hints;

  /**
   * Адрес из текста идёт первым, а не как запасной вариант.
   * Поиск по одному названию промахивается городом и однофамильцами:
   * «Бергамот» находит чайную лавку на другом конце города, хотя человек
   * тут же написал «Малая Зеленина, 4». Адрес однозначен — название нет.
   */
  const address = extractAddress(input.text, {
    // Исключаем только размеченные человеком названия. Эвристические подсказки
    // сюда класть нельзя: «Малая Зеленина» — это и заглавная пара для эвристики,
    // и настоящая улица, и адрес отбрасывал сам себя.
    exclude: hints.filter((hint) => hint.weight >= QUOTED_WEIGHT).map((hint) => hint.text),
  });

  const addressCandidates: Pending[] = [];
  if (address) {
    const points = await deps.nominatim
      .geocode(address.query, input.city, MAX_CANDIDATES)
      .catch(() => []);
    const name = hints[0]!.text;
    for (const point of points) {
      const fromOsm = Boolean(point.address);
      addressCandidates.push({
        draft: {
          name,
          address: point.address || address.raw,
          district: point.district,
          category: point.category,
          lat: point.lat,
          lng: point.lng,
          maps_url: yandexUrlFor(point.lat, point.lng, name),
          source: 'telegram',
        },
        // Название здесь взято из поста, а не из OSM, — переводить его придётся.
        // Адрес же разобран по частям, и английскую сборку можно взять готовой.
        addressEn: fromOsm ? point.addressEn : null,
      });
    }
  }

  const candidates: Pending[] = [];
  const seen = new Set<string>();
  for (const hint of searchHints.slice(0, MAX_CANDIDATES)) {
    if (candidates.length >= MAX_CANDIDATES) break;
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

  // Адресные варианты впереди: они точнее. Найденные по названию идут следом,
  // на случай если адрес разобрался неверно, — выбор всё равно за человеком (§3).
  const all = dedupeDrafts([...addressCandidates, ...candidates]).slice(0, MAX_CANDIDATES);

  if (all.length === 0) {
    return { status: 'failed', reason: 'Не нашли на карте ничего похожего' };
  }

  return {
    status: 'needs_confirmation',
    draft: await english({
      draft: {
        name: hints[0]!.text,
        address: address?.raw ?? '',
        district: null,
        category: null,
        lat: null,
        lng: null,
        maps_url: null,
        source: 'telegram',
      },
    }),
    candidates: await Promise.all(all.map(english)),
  };
}
