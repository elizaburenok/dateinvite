import { describe, expect, it, vi } from 'vitest';
import { openDb } from '../db/index.js';
import { createLocale } from './index.js';
import type { translateWithClaude } from './claude.js';

/** Переводчик-заглушка: отдаёт «EN:<исходник>» и считает вызовы. */
function fakeTranslator(): typeof translateWithClaude & { calls: number } {
  const fn = vi.fn(async (requests: Parameters<typeof translateWithClaude>[0]) =>
    requests.map((request) => `EN:${request.source}`),
  ) as unknown as typeof translateWithClaude & { calls: number };
  return fn;
}

describe('локализация места', () => {
  it('готовый английский из OSM важнее перевода', async () => {
    const translate = fakeTranslator();
    const locale = createLocale({ db: openDb(':memory:'), apiKey: 'test', translate });

    const result = await locale.place({
      name: 'Кооператив «Чёрный»',
      address: 'Лялин переулок, 5, Москва',
      district: null,
      nameEn: 'Cooperative Chorny',
      addressEn: '5 Lyalin Lane, Moscow',
    });

    expect(result.name).toBe('Cooperative Chorny');
    expect(result.address).toBe('5 Lyalin Lane, Moscow');
    // Переводить было нечего — сетевого вызова быть не должно.
    expect(translate).not.toHaveBeenCalled();
  });

  it('оригинал сохраняется рядом с переводом', async () => {
    const locale = createLocale({ db: openDb(':memory:'), apiKey: 'test', translate: fakeTranslator() });

    const result = await locale.place({ name: 'Бергамот', address: '', district: 'Тверской' });

    expect(result).toMatchObject({
      name: 'EN:Бергамот',
      name_ru: 'Бергамот',
      district: 'EN:Тверской',
      district_ru: 'Тверской',
    });
  });

  it('строку на латинице не трогает и оригинал ей не заводит', async () => {
    const translate = fakeTranslator();
    const locale = createLocale({ db: openDb(':memory:'), apiKey: 'test', translate });

    const result = await locale.place({ name: 'Skuratov Coffee', address: '', district: null });

    expect(result).toMatchObject({ name: 'Skuratov Coffee', name_ru: null });
    expect(translate).not.toHaveBeenCalled();
  });

  it('второй раз ту же строку не переводит — берёт из кеша', async () => {
    const db = openDb(':memory:');
    const translate = fakeTranslator();
    const locale = createLocale({ db, apiKey: 'test', translate });

    await locale.place({ name: 'Бергамот', address: '', district: null });
    const second = await locale.place({ name: 'Бергамот', address: '', district: null });

    expect(second.name).toBe('EN:Бергамот');
    expect(translate).toHaveBeenCalledTimes(1);
  });

  it('переводчик упал — место всё равно сохраняется латиницей', async () => {
    const onError = vi.fn();
    const failing = vi.fn(async () => {
      throw new Error('нет сети');
    }) as unknown as typeof translateWithClaude;
    const db = openDb(':memory:');
    const locale = createLocale({ db, apiKey: 'test', translate: failing, onError });

    const result = await locale.place({
      name: 'Бергамот',
      address: 'Малая Зеленина, 4',
      district: null,
    });

    expect(result.name).toBe('Bergamot');
    expect(result.address).toBe('4 Malaya Zelenina');
    expect(onError).toHaveBeenCalled();
    // Транслит — запасной вариант, а не решение: в кеш он попасть не должен,
    // иначе одна сетевая ошибка навсегда закрепила бы худший перевод.
    const cached = db.prepare('SELECT COUNT(*) AS count FROM translations').get() as { count: number };
    expect(cached.count).toBe(0);
  });

  it('без ключа работает транслитом и никуда не ходит', async () => {
    const locale = createLocale({ db: openDb(':memory:') });
    const result = await locale.place({ name: 'Щукин', address: '', district: null });
    expect(result.name).toBe('Shchukin');
  });
});
