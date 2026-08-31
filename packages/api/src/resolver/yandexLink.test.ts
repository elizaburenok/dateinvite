import { describe, expect, it, vi } from 'vitest';
import {
  expandShortLink,
  isYandexMapsUrl,
  isYandexShortLink,
  parseYandexUrl,
  resolveYandexLink,
  slugToQuery,
} from './yandexLink.js';

describe('распознавание ссылок Яндекс.Карт', () => {
  it('принимает карты на разных доменах', () => {
    expect(isYandexMapsUrl('https://yandex.ru/maps/org/kooperativ/1042665827/')).toBe(true);
    expect(isYandexMapsUrl('https://yandex.com/maps/213/moscow/')).toBe(true);
    expect(isYandexMapsUrl('https://yandex.ru/maps/-/CDb1IL3Z')).toBe(true);
  });

  it('не принимает чужие ссылки и не-карты Яндекса', () => {
    expect(isYandexMapsUrl('https://maps.google.com/?q=1')).toBe(false);
    expect(isYandexMapsUrl('https://yandex.ru/search/?text=кофе')).toBe(false);
    expect(isYandexMapsUrl('не ссылка')).toBe(false);
    // Домен только заканчивается на yandex.ru, но им не является.
    expect(isYandexMapsUrl('https://evil-yandex.ru/maps/org/x/1/')).toBe(false);
  });

  it('отличает короткую ссылку от развёрнутой', () => {
    expect(isYandexShortLink('https://yandex.ru/maps/-/CDb1IL3Z')).toBe(true);
    expect(isYandexShortLink('https://yandex.ru/maps/org/x/1/')).toBe(false);
  });
});

describe('извлечение координат из URL', () => {
  it('ll — это долгота,широта', () => {
    const data = parseYandexUrl('https://yandex.ru/maps/213/moscow/?ll=37.617700%2C55.755863&z=10');
    expect(data).toMatchObject({ lat: 55.755863, lng: 37.6177 });
  });

  it('rtext — наоборот, широта,долгота; берём конечную точку маршрута', () => {
    const data = parseYandexUrl(
      'https://yandex.ru/maps/?rtext=55.947789%2C37.300785~56.071224%2C37.057169&rtt=mt',
    );
    expect(data).toMatchObject({ lat: 56.071224, lng: 37.057169 });
  });

  it('whatshere точнее, чем центр карты', () => {
    const data = parseYandexUrl(
      'https://yandex.ru/maps/213/moscow/?ll=37.617700%2C55.755863&whatshere%5Bpoint%5D=37.651832%2C55.760021&whatshere%5Bzoom%5D=17',
    );
    expect(data).toMatchObject({ lat: 55.760021, lng: 37.651832 });
  });

  it('достаёт slug и oid организации', () => {
    const data = parseYandexUrl('https://yandex.ru/maps/org/kooperativ_chyornyy/1042665827/');
    expect(data).toMatchObject({ slug: 'kooperativ_chyornyy', oid: '1042665827' });
  });

  it('достаёт slug и oid, когда в пути есть город', () => {
    const data = parseYandexUrl('https://yandex.ru/maps/213/moscow/org/kooperativ_chyornyy/1042665827/');
    expect(data).toMatchObject({ slug: 'kooperativ_chyornyy', oid: '1042665827' });
  });

  it('без координат отдаёт null вместо выдуманной точки', () => {
    const data = parseYandexUrl('https://yandex.ru/maps/org/kooperativ_chyornyy/1042665827/');
    expect(data).toMatchObject({ lat: null, lng: null });
  });

  it('отбрасывает бессмысленные координаты', () => {
    expect(parseYandexUrl('https://yandex.ru/maps/?ll=999%2C999')).toMatchObject({ lat: null });
    expect(parseYandexUrl('https://yandex.ru/maps/?ll=0%2C0')).toMatchObject({ lat: null });
    // Широта 200 невозможна — значит пара разобрана неверно, лучше ничего.
    expect(parseYandexUrl('https://yandex.ru/maps/?ll=37.6%2C200')).toMatchObject({ lat: null });
  });

  it('берёт подсказку названия из text=', () => {
    const data = parseYandexUrl('https://yandex.ru/maps/?text=Кооператив%20Чёрный');
    expect(data?.textHint).toBe('Кооператив Чёрный');
  });
});

describe('slugToQuery', () => {
  it('превращает slug в поисковый запрос', () => {
    expect(slugToQuery('kooperativ_chyornyy')).toBe('kooperativ chyornyy');
  });
  it('игнорирует слишком короткий мусор', () => {
    expect(slugToQuery('ab')).toBeNull();
    expect(slugToQuery(null)).toBeNull();
  });
});

describe('разворачивание короткой ссылки', () => {
  it('идёт по цепочке редиректов до конечного адреса', async () => {
    const target = 'https://yandex.ru/maps/213/moscow/org/kooperativ_chyornyy/1042665827/?ll=37.651832%2C55.760021';
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce({ headers: new Headers({ location: '/maps/redir/step2' }) })
      .mockResolvedValueOnce({ headers: new Headers({ location: target }) })
      .mockResolvedValueOnce({ headers: new Headers() });

    const result = await expandShortLink('https://yandex.ru/maps/-/CDb1IL3Z', {
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    expect(result).toBe(target);
    expect(fetchImpl).toHaveBeenCalledTimes(3);
  });

  it('не зацикливается на бесконечном редиректе', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      headers: new Headers({ location: 'https://yandex.ru/maps/-/loop' }),
    });
    await expandShortLink('https://yandex.ru/maps/-/loop', {
      fetchImpl: fetchImpl as unknown as typeof fetch,
      maxRedirects: 3,
    });
    expect(fetchImpl).toHaveBeenCalledTimes(3);
  });

  it('resolveYandexLink разворачивает и разбирает за один вызов', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      headers: new Headers({
        location: 'https://yandex.ru/maps/org/kooperativ_chyornyy/1042665827/?ll=37.651832%2C55.760021',
      }),
    });
    const data = await resolveYandexLink('https://yandex.ru/maps/-/CDb1IL3Z', {
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    expect(data).toMatchObject({ lat: 55.760021, lng: 37.651832, oid: '1042665827' });
  });
});
