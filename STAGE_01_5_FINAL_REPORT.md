# Endemion Life — Stage 01.5: финальная проверка рабочей среды

Дата: 2026-11-03. Предыдущие документы: [STAGE_01_5_REPORT.md](STAGE_01_5_REPORT.md), [STAGE_01_5_AUDIT.md](STAGE_01_5_AUDIT.md).

Проверено по факту: SSH на сервер 185.175.156.196 (`/opt/endemion-life`), запросы к https://life.endemion.online снаружи, GitHub REST API (журналы заданий Actions), чистый клон репозитория на машине разработки. Значения секретов не выводились: в журнале проверок только имена переменных и признак «задано/пусто».

**Коротко.** Рабочая среда работает, данные в сохранности. Найдена одна существенная проблема: **CI на GitHub не проходил ни разу** (0 успешных из 8 запусков на `main`). Исправлено в ветке `fix/ci-green`. HSTS включён, копии базы теперь уходят во внешнее S3-хранилище, отправка проверена. Почта (SMTP) и канал оповещений не настроены: нужны данные от владельца.

## 1. Verified — проверено

| # | Что | Как проверено | Результат |
| --- | --- | --- | --- |
| 1 | Git | `git status`, `git log` локально и на сервере | `main` чистый, `4e5beca` локально, на GitHub и на сервере. На сервере `origin` — bundle, не GitHub |
| 2 | GitHub Actions | REST API: запуски, задания, журналы | Workflow `Security` зелёный на всех коммитах. Workflow `CI` красный на всех 8 запусках `main` (причины — раздел 2) |
| 4 | HTTPS и сертификат | `openssl s_client`, `curl` | Let's Encrypt (YE2), `CN=life.endemion.online`, действует до 2027-02-01. `http://` → 308 на `https://`. TLS 1.1 отклонён, согласован TLS 1.3 |
| 6 | Cookie рабочей среды | `Set-Cookie` ответа `POST /api/session` | `el_session`: `HttpOnly; Secure; SameSite=Lax`, 365 дней. `el_oidc`: `HttpOnly; Secure; SameSite=Lax`, путь только `/api/auth/oidc/callback`, 10 минут. В API `NODE_ENV=production`, `COOKIE_SECURE=true` |
| 7 | API health | `GET /api/health` снаружи | `status: ok`, `database: up`, `redis: up` |
| 8 | Docker Compose | `docker compose ps`, `config -q` на сервере | Все 7 сервисов `healthy`: api, web, nginx, postgres, redis, backup, monitor |
| 9 | PostgreSQL | `psql` в контейнере | База `endemion_life` 8.4 МБ; применены 3 миграции (`init`, `accounts_and_sessions`, `endemion_id`); игроков 5, жизней 1, аккаунтов 0. Порт базы наружу не открыт |
| 10 | Redis | `redis-cli ping` | `PONG`; порт наружу не открыт |
| 11 | Резервное копирование | Ручной запуск `backup.sh` на сервере 2026-11-03 19:36 UTC | Копия 24 КБ создана, контрольная сумма и оглавление в порядке, отправлена в S3 (`rclone lsl` показывает `.dump` и `.sha256` в бакете). Расписание `30 3 * * *` (Europe/Moscow). Плановых копий ещё нет: первая — в ночь на 2026-11-04 |
| 12 | Восстановление базы | Пробное восстановление внутри `backup.sh` (`BACKUP_VERIFY_FULL=true`) | Пройдено: `migrations=3 players=5 lives=1 snapshots=2 history=2 actions=1`. Рабочая база не перезаписывалась |
| 13 | Регистрация и вход | Запросы к рабочему API | Вход и регистрация по паролю отключены: `POST /api/auth/login` → 410 `USE_ENDEMION_ID`. `GET /api/auth/oidc/login` → 302 на `auth.endemion.online` с PKCE (S256), `state`, `nonce`, `client_id=endemion-life`. Discovery `auth.endemion.online` — 200. Полный вход через браузер с настоящим аккаунтом **не выполнялся** |
| 15 | Мониторинг | Журнал контейнера `monitor` | Работает, проверяет внутренний и публичный адрес раз в 60 с. Утром 2026-11-03 отметил недоступность во время выпуска сертификата и восстановление. Оповещения уходят только в журнал (раздел 3) |
| 16 | Диск и память | `df -h`, `free -m`, `docker system df` | Корень 22 ГБ, занято 8.1 ГБ (38%). Память: 2 ГБ, доступно 1.3 ГБ, swap не используется. 1.5 ГБ занимают неиспользуемые образы Docker |
| 17 | Журналы ошибок | `docker compose logs --since 24h` | API: 0 записей уровня error/fatal. Nginx: 0 ответов 5xx. В журнале API нет паролей и значений `el_session` |
| 18 | Безопасность сервера | `sshd -T`, `ufw status`, `ss -tlnp`, права файлов | SSH только по ключу (`passwordauthentication no`). Межсетевой экран: 22, 80, 443. Слушают только 22, 80, 443 и 127.0.0.1:9000. `.env` — 600; каталог копий — 700, файлы копий — 440. Включены `unattended-upgrades`, `docker` в автозапуске. Запрос с чужим `Origin` → 403. Заголовки `X-Frame-Options: DENY`, `nosniff`, `Referrer-Policy`, `Permissions-Policy` на месте |

