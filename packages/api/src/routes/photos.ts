import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { halftoneSettingsSchema, MAX_PHOTO_BYTES } from '@invite/shared';
import { makeRequireHost, hostUser } from '../auth/hook.js';
import { getPhotoStyle, savePhotoStyle } from '../domain/photoStyle.js';
import { badRequest } from '../domain/errors.js';
import { PhotoStore } from '../resolver/photos.js';
import type { Db } from '../db/index.js';

export function localPhotoUrl(value: string, publicBaseUrl: string): string {
  if (value.startsWith('/media/')) return value;
  try {
    const url = new URL(value);
    if (url.origin === new URL(publicBaseUrl).origin) return url.pathname;
  } catch { /* Rejected by PhotoStore, without fetching remote URLs. */ }
  return value;
}

export async function photoRoutes(app: FastifyInstance, deps: { db: Db; botToken: string; mediaDir: string; publicBaseUrl: string }) {
  app.addHook('preHandler', makeRequireHost(deps));
  const store = new PhotoStore({ mediaDir: deps.mediaDir });
  app.get('/api/photo-style', async (request) => getPhotoStyle(deps.db, hostUser(request).id));
  app.put('/api/photo-style', async (request) => {
    const parsed = halftoneSettingsSchema.safeParse(request.body);
    if (!parsed.success) throw badRequest('invalid_style', 'Проверьте настройки растра');
    savePhotoStyle(deps.db, hostUser(request).id, parsed.data);
    return parsed.data;
  });
  app.addContentTypeParser(['image/jpeg', 'image/png', 'image/webp'], { parseAs: 'buffer', bodyLimit: MAX_PHOTO_BYTES }, (_request, body, done) => done(null, body));
  app.post('/api/photos', { bodyLimit: MAX_PHOTO_BYTES }, async (request, reply) => {
    if (!Buffer.isBuffer(request.body)) throw badRequest('invalid_photo', 'Выберите JPEG, PNG или WebP');
    try {
      return reply.code(201).send({ source_url: await store.saveOriginal(request.body) });
    } catch {
      throw badRequest('invalid_photo', 'Не удалось прочитать фото. Нужен JPEG, PNG или WebP до 10 МБ и 40 мегапикселей.');
    }
  });
  app.get('/api/photos/source', async (request) => {
    const parsed = z.object({ photo_url: z.string().max(500) }).safeParse(request.query);
    if (!parsed.success) throw badRequest('invalid_photo', 'Не выбрана фотография');
    try { return await store.source(localPhotoUrl(parsed.data.photo_url, deps.publicBaseUrl)); }
    catch { throw badRequest('invalid_photo', 'Оригинал недоступен. Загрузите фотографию с устройства.'); }
  });
  app.post('/api/photos/render', async (request) => {
    const parsed = z.object({ photo_url: z.string().max(500), settings: halftoneSettingsSchema }).safeParse(request.body);
    if (!parsed.success) throw badRequest('invalid_photo', 'Проверьте фотографию и настройки');
    try { return { photo_url: await store.render(localPhotoUrl(parsed.data.photo_url, deps.publicBaseUrl), parsed.data.settings) }; }
    catch { throw badRequest('invalid_photo', 'Не удалось обработать фотографию. Попробуйте загрузить её заново.'); }
  });
}
