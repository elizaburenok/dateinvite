import { beforeEach, describe, expect, it, vi } from 'vitest';
import { openDb, type Db } from '../db/index.js';
import { NominatimClient, type NominatimPlace } from './nominatim.js';
import { resolvePlace } from './index.js';

const KOOPERATIV: NominatimPlace = {
  place_id: 1,
  lat: '55.7600217',
  lon: '37.6518326',
  name: 'Кооператив «Чёрный»',
  display_name: 'Кооператив «Чёрный», 5 с1, Лялин переулок, Бауманка, Басманный район, Москва, Россия',
  category: 'amenity',
  type: 'cafe',
  address: {
    amenity: 'Кооператив «Чёрный»',
    house_number: '5 с1',
    road: 'Лялин переулок',
    suburb: 'Бауманка',
    city: 'Москва',
  },
};

const MART: NominatimPlace = {
  place_id: 2,
  lat: '55.7501',
    lon: '37.6301',
  name: 'Март',
  display_name: 'Март, 12, Солянка, Москва, Россия',
  category: 'amenity',
  type: 'bar',
  address: { road: 'Солянка', house_number: '12', city: 'Москва', suburb: 'Китай-город' },
};

let db: Db;

function clientReturning(byUrl: (url: string) => NominatimPlace[]) {
  const fetchImpl = vi.fn(async (input: unknown) => {
    const url = String(input);
    return {
      ok: true,
      status: 200,
      json: async () => (url.includes('/reverse') ? (byUrl(url)[0] ?? {}) : byUrl(url)),
    } as Response;
  });
  const client = new NominatimClient({
    db,
    baseUrl: 'https://nominatim.test',
    userAgent: 'test',
    fetchImpl: fetchImpl as unknown as typeof fetch,
    minIntervalMs: 0,
  });
  return { client, fetchImpl };
}

beforeEach(() => {
  db = openDb(':memory:');
});

describe('ветка «ссылка Яндекс.Карт» (§7)', () => {
  it('координаты из ссылки + обогащение из OSM дают resolved', async () => {
    const { client } = clientReturning(() => [KOOPERATIV]);
    const result = await resolvePlace(
      { urls: ['https://yandex.ru/maps/org/kooperativ/1042665827/?ll=37.651832%2C55.760021'] },
      { nominatim: client },
    );

    expect(result.status).toBe('resolved');
    if (result.status !== 'resolved') return;
    expect(result.place).toMatchObject({
      name: 'Кооператив «Чёрный»',
      address: 'Лялин переулок, 5 с1, Москва',
      district: 'Бауманка',
      category: 'Кофейня',
      source: 'yandex',
    });
    // maps_url — исходная ссылка хоста, а не выдуманная нами.
    expect(result.place.maps_url).toContain('/maps/org/kooperativ/1042665827/');
  });

  it('короткая ссылка сначала разворачивается', async () => {
    const { client } = clientReturning(() => [KOOPERATIV]);
    const expandFetch = vi.fn().mockResolvedValue({
      headers: new Headers({
        location: 'https://yandex.ru/maps/org/kooperativ/1042665827/?ll=37.651832%2C55.760021',
      }),
    });

    const result = await resolvePlace(
      { urls: ['https://yandex.ru/maps/-/CDb1IL3Z'] },
      { nominatim: client, expandOptions: { fetchImpl: expandFetch as unknown as typeof fetch } },
    );

    expect(expandFetch).toHaveBeenCalled();
    expect(result.status).toBe('resolved');
  });

  it('ссылка без координат уходит в кандидаты, а не в resolved', async () => {
    const { client } = clientReturning(() => [KOOPERATIV]);
    const result = await resolvePlace(
      { urls: ['https://yandex.ru/maps/org/kooperativ_chyornyy/1042665827/'] },
      { nominatim: client },
    );

    expect(result.status).toBe('needs_confirmation');
    if (result.status !== 'needs_confirmation') return;
    expect(result.candidates).toHaveLength(1);
  });

  it('координата есть, а объекта в OSM нет — просим хоста дописать название', async () => {
    const { client } = clientReturning(() => []);
    const result = await resolvePlace(
      { urls: ['https://yandex.ru/maps/?ll=37.651832%2C55.760021&text=Кооператив'] },
      { nominatim: client },
    );

    expect(result.status).toBe('needs_confirmation');
    if (result.status !== 'needs_confirmation') return;
    expect(result.draft).toMatchObject({ name: 'Кооператив', lat: 55.760021, lng: 37.651832 });
  });
});

describe('ветки геометки и venue (§7)', () => {
  it('venue от Telegram верим напрямую', async () => {
    const { client } = clientReturning(() => [KOOPERATIV]);
    const result = await resolvePlace(
      {
        venue: { title: 'Кооператив Чёрный', address: 'Лялин пер., 5с1', lat: 55.76, lng: 37.65 },
      },
      { nominatim: client },
    );

    expect(result.status).toBe('resolved');
    if (result.status !== 'resolved') return;
    expect(result.place).toMatchObject({
      name: 'Кооператив Чёрный',
      address: 'Лялин пер., 5с1',
      district: 'Бауманка',
      source: 'telegram',
    });
  });

  it('голая геометка обогащается через reverse', async () => {
    const { client } = clientReturning(() => [KOOPERATIV]);
    const result = await resolvePlace(
      { location: { lat: 55.7600217, lng: 37.6518326 } },
      { nominatim: client },
    );
    expect(result.status).toBe('resolved');
    if (result.status !== 'resolved') return;
    expect(result.place.name).toBe('Кооператив «Чёрный»');
  });
});

