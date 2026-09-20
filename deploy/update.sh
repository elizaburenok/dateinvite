#!/usr/bin/env bash
#
# Неинтерактивное обновление уже развёрнутого приложения до свежего origin/main.
# В отличие от setup.sh здесь ничего не спрашивается и не переустанавливается
# системное окружение (Node, Caddy, systemd-юнит) — только код, сборка и
# перезапуск сервиса. Ровно то, что нужно вызывать из CI на каждый пуш в main.
#
# Запуск от root (так же, как setup.sh):
#   sudo bash /srv/invite/deploy/update.sh
#
# База и накопленные фото не трогаются: они лежат в /srv/invite/data,
# а reset --hard затрагивает только отслеживаемые git-ом файлы.

set -euo pipefail

APP_DIR="/srv/invite"
APP_USER="invite"

if [[ $EUID -ne 0 ]]; then
  printf '\033[31m%s\033[0m\n' "Запустите от root: sudo bash $0"
  exit 1
fi

if [[ ! -d "$APP_DIR/.git" ]]; then
  printf '\033[31m%s\033[0m\n' "Нет установки в $APP_DIR — сначала прогоните deploy/setup.sh."
  exit 1
fi

# Каталог принадлежит пользователю invite, а скрипт идёт из-под root — тем же
# приёмом, что и setup.sh, снимаем отказ git-а трогать «чужой» репозиторий.
app_git() { git -c safe.directory="$APP_DIR" -C "$APP_DIR" "$@"; }

echo "== Забираю свежий код из origin/main =="
app_git fetch --quiet origin
app_git reset --hard --quiet origin/main
echo "Код: $(app_git log --oneline -1)"

echo "== Ставлю зависимости и собираю =="
cd "$APP_DIR"
sudo -u "$APP_USER" npm ci --silent
sudo -u "$APP_USER" npm run build --silent

# Права на свежие файлы (dist, node_modules) — сервису, чтобы он их читал.
chown -R "$APP_USER:$APP_USER" "$APP_DIR"

echo "== Перезапускаю сервис =="
systemctl restart invite-api

sleep 5
if systemctl is-active --quiet invite-api; then
  printf '\033[32m%s\033[0m\n' "Готово: сервис перезапущен на свежей версии."
else
  printf '\033[31m%s\033[0m\n' "Сервис не поднялся после обновления. Лог:"
  journalctl -u invite-api -n 30 --no-pager
  exit 1
fi
