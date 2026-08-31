import fastifyStatic from '@fastify/static';
import fs from 'node:fs';
import path from 'node:path';
import type { FastifyInstance } from 'fastify';

/**
 * Раздача собранных фронтендов тем же процессом.
 * В проде перед приложением стоит Caddy, но так `npm start` даёт рабочий
 * продукт целиком — без него нельзя было бы проверить сборку локально.
 */
export async function registerFrontend(
  app: FastifyInstance,
  options: { root: string; prefix: string; name: string },
): Promise<boolean> {
  if (!fs.existsSync(path.join(options.root, 'index.html'))) return false;

  await app.register(
    async (scope) => {
      await scope.register(fastifyStatic, {
        root: options.root,
        // Префикс уже задан на плагине-обёртке ниже. Если повторить его здесь,
        // Fastify склеит их в /i/i/, ассеты уедут не туда, а на /i/assets/*
        // сработает SPA-фолбэк и отдаст HTML под видом JS.
        prefix: '/',
        index: ['index.html'],
        list: false,
      });

      // SPA-фолбэк: /i/<token> и внутренние маршруты Mini App должны отдавать index.html,
      // иначе прямой переход по ссылке упирается в 404.
      scope.setNotFoundHandler((request, reply) => {
        if (request.method !== 'GET') return reply.code(404).send({ error: 'not_found' });
        return reply.sendFile('index.html', options.root);
      });
    },
    { prefix: options.prefix.replace(/\/$/, '') },
  );

  app.log.info(`[${options.name}] раздаётся из ${options.root}`);
  return true;
}
