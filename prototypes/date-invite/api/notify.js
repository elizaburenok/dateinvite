/**
 * Serverless-хендлер (формат Vercel). Принимает выбор получателя и пересылает
 * его в Telegram. Локально этот же файл монтируется dev-плагином из vite.config.js
 * на маршрут /api/notify.
 *
 * Токен живёт только здесь (в process.env) и никогда не попадает в клиентский бандл.
 */

const TELEGRAM_API = 'https://api.telegram.org';

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function buildMessage(payload) {
  const { placeName, placeNote, to, from, ts } = payload;
  const when = ts ? new Date(ts) : new Date();
  const stamp = when.toLocaleString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const lines = [
    '💌 <b>Ответ на приглашение</b>',
    '',
    `Выбрано место: <b>${escapeHtml(placeName)}</b>`,
  ];

  if (placeNote) lines.push(`<i>${escapeHtml(placeNote)}</i>`);
  if (to) lines.push(`Кому отправлялось: ${escapeHtml(to)}`);
  if (from) lines.push(`От: ${escapeHtml(from)}`);
  lines.push('', `🕒 ${escapeHtml(stamp)}`);

  return lines.join('\n');
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.statusCode = 405;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ ok: false, error: 'method_not_allowed' }));
    return;
  }

  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  const payload = req.body && typeof req.body === 'object' ? req.body : {};

  if (!payload.placeName) {
    res.statusCode = 400;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ ok: false, error: 'place_required' }));
    return;
  }

  // Без настроенного .env UI не должен ломаться: отвечаем понятной ошибкой,
  // клиент сохранит выбор локально и покажет мягкое сообщение.
  if (!token || !chatId) {
    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    res.end(
      JSON.stringify({
        ok: false,
        error: 'telegram_not_configured',
        hint: 'Заполни TELEGRAM_BOT_TOKEN и TELEGRAM_CHAT_ID в .env (см. .env.example)',
      })
    );
    return;
  }

  try {
    const tgResponse = await fetch(`${TELEGRAM_API}/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: buildMessage(payload),
        parse_mode: 'HTML',
        disable_web_page_preview: true,
      }),
    });

    const result = await tgResponse.json().catch(() => ({}));

    if (!tgResponse.ok || result.ok === false) {
      res.statusCode = 200;
      res.setHeader('Content-Type', 'application/json');
      res.end(
        JSON.stringify({
          ok: false,
          error: 'telegram_rejected',
          description: result.description || `HTTP ${tgResponse.status}`,
        })
      );
      return;
    }

    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ ok: true }));
  } catch (error) {
    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ ok: false, error: 'network', description: String(error) }));
  }
}
