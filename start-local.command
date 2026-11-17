#!/bin/bash
# Open with Terminal to run the host Mini App outside Telegram.
set -euo pipefail
cd "$(dirname "$0")"

if [[ ! -f .env ]] || ! rg -q '^BOT_TOKEN=.+$' .env; then
  echo 'Нужен BOT_TOKEN в .env для локальной авторизации.'
  exit 1
fi

echo 'Собираю приложение…'
npm run build

# A Telegram signature expires after 24 hours; refresh only the local dev copy.
node --env-file=.env --input-type=module <<'JS'
import fs from 'node:fs';
import { buildDataCheckString, signInitData } from './packages/api/dist/auth/initData.js';

const params = new URLSearchParams({
  auth_date: String(Math.floor(Date.now() / 1000)),
  user: JSON.stringify({ id: Number(process.env.DEV_TELEGRAM_ID ?? '424242'), first_name: 'Элиза', username: 'eliza' }),
});
params.set('hash', signInitData(buildDataCheckString(params), process.env.BOT_TOKEN));
const filename = 'packages/miniapp/.env.local';
const previous = fs.existsSync(filename) ? fs.readFileSync(filename, 'utf8') : '';
const next = /^VITE_DEV_INIT_DATA=/m.test(previous)
  ? previous.replace(/^VITE_DEV_INIT_DATA=.*$/m, `VITE_DEV_INIT_DATA=${params}`)
  : `${previous.trimEnd()}\nVITE_DEV_INIT_DATA=${params}\n`;
fs.writeFileSync(filename, next, { mode: 0o600 });
fs.chmodSync(filename, 0o600);
JS

for port in 3000 5175; do
  if lsof -nP -iTCP:"$port" -sTCP:LISTEN 2>/dev/null | rg -q LISTEN; then
    echo "Порт $port уже занят. Остановите прежний сервер и запустите снова."
    exit 1
  fi
done

DEV_SKIP_BOT=1 PUBLIC_BASE_URL=http://localhost:3000 PORT=3000 HOST=127.0.0.1 \
  node --env-file=.env packages/api/dist/server.js &
api_pid=$!
./node_modules/.bin/vite packages/miniapp --host 127.0.0.1 --port 5175 --strictPort &
app_pid=$!
trap 'kill "$api_pid" "$app_pid" 2>/dev/null || true' EXIT INT TERM

for attempt in {1..40}; do
  if curl --silent --fail --output /dev/null http://127.0.0.1:3000/app/ && \
     curl --silent --fail --output /dev/null http://127.0.0.1:5175/app/; then
    echo 'Приложение запущено: http://localhost:5175/app/'
    open http://localhost:5175/app/
    wait "$api_pid" "$app_pid"
    exit 0
  fi
  if ! kill -0 "$api_pid" 2>/dev/null || ! kill -0 "$app_pid" 2>/dev/null; then
    echo 'Один из серверов завершился. Проверьте ошибку выше.'
    exit 1
  fi
  sleep 0.5
done
echo 'Серверы не ответили вовремя. Проверьте сообщения выше.'
exit 1
