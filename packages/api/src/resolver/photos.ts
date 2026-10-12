import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import { DEFAULT_HALFTONE, MAX_PHOTO_BYTES, MAX_PHOTO_PIXELS, halftoneSettingsSchema, renderHalftone, type HalftoneSettings } from '@invite/shared';

/**
 * Фото места берётся из самого Telegram-поста и складывается к нам (§14.4):
 * это законный источник и единственный способ пережить удаление оригинала (§3).
 * Фото с Яндекс.Карт мы не трогаем — их API прямо запрещает сохранять данные.
 */

const MAX_BYTES = MAX_PHOTO_BYTES;
const LOCAL_PHOTO = /^\/media\/([a-f0-9]{24,64}\.(?:jpg|jpeg|png|webp))(?:\.halftone-([a-f0-9]{16})\.png)?$/;

export interface PhotoStoreOptions {
  mediaDir: string;
  fetchImpl?: typeof fetch;
}

export class PhotoStore {
  constructor(private readonly options: PhotoStoreOptions) {}

  async saveOriginal(buffer: Buffer): Promise<string> {
    if (!buffer.length || buffer.length > MAX_BYTES) throw new Error('Фото должно быть не больше 10 МБ');
    const metadata = await sharp(buffer, { limitInputPixels: MAX_PHOTO_PIXELS }).metadata();
    if (!metadata.format || !['jpeg', 'png', 'webp'].includes(metadata.format) || (metadata.pages ?? 1) > 1) {
      throw new Error('Поддерживаются обычные JPEG, PNG и WebP');
    }
    const ext = metadata.format === 'jpeg' ? 'jpg' : metadata.format;
    const hash = crypto.createHash('sha256').update(buffer).digest('hex').slice(0, 32);
    const filename = `${hash}.${ext}`;
    await fs.mkdir(this.options.mediaDir, { recursive: true });
    await fs.writeFile(path.join(this.options.mediaDir, filename), buffer);
    return `/media/${filename}`;
  }

  async source(photoUrl: string): Promise<{ source_url: string; settings: HalftoneSettings }> {
    const match = LOCAL_PHOTO.exec(photoUrl);
    if (!match) throw new Error('Выберите фотографию, загруженную в проект');
    const source_url = await this.original(photoUrl);
    let settings: HalftoneSettings = { ...DEFAULT_HALFTONE };
    if (match[2]) {
      const saved = await fs.readFile(path.join(this.options.mediaDir, `${path.basename(photoUrl)}.json`), 'utf8');
      settings = halftoneSettingsSchema.parse(JSON.parse(saved));
    }
    return { source_url, settings };
  }

  async original(photoUrl: string): Promise<string> {
    const match = LOCAL_PHOTO.exec(photoUrl);
    if (!match) throw new Error('Выберите фотографию, загруженную в проект');
    await fs.access(path.join(this.options.mediaDir, match[1]!));
    return `/media/${match[1]}`;
  }

  async render(photoUrl: string, settings: HalftoneSettings): Promise<string> {
    const { source_url } = await this.source(photoUrl);
    const parsed = halftoneSettingsSchema.parse(settings);
    const hash = crypto.createHash('sha256').update(`halftone-v1:${JSON.stringify(parsed)}`).digest('hex').slice(0, 16);
    const filename = `${path.basename(source_url)}.halftone-${hash}.png`;
    const destination = path.join(this.options.mediaDir, filename);
    try { await fs.access(destination); return `/media/${filename}`; } catch { /* First render. */ }
    const { data, info } = await sharp(path.join(this.options.mediaDir, path.basename(source_url)), { limitInputPixels: MAX_PHOTO_PIXELS })
      .rotate().toColourspace('srgb').ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    const pixels = renderHalftone(data, info.width, info.height, parsed);
    const png = await sharp(pixels, { raw: { width: info.width, height: info.height, channels: 4 } }).png().toBuffer();
    // Publish only complete files; concurrent requests can safely produce the same deterministic image.
    const temporary = `${destination}.${crypto.randomUUID()}.tmp`;
    await fs.writeFile(`${destination}.json`, JSON.stringify(parsed));
    await fs.writeFile(temporary, png);
    await fs.rename(temporary, destination);
    return `/media/${filename}`;
  }

  /** Existing stylized photos keep their chosen settings; old local originals get the default. */
  async prepare(photoUrl: string, settings: HalftoneSettings): Promise<string> {
    const match = LOCAL_PHOTO.exec(photoUrl);
    if (!match || match[2]) return photoUrl;
    return this.render(photoUrl, settings);
  }

  /**
   * Скачивает файл и кладёт под именем-хешем содержимого.
   * Хеш вместо случайного имени: одно и то же фото не размножается копиями,
   * а имя можно кешировать навсегда.
   */
  async saveFromUrl(url: string, _suggestedName: string, settings: HalftoneSettings = DEFAULT_HALFTONE): Promise<string | null> {
    const doFetch = this.options.fetchImpl ?? fetch;
    const response = await doFetch(url);
    if (!response.ok) return null;

    const length = Number(response.headers.get('content-length') ?? '0');
    if (length > MAX_BYTES) return null;

    if (!response.body) return null;
    const chunks: Uint8Array[] = [];
    let bytes = 0;
    for await (const chunk of response.body) {
      bytes += chunk.byteLength;
      // Leaving the async iterator cancels the stream and releases its reader.
      if (bytes > MAX_BYTES) return null;
      chunks.push(chunk);
    }
    const buffer = Buffer.concat(chunks);
    if (buffer.byteLength === 0 || buffer.byteLength > MAX_BYTES) return null;

    return this.render(await this.saveOriginal(buffer), settings);
  }
}
