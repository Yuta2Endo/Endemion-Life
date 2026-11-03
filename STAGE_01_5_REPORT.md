# Endemion Life — Stage 01.5: подготовка к эксплуатации

Дата: 2026-11-03. Исходный документ: [STAGE_01_REPORT.md](STAGE_01_REPORT.md), аудит: [STAGE_01_5_AUDIT.md](STAGE_01_5_AUDIT.md).

**Коротко.** Всё, что можно было сделать и проверить без сервера, DNS, SMTP и GitHub, сделано и проверено на локальном стеке рабочей среды.

**Обновление 2026-11-03, после решений владельца:** код опубликован в github.com/Yuta2Endo/Endemion-Life. DNS-запись `life.endemion.online → 185.175.156.196` создана. Стек развёрнут на сервере в `/opt/endemion-life` в режиме behind-proxy за Caddy основного сайта. Сертификат Let's Encrypt выпустил Caddy (действует до 2027-02-01). `check-https.sh https://life.endemion.online` — все проверки OK. Первая резервная копия на сервере создана и проверена пробным восстановлением. **Статус CI на GitHub не проверен** (репозиторий закрытый, `gh` не установлен). SMTP и канал оповещений не настроены.

## 1. Что найдено при аудите

Подробно — `STAGE_01_5_AUDIT.md`. Главное:

- Git не инициализирован, автор коммитов не задан, риск CRLF в shell-скриптах.
- `life.endemion.online` отсутствует в DNS (NXDOMAIN). На сервере 185.175.156.196 порты 80/443 заняты Caddy основного сайта.
- Только HTTP, `COOKIE_SECURE=false`; Nginx дописывал `X-Forwarded-For` вместо замены (можно было подменить IP для лимитов).
- Нет резервных копий, нет healthcheck у web и nginx, нет ротации журналов, журналы API — простой текст, нет мониторинга.
- Одна сессия на игрока (поле `players.session_hash`), аккаунтов нет; лимит запросов отключался вместе с Redis.
- Параллельные действия, сбой транзакции и перезапуски не проверялись. Образ `migrate` — 2.69 ГБ.

## 2. Что реализовано