describe('ветка «только текст» (§7, §12)', () => {
  it('даёт кандидатов и НЕ сохраняет как resolved', async () => {
    const { client } = clientReturning((url) =>
      url.includes('%D0%9C%D0%B0%D1%80%D1%82') || url.includes('Март') ? [MART] : [KOOPERATIV],
    );

    const result = await resolvePlace(
      { text: 'Вчера были в баре «Март» на Солянке, отличное место', city: 'Москва' },
      { nominatim: client },
    );

    expect(result.status).toBe('needs_confirmation');
    if (result.status !== 'needs_confirmation') return;
    expect(result.candidates.length).toBeGreaterThanOrEqual(1);
    expect(result.candidates.length).toBeLessThanOrEqual(3);
    expect(result.candidates[0]).toMatchObject({ name: 'Март', category: 'Бар' });
  });

  it('не отдаёт больше трёх кандидатов', async () => {
    const many = Array.from({ length: 9 }, (_, i) => ({
      ...MART,
      place_id: 100 + i,
      lat: String(55.75 + i / 100),
      name: `Вариант ${i}`,
    }));
    const { client } = clientReturning(() => many);

    const result = await resolvePlace(
      { text: 'кофейня «Один», бар «Два», ресторан «Три»', city: 'Москва' },
      { nominatim: client },
    );
    expect(result.status).toBe('needs_confirmation');
    if (result.status !== 'needs_confirmation') return;
    expect(result.candidates).toHaveLength(3);
  });

  it('текст без зацепок — failed, место не создаётся молча', async () => {
    const { client } = clientReturning(() => []);
    const result = await resolvePlace({ text: 'очень вкусно, всем советую' }, { nominatim: client });
    expect(result).toMatchObject({ status: 'failed' });
  });

  it('название есть, но на карте ничего не нашлось — тоже failed', async () => {
    const { client } = clientReturning(() => []);
    const result = await resolvePlace(
      { text: 'кофейня «Неведомая Зверушка»' },
      { nominatim: client },
    );
    expect(result).toMatchObject({ status: 'failed' });
  });

  it('пустой ввод — failed', async () => {
    const { client } = clientReturning(() => []);
    expect(await resolvePlace({}, { nominatim: client })).toMatchObject({ status: 'failed' });
  });
});

describe('кеш Nominatim (условие политики использования)', () => {
  it('повторный одинаковый запрос не ходит в сеть', async () => {
    const { client, fetchImpl } = clientReturning(() => [KOOPERATIV]);
    await client.reverse(55.76, 37.65);
    await client.reverse(55.76, 37.65);
    expect(fetchImpl).toHaveBeenCalledTimes(1);

    const cached = db.prepare('SELECT COUNT(*) AS c FROM geo_cache').get() as { c: number };
    expect(cached.c).toBe(1);
  });
});

describe('шум в кандидатах', () => {
  it('название в кавычках отсекает варианты из соседних заглавных слов', async () => {
    const byQuery = (url: string): NominatimPlace[] => {
      const q = decodeURIComponent(new URL(url).searchParams.get('q') ?? '');
      if (q.startsWith('Профсоюз')) return [MART];
      // «Покровке» — случайное слово из фразы, оно не должно попасть в список.
      return [{ ...MART, place_id: 99, name: 'Театр на Покровке', lat: '55.7634' }];
    };
    const { client } = clientReturning(byQuery);

    const result = await resolvePlace(
      { text: 'Сходили в бар «Профсоюз» на Покровке', city: 'Москва' },
      { nominatim: client },
    );

    expect(result.status).toBe('needs_confirmation');
    if (result.status !== 'needs_confirmation') return;
    expect(result.candidates.map((c) => c.name)).toEqual(['Март']);
  });
});

describe('подсказка названия из ссылки (§7)', () => {
  it('размеченное человеком название бьёт первое слово с заглавной', async () => {
    const byQuery = (url: string): NominatimPlace[] => {
      const q = decodeURIComponent(new URL(url).searchParams.get('q') ?? '');
      // «Красота» — первое слово фразы, настоящее название размечено ссылкой.
      return q.startsWith('Баски') ? [{ ...MART, name: 'Баски & Монегаски' }] : [];
    };
    const { client } = clientReturning(byQuery);

    const result = await resolvePlace(
      {
        text: 'Красота дня — нарядные завтраки в Баски & Монегаски, Провиантская ул., 3/6',
        nameHints: ['Баски & Монегаски'],
        city: 'Москва',
      },
      { nominatim: client },
    );

    expect(result.status).toBe('needs_confirmation');
    if (result.status !== 'needs_confirmation') return;
    expect(result.draft.name).toBe('Баски & Монегаски');
    expect(result.candidates[0]?.name).toBe('Баски & Монегаски');
  });
});
