import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { webhookCallback } from 'grammy';
import { buildApp } from './app.js';
import { config } from './config.js';
import { openDb } from './db/index.js';
import { NominatimClient } from './resolver/nominatim.js';
import { PhotoStore } from './resolver/photos.js';
import { configureBotCommands, createBot } from './bot/index.js';
import { createTelegramNotifier } from './bot/notifier.js';
import { noopNotifier, type Notifier } from './notify.js';
import { registerFrontend } from './frontends.js';

const packagesDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

/**
 * Подключение к Telegram с повторами. Свежий домен (например, туннель) не сразу
 * виден снаружи, поэтому первая попытка часто падает на резолве имени —
 * это нормально и лечится ожиданием, а не падением процесса.
 */
async function setupTelegram(
  bot: ReturnType<typeof createBot>,
  app: Awaited<ReturnType<typeof buildApp>>,
  miniAppUrl: string,
  useWebhook: boolean,
): Promise<void> {
  const webhookUrl = `${config.publicBaseUrl}/bot/webhook/${config.webhookSecret}`;

  await bot.init();

  if (!useWebhook) {
    // Мог остаться вебхук с прошлого запуска на другом адресе — Telegram не отдаёт
    // обновления через getUpdates, пока он задан, и бот молчал бы без объяснений.
    await bot.api.deleteWebhook();
    // Telegram принимает вебхуки только по HTTPS — локально работаем поллингом.
    app.log.warn('PUBLIC_BASE_URL не https, запускаю бота в режиме long polling');
    void bot.start({ allowed_updates: ['message', 'callback_query'] });
    return;
  }

  const delaysMs = [0, 5_000, 15_000, 30_000, 60_000];
  for (const [attempt, delay] of delaysMs.entries()) {
    if (delay > 0) await new Promise((resolve) => setTimeout(resolve, delay));
    try {
      await bot.api.setWebhook(webhookUrl, {
        secret_token: config.webhookSecret,
        allowed_updates: ['message', 'callback_query'],
      });
      await configureBotCommands(bot, miniAppUrl);
      app.log.info(`вебхук установлен: ${webhookUrl}`);
      return;
    } catch (error) {
      const last = attempt === delaysMs.length - 1;
      app.log[last ? 'error' : 'warn'](
        { err: error },
        last
          ? 'вебхук так и не установился — бот не будет получать сообщения'
          : `вебхук не установился, попытка ${attempt + 1} из ${delaysMs.length}`,
      );
      if (last) throw error;
    }
  }
}

async function main(): Promise<void> {
  const db = openDb(config.dbPath);
  const nominatim = new NominatimClient({
    db,
    baseUrl: config.nominatimBaseUrl,
    userAgent: config.nominatimUserAgent,
  });
  const photoStore = new PhotoStore({ mediaDir: config.mediaDir });
  const miniAppUrl = `${config.publicBaseUrl}/app/`;

  let notifier: Notifier = noopNotifier;
  let bot: ReturnType<typeof createBot> | null = null;

  // DEV_SKIP_BOT позволяет поднять API с настоящим токеном (нужен для проверки initData),
  // но без подключения к Telegram — так Mini App отлаживается локально.
  const botRuns = config.botEnabled && process.env.DEV_SKIP_BOT !== '1';
  if (botRuns) {
    bot = createBot({ db, token: config.botToken, nominatim, photoStore, miniAppUrl });
    notifier = createTelegramNotifier(bot, config.publicBaseUrl);
  }

  const app = await buildApp({
    db,
    botToken: config.botToken,
    publicBaseUrl: config.publicBaseUrl,
    envelopeTtlDays: config.envelopeTtlDays,
    mediaDir: config.mediaDir,
    notifier,
    logger: true,
  });

  // Режим выбирается один раз и на всю жизнь процесса: grammY запрещает
  // long polling, если для бота уже создан обработчик вебхука, — а раньше
  // маршрут регистрировался всегда, и локальный запуск молча оставался без бота.
  const useWebhook = config.publicBaseUrl.startsWith('https://');

  if (bot && useWebhook) {
    if (!config.webhookSecret) {
      throw new Error('С BOT_TOKEN обязателен WEBHOOK_SECRET — иначе вебхук открыт всем');
    }
    // Секрет и в пути, и в заголовке X-Telegram-Bot-Api-Secret-Token:
    // путь прячет эндпоинт, заголовок доказывает, что запрос от Telegram.
    app.post(
      `/bot/webhook/${config.webhookSecret}`,
      webhookCallback(bot, 'fastify', { secretToken: config.webhookSecret }),
    );
  }

  await registerFrontend(app, {
    root: path.join(packagesDir, 'miniapp/dist'),
    prefix: '/app/',
    name: 'miniapp',
  });
  await registerFrontend(app, {
    root: path.join(packagesDir, 'guest/dist'),
    prefix: '/i/',
    name: 'guest',
  });

  await app.listen({ port: config.port, host: config.host });

  if (bot) {
    // Настройка бота идёт отдельно от HTTP и не может его уронить: страница-конверт
    // обязана открываться, даже когда Telegram недоступен или адрес ещё не разошёлся
    // по DNS. Иначе чужой сбой на старте гасит весь продукт.
    void setupTelegram(bot, app, miniAppUrl, useWebhook).catch((error) => {
      app.log.error({ err: error }, 'бот не настроился, HTTP при этом работает');
    });
  }

  const shutdown = async () => {
    app.log.info('останавливаюсь…');
    if (bot) await bot.stop().catch(() => undefined);
    await app.close();
    db.close();
    process.exit(0);
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