| Область | Что сделано |
| --- | --- |
| Git | Репозиторий, `.gitignore` (секреты, дампы, сертификаты, письма), `.gitattributes` (LF), автор коммитов, 5 коммитов без секретов, `docs/GIT_WORKFLOW.md` |
| HTTPS | Nginx с режимами `tls` (Let's Encrypt через certbot webroot, продление дважды в сутки, перечитывание сертификата), `bootstrap` (до сертификата) и `behind-proxy` (за Caddy). Редирект HTTP→HTTPS, HSTS по переменной, профиль TLS Mozilla intermediate, отказ чужим именам, JSON-журнал. Скрипты выпуска и проверки |
| Безопасность | `COOKIE_SECURE=true` по умолчанию в рабочей среде, `X-Forwarded-For` заменяется адресом клиента, `real_ip` только из доверенной подсети, лимиты Nginx (отдельный для `/api/auth/`), раздельные настройки разработки и рабочей среды |
| Резервные копии | Отдельный контейнер: cron, ручная копия, проверка (сумма, оглавление, пробное восстановление), срок хранения с неудаляемым минимумом, защита файлов, журнал, оповещения, S3 через rclone. Безопасное восстановление: проверка, подтверждение, копия перед восстановлением, восстановление в новую базу, замена переименованием с сохранением прежней базы |
| Аккаунты | Таблицы `sessions`, `accounts`, `auth_tokens`; регистрация, вход, выход, подтверждение почты кодом, восстановление по одноразовой ссылке, список устройств, отзыв одной и всех других сессий, перенос гостевых жизней, блокировка перебора, лимиты на адрес и на почту (Redis или память). Страницы `/account`, `/reset-password` |
| CI | `.github/workflows/ci.yml`: lint, typecheck, unit, сборка; API-тесты на PostgreSQL и Redis с проверкой миграций (применение, расхождение со схемой, статус); Playwright; сборка всех 6 Docker-образов; проверка Compose. `security.yml`: `pnpm audit`, dependency review, gitleaks, shellcheck, actionlint |
| Наблюдение | JSON-журналы с уровнями, request id (общий с Nginx), время ответа, очистка секретов; Sentry по `SENTRY_DSN`; healthcheck всех сервисов; ротация журналов; контейнер-монитор с оповещениями в Telegram/Slack/Discord/webhook и проверкой срока сертификата; внешний «пульс» |
| Надёжность | Тесты параллельных действий, повтора `actionId`, отката транзакции, недоступности PostgreSQL и Redis; нагрузочный тест. Исправлены закрытие пула базы до остановки HTTP-сервера и ответ 500 со стеком при недоступности базы |
| Образы | `migrate` уменьшен с 2.69 ГБ до 842 МБ (`pnpm deploy`), healthcheck у api и web |

## 3. Добавленные файлы

- **CI:** `.github/workflows/ci.yml`, `.github/workflows/security.yml`
- **API:** `apps/api/src/auth/{auth.controller,auth.service,auth-throttle,password}.ts`, `apps/api/src/mail/mail.service.ts`, `apps/api/src/common/{logger,request-logging,sentry}.ts`
- **Тесты:** `apps/api/src/auth/password.spec.ts`, `apps/api/src/common/logger.spec.ts`, `apps/api/test/{helpers,auth.e2e-spec,reliability.e2e-spec}.ts`, `apps/web/e2e/account.spec.ts`, `packages/shared/test/auth.test.ts`
- **Сайт:** `apps/web/src/app/account/page.tsx`, `apps/web/src/app/reset-password/page.tsx`, `apps/web/src/components/account-link.tsx`, `apps/web/src/components/account/{account-panel,reset-password-form}.tsx`, `apps/web/src/lib/auth.ts`
- **Общие пакеты:** `packages/shared/src/auth.ts`, миграция `packages/database/prisma/migrations/20261102180000_accounts_and_sessions/migration.sql`
- **Инфраструктура:** `infrastructure/nginx/{Dockerfile,nginx-entrypoint.sh}`, `infrastructure/nginx/templates/{tls,bootstrap,behind-proxy}.conf.template`, `infrastructure/nginx/snippets/{http-common,app,proxy-headers,tls-params}.conf`; `infrastructure/backup/{Dockerfile,lib.sh,backup.sh,verify-backup.sh,restore.sh,entrypoint.sh,healthcheck.sh}`; `infrastructure/monitor/{Dockerfile,monitor.sh}`; `infrastructure/scripts/{issue-certificate.sh,check-https.sh,notify.sh,load-test.mjs}`; `infrastructure/docker-compose.behind-proxy.yml`, `infrastructure/env.production.example`
- **Git:** `.gitattributes`
- **Документация:** `STAGE_01_5_AUDIT.md`, `STAGE_01_5_REPORT.md`, `docs/{GIT_WORKFLOW,HTTPS_SETUP,DATABASE_BACKUPS,AUTHENTICATION,MONITORING,DEPLOYMENT,PRODUCTION_CHECKLIST,ROLLBACK,LOAD_TEST_REPORT}.md`

## 4. Изменённые файлы

- `.gitignore`, `.env.example` (новые переменные: лимит входа, почта, журналы, Sentry, shadow-база), `README.md`, `docs/architecture.md`
- `Dockerfile` (отдельная лёгкая цель `migrate`, healthcheck api и web)
- `infrastructure/docker-compose.prod.yml` (Nginx с HTTPS, certbot, backup, monitor, healthcheck-и, ротация журналов, `COOKIE_SECURE=true`); удалён `infrastructure/nginx/nginx.conf` (заменён шаблонами)
- `packages/database/prisma/schema.prisma`, `packages/database/prisma.config.ts` (необязательная shadow-база), `packages/database/package.json`
- `packages/shared/src/{index,views}.ts` (коды ошибок `EMAIL_TAKEN`, `INVALID_CREDENTIALS`, `INVALID_CODE`, `INVALID_TOKEN`, `ALREADY_SIGNED_IN`, `UNAVAILABLE`)
- `apps/api/src/{app.module,bootstrap,config,main}.ts`, `apps/api/src/session/session.service.ts`, `apps/api/src/common/{error-response,exception.filter}.ts`, `apps/api/src/prisma/prisma.service.ts`, `apps/api/src/redis/redis.service.ts`, `apps/api/package.json`
- `apps/api/test/lives.e2e-spec.ts`, `apps/web/playwright.config.ts`, `apps/web/src/components/site-header.tsx`, `apps/web/src/lib/messages.ts`, `pnpm-lock.yaml` (nodemailer 10.3.1, @sentry/node 11.10.0)

Игровая логика (`packages/game-core`) и игровые страницы не менялись.

## 5. Миграции

`20261102180000_accounts_and_sessions`:

1. Таблица `sessions`; **перенос** каждого `players.session_hash` в `sessions` (срок 365 дней от последнего визита) — до удаления столбца, поэтому cookie Stage 01 продолжают работать.
2. Удаление `players.session_hash` и его индекса.
3. Таблицы `accounts` (почта уникальна, `player_id` уникален), `auth_tokens` (enum `AuthTokenPurpose`), индексы и внешние ключи с каскадным удалением.

Проверено: применение на копии базы Stage 01 с гостевыми сессиями; `prisma migrate diff --from-migrations … --to-schema … --exit-code` — «No difference detected».

## 6. Новые API endpoints

`GET /api/auth/me`, `POST /api/auth/register`, `POST /api/auth/login`, `POST /api/auth/logout`, `POST /api/auth/verify-email`, `POST /api/auth/resend-verification`, `POST /api/auth/forgot-password`, `POST /api/auth/reset-password`, `GET /api/auth/sessions`, `POST /api/auth/sessions/revoke`, `POST /api/auth/sessions/revoke-others`. Описание тел и ответов — `docs/AUTHENTICATION.md`. Прежние endpoints не изменились; новый ответ `503 UNAVAILABLE` при недоступной базе.

## 7. Запущенные тесты

| Набор | Команда | Что проверяет |
| --- | --- | --- |
| Lint, типы, unit, сборка | `pnpm check` | ESLint, TypeScript всех пакетов, unit-тесты (game-core, shared, api), production-сборка |
| API | `pnpm test:api` | `lives.e2e-spec.ts` (Stage 01), `auth.e2e-spec.ts` (24), `reliability.e2e-spec.ts` (7) на отдельной базе `endemion_life_test` |
| Браузер | `pnpm test:e2e` | Playwright, компьютер и телефон: игра, аккаунты |
| Миграции | `prisma migrate diff --exit-code` | Миграции совпадают со схемой |
| Безопасность | `pnpm audit --prod --audit-level high`, actionlint 1.7.12, shellcheck | Зависимости, workflow, shell-скрипты |
| Рабочий стек | `docker compose -f infrastructure/docker-compose.prod.yml` локально | Сборка образов, HTTPS с самоподписанным сертификатом, копии и восстановление, монитор, отказы и перезапуски, нагрузка |

## 8. Результаты

| Проверка | Результат |
| --- | --- |
| `pnpm check` | код 0: lint и typecheck без ошибок; unit — game-core 56, shared 9, web 4, api 18 (87 тестов); сборка прошла |
| `pnpm test:api` | 51 из 51 (3 файла) |
| `pnpm test:e2e` | 28 из 28 (компьютер и телефон) |
| Миграции: расхождение со схемой | нет («No difference detected») |
| `pnpm audit --prod --audit-level high` | 0 high/critical; 2 moderate (glob 13.0.6 и minimatch внутри `@sentry/node` → `@sentry/bundler-plugins`, исправления нет в совместимой версии; код сборщика в рантайме API не вызывается) |
| actionlint, shellcheck (`--severity=warning`) | без замечаний |
| `docker compose config` (prod, prod + behind-proxy) | без ошибок |
| Сборка 6 образов | api 889 МБ, web 388 МБ, migrate 842 МБ, nginx 94 МБ, backup 597 МБ, monitor 24 МБ |
| Нагрузка: 50 игроков, 60 с | 21 188 запросов, 352/с, ход p95 219 мс, 0 ошибок, 0 нарушений целостности (`docs/LOAD_TEST_REPORT.md`) |

## 9. Что проверено реально (на этой машине)

- Полный стек `docker-compose.prod.yml` поднимается, все сервисы `healthy`, `migrate` завершается с кодом 0.
- Nginx: без сертификата — режим bootstrap (503); с сертификатом (самоподписанный, `localhost:8443`) — `check-https.sh` все OK: редирект, заголовки, cookie `HttpOnly; Secure; SameSite=Lax`, чужой Origin 403, TLS 1.0/1.1 отклонены, TLS 1.3; HSTS только после включения; чужой Host — 444, неизвестный SNI отклонён.
- Резервные копии: ручная с полной проверкой, повреждённая копия отклоняется, восстановление в новую базу и поверх существующей (копия в `pre-restore/`, прежняя база сохранена, откат переименованием), отказ без подтверждения, учение на рабочей базе тестового стека, плановая копия по cron и срок хранения.
- Аккаунты и перенос жизней — автотесты API и Playwright (коды берутся из писем драйвера `file`).
- Монитор: оповещения «недоступен», «снова работает», «с ограничениями» доставлены в тестовый webhook при остановке API и Redis.
- Отказы: остановка PostgreSQL (503, самовосстановление), остановка Redis (`degraded`, игра работает), перезапуск API (сессии и жизни на месте), перезапуск API под нагрузкой (только 502 на время перезапуска, без ошибок в журнале).

## 10. Подготовлено, но требует доступа к серверу

- Развёртывание (`docs/DEPLOYMENT.md`): каталог `/opt/endemion-life`, `.env`, сборка, запуск.
- Подключение к Caddy основного сайта (режим behind-proxy): блок в Caddyfile и `caddy reload` — затрагивает рабочий endemion.online, делается только владельцем или с его подтверждения.
- Режим tls (если будет отдельный сервер): `issue-certificate.sh`.
- Проверочный список `docs/PRODUCTION_CHECKLIST.md`, повтор нагрузочного теста на сервере, проверка перезагрузки сервера.
- Каталог копий на сервере и пробное восстановление там.

## 11. Требует DNS, SMTP или внешних секретов

| Что | Нужно от владельца | Без этого |
| --- | --- | --- |
| DNS | ✅ Сделано 2026-11-03: `life A 185.175.156.196` | — |
| Сертификат HTTPS | ✅ Выпущен Caddy 2026-11-03 | — |
| SMTP | `SMTP_URL`, `MAIL_FROM`, SPF/DKIM домена | Регистрация и вход работают; подтверждение почты и восстановление пароля — нет |
| GitHub | Создать закрытый репозиторий, разрешить push | CI не запускается; защита ветки не настроена |
| Оповещения | Токен бота Telegram / webhook Slack или Discord | Оповещения только в журнале монитора |
| Внешнее хранилище копий | Бакет S3 и ключи | Копии только на диске сервера |
| Sentry, внешний «пульс» | DSN, адрес healthchecks.io | Ошибки только в журнале; падение всего сервера не заметит никто |

## 12. Оставшиеся риски

- **Одна копия API.** Обновление и сбой процесса — несколько секунд 502. При росте нагрузки API упрётся в одно ядро (нагрузочный тест).
- **Общий сервер.** Endemion Life и endemion.online на одной машине: нагрузка или нехватка диска одного затрагивает другой. Копии на том же диске до настройки S3.
- **Подтверждение почты не обязательно** для игры: аккаунт можно создать на чужой адрес (владелец адреса сможет восстановить доступ и завершить сессии). Обязательность — решение для Stage 02.
- **Лимит входа без Redis** — в памяти процесса: при нескольких копиях API он станет на копию, а не общим.
- **2 moderate-уязвимости** в инструментах сборки внутри `@sentry/node` (раздел 8): ждут обновления Sentry.
- **Миграции не откатываются автоматически**: откат — восстановлением копии (`docs/ROLLBACK.md`); правило «расширить, потом сузить» для новых миграций.
- Проверки HTTPS, CI и оповещений в настоящие каналы ещё не выполнялись в реальной среде — до этого возможны ошибки конфигурации, которые локально не видны.

## 13. Пошаговый запуск

1. **Владелец:** DNS `A life.endemion.online → 185.175.156.196`; решение по репозиторию (GitHub или bundle); SMTP; канал оповещений.
2. Код на сервер в `/opt/endemion-life` (`docs/DEPLOYMENT.md`, раздел 1).
3. `cp infrastructure/env.production.example .env && chmod 600 .env`, заполнить: `NGINX_MODE=behind-proxy`, `PROXY_NETWORK`, `REAL_IP_FROM`, `POSTGRES_PASSWORD=$(openssl rand -hex 24)`, `SMTP_URL`, `ALERT_WEBHOOK_*`, `BACKUP_HOST_DIR`.
4. `DC="docker compose -f infrastructure/docker-compose.prod.yml -f infrastructure/docker-compose.behind-proxy.yml --env-file .env"`; `$DC config -q`; `$DC build`; `$DC up -d`; `$DC ps` — всё `healthy`.
5. **Владелец:** блок `life.endemion.online { reverse_proxy endemion-life-nginx:80 }` в Caddyfile, `caddy validate`, `caddy reload`.
6. `sh infrastructure/scripts/check-https.sh https://life.endemion.online` — все OK; затем `HSTS_MAX_AGE=63072000`, `$DC up -d nginx`.
7. `$DC exec backup backup.sh`; пробное восстановление в `endemion_life_check`; `$DC exec monitor /opt/monitor/notify.sh "проверка"`.
8. `docs/PRODUCTION_CHECKLIST.md` целиком.
9. **Владелец:** репозиторий на GitHub, push, зелёный CI, защита `main`.

## 14. Критерии готовности

| Критерий | Состояние | Основание |
| --- | --- | --- |
| Git настроен, изменения сохранены безопасным коммитом | ✅ Выполнено | Коммиты в `main` без секретов (проверка всей истории); `origin` — github.com/Yuta2Endo/Endemion-Life, подключён по решению владельца |
| Секреты исключены из Git | ✅ Выполнено | `.gitignore`, `.env` не в Git, образцы без паролей; gitleaks в CI |
| HTTPS-конфигурация подготовлена | ✅ Выполнено | Сертификат Let's Encrypt для life.endemion.online (выпустил Caddy), `check-https.sh` на настоящем домене — все OK. HSTS ещё не включён |
| Production cookie настроены безопасно | ✅ Выполнено | `HttpOnly; Secure; SameSite=Lax` проверены через HTTPS стека |
| Backup PostgreSQL работает | ✅ Выполнено | Локально: ручная и плановая копии, проверка, срок хранения. На сервере: ручная копия с полной проверкой и пробное восстановление в отдельную базу |
| Restore PostgreSQL проверен на тестовой базе | ✅ Выполнено | Новая база, поверх существующей, откат, учение |
| Восстановление создаёт предварительную копию | ✅ Выполнено | `pre-restore/` + прежняя база `_before_<время>` |
| Регистрация работает | ✅ Выполнено | Тесты API и Playwright |
| Вход работает | ✅ Выполнено | Тесты API и Playwright |
| Выход работает | ✅ Выполнено | Тесты API и Playwright |
| Подтверждение email работает либо обозначено внешнее требование SMTP | ⚠️ Работает с драйверами `file`/`memory`; **в рабочей среде нужен SMTP** | Отправка через настоящий SMTP не проверялась |
| Гостевые жизни переносятся в аккаунт | ✅ Выполнено | Регистрация и вход, с историей, снимками и действиями; параллельный вход |
| Чужие игровые жизни недоступны | ✅ Выполнено | 404 на всех endpoints, перенос только своего гостя |
| CI проходит | ❌ **Не подтверждено** | Код на GitHub, push запустил workflow, но результат не виден: репозиторий закрытый, `gh` не установлен. Все шаги workflow проходят локально |
| API пишет структурированные логи | ✅ Выполнено | JSON, request id, время, очистка секретов (unit-тесты и журнал стека) |
| Healthchecks работают | ✅ Выполнено | Все сервисы стека `healthy`; переходы в `unhealthy` и обратно проверены |
| Настроено оповещение о сбоях или подготовлена проверенная интеграция | ✅ Интеграция проверена на тестовом webhook; ⚠️ **настоящий канал — за владельцем** | Telegram/Slack/Discord не проверялись без токенов |
| Параллельные игровые действия протестированы | ✅ Выполнено | `reliability.e2e-spec.ts`, нагрузочный тест |
| Production build проходит | ✅ Выполнено | `pnpm build` в `pnpm check` |
| Docker build проходит | ✅ Выполнено | Все 6 образов собраны локально |
| Документация обновлена | ✅ Выполнено | README, architecture, 9 документов в `docs/` |

**Отдельно, зависит от внешних данных и не отмечено выполненным:** реальный сертификат HTTPS (DNS, сервер), развёртывание на сервере, CI на GitHub, отправка писем через SMTP, оповещения в настоящий канал, копии во внешнем S3, Sentry.

Stage 02 не начат.
