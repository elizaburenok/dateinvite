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

export interface InviteRoutesDeps {
  db: Db;
  publicBaseUrl: string;
  notifier: Notifier;
}

/**
 * Публичные роуты гостя (§8). Никакой авторизации: единственный секрет — токен.
 * Всё, что здесь отдаётся, берётся из снапшота в БД, без походов во внешние сервисы (§3).
 */
export async function inviteRoutes(app: FastifyInstance, deps: InviteRoutesDeps): Promise<void> {
  const { db, notifier } = deps;
  const toPublicUrl = makePublicUrl(deps.publicBaseUrl);

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

    const places = envelopePlaceRows(db, envelope.id);
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
