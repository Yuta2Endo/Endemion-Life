# R6.1 — Launch Gate

**Статус:** COMPLETE AND DEPLOYED (2026-11-16 03:17 UTC)
**Save schema:** 14 (без изменений)  
**DB migration:** нет  
**Затронуты API и infrastructure**

## 1. Что добавлено

- Новый строгий endpoint готовности `GET /api/ready`:
  - 200 — PostgreSQL и Redis доступны;
  - 503 — хотя бы один сервис недоступен;
  - ответ: `{ ready, version, services: { database, redis } }`.
- `/api/ready` исключён из rate limiter, поэтому readiness не зависит от Redis и не маскируется ошибкой ограничителя.
- Новый внешний launch gate: `infrastructure/scripts/launch-check.mjs`.
- Команда:
  ```bash
  BASE_URL=https://life.endemion.online pnpm launch:check
  ```
- Скрипт проверяет:
  - `/api/health` — БД и Redis;
  - `/api/ready` — строгую готовность;
  - `/` и `/worlds` — web;
  - `/api/universes` — шесть миров;
  - `/api/world` — шесть общих миров;
  - `/api/world/hunter/story` — четыре сезонные главы;
  - `/api/contracts?universeId=hunter` — доску контрактов;
  - `/api/notifications` — гостевой 401;
  - `/audio/worlds/dark-fantasy.ogg` — наличие и MIME-тип аудио.
- Скрипт не требует секретов, ничего не записывает и возвращает код 1 при любом провале.

## 2. Использование

```bash
# Production
BASE_URL=https://life.endemion.online pnpm launch:check

# Локальный или staging
BASE_URL=http://127.0.0.1:3000 pnpm launch:check

# Самоподписанный сертификат
BASE_URL=https://staging.example INSECURE=1 pnpm launch:check
```

Порог предупреждения о медленном ответе: `LAUNCH_SLOW_MS` (по умолчанию 2000 мс). Таймаут запроса: `LAUNCH_TIMEOUT_MS` (15000 мс).

## 3. Проверка

| Проверка | Результат |
|---|---|
| API typecheck | PASS |
| API reliability/readiness e2e | **8/8 PASS** |
| `node --check launch-check.mjs` | PASS |
| Launch gate против production | **10/10 PASS** |
| Save schema | 14 |
| DB migration | нет |

## 4. Деплой

- Код: **`5728641`**; production runtime **`5728641`**.
- Deploy run **43796939539** — success; environment `26274376808` approved.
- История: `2026-11-16T03:16:59Z deploy-start 5728641 from afeedc9` → `2026-11-16T03:17:27Z deploy 5728641 ok`.
- CI **43796431687** success; Security **43796431693** success.
- Миграций в production: **26**; save schema **14**.
- Launch gate против `https://life.endemion.online`: **10/10 PASS** — health, readiness, web, worlds, universes, shared worlds, season story, contracts, guest auth, audio.
- Откат: **`afeedc9`**.

## 5. Ограничения

- Это первый срез R6: эксплуатационный gate, а не весь запуск.
- Android AAB, Play Console, подпись и data safety не входят.
- Staging/canary окружение не создано.
- Push-уведомления и deep links не входят.
- Очередь модерации остаётся существующей (Stage 05 reports/blocks).
- Backup/restore скрипты уже есть, но полный restore drill в этом срезе не выполнялся.
- Launch gate проверяет доступность и форму ответов, а не визуальный UI и не Android WebView.

## 6. Откат

Миграций нет. Откат — предыдущий API/infrastructure коммит. `/api/ready` и скрипт не меняют данные игроков.