## 2. Fixed — исправлено

### CI на GitHub (ветка `fix/ci-green`, коммит `353c480`)

Журналы заданий показали три независимые причины. Все три не видны на машине разработки, потому что там есть собранные пакеты и `.env`:

| Задание | Причина | Исправление |
| --- | --- | --- |
| Lint, typecheck, unit tests, build | Типизированный ESLint запускался до `prisma generate` и сборки пакетов: в чистом клоне нет Prisma Client и `.d.ts`, отсюда 695 ошибок `no-unsafe-*` | В CI шаг `pnpm build:packages` перед `pnpm lint`. В `pnpm check` то же, чтобы проверка в чистом клоне совпадала с CI. Воспроизведено в чистом клоне: без шага lint падает, с шагом проходит |
| Compose files are valid | `infrastructure/docker-compose.yml` читает `../.env`, в CI его нет | Шаг копирует `.env.example` в `.env` перед `config -q` |
| Docker build (web) | `Dockerfile` копирует `apps/web/public`; каталог пустой, Git его не хранит | `apps/web/public/.gitkeep` |

Результат: запуск `CI` 41703242567 на `353c480` — **все 10 заданий success**, `Security` — success.

### Двойной заголовок HSTS (коммит `c882758`)

После включения HSTS ответы `/api/*` несли два заголовка: `max-age=31536000` (Helmet в API) и `max-age=63072000` (Nginx). Helmet включал HSTS независимо от `HSTS_MAX_AGE`. Теперь API HSTS не ставит, а Nginx скрывает от API и Next.js заголовки, которые ставит сам. Конфигурация Nginx проверена `nginx -t` в собранном образе. Выкачено вместе со Stage 02 2026-11-04: снаружи на `/` и `/api/*` один заголовок HSTS.

`fix/ci-green` влит в `main` 2026-11-04 (fast-forward вместе со Stage 02, `66602fb`); CI и Security на `main` зелёные.

### HSTS включён на сервере

После проверки HTTPS (раздел 1) в `.env` сервера `HSTS_MAX_AGE=63072000`. Пересоздан только контейнер `nginx` (`up -d --no-deps --no-build`). Снаружи: `Strict-Transport-Security: max-age=63072000; includeSubDomains`. Caddy и основной сайт не затронуты.

### Внешнее хранилище копий

На сервере нашлись ключи S3 основного сайта Endemion (VK Cloud Object Storage, бакет `endemio`). Endemion Life настроен на тот же бакет с отдельным префиксом: `BACKUP_S3_REMOTE=backup:endemio/endemion-life`. Очистка копий основного сайта (`server/backup.mjs`) удаляет только ключи `backups/endemion-*.sqlite`, копии Endemion Life она не трогает. Перед изменением сохранён `/opt/endemion-life/.env.bak-20261103-stage015-final` (600). Пересоздан только контейнер `backup`. Отправка проверена (раздел 1, п. 11).

## 3. Requires owner action — требует владельца

