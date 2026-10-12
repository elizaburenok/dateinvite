import type { FastifyInstance } from 'fastify';
import { answerRequestSchema } from '@invite/shared';
import type { Db } from '../db/index.js';
import type { Notifier } from '../notify.js';
import {
  effectiveStatus,
  envelopePlaceRows,
  getAnswer,
  markOpened,
  recordAnswer,
  requireEnvelopeByToken,
  toInviteResponse,
} from '../domain/envelopes.js';
import { getUserById } from '../domain/users.js';
import { makePublicUrl } from '../lib/media.js';
import { PhotoStore } from '../resolver/photos.js';
import { localPhotoUrl } from './photos.js';
import type { PlaceRow } from '../domain/places.js';

export interface InviteRoutesDeps {
  db: Db;
  publicBaseUrl: string;
  notifier: Notifier;
  mediaDir: string;
}

/**
 * Публичные роуты гостя (§8). Никакой авторизации: единственный секрет — токен.
 * Всё, что здесь отдаётся, берётся из снапшота в БД, без походов во внешние сервисы (§3).
 */
export async function inviteRoutes(app: FastifyInstance, deps: InviteRoutesDeps): Promise<void> {
  const { db, notifier } = deps;
  const toPublicUrl = makePublicUrl(deps.publicBaseUrl);
  const photoStore = new PhotoStore({ mediaDir: deps.mediaDir });

  app.get<{ Params: { token: string } }>('/api/invite/:token', async (request, reply) => {
    const envelope = requireEnvelopeByToken(db, request.params.token);

    // Первое открытие переводит sent → opened и уведомляет хоста (§5, §14.3).
    if (markOpened(db, envelope)) {
      const host = getUserById(db, envelope.owner_id);
      if (host) {
        notifier
          .envelopeOpened(host, envelope)
          .catch((err) => request.log.error({ err }, 'не удалось отправить пуш об открытии'));
      }
    }

    // Invitations may contain previously stylized URLs. Resolve each saved
    // frame to its original so every guest card uses the unfiltered photo.
    const originals = new Map<string, Promise<string>>();
    const guestPhoto = (url: string): Promise<string> => {
      const source = localPhotoUrl(url, deps.publicBaseUrl);
      let original = originals.get(source);
      if (!original) {
        original = photoStore.original(source).catch(() => url);
        originals.set(source, original);
      }
      return original;
    };
    const places: PlaceRow[] = await Promise.all(envelopePlaceRows(db, envelope.id).map(async (row) => {
      const savedPhotos: string[] = JSON.parse(row.photos);
      const photos = await Promise.all(savedPhotos.map(guestPhoto));
      return { ...row, photos: JSON.stringify(photos), photo_url: photos[0] ?? null };
    }));
    const answer = getAnswer(db, envelope.id);
    // Ответ отдаём даже для протухшего конверта: страница сама покажет нужное состояние,
    // а контракт остаётся одной формы (§8).
    return reply.send(toInviteResponse(envelope, places, answer, toPublicUrl));
  });

  app.post<{ Params: { token: string } }>('/api/invite/:token/answer', async (request, reply) => {
    const parsed = answerRequestSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({
        error: 'invalid_body',
        message: 'Ожидается { chosen_place_id, message }',
      });
    }

    const envelope = requireEnvelopeByToken(db, request.params.token);
    const { answer, created } = recordAnswer(
      db,
      envelope,
      parsed.data.chosen_place_id,
      parsed.data.message,
    );

    if (created) {
      const host = getUserById(db, envelope.owner_id);
      const chosen = envelopePlaceRows(db, envelope.id).find((p) => p.id === answer.chosen_place_id);
      if (host && chosen) {
        notifier
          .envelopeAnswered(host, envelope, chosen, answer.guest_message)
          .catch((err) => request.log.error({ err }, 'не удалось отправить пуш об ответе'));
      }
    }

    return reply.send({
      chosen_place_id: answer.chosen_place_id,
      message: answer.guest_message,
      answered_at: answer.answered_at,
    });
  });

  // Лёгкий пинг для страницы: узнать статус, не перерисовывая весь конверт.
  app.get<{ Params: { token: string } }>('/api/invite/:token/status', async (request, reply) => {
    const envelope = requireEnvelopeByToken(db, request.params.token);
    return reply.send({ token: envelope.token, status: effectiveStatus(envelope) });
  });
}
