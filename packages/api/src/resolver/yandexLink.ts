/**
 * Разбор ссылок Яндекс.Карт.
 *
 * Почему только URL и никакого HTML: страница организации на Яндекс.Картах —
 * SPA-оболочка. В исходном HTML нет ни названия, ни адреса, ни фото; og-теги
 * дженериковые («Яндекс Карты — транспорт, навигация, поиск мест»), а координаты
 * в разметке — центр Москвы, а не организации. Проверено на живой странице.
 * Официальный Geosearch API отпадает отдельно: он запрещает сохранять данные,
 * а весь продукт стоит на снапшоте (§3).
 *
 * Итого от Яндекса мы законно берём ровно две вещи: координаты из параметров URL
 * и сам URL как «открыть в Картах». Название и адрес приезжают из OSM.
 */

export interface YandexLinkData {
  /** Канонический URL — уходит в maps_url. */
  url: string;
  lat: number | null;
  lng: number | null;
  /** Транслитерированный slug организации: слабая подсказка для поиска по названию. */
  slug: string | null;
  oid: string | null;
  /** Параметр text= — самая надёжная подсказка названия, если она есть. */
  textHint: string | null;
}

const YANDEX_HOSTS = /(^|\.)(yandex\.(ru|com|by|kz|uz|com\.tr)|ya\.ru)$/i;

export function isYandexMapsUrl(raw: string): boolean {
  try {
    const url = new URL(raw);
    if (!YANDEX_HOSTS.test(url.hostname)) return false;
    return url.pathname.startsWith('/maps') || url.hostname.startsWith('maps.');
  } catch {
    return false;
  }
}

/** Короткая ссылка не несёт данных сама по себе — её надо развернуть по редиректу. */
export function isYandexShortLink(raw: string): boolean {
  try {
    const url = new URL(raw);
    return YANDEX_HOSTS.test(url.hostname) && /^\/maps\/-\//.test(url.pathname);
  } catch {
    return false;
  }
}

function validCoords(lat: number, lng: number): boolean {
  return (
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    Math.abs(lat) <= 90 &&
    Math.abs(lng) <= 180 &&
    !(lat === 0 && lng === 0)
  );
}

/** Пары вида `ll`, `pt`, `whatshere[point]` идут как долгота,широта. */
function parseLonLat(value: string | null): { lat: number; lng: number } | null {
  if (!value) return null;
  const [lonRaw, latRaw] = value.split(',');
  const lng = Number(lonRaw);
  const lat = Number(latRaw);
  return validCoords(lat, lng) ? { lat, lng } : null;
}

/** А `rtext` — наоборот, широта,долгота. Перепутать порядок значит уехать в другую страну. */
function parseLatLon(value: string | null): { lat: number; lng: number } | null {
  if (!value) return null;
  const [latRaw, lonRaw] = value.split(',');
  const lat = Number(latRaw);
  const lng = Number(lonRaw);
  return validCoords(lat, lng) ? { lat, lng } : null;
}

export function parseYandexUrl(raw: string): YandexLinkData | null {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return null;
  }
  if (!isYandexMapsUrl(raw)) return null;

  const params = url.searchParams;

  // Порядок важен: точка «что здесь» и метка точнее, чем центр карты (ll),
  // а маршрут даёт лишь конечную точку.
  const routePoints = params.get('rtext')?.split('~') ?? [];
  const coords =
    parseLonLat(params.get('whatshere[point]')) ??
    parseLonLat(params.get('pt')?.split(',').slice(0, 2).join(',') ?? null) ??
    parseLatLon(routePoints.length > 0 ? (routePoints[routePoints.length - 1] ?? null) : null) ??
    parseLonLat(params.get('ll'));

  const orgMatch = /\/maps\/(?:[^/]+\/)*?org\/([^/]+)\/(\d+)/.exec(url.pathname);

  return {
    url: url.toString(),
    lat: coords?.lat ?? null,
    lng: coords?.lng ?? null,
    slug: orgMatch?.[1] ?? null,
    oid: orgMatch?.[2] ?? null,
    textHint: params.get('text'),
  };
}

/** Slug вида `kooperativ_chyornyy` → «kooperativ chyornyy»: годится как запрос в поиск. */
export function slugToQuery(slug: string | null): string | null {
  if (!slug) return null;
  const cleaned = decodeURIComponent(slug).replace(/[-_]+/g, ' ').trim();
  return cleaned.length >= 3 ? cleaned : null;
}

export interface ExpandOptions {
  fetchImpl?: typeof fetch;
  maxRedirects?: number;
  timeoutMs?: number;
}

/**
 * Разворачивает короткую ссылку по цепочке 30x. Тело не качаем — оно бесполезно,
 * нужен только конечный адрес.
 */
export async function expandShortLink(raw: string, options: ExpandOptions = {}): Promise<string> {
  const doFetch = options.fetchImpl ?? fetch;
  const maxRedirects = options.maxRedirects ?? 5;
  let current = raw;

  for (let hop = 0; hop < maxRedirects; hop += 1) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), options.timeoutMs ?? 10_000);
    try {
      const response = await doFetch(current, {
        method: 'GET',
        redirect: 'manual',
        signal: controller.signal,
        headers: { 'user-agent': 'Mozilla/5.0 (compatible; invite-app/0.1)' },
      });
      const location = response.headers.get('location');
      if (!location) return current;
      current = new URL(location, current).toString();
    } finally {
      clearTimeout(timer);
    }
  }

  return current;
}

export async function resolveYandexLink(
  raw: string,
  options: ExpandOptions = {},
): Promise<YandexLinkData | null> {
  const target = isYandexShortLink(raw) ? await expandShortLink(raw, options) : raw;
  return parseYandexUrl(target);
}