| Что | Зачем | Что нужно |
| --- | --- | --- |
| SMTP | Подтверждение почты и восстановление пароля Endemion Life. Сейчас `SMTP_URL` пустой, драйвер почты `none` | `SMTP_URL`. Основной сайт шлёт письма через HTTP API Unisender Go; у Unisender Go есть и SMTP, тот же аккаунт подойдёт. SPF/DKIM для `endemion.online` |
| Канал оповещений | Сейчас оповещения пишутся только в журнал монитора | Токен бота Telegram и chat id или webhook Slack/Discord. На сервере таких данных нет ни у одного проекта |
| Отдельный ключ S3 | Сейчас общий ключ с основным сайтом: компрометация одного проекта даёт доступ к копиям обоих | Ключ с правом записи только в префикс `endemion-life/` и правило жизненного цикла бакета для него |
| Защита ветки `main` | Запрет прямого push и обязательный зелёный CI | Недоступно для закрытого репозитория на бесплатном плане GitHub: API отвечает 403 «Upgrade to GitHub Pro». Варианты: GitHub Pro или открытый репозиторий |
| Sentry, внешний «пульс» | Падение всего сервера сейчас никто не заметит | `SENTRY_DSN`, `HEALTHCHECKS_PING_URL`, `HEALTHCHECKS_BACKUP_PING_URL` |

## 4. Not verified — не проверено

- **Отправка писем через SMTP**: SMTP не настроен, проверять нечего.
- **Полный вход через Endemion ID в браузере** с настоящим аккаунтом: проверены только перенаправление на провайдера и discovery. Обмен кода покрыт автотестом `endemion-id.e2e-spec.ts` на тестовом провайдере, не на рабочем.
- **Оповещения в настоящий канал**: канала нет.
- **Перезагрузка сервера** со стеком: не делалась, это затронет основной сайт.
- **Нагрузочный тест на сервере**: не повторялся, он нагрузил бы общий сервер с endemion.online.

Проверено позже, 2026-11-04: плановая копия в 03:30 МСК создана, прошла пробное восстановление и отправлена в `endemio/endemion-life/daily/`. CI на `c882758` и `3eebf7c` — success.

## 5. Remaining risks — оставшиеся риски

- **Общий сервер с основным сайтом.** 2 ГБ памяти на оба проекта. Диск и память общие; копии на том же диске, теперь дублируются в S3.
- **Общий ключ S3** с основным сайтом (раздел 3).
- **`main` без защиты ветки**: прямой push в `main` технически возможен.
- **Почта не работает.** Пока вход только через Endemion ID, Endemion Life письма почти не нужны. Если вернётся вход по паролю, без SMTP нельзя восстановить пароль.
- **Одна копия API**: обновление — несколько секунд 502 (известно с Stage 01.5).
- **Оповещения только в журнал**: о сбое ночью никто не узнает до утра.
- **2 moderate-уязвимости** в инструментах сборки внутри `@sentry/node` (из отчёта Stage 01.5); `pnpm audit` в workflow `Security` проходит на уровне high.

## 6. Изменения на сервере

| Файл / сервис | Изменение | Откат |
| --- | --- | --- |
| `/opt/endemion-life/.env` | `HSTS_MAX_AGE=63072000`; `BACKUP_S3_REMOTE`, `RCLONE_CONFIG_BACKUP_{ENDPOINT,REGION,ACCESS_KEY_ID,SECRET_ACCESS_KEY}` | `cp -p .env.bak-20261103-stage015-final .env`, затем `up -d --no-deps --no-build nginx backup`. HSTS после отката остаётся в браузерах до истечения `max-age` |
| Контейнеры `nginx`, `backup` | Пересозданы с новыми переменными, образы те же | — |
| `/var/backups/endemion-life/manual/` и бакет `endemio/endemion-life/manual/` | Новая копия `endemion_life-manual-20261103T193625Z.dump` | — |

Caddyfile, контейнеры и данные основного сайта не менялись. Миграции не выполнялись.

## 7. Вывод для Stage 02

Критических проблем с сохранностью данных и безопасностью нет: копии создаются, проверяются восстановлением и хранятся вне сервера. Секреты не попали в Git (workflow `Security` с gitleaks зелёный). Stage 02 можно начинать.
