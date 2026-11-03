# Наблюдение: журналы, ошибки, доступность

## Журналы API

- Формат `LOG_FORMAT=json` (по умолчанию в production) — одна строка JSON на запись: `time`, `level`, `context`, `msg`, `requestId` и поля записи. `pretty` — читаемый вид для разработки.
- Уровни `LOG_LEVEL`: `error`, `warn`, `info` (по умолчанию), `debug`.
- Каждый запрос: `method`, `path` (без строки запроса), `status`, `durationMs`, `ip`. Уровень: `info` для 2xx/3xx, `warn` для 4xx, `error` для 5xx. `/api/health` пишется, только если ответил ≥500.
- **Request ID**: заголовок `X-Request-Id` от Nginx (`$request_id`) или клиента (если похож на идентификатор: `[A-Za-z0-9._-]{8,64}`), иначе UUID. Возвращается в ответе и попадает во все записи этого запроса. Nginx пишет тот же id в свой журнал — запрос можно найти в обоих.
- **Секреты**: поля с именами вида `password`, `token`, `secret`, `cookie`, `authorization`, `session_id`, `code`, `dsn`, `smtp`, `api_key` заменяются на `[redacted]`; в тексте вырезаются пароли из URL (`postgresql://user:***@…`) и значения `el_session=`. Тела запросов и тексты писем не пишутся.
- Ошибки 5xx: запись `Необработанная ошибка` с путём и стеком. Недоступность базы (коды Prisma P1001, P1002, P1017, P2024) — одна строка `warn` «База данных недоступна» без стека, клиенту — `503 UNAVAILABLE`.

Журнал Nginx — тоже JSON (`endemion_json`): время, адрес, метод, путь без строки запроса, статус, время ответа upstream, request id.

Все контейнеры: драйвер `json-file`, не больше 5 файлов по 10 МБ.

```bash
DC="docker compose -f infrastructure/docker-compose.prod.yml --env-file .env"
$DC logs -f api                         # журнал API
$DC logs api | grep '"level":"error"'   # ошибки
$DC logs api nginx | grep <request id>  # один запрос
```

## Sentry

`SENTRY_DSN` — Sentry или совместимый сервис (GlitchTip). Пусто — выключено. Отправляются ошибки 5xx (кроме недоступности базы) и необработанные исключения процесса, с тегом `requestId`. Данные пользователя, cookie, заголовки, тела и строка запроса не собираются (`dataCollection`), текст события дополнительно проходит ту же очистку, что журнал. Отправка в настоящий Sentry **не проверялась**: нужен DSN.

## Проверки здоровья

| Сервис | Healthcheck | Перезапуск |
| --- | --- | --- |
| postgres | `pg_isready` каждые 5 с | `unless-stopped` |
| redis | `redis-cli ping` | `unless-stopped` |
| migrate | — (запускается один раз, код 0 обязателен для старта API) | `no` |
| api | `GET /api/health` → 200 каждые 15 с | `unless-stopped` |
| web | `GET /` → <500 | `unless-stopped` |
| nginx | `GET /nginx-health` | `unless-stopped` |
| backup | `crond` работает, последняя копия не старше 26 ч | `unless-stopped` |
| monitor | цикл проверок жив (отметка не старше 5 мин) | `unless-stopped` |
| certbot | — | `unless-stopped` |

`GET /api/health`:

```json
{ "status": "ok", "version": "0.1.0", "uptimeSeconds": 120, "services": { "database": "up", "redis": "up" } }
```

200 и `degraded` — Redis недоступен (игра работает, общий лимит запросов отключён, лимит входа — в памяти). 503 — нет базы.

## Монитор и оповещения

Контейнер `monitor` раз в `MONITOR_INTERVAL` (60) секунд проверяет `http://api:4000/api/health` внутри сети и, если задан `MONITOR_PUBLIC_URL`, публичный адрес (DNS, HTTPS, Nginx целиком). Раз в 12 часов — срок сертификата публичного адреса.

Оповещения уходят при **смене** состояния:

| Сообщение | Когда |
| --- | --- |
| 🔴 Endemion Life недоступен: … | `MONITOR_FAILURES` (3) неудачных проверок подряд; повтор раз в `MONITOR_REPEAT_MINUTES` (60), пока сбой не устранён |
| 🟢 Endemion Life снова работает | Первая успешная проверка после сбоя |
| 🟡 … работает с ограничениями: Redis недоступен | Redis недоступен |
| 🟡 Сертификат HTTPS истекает через N дн. | Осталось меньше `MONITOR_CERT_WARN_DAYS` (14) |
| Endemion Life: ошибка резервного копирования — … | Любой сбой `backup.sh` (из контейнера backup) |

Куда (`.env`):

| Канал | Настройка |
| --- | --- |
| Telegram | `ALERT_WEBHOOK_FORMAT=telegram`, `ALERT_WEBHOOK_URL=https://api.telegram.org/bot<токен>/sendMessage`, `ALERT_TELEGRAM_CHAT_ID=<id чата>` |
| Slack | `ALERT_WEBHOOK_FORMAT=slack`, URL входящего webhook |
| Discord | `ALERT_WEBHOOK_FORMAT=discord`, URL webhook канала |
| Свой сервис | `ALERT_WEBHOOK_FORMAT=generic`: `POST {"source","time","text"}` |

Проверка канала после настройки:

```bash
$DC exec monitor /opt/monitor/notify.sh "Проверка оповещений Endemion Life"
```

Монитор работает на том же сервере и не заметит падения всего сервера. Для этого — внешний «пульс»: `HEALTHCHECKS_PING_URL` (healthchecks.io или аналог) получает запрос после каждой успешной проверки; сервис оповещает, если запросы перестали приходить. `HEALTHCHECKS_BACKUP_PING_URL` — так же для резервных копий (ожидаемый период — сутки).

## Что проверено (локально, стек `docker-compose.prod.yml`)

Монитор с интервалом 10 с и порогом 2 отправлял оповещения в тестовый приёмник webhook (контейнер в сети стека, формат generic):

- API остановлен → через 2 проверки «🔴 недоступен: нет ответа»; запущен → «🟢 снова работает»;
- Redis остановлен → «🟡 работает с ограничениями»; запущен → «🟢 все сервисы снова работают»;
- PostgreSQL остановлен → `/api/health` 503, запросы игры `503 UNAVAILABLE`, в журнале одна строка `warn` с кодом P1001; после запуска API восстановился сам.

Доставка в настоящие Telegram/Slack/Discord, Sentry и внешний «пульс» **не проверялись**: нужны токены и адреса владельца.
