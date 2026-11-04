# Развёртывание на сервере

Состояние на 2026-11-04: развёрнут Stage 02 (`66602fb`). На 2026-11-03: **развёрнуто** на 185.175.156.196 в `/opt/endemion-life`, режим behind-proxy. Блок `life.{$SITE_DOMAIN}` добавлен в Caddyfile репозитория Endemion (коммит `7db87cf`). Образы собраны на компьютере разработки и перенесены `docker save | ssh … docker load`: на сервере 2 ГБ памяти, и сборка мешала бы основному сайту. Ниже — общий порядок. Весь порядок ниже проверен на локальном стеке `docker-compose.prod.yml` (Docker Desktop), но не на сервере. Шаги, которые зависят от владельца, отмечены «владелец».

## Что поднимается

```
Интернет ─► Caddy (уже на сервере, режим behind-proxy)  или  Nginx :80/:443 (режим tls)
              │
              ▼
           nginx ──/api/*──► api :4000 ──► postgres, redis
                 └──/*─────► web :3000
           migrate   — миграции, запускается перед api и завершается
           certbot   — продление сертификата (только режим tls)
           backup    — резервные копии по расписанию (docs/DATABASE_BACKUPS.md)
           monitor   — проверки и оповещения (docs/MONITORING.md)
```

## Требования к серверу

- Linux x86_64, Docker Engine 27+ с плагином Compose v2.24+ (нужен `!reset` в `docker-compose.behind-proxy.yml`).
- 2 ГБ памяти и 10 ГБ диска: сборка образов на сервере. Работающий стек занимает около 600 МБ памяти.
- Открытые порты: 80 и 443 (режим tls) или ничего нового (режим behind-proxy).
- DNS: запись `A life.endemion.online` → IP сервера (владелец, docs/HTTPS_SETUP.md).

На сервере 185.175.156.196 порты 80/443 занимает Caddy сайта endemion.online (`/opt/endemion`). Поэтому для него — режим **behind-proxy** в отдельном каталоге `/opt/endemion-life`. Стек Endemion Life не трогает контейнеры и тома основного сайта: у него своё имя проекта Compose (`endemion-life-prod`).

## 1. Код на сервере

Репозиторий: https://github.com/Yuta2Endo/Endemion-Life (закрытый). Для сервера нужен ключ только для чтения — deploy key в настройках репозитория. Варианты:

- **Через GitHub (владелец создаёт закрытый репозиторий):**
  ```bash
  git remote add origin git@github.com:<владелец>/endemion-life.git && git push -u origin main   # на рабочем компьютере
  git clone git@github.com:<владелец>/endemion-life.git /opt/endemion-life                        # на сервере
  ```
- **Без GitHub:** архив репозитория.
  ```bash
  git bundle create endemion-life.bundle main                                   # на рабочем компьютере
  scp endemion-life.bundle root@<сервер>:/opt/
  git clone -b main /opt/endemion-life.bundle /opt/endemion-life                # на сервере
  ```

## 2. Настройки

```bash
cd /opt/endemion-life
cp infrastructure/env.production.example .env
chmod 600 .env
openssl rand -hex 24          # → POSTGRES_PASSWORD
```

Заполните `.env`:

| Переменная | Значение |
| --- | --- |
| `DOMAIN` | `life.endemion.online` |
| `NGINX_MODE` | `behind-proxy` (сервер с Caddy) или `tls` |
| `PROXY_NETWORK`, `REAL_IP_FROM` | Для behind-proxy: сеть Docker Caddy и её подсеть (docs/HTTPS_SETUP.md) |
| `LETSENCRYPT_EMAIL` | Для tls |
| `POSTGRES_PASSWORD` | Сгенерированный, только `[A-Za-z0-9_-]` |
| `HSTS_MAX_AGE` | `0` до проверки HTTPS |
| `SMTP_URL`, `MAIL_FROM` | Владелец: без них не работает подтверждение почты и восстановление пароля |
| `ALERT_WEBHOOK_*`, `HEALTHCHECKS_*`, `SENTRY_DSN` | Владелец: каналы оповещений |
| `BACKUP_HOST_DIR`, `BACKUP_TZ`, `BACKUP_S3_REMOTE`, `RCLONE_CONFIG_BACKUP_*` | Каталог и хранилище копий |

