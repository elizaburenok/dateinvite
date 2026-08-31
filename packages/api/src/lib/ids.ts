import crypto from 'node:crypto';

export function uuid(): string {
  return crypto.randomUUID();
}

/**
 * Публичный токен конверта: 16 случайных байт = 128 бит энтропии (§13),
 * base64url — чтобы ссылка оставалась короткой и без экранирования.
 */
export function envelopeToken(): string {
  return crypto.randomBytes(16).toString('base64url');
}

export function nowIso(): string {
  return new Date().toISOString();
}
