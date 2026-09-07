import { fileURLToPath } from 'node:url';
import path from 'node:path';

const here = path.dirname(fileURLToPath(import.meta.url));
/** Корень монорепо: src/ и dist/ лежат на одной глубине от packages/api. */
const repoRoot = path.resolve(here, '../../..');

function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Не задана переменная окружения ${name} (см. deploy/.env.example)`);
  return value;
}

function optional(name: string, fallback: string): string {
  return process.env[name] || fallback;
}

export const config = {
  port: Number(optional('PORT', '3000')),
  host: optional('HOST', '0.0.0.0'),

  /** Публичный адрес, от него строятся ссылки на конверты и на фото. */
  publicBaseUrl: optional('PUBLIC_BASE_URL', 'http://localhost:3000').replace(/\/$/, ''),

  dbPath: path.resolve(repoRoot, optional('DB_PATH', 'data/invite.db')),
  mediaDir: path.resolve(repoRoot, optional('MEDIA_DIR', 'data/media')),

  botToken: process.env.BOT_TOKEN ?? '',
  webhookSecret: optional('WEBHOOK_SECRET', ''),

  envelopeTtlDays: Number(optional('ENVELOPE_TTL_DAYS', '14')),

  /**
   * Политика использования Nominatim требует содержательный User-Agent
   * с контактом — иначе запросы законно блокируют.
   */
  nominatimUserAgent: optional('NOMINATIM_USER_AGENT', 'invite-app/0.1 (self-hosted personal use)'),
  nominatimBaseUrl: optional('NOMINATIM_BASE_URL', 'https://nominatim.openstreetmap.org'),

  /**
   * Перевод названий и адресов на английский. Без ключа остаются тег name:en
   * из OSM и транслитерация — места всё равно сохраняются латиницей,
   * просто «Цветочная лавка» станет Tsvetochnaya Lavka, а не Flower Shop.
   */
  anthropicApiKey: process.env.ANTHROPIC_API_KEY ?? '',
  translationModel: optional('TRANSLATION_MODEL', 'claude-opus-5'),

  /**
   * Модель для LLM-разбора поста в ветке «только текст» без адреса: делит слитное
   * «Бренд + бизнес-центр» на искомое имя и достаёт город. Без ключа не зовётся.
   */
  extractionModel: optional('EXTRACTION_MODEL', 'claude-opus-5'),

  /** Бот включается только когда есть токен — тесты и локальная разработка живут без него. */
  get botEnabled(): boolean {
    return this.botToken.length > 0;
  },

  requireBotToken(): string {
    return required('BOT_TOKEN');
  },
} as const;

export type Config = typeof config;
