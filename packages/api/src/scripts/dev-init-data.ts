/**
 * Печатает валидную initData для локальной отладки Mini App вне Telegram.
 * Токен должен совпадать с BOT_TOKEN, с которым запущен API.
 */
import { buildDataCheckString, signInitData } from '../auth/initData.js';

const token = process.env.BOT_TOKEN;
if (!token) throw new Error('нужен BOT_TOKEN');

const telegramId = Number(process.env.DEV_TELEGRAM_ID ?? '424242');
const params = new URLSearchParams({
  auth_date: String(Math.floor(Date.now() / 1000)),
  user: JSON.stringify({ id: telegramId, first_name: 'Элиза', username: 'eliza' }),
});
params.set('hash', signInitData(buildDataCheckString(params), token));
console.log(params.toString());
