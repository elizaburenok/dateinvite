import Fastify, { type FastifyInstance } from 'fastify';
import fastifyStatic from '@fastify/static';
import fastifyCors from '@fastify/cors';
import fs from 'node:fs';
import type { Db } from './db/index.js';
import { DomainError } from './domain/errors.js';
import { hostRoutes } from './routes/host.js';
import { inviteRoutes } from './routes/invite.js';
import { noopNotifier, type Notifier } from './notify.js';

export interface AppDeps {
  db: Db;
  botToken: string;
  publicBaseUrl: string;
  envelopeTtlDays: number;
  mediaDir: string;
  notifier?: Notifier;
  logger?: boolean;
}

export async function buildApp(deps: AppDeps): Promise<FastifyInstance> {
  const app = Fastify({ logger: deps.logger ?? false, trustProxy: true });

  // Гость-страница живёт на другом origin, поэтому её роутам нужен CORS.
  // Ничего секретного они не отдают: доступ и так открыт по токену.
  await app.register(fastifyCors, { origin: true });

  app.setErrorHandler((error, request, reply) => {
    if (error instanceof DomainError) {
      return reply.code(error.status).send({ error: error.code, message: error.message });
    }
    request.log.error({ err: error }, 'необработанная ошибка');
    // Fastify отдаёт ошибку как unknown; свои 4xx (валидация роутера, размер тела)
    // пробрасываем как есть, всё остальное схлопываем в 500 без утечки внутренностей.
    const failure = error as { statusCode?: number; message?: string };
    const status =
      typeof failure.statusCode === 'number' && failure.statusCode >= 400 && failure.statusCode < 500
        ? failure.statusCode
        : 500;
    return reply.code(status).send({
      error: status === 500 ? 'internal_error' : 'request_error',
      message: status === 500 ? 'Внутренняя ошибка' : (failure.message ?? 'Ошибка запроса'),
    });
  });

  app.get('/api/health', async () => ({ ok: true }));

  if (fs.existsSync(deps.mediaDir)) {
    await app.register(fastifyStatic, {
      root: deps.mediaDir,
      prefix: '/media/',
      // Кешированные снимки не меняются: имя файла содержит хеш содержимого.
      maxAge: '30d',
      index: false,
      list: false,
    });
  }

  await app.register(hostRoutes, {
    db: deps.db,
    botToken: deps.botToken,
    publicBaseUrl: deps.publicBaseUrl,
    envelopeTtlDays: deps.envelopeTtlDays,
  });

  await app.register(inviteRoutes, {
    db: deps.db,
    publicBaseUrl: deps.publicBaseUrl,
    notifier: deps.notifier ?? noopNotifier,
  });

  return app;
}
