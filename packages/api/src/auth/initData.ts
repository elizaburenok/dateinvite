import crypto from 'node:crypto';
import { INIT_DATA_MAX_AGE_SEC } from '@invite/shared';

/**
 * Валидация Telegram Mini App initData — единственная точка доверия к личности хоста (§3).
 *
 * Схема из core.telegram.org/bots/webapps:
 *   secret_key = HMAC_SHA256(bot_token, "WebAppData")
 *   hex(HMAC_SHA256(data_check_string, secret_key)) == hash
 *
 * Из data-check-string исключается ТОЛЬКО поле hash. Поле signature участвует в подписи
 * (оно исключается лишь в сторонней Ed25519-схеме, которую мы не используем).
 */

export interface TelegramUser {
  id: number;
  first_name?: string;
  last_name?: string;
  username?: string;
  language_code?: string;
}

export type InitDataFailure =
  | 'malformed'
  | 'missing_hash'
  | 'missing_user'
  | 'bad_signature'
  | 'expired';

export type InitDataResult =
  | { ok: true; user: TelegramUser; authDate: number }
  | { ok: false; reason: InitDataFailure };

export interface ValidateOptions {
  maxAgeSec?: number;
  /** Unix-секунды; параметр только ради детерминированных тестов. */
  nowSec?: number;
}

export function buildDataCheckString(params: URLSearchParams): string {
  return [...params.entries()]
    .filter(([key]) => key !== 'hash')
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([key, value]) => `${key}=${value}`)
    .join('\n');
}

export function signInitData(dataCheckString: string, botToken: string): string {
  const secretKey = crypto.createHmac('sha256', 'WebAppData').update(botToken).digest();
  return crypto.createHmac('sha256', secretKey).update(dataCheckString).digest('hex');
}

export function validateInitData(
  initData: string,
  botToken: string,
  options: ValidateOptions = {},
): InitDataResult {
  const maxAgeSec = options.maxAgeSec ?? INIT_DATA_MAX_AGE_SEC;
  const nowSec = options.nowSec ?? Math.floor(Date.now() / 1000);

  if (!initData || !botToken) return { ok: false, reason: 'malformed' };

  let params: URLSearchParams;
  try {
    params = new URLSearchParams(initData);
  } catch {
    return { ok: false, reason: 'malformed' };
  }

  const hash = params.get('hash');
  if (!hash) return { ok: false, reason: 'missing_hash' };

  const expected = signInitData(buildDataCheckString(params), botToken);
  const received = Buffer.from(hash, 'hex');
  const computed = Buffer.from(expected, 'hex');
  if (received.length !== computed.length || !crypto.timingSafeEqual(received, computed)) {
    return { ok: false, reason: 'bad_signature' };
  }

  const authDate = Number(params.get('auth_date'));
  if (!Number.isFinite(authDate) || authDate <= 0) return { ok: false, reason: 'malformed' };
  // Подпись валидна вечно, поэтому свежесть проверяем отдельно: иначе перехваченная
  // однажды строка открывала бы библиотеку хоста навсегда.
  if (nowSec - authDate > maxAgeSec) return { ok: false, reason: 'expired' };

  const rawUser = params.get('user');
  if (!rawUser) return { ok: false, reason: 'missing_user' };

  let user: TelegramUser;
  try {
    user = JSON.parse(rawUser) as TelegramUser;
  } catch {
    return { ok: false, reason: 'malformed' };
  }
  if (typeof user?.id !== 'number') return { ok: false, reason: 'missing_user' };

  return { ok: true, user, authDate };
}
