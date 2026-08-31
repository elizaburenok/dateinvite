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

  if (bot) {
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
    await bot.init();
    const webhookUrl = `${config.publicBaseUrl}/bot/webhook/${config.webhookSecret}`;
    if (webhookUrl.startsWith('https://')) {
      await bot.api.setWebhook(webhookUrl, {
        secret_token: config.webhookSecret,
        allowed_updates: ['message', 'callback_query'],
      });
      await configureBotCommands(bot, miniAppUrl);
      app.log.info(`вебхук установлен: ${webhookUrl}`);
    } else {
      // Telegram принимает вебхуки только по HTTPS — локально работаем поллингом.
      app.log.warn('PUBLIC_BASE_URL не https, запускаю бота в режиме long polling');
      void bot.start({ allowed_updates: ['message', 'callback_query'] });
    }
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
