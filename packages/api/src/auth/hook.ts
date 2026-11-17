import type { FastifyReply, FastifyRequest } from 'fastify';
import { validateInitData } from './initData.js';
import { upsertUser, type UserRow } from '../domain/users.js';
import type { Db } from '../db/index.js';

declare module 'fastify' {
  interface FastifyRequest {
    hostUser?: UserRow;
  }
}

/**
 * Заголовок вида `Authorization: tma <initData>` — соглашение платформы Mini Apps.
 * Токен бота не покидает сервер, клиент лишь пересылает то, что ему выдал Telegram.
 */
function extractInitData(request: FastifyRequest): string | null {
  const header = request.headers.authorization;
  if (!header) return null;
  const [scheme, ...rest] = header.split(' ');
  if (scheme?.toLowerCase() !== 'tma' || rest.length === 0) return null;
  return rest.join(' ');
}

export interface HostAuthDeps {
  db: Db;
  botToken: string;
}

export function makeRequireHost({ db, botToken }: HostAuthDeps) {
  return async function requireHost(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    if (!botToken) {
      // Без токена бота подпись проверить нечем — молча пускать нельзя.
      await reply.code(503).send({
        error: 'bot_not_configured',
        message: 'Host authentication is unavailable because BOT_TOKEN is not configured',
      });
      return;
    }

    const initData = extractInitData(request);
    if (!initData) {
      await reply
        .code(401)
        .send({ error: 'unauthorized', message: 'Missing Authorization: tma <initData> header' });
      return;
    }

    const result = validateInitData(initData, botToken);
    if (!result.ok) {
      await reply.code(401).send({ error: result.reason, message: 'initData verification failed' });
      return;
    }

    request.hostUser = upsertUser(db, result.user);
  };
}

export function hostUser(request: FastifyRequest): UserRow {
  if (!request.hostUser) throw new Error('requireHost не отработал перед хендлером');
  return request.hostUser;
}
