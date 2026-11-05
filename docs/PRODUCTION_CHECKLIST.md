# Проверочный список перед запуском

Отмечайте на сервере. Пункты, требующие владельца, помечены **[владелец]**.

## Доступ и настройки

- [ ] **[владелец]** DNS: `dig +short life.endemion.online A` возвращает IP сервера.
- [ ] **[владелец]** Решено, как код попадает на сервер (закрытый репозиторий GitHub или bundle).
- [ ] `.env` создан из `infrastructure/env.production.example`, `chmod 600 .env`, в Git его нет (`git status` чистый).
- [ ] `POSTGRES_PASSWORD` сгенерирован (`openssl rand -hex 24`), не пример из образца.
- [ ] `DOMAIN=life.endemion.online`; `CORS_ORIGINS` и `PUBLIC_URL` не заданы (берутся `https://DOMAIN`) или заданы с `https://`.
- [ ] `COOKIE_SECURE` не задан или `true`.
- [ ] `NGINX_MODE` выбран; для behind-proxy заданы `PROXY_NETWORK` и `REAL_IP_FROM`.
- [ ] `$DC config -q` без ошибок.

## Запуск

- [ ] `$DC ps`: postgres, redis, api, web, nginx, backup, monitor — `healthy`; migrate — `Exited (0)`.
- [ ] `$DC logs migrate`: миграции применены.
- [ ] Журнал API — JSON, строка «API запущен» с `"env":"production"`, `"httpsOnlySession":true`.
- [ ] `$DC logs api | grep -iE 'password|el_session='` — пусто (секретов в журнале нет).

## HTTPS

- [ ] Сертификат выпущен (tls: `issue-certificate.sh`; behind-proxy: Caddy).
- [ ] `sh infrastructure/scripts/check-https.sh https://life.endemion.online` — все OK.
- [ ] Сайт открывается в браузере без предупреждений; `http://` перенаправляет на `https://`.
- [ ] Cookie `el_session` в DevTools: `HttpOnly`, `Secure`, `SameSite=Lax`.
- [ ] После этого: `HSTS_MAX_AGE=63072000`, `$DC up -d nginx`, `check-https.sh` показывает «HSTS включён».

## Приложение

- [ ] Гостем: создать жизнь, прожить несколько лет, обновить страницу — жизнь на месте.
- [ ] Зарегистрироваться с того же браузера — жизнь осталась.
- [ ] **[владелец: SMTP]** Письмо с кодом пришло, код подтверждает почту.
- [ ] Выйти, войти с другого браузера — жизнь видна; «Завершить другие сеансы» выкидывает первый браузер.
- [ ] **[владелец: SMTP]** «Забыли пароль» — письмо со ссылкой, новый пароль работает, старые сессии завершены.
- [ ] Запрос с чужим Origin: `curl -X POST -H 'Origin: https://evil.example' -H 'Content-Type: application/json' -d '{}' https://life.endemion.online/api/lives` → 403.

## Резервные копии

- [ ] `BACKUP_HOST_DIR` существует, `chmod 700`, на другом разделе или есть внешнее хранилище.
- [ ] `$DC exec backup backup.sh` — успех, файл в `manual/`.
- [ ] Пробное восстановление `restore.sh … --target endemion_life_check` — успех; тестовая база удалена.
- [ ] **[владелец]** `BACKUP_S3_REMOTE` и ключи хранилища; после копии файл виден в бакете.
- [ ] На следующий день: плановая копия в `daily/`, healthcheck backup `healthy`.

## Наблюдение

- [ ] **[владелец]** `ALERT_WEBHOOK_*` заданы; `$DC exec monitor /opt/monitor/notify.sh "проверка"` — сообщение пришло.
- [ ] `$DC stop api`, через 3 минуты — оповещение «недоступен»; `$DC start api` — «снова работает».
- [ ] `MONITOR_PUBLIC_URL=https://life.endemion.online/api/health`.
- [ ] **[владелец]** `HEALTHCHECKS_PING_URL` (внешний «пульс»), `SENTRY_DSN` — по желанию.

## Сервер

- [ ] `systemctl is-enabled docker` — `enabled` (стек поднимается после перезагрузки).
- [ ] Межсетевой экран: открыты только 22, 80, 443.
- [ ] Свободно больше 5 ГБ диска (`df -h`); журналы контейнеров ограничены (10 МБ × 5).
- [ ] После всего: перезагрузка сервера, через 2 минуты `$DC ps` — всё `healthy`.

## CI

- [ ] **[владелец]** Репозиторий на GitHub, workflow `CI` и `Security` зелёные на `main`.
- [ ] `LIVE_OPS_TOKEN` пуст, пока окна не ведут вручную. Если задан — не короче 16 символов и не в Git.
- [ ] Новые миграции (`live_windows`, `insights`) не применять без `allow_migrations` и проверки на копии. Откат кода их не снимает.
- [ ] **[владелец]** Защита ветки `main`: обязательные проверки (docs/GIT_WORKFLOW.md).
