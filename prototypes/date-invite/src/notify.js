/**
 * Отправка выбора: сначала сохраняем локально (чтобы ответ не потерялся),
 * потом пробуем доставить в Telegram через /api/notify.
 */

import { inviteId } from './config.js';

const storageKey = (id) => `date-invite:${id}`;

export function readAnswer(id = inviteId) {
  try {
    const raw = localStorage.getItem(storageKey(id));
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function saveAnswer(answer, id = inviteId) {
  try {
    localStorage.setItem(storageKey(id), JSON.stringify(answer));
  } catch {
    /* приватный режим / переполнение — не критично, UI продолжает работать */
  }
}

/** @returns {Promise<{ok: boolean, error?: string}>} */
export async function sendAnswer(answer) {
  saveAnswer(answer, answer.inviteId);

  try {
    const response = await fetch('/api/notify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(answer),
    });

    const result = await response.json().catch(() => ({ ok: false, error: 'bad_json' }));

    if (result.ok) {
      saveAnswer({ ...answer, delivered: true }, answer.inviteId);
      return { ok: true };
    }

    return { ok: false, error: result.error || 'unknown' };
  } catch (error) {
    return { ok: false, error: 'network' };
  }
}
