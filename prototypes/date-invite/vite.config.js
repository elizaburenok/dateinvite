import { defineConfig, loadEnv } from 'vite';
import { resolve } from 'node:path';

/**
 * Dev-плагин: монтирует serverless-хендлер api/notify.js на /api/notify,
 * чтобы локальный `npm run dev` вёл себя так же, как продакшн на Vercel.
 * Секреты из .env читаются здесь, на сервере, и в бандл не попадают.
 */
function apiDevServer(env) {
  return {
    name: 'api-dev-server',
    configureServer(server) {
      server.middlewares.use('/api/notify', async (req, res, next) => {
        if (req.method !== 'POST') return next();

        // Отдаём секреты хендлеру через process.env — как на Vercel.
        process.env.TELEGRAM_BOT_TOKEN =
          process.env.TELEGRAM_BOT_TOKEN || env.TELEGRAM_BOT_TOKEN || '';
        process.env.TELEGRAM_CHAT_ID =
          process.env.TELEGRAM_CHAT_ID || env.TELEGRAM_CHAT_ID || '';

        try {
          const raw = await new Promise((resolve, reject) => {
            let data = '';
            req.on('data', (chunk) => {
              data += chunk;
            });
            req.on('end', () => resolve(data));
            req.on('error', reject);
          });

          req.body = raw ? JSON.parse(raw) : {};

          // Свежий импорт на каждый запрос — правки в хендлере подхватываются без рестарта.
          const module = await server.ssrLoadModule('/api/notify.js');
          await module.default(req, res);
        } catch (error) {
          res.statusCode = 500;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ ok: false, error: 'dev_handler_failed', description: String(error) }));
        }
      });
    },
  };
}

export default defineConfig(({ mode }) => {
  // '' — грузим все переменные, включая без префикса VITE_ (они нужны только серверу).
  const env = loadEnv(mode, process.cwd(), '');

  return {
    plugins: [apiDevServer(env)],
    server: { host: true },
    build: { rollupOptions: { input: { builder: resolve('index.html'), invite: resolve('invite.html') } } },
  };
});