```bash
mkdir -p /var/backups/endemion-life && chmod 700 /var/backups/endemion-life
```

## 3. Проверка конфигурации

```bash
# режим tls
DC="docker compose -f infrastructure/docker-compose.prod.yml --env-file .env"
# режим behind-proxy
DC="docker compose -f infrastructure/docker-compose.prod.yml -f infrastructure/docker-compose.behind-proxy.yml --env-file .env"

$DC config -q && echo OK
```

## 4. Первый запуск

```bash
$DC build
$DC up -d
$DC ps                                   # все сервисы healthy, migrate — Exited (0)
$DC logs migrate                         # «All migrations have been successfully applied»
$DC exec api node -e "fetch('http://127.0.0.1:4000/api/health').then(r=>r.text()).then(console.log)"
```

API не стартует, пока `migrate` не завершится с кодом 0; сайт — пока API не здоров; Nginx — пока не здоровы оба.

## 5. HTTPS

- **tls:** `sh infrastructure/scripts/issue-certificate.sh --staging`, затем настоящий сертификат (docs/HTTPS_SETUP.md).
- **behind-proxy:** блок `life.{$SITE_DOMAIN}` в Caddyfile **репозитория Endemion** (владелец: затрагивает endemion.online). Порядок, которым это сделано 2026-11-03:
  1. правка и `caddy validate` локально, коммит и push в `main` Endemion;
  2. на сервере: копия `cp -p /opt/endemion/Caddyfile /root/Caddyfile.before-life.<время>`, `git pull --ff-only` в `/opt/endemion`;
  3. `docker cp Caddyfile endemion-caddy-1:/tmp/Caddyfile.new`, `caddy validate`, `caddy reload --config /tmp/Caddyfile.new`.

  **Ловушка:** Caddyfile подключён в контейнер Caddy как отдельный файл (`./Caddyfile:/etc/caddy/Caddyfile:ro`). `git pull` заменяет файл новым (новый inode), а контейнер до перезапуска видит прежний. Поэтому `caddy reload` без `--config /tmp/…` загрузит старый файл без блока `life`, и life.endemion.online перестанет открываться. После перезапуска контейнера (`docker restart endemion-caddy-1` или пересоздание через `docker compose up`) он видит актуальный файл, и ловушка исчезает.

```bash
sh infrastructure/scripts/check-https.sh https://life.endemion.online
```

Когда всё OK — `HSTS_MAX_AGE=63072000` в `.env` и `$DC up -d nginx`.

## 6. Резервные копии и оповещения

```bash
$DC exec backup backup.sh                                    # первая ручная копия с проверкой
$DC exec backup restore.sh /backups/manual/<файл>.dump --target endemion_life_check   # пробное восстановление
$DC exec postgres psql -U endemion -d postgres -c 'DROP DATABASE endemion_life_check'
$DC exec monitor /opt/monitor/notify.sh "Проверка оповещений Endemion Life"
```

Пройдите `docs/PRODUCTION_CHECKLIST.md`.

## Обновление

```bash
cd /opt/endemion-life
$DC exec backup backup.sh                # копия перед обновлением — путь запишите
git rev-parse --short HEAD               # текущая версия — для отката
git pull --ff-only                       # или git fetch из нового bundle
$DC build
$DC up -d                                # migrate применит новые миграции, затем перезапустятся api и web
$DC ps
sh infrastructure/scripts/check-https.sh https://life.endemion.online
```

Перезапуск API — несколько секунд ответов 502 (одна копия API, без бесшовного переключения; проверено). Запросы, пришедшие во время остановки, завершаются, соединения с базой закрываются после HTTP-сервера.

Если что-то пошло не так — docs/ROLLBACK.md.

## Автоматическое восстановление

Все долгоживущие сервисы — `restart: unless-stopped`: контейнер перезапускается после сбоя и после перезагрузки сервера (служба Docker должна быть включена: `systemctl enable docker`). Healthcheck-и помечают зависший сервис `unhealthy`; монитор присылает оповещение. Docker сам не перезапускает `unhealthy`-контейнер — это решение остаётся за человеком (журнал перед перезапуском).

Проверено локально: остановка PostgreSQL — API отвечает 503, после запуска базы восстанавливается сам; остановка Redis — игра работает, health `degraded`; перезапуск API — та же cookie видит те же жизни.
