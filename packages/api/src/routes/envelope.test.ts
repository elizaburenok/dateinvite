import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { inviteResponseSchema } from '@invite/shared';
import { authHeader, makeTestContext, seedPlaces, type TestContext } from '../test/helpers.js';

const HOST_TG = 42;

let ctx: TestContext;

beforeEach(async () => {
  ctx = await makeTestContext();
});

afterEach(async () => {
  await ctx.close();
});

async function createEnvelope(placeIds: string[], hostNote: string | null = 'Куда поедем в субботу?') {
  return ctx.app.inject({
    method: 'POST',
    url: '/api/envelopes',
    headers: authHeader(HOST_TG),
    payload: { place_ids: placeIds, host_note: hostNote },
  });
}

describe('лимит 3–5 мест на уровне API (§12)', () => {
  it('отклоняет конверт из двух мест', async () => {
    const ids = seedPlaces(ctx.db, HOST_TG, 2);
    const res = await createEnvelope(ids);
    expect(res.statusCode).toBe(400);
    expect(res.json().error).toBe('invalid_place_count');
  });

  it('отклоняет конверт из шести мест', async () => {
    const ids = seedPlaces(ctx.db, HOST_TG, 6);
    const res = await createEnvelope(ids);
    expect(res.statusCode).toBe(400);
    expect(res.json().error).toBe('invalid_place_count');
  });

  it('принимает 3, 4 и 5 мест', async () => {
    for (const count of [3, 4, 5]) {
      const ids = seedPlaces(ctx.db, HOST_TG, count);
      const res = await createEnvelope(ids);
      expect(res.statusCode, `для ${count} мест`).toBe(201);
    }
  });

  it('отклоняет дубли одного и того же места', async () => {
    const ids = seedPlaces(ctx.db, HOST_TG, 3);
    const res = await createEnvelope([ids[0]!, ids[0]!, ids[1]!]);
    expect(res.statusCode).toBe(400);
    expect(res.json().error).toBe('duplicate_places');
  });

  it('не даёт положить в конверт неподтверждённое место (§3)', async () => {
    const ids = seedPlaces(ctx.db, HOST_TG, 3, { enrichment_status: 'needs_confirmation' });
    const res = await createEnvelope(ids);
    expect(res.statusCode).toBe(400);
    expect(res.json().error).toBe('unconfirmed_place');
  });

  it('не даёт положить в конверт чужое место', async () => {
    const mine = seedPlaces(ctx.db, HOST_TG, 2);
    const [theirs] = seedPlaces(ctx.db, 777, 1);
    const res = await createEnvelope([...mine, theirs!]);
    expect(res.statusCode).toBe(400);
    expect(res.json().error).toBe('unknown_place');
  });
});

describe('жизненный цикл конверта (§5)', () => {
  it('sent → opened → answered, с уведомлениями хосту', async () => {
    const ids = seedPlaces(ctx.db, HOST_TG, 3);
    const created = await createEnvelope(ids);
    const { token, url } = created.json();
    expect(url).toBe(`https://invite.test/i/${token}`);

    const listBefore = await ctx.app.inject({
      method: 'GET',
      url: '/api/envelopes',
      headers: authHeader(HOST_TG),
    });
    expect(listBefore.json().envelopes[0].status).toBe('sent');

    const opened = await ctx.app.inject({ method: 'GET', url: `/api/invite/${token}` });
    expect(opened.statusCode).toBe(200);
    expect(opened.json().status).toBe('opened');
    expect(ctx.sent.filter((n) => n.kind === 'opened')).toHaveLength(1);

    // Повторное открытие не плодит уведомления: переход бывает только один раз.
    await ctx.app.inject({ method: 'GET', url: `/api/invite/${token}` });
    expect(ctx.sent.filter((n) => n.kind === 'opened')).toHaveLength(1);

    const answered = await ctx.app.inject({
      method: 'POST',
      url: `/api/invite/${token}/answer`,
      payload: { chosen_place_id: ids[1], message: 'давай к 12?' },
    });
    expect(answered.statusCode).toBe(200);
    expect(answered.json().chosen_place_id).toBe(ids[1]);

    const notification = ctx.sent.find((n) => n.kind === 'answered');
    expect(notification).toMatchObject({ chosenPlaceName: 'Место 2', guestMessage: 'давай к 12?' });

    const listAfter = await ctx.app.inject({
      method: 'GET',
      url: '/api/envelopes',
      headers: authHeader(HOST_TG),
    });
    const summary = listAfter.json().envelopes[0];
    expect(summary.status).toBe('answered');
    expect(summary.answer).toMatchObject({
      chosen_place_id: ids[1],
      chosen_place_name: 'Место 2',
      guest_message: 'давай к 12?',
    });
  });

  it('повторный ответ идемпотентен и не плодит дубли (§8)', async () => {
    const ids = seedPlaces(ctx.db, HOST_TG, 3);
    const { token } = (await createEnvelope(ids)).json();

    const first = await ctx.app.inject({
      method: 'POST',
      url: `/api/invite/${token}/answer`,
      payload: { chosen_place_id: ids[0], message: 'первый' },
    });
    const second = await ctx.app.inject({
      method: 'POST',
      url: `/api/invite/${token}/answer`,
      payload: { chosen_place_id: ids[2], message: 'передумал' },
    });

    expect(second.statusCode).toBe(200);
    expect(second.json()).toEqual(first.json());
    expect(second.json().chosen_place_id).toBe(ids[0]);

    const rows = ctx.db.prepare('SELECT COUNT(*) AS c FROM answers').get() as { c: number };
    expect(rows.c).toBe(1);
    expect(ctx.sent.filter((n) => n.kind === 'answered')).toHaveLength(1);
  });

  it('не принимает выбор места, которого нет в конверте', async () => {
    const ids = seedPlaces(ctx.db, HOST_TG, 4);
    const { token } = (await createEnvelope(ids.slice(0, 3))).json();
    const res = await ctx.app.inject({
      method: 'POST',
      url: `/api/invite/${token}/answer`,
      payload: { chosen_place_id: ids[3], message: null },
    });
    expect(res.statusCode).toBe(400);
    expect(res.json().error).toBe('unknown_place');
  });

  it('протухший конверт отдаётся со статусом expired и не принимает ответ (§14.2)', async () => {
    const ids = seedPlaces(ctx.db, HOST_TG, 3);
    const { token } = (await createEnvelope(ids)).json();
    ctx.db
      .prepare('UPDATE envelopes SET expires_at = ? WHERE token = ?')
      .run(new Date(Date.now() - 1000).toISOString(), token);

    const res = await ctx.app.inject({ method: 'GET', url: `/api/invite/${token}` });
    expect(res.json().status).toBe('expired');

    const answer = await ctx.app.inject({
      method: 'POST',
      url: `/api/invite/${token}/answer`,
      payload: { chosen_place_id: ids[0], message: null },
    });
    expect(answer.statusCode).toBe(410);
    expect(answer.json().error).toBe('envelope_expired');
  });

  it('неизвестный токен — 404, а не подсказка о существовании конверта', async () => {
    const res = await ctx.app.inject({ method: 'GET', url: '/api/invite/definitely-not-a-token' });
    expect(res.statusCode).toBe(404);
  });
});

