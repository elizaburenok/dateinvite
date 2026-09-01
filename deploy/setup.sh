#!/usr/bin/env bash
#
# Разворачивает приложение на чистом сервере Ubuntu 22.04/24.04 или Debian 12.
# Ставит Node, Caddy, собирает проект, настраивает автозапуск и https.
#
# Запуск от root:
#   bash /srv/invite/deploy/setup.sh
#
# Скрипт можно запускать повторно: он обновляет уже настроенную установку,
# не трогая базу и накопленные фото.

set -euo pipefail

APP_DIR="/srv/invite"
APP_USER="invite"
REPO="https://github.com/elizaburenok/dateinvite.git"

red()  { printf '\033[31m%s\033[0m\n' "$*"; }
green(){ printf '\033[32m%s\033[0m\n' "$*"; }
bold() { printf '\033[1m%s\033[0m\n' "$*"; }

if [[ $EUID -ne 0 ]]; then
  red "Запустите от root: sudo bash $0"
  exit 1
fi

bold "== 1/7. Спрашиваю то, что знаете только вы =="

# Читаем из /dev/tty, а не из stdin: скрипт может быть запущен через пайп.
# Без терминала (cloud-init при создании сервера) спрашивать некого —
# тогда всё обязано прийти переменными окружения, иначе честно падаем,
# а не висим вечно в ожидании ответа, которого не будет.
read_tty() {
  if [[ ! -r /dev/tty ]]; then
    red "Нет терминала, а переменная $2 не задана."
    red "При запуске через cloud-init задайте DOMAIN, BOT_TOKEN и CONTACT_EMAIL."
    exit 1
  fi
  read -r -p "$1" "$2" < /dev/tty
}

DOMAIN="${DOMAIN:-}"
while [[ -z "$DOMAIN" ]]; do
  echo
  echo "Домен, по которому будет доступно приложение — без https:// и без слэша."
  echo "Например: dateinvite.duckdns.org"
  read_tty "Домен: " DOMAIN
done

BOT_TOKEN="${BOT_TOKEN:-}"
while [[ -z "$BOT_TOKEN" ]]; do
  echo
  echo "Токен бота от @BotFather (вида 123456789:AA...)."
  read_tty "Токен: " BOT_TOKEN
done

CONTACT_EMAIL="${CONTACT_EMAIL:-}"
while [[ -z "$CONTACT_EMAIL" ]]; do
  echo
  echo "Почта для OpenStreetMap: они требуют контакт, иначе блокируют запросы."
  read_tty "Почта: " CONTACT_EMAIL
done

bold "== 2/7. Ставлю системные пакеты =="
export DEBIAN_FRONTEND=noninteractive
apt-get update -qq
apt-get install -y -qq curl ca-certificates gnupg git build-essential python3 debian-keyring debian-archive-keyring apt-transport-https

if ! command -v node >/dev/null || [[ "$(node -v | cut -c2- | cut -d. -f1)" -lt 22 ]]; then
  echo "Ставлю Node.js 22…"
  curl -fsSL https://deb.nodesource.com/setup_22.x | bash - >/dev/null
  apt-get install -y -qq nodejs
fi
echo "Node: $(node -v)"

if ! command -v caddy >/dev/null; then
  echo "Ставлю Caddy…"
  curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' \
    | gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
  curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' \
    > /etc/apt/sources.list.d/caddy-stable.list
  apt-get update -qq
  apt-get install -y -qq caddy
fi
echo "Caddy: $(caddy version | head -1)"

# DuckDNS: сервер сам сообщает сервису свой адрес. Иначе получается тупик —
# домен должен указывать на сервер до выпуска сертификата, а IP становится
# известен только после создания сервера.
if [[ -n "${DUCKDNS_TOKEN:-}" ]]; then
  bold "== 2.5/7. Прописываю домен в DuckDNS =="
  SUB="${DOMAIN%%.duckdns.org}"
  RESULT="$(curl -s "https://www.duckdns.org/update?domains=$SUB&token=$DUCKDNS_TOKEN&ip=")"
  if [[ "$RESULT" == "OK" ]]; then
    green "DuckDNS обновлён: $DOMAIN → $(curl -s https://api.ipify.org)"
  else
    red "DuckDNS ответил: $RESULT — проверьте токен и имя поддомена."
  fi

  # IP сервера может смениться при переезде — обновляем адрес раз в сутки.
  cat > /etc/systemd/system/duckdns.service <<UNIT
[Unit]
Description=Обновление адреса в DuckDNS
After=network-online.target

[Service]
Type=oneshot
ExecStart=/usr/bin/curl -fsS "https://www.duckdns.org/update?domains=$SUB&token=$DUCKDNS_TOKEN&ip="
UNIT
  cat > /etc/systemd/system/duckdns.timer <<UNIT
[Unit]
Description=Ежедневное обновление адреса в DuckDNS

