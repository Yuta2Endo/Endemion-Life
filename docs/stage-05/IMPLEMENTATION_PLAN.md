# STAGE 05 — Multiplayer Foundation: план реализации

**Статус:** реализовано, проверено, закоммичено (`b6db176` → `9daaec2`) и развёрнуто в production 2026-11-13.
**База:** production `9daaec2`, 12 миграций, save schema **14**.
**Схема сохранения не менялась.**

## Цель этапа

Заложить серверный фундамент общего мира, не превращая игру в клиент-авторитетную имитацию мультиплеера:

- гостевой соло-режим сохраняется;
- общий мир и социальные мутации требуют аккаунта;
- присутствие игроков эфемерно и не является частью сохранения;
- вклад в мир идемпотентен, ограничен сезоном и считается только сервером;
- появляются экспорт/удаление аккаунта и базовая модерация;
- realtime-доставка — SSE, без новой зависимости и без WebSocket-инфраструктуры.

## Границы этапа

### Входит

1. `requireAccount` — единая проверка «настоящий аккаунт, не гость».
2. Redis presence: heartbeat, TTL, список онлайн, SSE-поток.
3. Серверный вклад в общий мир: `actionId`, `expectedSeason`, цель, аудит, идемпотентность.
4. Один вклад на аккаунт в сезон; конкурентные запросы сериализуются advisory lock.
5. Уведомление о вкладе через SSE после commit.
6. `GET /api/auth/export`, `DELETE /api/auth/account`.
7. `POST /api/social/reports` и таблица `player_reports`.
8. Web: присутствие, список онлайн, форма вклада, SSE-обновление.
9. Nginx: отдельный streaming-location без буферизации.
10. Тесты, включая конкурентные вклады и SSE.

### Не входит

- WebSocket, комнаты, матчмейкинг, PvP.
- Полноценный чат и модераторская очередь.
- Торговля между игроками, общая экономика, кланы.
- Синхронизация `GameState` между игроками.
- Автоматический сезонный worker.
- Мобильный push и deep links.
- Изменение `SAVE_SCHEMA_VERSION`.

## Ключевые решения

| Решение | Причина |
|---|---|
| Аккаунт обязателен только для общих мутаций | Гость остаётся полноценным соло-игроком; не ломаем существующий сценарий |
| Presence в Redis, не в PostgreSQL | Присутствие эфемерно; не создаёт нагрузки на БД и не требует миграции |
| SSE вместо WebSocket | Достаточно server→client уведомлений; нет новой зависимости; работает через cookie |
| `WorldContribution` с уникальностями | Идемпотентность по `actionId` и один вклад на сезон защищены БД |
| Сервер считает эффект (+1 к целям) | Клиент присылает только цель, не награду и не число |
| Вклад не двигает сезон | Сезон меняет только ops tick; вклад не ускоряет мир |
| Отчёт — отдельная таблица | Блокировка обратима, жалоба — история для модерации |
| Удаление аккаунта каскадно | `Player` — владелец жизней, сессий, вкладов, отчётов и связей |

## Срезы

### 05.1 — Account gate

- `SessionService.requireAccount` возвращает `{session, player, account}`.
- Гость: `403 ACCOUNT_REQUIRED`.
- Соло-жизни, импорт, restore, succession не затронуты.

### 05.2 — Presence

- `POST /api/presence/heartbeat`.
- `GET /api/presence/online`.
- `GET /api/presence/stream` (SSE).
- Redis sorted set `presence:world:<universeId>`, score = timestamp, TTL 90 s.
- Имена подтягиваются из `Player` при чтении, не хранятся в Redis.
- Redis outage → `available:false`, без 500.

### 05.3 — Shared contribution

- `POST /api/world/:universeId/contribute`.
- Транзакция + `pg_advisory_xact_lock(hashtext('world:<id>'))`.
- Проверки: replay, `expectedSeason`, один вклад в сезон, существование цели.
- Эффект: поселение +1 prosperity/stability; фракция +1 influence/standing, с clamp.
- Запись `WorldCommand`, `WorldAudit`, `WorldContribution`; SSE после commit.

### 05.4 — Account lifecycle и модерация

- Экспорт без `passwordHash`, `tokenHash`, `refreshToken`.
- Удаление по `confirm: "DELETE"`, каскад и очистка cookie.
- Жалоба: причина из фиксированного списка, до 500 символов, нельзя на себя.

### 05.5 — Web и инфраструктура

- `WorldParticipation` на `/worlds`: присутствие, онлайн, выбор цели, вклад.
- EventSource с автоматическим reconnect; при `world` — перезапрос деталей.
- Nginx `location = /api/presence/stream`: `proxy_buffering off`, `gzip off`, timeout 1h.

### 05.6 — Проверки и документы

- API e2e: account gate, presence, stale presence, SSE, replay, season conflict, one-per-season, concurrent same-account, multi-account, report, export, delete.
- Полная матрица тестов, web build, typecheck, lint.
- Документы Stage 05 и обновление статуса.

## Критерии приёмки

- 05-01: гость не может heartbeat/online/stream/contribute; соло-жизнь создаётся.
- 05-02: heartbeat обновляет TTL; старый score не виден; Redis outage не ломает ответ.
- 05-03: SSE отдаёт `presence` и `world`; второй аккаунт получает уведомление о вкладе.
- 05-04: replay по `actionId` не меняет мир; `expectedSeason` и один вклад в сезон дают 409.
- 05-05: конкурентные вклады не создают двойной эффект.
- 05-06: SSE reconnect восстанавливает снимок (EventSource + initial `presence`).
- 05-07: экспорт содержит данные игрока и не содержит секретов; удаление каскадно.
- 05-08: жалоба создаётся только аккаунтом; блокировка сохраняет прежнего автора.
- 05-09: несколько аккаунтов одновременно поддерживают мир без потери проекции.
- 05-10: клиент не присылает награду/seed; сервер считает эффект сам.