describe('контракт GET /invite/{token} (§8)', () => {
  it('форма ответа ровно по схеме и без внутренних полей', async () => {
    const ids = seedPlaces(ctx.db, HOST_TG, 3);
    const { token } = (await createEnvelope(ids, 'Выбирай ✨')).json();

    const res = await ctx.app.inject({ method: 'GET', url: `/api/invite/${token}` });
    const parsed = inviteResponseSchema.safeParse(res.json());
    expect(parsed.success).toBe(true);

    const body = res.json();
    expect(body.host_note).toBe('Выбирай ✨');
    expect(body.places).toHaveLength(3);
    // Гостю не утекают ни владелец, ни служебные статусы места, ни исходная ссылка.
    expect(Object.keys(body.places[0]).sort()).toEqual(
      ['category', 'district', 'id', 'lat', 'lng', 'maps_url', 'name', 'note', 'photo_url', 'rating'].sort(),
    );
    // Относительный путь к фото развёрнут в абсолютный — страница живёт на другом домене.
    expect(body.places[0].photo_url).toBe('https://invite.test/media/place-1.jpg');
  });

  it('порядок мест в конверте — тот, что задал хост', async () => {
    const ids = seedPlaces(ctx.db, HOST_TG, 3);
    const reversed = [ids[2]!, ids[0]!, ids[1]!];
    const { token } = (await createEnvelope(reversed)).json();
    const res = await ctx.app.inject({ method: 'GET', url: `/api/invite/${token}` });
    expect(res.json().places.map((p: { id: string }) => p.id)).toEqual(reversed);
  });
});

describe('снапшот переживает уборку в библиотеке (§3, §12)', () => {
  it('удалённое место остаётся в уже отправленном конверте', async () => {
    const ids = seedPlaces(ctx.db, HOST_TG, 3);
    const { token } = (await createEnvelope(ids)).json();

    const deleted = await ctx.app.inject({
      method: 'DELETE',
      url: `/api/places/${ids[0]}`,
      headers: authHeader(HOST_TG),
    });
    expect(deleted.statusCode).toBe(204);

    const library = await ctx.app.inject({
      method: 'GET',
      url: '/api/places',
      headers: authHeader(HOST_TG),
    });
    expect(library.json().places).toHaveLength(2);

    const invite = await ctx.app.inject({ method: 'GET', url: `/api/invite/${token}` });
    expect(invite.json().places).toHaveLength(3);
    expect(invite.json().places[0].name).toBe('Место 1');
  });
});

describe('авторизация хоста', () => {
  it('без initData библиотека закрыта', async () => {
    const res = await ctx.app.inject({ method: 'GET', url: '/api/places' });
    expect(res.statusCode).toBe(401);
  });

  it('гость-роуты работают без авторизации (§3, асимметрия)', async () => {
    const ids = seedPlaces(ctx.db, HOST_TG, 3);
    const { token } = (await createEnvelope(ids)).json();
    const res = await ctx.app.inject({ method: 'GET', url: `/api/invite/${token}` });
    expect(res.statusCode).toBe(200);
  });

  it('хост не видит чужую библиотеку', async () => {
    seedPlaces(ctx.db, HOST_TG, 3);
    const res = await ctx.app.inject({
      method: 'GET',
      url: '/api/places',
      headers: authHeader(999),
    });
    expect(res.json().places).toEqual([]);
  });
});
