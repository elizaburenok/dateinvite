import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';

/**
 * Фото места берётся из самого Telegram-поста и складывается к нам (§14.4):
 * это законный источник и единственный способ пережить удаление оригинала (§3).
 * Фото с Яндекс.Карт мы не трогаем — их API прямо запрещает сохранять данные.
 */

const ALLOWED_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp']);
const MAX_BYTES = 10 * 1024 * 1024;

export interface PhotoStoreOptions {
  mediaDir: string;
  fetchImpl?: typeof fetch;
}

export class PhotoStore {
  constructor(private readonly options: PhotoStoreOptions) {}

  /**
   * Скачивает файл и кладёт под именем-хешем содержимого.
   * Хеш вместо случайного имени: одно и то же фото не размножается копиями,
   * а имя можно кешировать навсегда.
   */
  async saveFromUrl(url: string, suggestedName: string): Promise<string | null> {
    const doFetch = this.options.fetchImpl ?? fetch;
    const response = await doFetch(url);
    if (!response.ok) return null;

    const length = Number(response.headers.get('content-length') ?? '0');
    if (length > MAX_BYTES) return null;

    const buffer = Buffer.from(await response.arrayBuffer());
    if (buffer.byteLength === 0 || buffer.byteLength > MAX_BYTES) return null;

    // Расширение берём из имени, выданного Telegram, а не из URL, и только из белого списка.
    const ext = ALLOWED_EXTENSIONS.has(path.extname(suggestedName).toLowerCase())
      ? path.extname(suggestedName).toLowerCase()
      : '.jpg';
    const hash = crypto.createHash('sha256').update(buffer).digest('hex').slice(0, 32);
    const filename = `${hash}${ext}`;

    await fs.mkdir(this.options.mediaDir, { recursive: true });
    await fs.writeFile(path.join(this.options.mediaDir, filename), buffer);

    // В БД храним относительный путь: домен может смениться, снапшот от этого не пострадает.
    return `/media/${filename}`;
  }
}
