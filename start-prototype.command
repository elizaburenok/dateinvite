#!/bin/bash
# Open with Terminal to build and preview the standalone home prototype.
set -euo pipefail
cd "$(dirname "$0")"

echo 'Собираю прототип…'
npm run build -w @invite/miniapp

if lsof -nP -iTCP:3000 -sTCP:LISTEN 2>/dev/null | rg -q LISTEN; then
  echo 'Порт 3000 уже занят. Остановите прежний сервер и запустите снова.'
  exit 1
fi

npm run preview -w @invite/miniapp -- --host 127.0.0.1 --port 3000 --strictPort &
preview_pid=$!
trap 'kill "$preview_pid" 2>/dev/null || true' EXIT INT TERM

for attempt in {1..40}; do
  if curl --silent --fail --output /dev/null http://127.0.0.1:3000/app/home-preview.html; then
    echo 'Прототип запущен: http://localhost:3000/app/home-preview.html'
    open http://localhost:3000/app/home-preview.html
    wait "$preview_pid"
    exit 0
  fi
  if ! kill -0 "$preview_pid" 2>/dev/null; then
    echo 'Сервер завершился. Проверьте ошибку выше.'
    exit 1
  fi
  sleep 0.5
done

echo 'Сервер не ответил вовремя. Проверьте сообщения выше.'
exit 1
