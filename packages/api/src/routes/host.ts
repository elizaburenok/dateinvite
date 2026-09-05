import type { FastifyInstance } from 'fastify';
import {
  createEnvelopeSchema,
  createPlaceSchema,
  placeFiltersSchema,
  updatePlaceSchema,
  type EnvelopeSummary,
} from '@invite/shared';
import type { Db } from '../db/index.js';
import { makeRequireHost, hostUser } from '../auth/hook.js';
import {
  confirmCandidate,
  getFacets,
  getPlaceRow,
  insertPlace,
  listCandidates,
  listPlaces,
  rowToPlace,
  softDeletePlace,
  updatePlace,
} from '../domain/places.js';
import {
  createEnvelope,
  effectiveStatus,
  envelopePlaceRows,
  getAnswer,
  inviteUrl,
  listEnvelopeRows,
} from '../domain/envelopes.js';
import { setUserCity } from '../domain/users.js';
import { makePublicUrl } from '../lib/media.js';
import { badRequest, notFound } from '../domain/errors.js';

export interface HostRoutesDeps {
  db: Db;
  botToken: string;
  publicBaseUrl: string;
  envelopeTtlDays: number;
}

/** Роуты Mini App (§8). Каждый запрос подтверждается свежей initData. */
export async function hostRoutes(app: FastifyInstance, deps: HostRoutesDeps): Promise<void> {
  const { db } = deps;
  const toPublicUrl = makePublicUrl(deps.publicBaseUrl);
  const requireHost = makeRequireHost({ db, botToken: deps.botToken });

  app.addHook('preHandler', requireHost);

  const withPublicPhoto = <T extends { photos: string[]; photo_url: string | null }>(
    place: T,
  ): T => ({
    ...place,
    photos: place.photos.map(toPublicUrl).filter((url): url is string => url !== null),
    photo_url: toPublicUrl(place.photo_url),
  });

  app.get('/api/me', async (request, reply) => {
    const user = hostUser(request);
    return reply.send({
      id: user.id,
      telegram_id: user.telegram_id,
      first_name: user.first_name,
      username: user.username,
      city: user.city,
    });
  });

  app.patch('/api/me', async (request, reply) => {
    const user = hostUser(request);
    const body = request.body as { city?: string | null } | undefined;
    if (body && 'city' in body) {
      const city = body.city?.trim() || null;
      setUserCity(db, user.id, city);
      return reply.send({ ...user, city });
    }
    return reply.send(user);
  });

  app.get('/api/places', async (request, reply) => {
    const user = hostUser(request);
    const filters = placeFiltersSchema.safeParse(request.query);
    if (!filters.success) {
      return reply.code(400).send({ error: 'invalid_filters', message: 'Некорректные фильтры' });
    }
    const places = listPlaces(db, user.id, filters.data).map(withPublicPhoto);
    return reply.send({ places, facets: getFacets(db, user.id) });
  });

  app.get<{ Params: { id: string } }>('/api/places/:id', async (request, reply) => {
    const user = hostUser(request);
    const row = getPlaceRow(db, user.id, request.params.id);
    if (!row) throw notFound('Место не найдено');
    return reply.send({
      ...withPublicPhoto(rowToPlace(row)),
      candidates: listCandidates(db, row.id),
    });
  });

  app.post('/api/places', async (request, reply) => {
    const user = hostUser(request);
    const parsed = createPlaceSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply
        .code(400)
        .send({ error: 'invalid_body', message: 'Проверьте поля места', issues: parsed.error.issues });
    }
    const row = insertPlace(db, {
      owner_id: user.id,
      ...parsed.data,
      source: 'manual',
      // Хост вводит данные руками — подтверждать нечего, это уже его правда.
      enrichment_status: 'resolved',
    });
    return reply.code(201).send({ ...withPublicPhoto(rowToPlace(row)), candidates: [] });
  });

  app.patch<{ Params: { id: string } }>('/api/places/:id', async (request, reply) => {
    const user = hostUser(request);
    const parsed = updatePlaceSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply
        .code(400)
        .send({ error: 'invalid_body', message: 'Проверьте поля места', issues: parsed.error.issues });
    }

    const { confirm_candidate_id, ...patch } = parsed.data;

    if (confirm_candidate_id) {
      const confirmed = confirmCandidate(db, user.id, request.params.id, confirm_candidate_id);
      if (!confirmed) throw notFound('Место или кандидат не найдены');
    }

    const hasPatch = Object.keys(patch).length > 0;
    const row = hasPatch
      ? updatePlace(db, user.id, request.params.id, patch)
      : getPlaceRow(db, user.id, request.params.id);
    if (!row) throw notFound('Место не найдено');

    return reply.send({
      ...withPublicPhoto(rowToPlace(row)),
      candidates: listCandidates(db, row.id),
    });
  });

  app.delete<{ Params: { id: string } }>('/api/places/:id', async (request, reply) => {
    const user = hostUser(request);
    if (!softDeletePlace(db, user.id, request.params.id)) throw notFound('Место не найдено');
    return reply.code(204).send();
  });

  app.post('/api/envelopes', async (request, reply) => {
    const user = hostUser(request);
    const parsed = createEnvelopeSchema.safeParse(request.body);
    if (!parsed.success) {
      // Сообщение схемы уже человеческое («Нужно минимум 3 места») — отдаём его как есть.
      const first = parsed.error.issues[0];
      throw badRequest('invalid_place_count', first?.message ?? 'Некорректный конверт');
    }
    const envelope = createEnvelope(db, {
      ownerId: user.id,
      placeIds: parsed.data.place_ids,
      hostNote: parsed.data.host_note,
      ttlDays: deps.envelopeTtlDays,
    });
    return reply.code(201).send({
      token: envelope.token,
      url: inviteUrl(deps.publicBaseUrl, envelope.token),
    });
  });

  app.get('/api/envelopes', async (request, reply) => {
    const user = hostUser(request);
    const envelopes: EnvelopeSummary[] = listEnvelopeRows(db, user.id).map((envelope) => {
      const places = envelopePlaceRows(db, envelope.id);
      const answer = getAnswer(db, envelope.id);
      const chosen = answer ? places.find((p) => p.id === answer.chosen_place_id) : undefined;
      return {
        id: envelope.id,
        token: envelope.token,
        url: inviteUrl(deps.publicBaseUrl, envelope.token),
        host_note: envelope.host_note,
        status: effectiveStatus(envelope),
        created_at: envelope.created_at,
        sent_at: envelope.sent_at,
        opened_at: envelope.opened_at,
        answered_at: envelope.answered_at,
        expires_at: envelope.expires_at,
        places: places.map((row) => withPublicPhoto(rowToPlace(row))),
        answer: answer
          ? {
              chosen_place_id: answer.chosen_place_id,
              chosen_place_name: chosen?.name ?? 'Удалённое место',
              guest_message: answer.guest_message,
              answered_at: answer.answered_at,
            }
          : null,
      };
    });
    return reply.send({ envelopes });
  });
}
