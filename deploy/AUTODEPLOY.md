# Автодеплой при пуше в main

Воркфлоу [`.github/workflows/deploy.yml`](../.github/workflows/deploy.yml) на каждый
пуш в `main` заходит на сервер по SSH и запускает
[`deploy/update.sh`](update.sh): забирает свежий `origin/main`, пересобирает фронт
и перезапускает `invite-api`. База и фото в `/srv/invite/data` не трогаются.

Ниже — разовая настройка. Всё выполняется **на сервере от root** (кроме последнего
шага с секретами — он в веб-интерфейсе GitHub).

## 1. Отдельный пользователь для деплоя

Заходить под root по SSH из CI не нужно — заведём узкого пользователя `deployer`,
которому разрешён без пароля ровно один sudo-скрипт.

```bash
useradd --create-home --shell /bin/bash deployer
```

## 2. Право запускать только update.sh через sudo

```bash
cat > /etc/sudoers.d/deployer <<'EOF'
deployer ALL=(root) NOPASSWD: /usr/bin/bash /srv/invite/deploy/update.sh
EOF
chmod 440 /etc/sudoers.d/deployer
visudo -cf /etc/sudoers.d/deployer   # проверка синтаксиса, должно вывести «parsed OK»
```

> Путь к bash должен совпадать с `command -v bash` на сервере (обычно
> `/usr/bin/bash`; на некоторых системах `/bin/bash` — подставьте свой).
> Воркфлоу вызывает `sudo bash /srv/invite/deploy/update.sh`.

## 3. SSH-ключ для CI

Сгенерируйте пару **без пароля** (пароль на ключе некому вводить в CI).
Если пользователь `deployer` и ключ уже существуют, не перезаписывайте их:

```bash
install -d -m 700 -o deployer -g deployer /home/deployer/.ssh
sudo -u deployer ssh-keygen -t ed25519 -N '' -f /home/deployer/.ssh/deploy_key -C 'github-actions-deploy'
sudo -u deployer bash -c 'cat /home/deployer/.ssh/deploy_key.pub >> /home/deployer/.ssh/authorized_keys'
chmod 600 /home/deployer/.ssh/authorized_keys
```

На сервере прочитайте `/home/deployer/.ssh/deploy_key` и скопируйте его целиком
в секрет GitHub `DEPLOY_SSH_KEY`. Не отправляйте ключ в чат и не добавляйте его
в репозиторий. После успешной проверки деплоя приватный ключ на сервере можно
удалить; публичный ключ в `authorized_keys` оставьте.

Заодно снимите строку known_hosts для строгой проверки хоста (шаг 4, необязательный,
но желательный):

```bash
ssh-keyscan -H <адрес-сервера> 2>/dev/null
```

## 4. Секреты в GitHub

Settings → Secrets and variables → Actions → **New repository secret**:

| Имя | Значение |
|-----|----------|
| `DEPLOY_HOST` | адрес сервера, напр. `dateinvite.duckdns.org` |
| `DEPLOY_USER` | `deployer` |
| `DEPLOY_SSH_KEY` | весь приватный ключ из шага 3 (от `-----BEGIN` до `-----END`) |
| `DEPLOY_KNOWN_HOSTS` | *(необязательно)* вывод `ssh-keyscan` из шага 3 |

Если SSH слушает не 22-й порт — добавьте **Variable** (вкладка Variables, не Secrets)
`DEPLOY_PORT` с нужным номером.

## 5. Проверка

- Вкладка **Actions** → workflow **Deploy** → **Run workflow** (ручной запуск), либо
  любой пуш в `main`.
- Зелёный прогон = сервер обновился. Если написано `Missing repository secret
  DEPLOY_SSH_KEY`, добавьте ключ из шага 3. При другой ошибке смотрите лог шага
  «Обновить приложение на сервере».

## Ручной запуск как раньше

`deploy/update.sh` можно в любой момент запустить руками — он не зависит от CI:

```bash
sudo bash /srv/invite/deploy/update.sh
```

А полный `deploy/setup.sh` остаётся для первичной установки и обновления системного
окружения (Node, Caddy, systemd-юнит).