[Timer]
OnBootSec=2min
OnUnitActiveSec=24h

[Install]
WantedBy=timers.target
UNIT
  systemctl daemon-reload
  systemctl enable --quiet --now duckdns.timer
fi

bold "== 3/7. Забираю код =="
id -u "$APP_USER" >/dev/null 2>&1 || useradd --system --create-home --shell /usr/sbin/nologin "$APP_USER"

if [[ -d "$APP_DIR/.git" ]]; then
  git -C "$APP_DIR" fetch --quiet origin
  git -C "$APP_DIR" reset --hard --quiet origin/main
else
  rm -rf "$APP_DIR"
  git clone --quiet "$REPO" "$APP_DIR"
fi
echo "Код: $(git -C "$APP_DIR" log --oneline -1)"

bold "== 4/7. Настройки =="
# Секрет вебхука генерируем один раз и сохраняем: смена без причины
# оборвала бы уже установленный вебхук.
if [[ -f "$APP_DIR/.env" ]] && grep -q '^WEBHOOK_SECRET=.\+' "$APP_DIR/.env"; then
  WEBHOOK_SECRET="$(grep '^WEBHOOK_SECRET=' "$APP_DIR/.env" | cut -d= -f2-)"
  echo "Секрет вебхука уже есть, оставляю прежний."
else
  WEBHOOK_SECRET="$(openssl rand -hex 24)"
fi

cat > "$APP_DIR/.env" <<ENVFILE
BOT_TOKEN=$BOT_TOKEN
PUBLIC_BASE_URL=https://$DOMAIN
WEBHOOK_SECRET=$WEBHOOK_SECRET
PORT=3000
HOST=127.0.0.1
DB_PATH=data/invite.db
MEDIA_DIR=data/media
ENVELOPE_TTL_DAYS=14
# В кавычках: значение с пробелами и скобками должны одинаково понять
# и Node (--env-file локально), и systemd (EnvironmentFile на сервере).
NOMINATIM_USER_AGENT="invite-app/0.1 ($CONTACT_EMAIL)"
NOMINATIM_BASE_URL=https://nominatim.openstreetmap.org
ENVFILE

# В .env лежит токен бота — читать его может только сам сервис.
chmod 600 "$APP_DIR/.env"
mkdir -p "$APP_DIR/data/media"
chown -R "$APP_USER:$APP_USER" "$APP_DIR"

bold "== 5/7. Собираю проект =="
cd "$APP_DIR"
sudo -u "$APP_USER" npm ci --silent
sudo -u "$APP_USER" npm run build --silent
echo "Сборка готова."

bold "== 6/7. Автозапуск =="
install -m 644 "$APP_DIR/deploy/invite-api.service" /etc/systemd/system/invite-api.service
systemctl daemon-reload
systemctl enable --quiet invite-api
systemctl restart invite-api

bold "== 7/7. https =="
cat > /etc/caddy/Caddyfile <<CADDYFILE
$DOMAIN {
	encode zstd gzip
	reverse_proxy 127.0.0.1:3000
	log {
		output file /var/log/caddy/invite.log
	}
}
CADDYFILE
systemctl reload caddy 2>/dev/null || systemctl restart caddy

echo
echo "Жду, пока приложение поднимется…"
sleep 8

echo
if systemctl is-active --quiet invite-api; then
  green "Сервис запущен."
else
  red "Сервис не запустился. Что случилось:"
  journalctl -u invite-api -n 30 --no-pager
  exit 1
fi

CODE="$(curl -s -o /dev/null -w '%{http_code}' --max-time 30 "https://$DOMAIN/api/health" || true)"
if [[ "$CODE" == "200" ]]; then
  green "Приложение отвечает по https."
else
  red "https пока не отвечает (код: ${CODE:-нет ответа})."
  echo "Обычно это значит, что домен ещё не указывает на этот сервер."
  echo "Проверьте A-запись домена и подождите несколько минут."
fi

WEBHOOK="$(curl -s "https://api.telegram.org/bot$BOT_TOKEN/getWebhookInfo" | grep -o '"url":"[^"]*"' | cut -d'"' -f4 || true)"
echo
if [[ -n "$WEBHOOK" ]]; then
  green "Бот подключён: вебхук на $WEBHOOK"
else
  echo "Вебхук ещё не установлен — приложение повторит попытку само."
fi

echo
bold "Готово. Что дальше:"
echo "  • Библиотека:  https://$DOMAIN/app/"
echo "  • Напишите боту /start в Telegram."
echo "  • У @BotFather: /mybots → ваш бот → Bot Settings → Menu Button"
echo "    → задайте https://$DOMAIN/app/"
echo
echo "Полезное:"
echo "  systemctl status invite-api      — как себя чувствует приложение"
echo "  journalctl -u invite-api -f      — живой лог"
echo "  bash $APP_DIR/deploy/setup.sh    — обновиться до свежей версии из GitHub"
