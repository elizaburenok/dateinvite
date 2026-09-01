import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { authHeader, makeTestContext, seedPlaces, type TestContext } from '../test/helpers.js';
import { insertPlace, listCandidates, softDeletePlace } from '../domain/places.js';
import { upsertUser } from '../domain/users.js';

const HOST_TG = 42;
let ctx: TestContext;

beforeEach(async () => {
  ctx = await makeTestContext();
});
afterEach(async () => {
  await ctx.close();
});

async function library(query = '') {
  const res = await ctx.app.inject({
    method: 'GET',
    url: `/api/places${query}`,
    headers: authHeader(HOST_TG),
  });
  return res.json();
}

describe('фильтры и фасеты библиотеки (§10.1, §12)', () => {
  beforeEach(() => {
    seedPlaces(ctx.db, HOST_TG, 4);
  });

  it('фильтрует по району', async () => {
    const { places } = await library('?district=Патриаршие');
    expect(places.map((p: { name: string }) => p.name)).toEqual(['Место 3', 'Место 1']);
  });

  it('фильтрует по категории', async () => {
    const { places } = await library('?category=Бар');
    expect(places).toHaveLength(2);
  });

  it('ищет по названию без учёта регистра', async () => {
    const { places } = await library('?q=место 2');
    expect(places).toHaveLength(1);
    expect(places[0].name).toBe('Место 2');
  });

  it('фильтрует по тегу точным совпадением, а не подстрокой', async () => {
    const user = upsertUser(ctx.db, { id: HOST_TG, first_name: 'Хост' });
    insertPlace(ctx.db, {
      owner_id: user.id,
      name: 'Кофейня с длинным тегом',
      source: 'manual',
      enrichment_status: 'resolved',
      tags: ['утренние'],
    });

    const { places } = await library('?tag=утро');
    expect(places).toHaveLength(1);
    expect(places[0].name).toBe('Место 1');
  });

  it('фасеты считаются по всей библиотеке, а не по текущей выборке', async () => {
    const { facets } = await library('?district=Патриаршие');
    expect(facets.districts).toEqual(['Басманный', 'Патриаршие']);
    expect(facets.categories).toEqual(['Бар', 'Кофейня']);
    expect(facets.tags).toEqual(['утро']);
  });
});

describe('инбокс «на подтверждение» (§3, §7)', () => {
  it('нечёткое место приходит с кандидатами и не считается resolved', async () => {
    seedPlaces(
      ctx.db,
      HOST_TG,
      1,
      { name: 'кофейня из поста', enrichment_status: 'needs_confirmation' },
      [
        { name: 'Кооператив Чёрный', address: 'Лялин переулок, 5с1', district: 'Басманный' },
        { name: 'Чёрный кофе', address: 'Покровка, 17' },
      ],
    );

    const { places, facets } = await library('?status=needs_confirmation');
    expect(places).toHaveLength(1);
    expect(places[0].candidates).toHaveLength(2);
    expect(facets.needs_confirmation_count).toBe(1);
  });

  it('подтверждение кандидата переносит его данные в место и чистит остальных', async () => {
    const [placeId] = seedPlaces(
      ctx.db,
      HOST_TG,
      1,
      { name: 'кофейня из поста', enrichment_status: 'needs_confirmation', district: null },
      [
        { name: 'Кооператив Чёрный', address: 'Лялин переулок, 5с1', district: 'Басманный' },
        { name: 'Чёрный кофе', address: 'Покровка, 17' },
      ],
    );

    const before = await library('?status=needs_confirmation');
    const candidateId = before.places[0].candidates[0].id;

    const res = await ctx.app.inject({
      method: 'PATCH',
      url: `/api/places/${placeId}`,
      headers: authHeader(HOST_TG),
      payload: { confirm_candidate_id: candidateId, note: 'сырники топ' },
    });

    expect(res.statusCode).toBe(200);
    const place = res.json();
    expect(place).toMatchObject({
      name: 'Кооператив Чёрный',
      address: 'Лялин переулок, 5с1',
      district: 'Басманный',
      enrichment_status: 'resolved',
      note: 'сырники топ',
    });
    expect(place.candidates).toEqual([]);

    const { facets } = await library();
    expect(facets.needs_confirmation_count).toBe(0);
  });
});

describe('правка карточки места (§10.2)', () => {
  it('меняет пометку и теги', async () => {
    const [placeId] = seedPlaces(ctx.db, HOST_TG, 1);
    const res = await ctx.app.inject({
      method: 'PATCH',
      url: `/api/places/${placeId}`,
      headers: authHeader(HOST_TG),
      payload: { note: 'тут тихо по утрам', tags: ['утро', 'работа'] },
    });
    expect(res.json()).toMatchObject({ note: 'тут тихо по утрам', tags: ['утро', 'работа'] });
  });

  it('не даёт править чужое место', async () => {
    const [placeId] = seedPlaces(ctx.db, HOST_TG, 1);
    const res = await ctx.app.inject({
      method: 'PATCH',
      url: `/api/places/${placeId}`,
      headers: authHeader(999),
      payload: { note: 'подмена' },
    });
    expect(res.statusCode).toBe(404);
  });

  it('отклоняет неизвестные поля вместо того, чтобы молча их проглотить', async () => {
    const [placeId] = seedPlaces(ctx.db, HOST_TG, 1);
    const res = await ctx.app.inject({
      method: 'PATCH',
      url: `/api/places/${placeId}`,
      headers: authHeader(HOST_TG),
      payload: { enrichment_status: 'resolved' },
    });
    expect(res.statusCode).toBe(400);
  });
});

describe('кандидаты не переживают своё место', () => {
  it('осиротевшие кандидаты не показываются', () => {
    const [placeId] = seedPlaces(ctx.db, HOST_TG, 1, { enrichment_status: 'needs_confirmation' }, [
      { name: 'Вариант', address: 'Улица, 1' },
    ]);
    expect(listCandidates(ctx.db, placeId!)).toHaveLength(1);

    // Правка в обход внешних ключей — ровно то, что делает внешний скрипт,
    // если забыл включить PRAGMA foreign_keys.
    ctx.db.pragma('foreign_keys = OFF');
    ctx.db.prepare('DELETE FROM places WHERE id = ?').run(placeId);
    ctx.db.pragma('foreign_keys = ON');

    expect(ctx.db.prepare('SELECT COUNT(*) AS c FROM place_candidates').get()).toEqual({ c: 1 });
    // Строки остались, но предлагать их хосту нельзя: места под ними нет.
    expect(listCandidates(ctx.db, placeId!)).toEqual([]);
  });

  it('кандидаты удалённого места не показываются', () => {
    const [placeId] = seedPlaces(ctx.db, HOST_TG, 1, { enrichment_status: 'needs_confirmation' }, [
      { name: 'Вариант', address: 'Улица, 1' },
    ]);
    softDeletePlace(ctx.db, upsertUser(ctx.db, { id: HOST_TG }).id, placeId!);
    expect(listCandidates(ctx.db, placeId!)).toEqual([]);
  });
});
