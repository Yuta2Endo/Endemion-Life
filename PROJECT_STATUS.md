# Endemion Life — статус проекта

**Обновлено:** 2026-11-14 (Portal integration ACTIVE)<br>
**Ветка:** `main`  
**HEAD:** `d91b579` (design QA gate)<br>
**Production:** STAGE 06.1 + design phases 0-8, save schema **14**; production code `42a572c`, deployed 2026-11-14 12:59 UTC; guild migration 13 applied<br>
**Production code:** `42a572c`; DB migrations **13**<br>
**Rollback:** `3f35fdc` (Stage 05) безопасен — миграция Stage 06.1 additive, таблицы гильдий можно оставить. Rollback на schema 13 (`0feb6d9`) требует восстановления БД после schema-14 записей.<br>
**Рабочее дерево:** clean, кроме untracked Stage 11 reports/docx.

**Stage 05 (2026-11-14):** account boundary, Redis presence, SSE, идемпотентный вклад в общий мир, export/delete аккаунта, reports, web-панель и Nginx SSE реализованы, проверены, закоммичены (`b6db176` → `9daaec2`) и развёрнуты. Production работает на `9daaec2`, 12 миграций. См. `docs/stage-05/STAGE_05_REPORT.md` и `docs/stage-05/RELEASE_RECORD.md`.

**Stage 04 (2026-11-14):** backend shared-world, детерминированный сезонный tick, replay/checksum, семь таблиц и web-панель `/worlds` реализованы, проверены, закоммичены (`cf7d098`) и развёрнуты. См. `docs/stage-04/RELEASE_RECORD.md`.

**Stage 03 (2026-11-14):** реализован, проверен, закоммичен (`7989731`) и развёрнут в production. Save schema **14**; существующие жизни schema 1–9 перечитываются и мигрируют при следующей записи. См. `docs/stage-03/STAGE_03_REPORT.md` и `docs/stage-03/RELEASE_RECORD.md`.

## Текущий статус

STAGE 00 (аудит), STAGE 01 (стабилизация), STAGE 02 (Advanced Life Simulation), STAGE 03 (Dynasty & Legacy), STAGE 04 (Living Worlds) и STAGE 05 (Multiplayer Foundation) завершены и развёрнуты. Production работает на `9daaec2`, save schema **14**, 12 миграций, общий мир season 1.

Production проверен 2026-11-13 после деплоя Stage 05:

- `/api/health` — HTTP 200, database/redis up;
- `/worlds` — HTTP 200;
- `/api/universes` — HTTP 200, все шесть миров;
- CSP активен, контейнеры api/web/nginx healthy;
- ошибок `INVALID_SAVE`/migration в логах не обнаружено;
- schema 9 жизни читаются кодом schema 14; новые schema 14 записи появятся после действий игроков.

| Этап | Название | Статус |
|------|----------|--------|
| STAGE 00 | Complete Project Audit | завершён, отчёты в `docs/audit/` |
| STAGE 01 (исторический) | Life Experience Upgrade | завершён |
| STAGE 02–09 | Living world, dynasty, social, economy, region | завершены |
| STAGE 10–16 | Mastery, live windows, insights | реализованы в production |
| STAGE 11.x | Portal integration | **ACTIVE**; Life endpoint и Portal JWKS deployed, 401-пути проверены |
| STAGE 01 (стабилизация) | Core Stabilization | **COMPLETED WITH BLOCKERS** — см. `docs/stage-01/STAGE_01_REPORT.md` |
| STAGE 02 (Advanced Life Simulation) | Health, education/career, household/property/business, travel, creation agency, balance/soak | **COMPLETE; deployed, schema 13 → 14** — см. `docs/stage-02/RELEASE_RECORD.md` |
| STAGE 03 (Dynasty & Legacy) | Relics, continuity, heir agency, six laws, long-run soak | **COMPLETE; deployed, schema 14** — см. `docs/stage-03/STAGE_03_REPORT.md` |
| STAGE 04 (Living Worlds) | Shared world, deterministic season tick, replay, web panel | **COMPLETE; deployed, schema 14, migration 11** — см. `docs/stage-04/RELEASE_RECORD.md` |
| STAGE 05 (Multiplayer Foundation) | Account gate, presence/SSE, contributions, export/delete, reports | **COMPLETE; deployed, schema 14, migration 12** — см. `docs/stage-05/STAGE_05_REPORT.md` |
| STAGE 06.1 (Guild Foundation) | Guilds, roles, requests, projects, reputation, audit | **COMPLETE; deployed, schema 14, migration 13** — см. `docs/stage-06/STAGE_06_1_REPORT.md` |

## Design (Living Chronicle)

- Дизайн-фазы 0–8 реализованы и задеплоены: production `42a572c`, schema 14, миграции 13.
- QA-гейт: `d91b579`; axe WCAG 2.2 AA, структурная проверка 320/390/1440 и transfer budget.
- Измеренный transfer: JS 477 KB, CSS 11 KB, fonts 127 KB, документ 25 KB — около 640 KB.
- Гейт: JS < 600 KB, всего < 750 KB. Цель плана 300 KB пока не достигнута; code-splitting — future work.
- Открыто: Lighthouse CI, screen-reader/200% zoom, Android WebView smoke, pixel baselines.

## Portal ↔ Life (ACTIVE in production)

Life-side API портала (`apps/api/src/portal/*`) зарегистрирован в `AppModule` (commit `4c786d6`) и активирован в production (`PORTAL_INTEGRATION_ENABLED=true`) после деплоя `3f35fdc`. `/api/portal/profile` без токена отвечает `401`, с некорректным токеном — `401 INVALID_TOKEN`; JWKS Portal отдаёт `200`.

- Контракт: ES256 JWT, `iss=https://endemion.online`, `aud=https://life.endemion.online`, `scope=portal:read`, lifetime ≤120 s, skew 30 s, `sub` = Endemion ID UUID.
- Endpoint: `GET /api/portal/profile`; ответ только `exists`, `displayName`, `lives.total`, `lives.alive`; `Cache-Control: private, no-store`.
- Защита: фиксированный JWKS URL, allow-list EC P-256/ES256/use=sig, timeout/cache/min-refresh, blocked kids, per-`sub` limit, отсутствие raw `sub`/токенов в логах.
- Проверки: API unit 74/74 (включая 39 portal-тестов), API e2e 135/135, typecheck/build/lint pass.
- Production: JWKS `200`, `kid=life-2026-11`, no `d`; Life `401`/`INVALID_TOKEN` и no-store проверены; все семь контейнеров healthy.
- `200`-профиль проверен короткоживущим ES256 assertion, подписанным на Portal-сервере для существующего `players.endemion_sub`: `200`, поля `profile.displayName/exists/lives`, no-store. Значения и subject не логировались.
- Не проверен полный браузерный flow Portal cookie session → assertion → Life; это остаётся operational smoke.
- Документация: `docs/portal/INTEGRATION.md`.

## STAGE 05 — Multiplayer Foundation (deployed, 2026-11-14)

STAGE 05 добавляет account boundary для общих систем: гости продолжают одиночную игру, аккаунты получают presence, SSE, вклад в общий мир, export/delete и reports. Общий мир остаётся отдельной проекцией; `SAVE_SCHEMA_VERSION` остаётся **14**, миграция `20261114130000_stage05_multiplayer` аддитивная и применена в production (12 миграций).

- API: `POST /api/presence/heartbeat`, `GET /api/presence/online`, `GET /api/presence/stream` (SSE), `POST /api/world/:universeId/contribute`, `GET /api/auth/export`, `DELETE /api/auth/account`, `POST /api/social/reports`.
- Contribution: advisory lock, unique `(playerId, actionId)`, one per season, expectedSeason, server-computed effect, command/audit/projection в одной транзакции, SSE после commit.
- Web: `world-participation.tsx` на `/worlds`; heartbeat 30s, EventSource, online roster, выбор settlement/faction, локализованные ошибки.
- Nginx: exact-match `/api/presence/stream` с отключённым buffering/cache/gzip.
- Проверки: game-core 775/775, shared 18/18, API unit 74/74, API e2e 132/132, web 25/25; typecheck/lint/build pass.
- Ограничения: SSE fan-out только в пределах одного API-процесса; нет replay/`Last-Event-ID`, лимита SSE-соединений, очереди модерации и load-теста. См. `docs/stage-05/PRESENCE_AND_SSE.md` и `SECURITY_AND_MODERATION.md`.
- Release: закоммичен (`b6db176` → `9daaec2`), CI/Security success, развёрнут с миграцией 2026-11-13 23:04 UTC; backup `endemion_life-manual-20261113T224407Z.dump` проверен trial restore. Portal остаётся вне релиза.
- Production smoke: `/api/health` 200, `/api/world` 200, SSE route returns 401 without account, 12 migrations. Полный двухаккаунтный smoke не выполнен: production password registration отключён (`410 USE_ENDEMION_ID`), нужен Endemion ID тест-аккаунт.

## STAGE 06.1 — Guild Foundation (deployed, 2026-11-14)

Узкий гильдейский слой: гильдии по мирам, роли leader/officer/member, публичное вступление или заявка, лимит 30 участников, одна гильдия на игрока в мире, проекты с серверным прогрессом, вклад с `actionId`-идемпотентностью, репутация за завершение, audit log и web-панель на `/social`.

- API: `/api/guilds` и вложенные маршруты; только account, гости получают `ACCOUNT_REQUIRED`.
- Данные: 13-я аддитивная миграция `20261115090000_stage06_guilds`; save schema остаётся **14**.
- Проверки: API e2e **141/141**, API unit 74/74, game-core 775/775, shared 18/18, web 25/25; typecheck/build/lint pass (1 старое warning).
- Ограничения: нет казны, торговли, чата, альянсов, приглашений и админ-модерации; web-панель без отдельного render-теста.
- Release: production HEAD `d63d405`, deploy `09:52:24Z` → `09:53:03Z ok`, 13 миграций, `/api/guilds` возвращает 401 без сессии, все 7 контейнеров healthy. См. `docs/stage-06/STAGE_06_1_REPORT.md`.

## STAGE 04 — Living Worlds (deployed, 2026-11-14)

Stage 04 добавляет серверный общий мир для каждой вселенной: детерминированный сезонный tick, снимки сезонов, журнал команд, replay/checksum, ops-аудит, публичную сверку с мирами жизней и web-панель на `/worlds`. `SAVE_SCHEMA_VERSION` остаётся **14**; общий мир — отдельная проекция. Backend: game-core 775/775, API e2e 127/127; web 25/25. Миграция `20261114120000_stage04_living_worlds` аддитивная, применена в production (11 миграций); шесть миров созданы lazily, season 1.

## STAGE 02 — Advanced Life Simulation

STAGE 02.1–02.6 реализованы, проверены, запушены и развёрнуты. `SAVE_SCHEMA_VERSION = 13`.

- Health/illness/injury/cause of death; schema 9.
- Education and career ladder; schema 10.
- Household/property/business; schema 11.
- Travel between existing settlements; schema 12.
- Upbringing packages and limited point-buy; schema 13.
- Deterministic 1008-life soak: no negative wealth, no NaN, state max 78.2 KiB, 74-year median death age.
- Полный soak: `ENDEMION_FULL_SOAK=1` в `packages/game-core/test/stage02-balance-soak.test.ts`.

## STAGE 03 — Dynasty & Legacy (deployed, 2026-11-14)

STAGE 03.1–03.5 реализованы, проверены, закоммичены (`7989731`) и развёрнуты в production. `SAVE_SCHEMA_VERSION = 14`, миграция 13 → 14 additive; существующие жизни schema 1–9 читаются и мигрируют при следующей записи.

- 03.1: полная оценка наследства (золото + дом + дела), передача дома в натуре, реликвии, `InheritanceRecord.assets`; schema 14.
- 03.2: социальная память NPC–NPC, мир и фракции переживают наследование; синтетические 5 поколений.
- 03.3: выбор наследника с объяснением, доли, опекун, хроника и архив рода; web-компоненты.
- 03.4: шесть законов наследования (первородство, равный раздел, merit, sect claim, гражданский кодекс, майорат); 61 тест.
- 03.5: длинный soak 12 родов в CI и 60 в полном прогоне; инфляционные границы; документы Stage 03.

Исправлен реальный дефект Stage 03.4: золото под опекой (`lineage.inheritance.held`) не входило в наследство и исчезало при смерти младшего наследника до `controlAge`; регрессионный тест есть. В 03.5 production-код не менялся.

### Проверки Stage 03 (2026-11-14)

- game-core: **767/767**, 52 файла.
- shared: **18/18**.
- web: **22/22**.
- API unit: **74/74**.
- API e2e (`pnpm test:api`): **119/119**; ожидаемые 500/503 в fault-injection логах.
- TypeScript, lint, production web build, `git diff --check`: PASS (lint — 0 ошибок, 1 pre-existing warning).
- Stage 03.5 CI soak: 12 родов, 4 дошли до 5-го поколения, 8 вымерли, 1,4 с.
- Stage 03.5 full soak: 60 родов, 14 дошли до 5-го поколения, 46 вымерли, 5,99 с; максимум хозяйства 3 824, `capLoss = 0`.
- Подробности: `docs/stage-03/STAGE_03_5_BALANCE_SOAK.md`.

### Остаточные риски Stage 03

- Высокая естественная смертность рода: 46/60 (76,7%) в полном прогоне, особенно dark-fantasy и hunter (по 9/10). Это балансовый риск, а не порча сохранения; механики и законы не менялись.
- Наследники могут быть старше 100 лет (xianxia/isekai), из-за чего следующее поколение живёт несколько лет.
- Опека редка (2 из 124 наследований); полный soak её покрывает, CI — нет.
- Stage 03 развёрнут: production код `7989731`, schema 14 engine; все семь контейнеров healthy, `/api/health` 200, `/worlds` 200, `/api/universes` — шесть миров.

## Проверки (исторический снимок Stage 02)

- game-core: **679/679**
- API unit: **74/74**
- shared: **18/18**
- API e2e: **118/118**
- web: **20/20**
- TypeScript, lint, production web build: PASS
- CI и Security на `0feb6d9`: **success**
- Android: debug APK и unsigned release AAB собраны (JDK 21, SDK 36); signing/Play submission не завершены

## Технические детали

- Production `SAVE_SCHEMA_VERSION = 14`. Совместимость форматов 1–14 сохраняется через аддитивные миграции.
- API: порт 4000; web: 3000. Локальный режим остаётся запасным для web, но **не создаёт новые жизни в Android-оболочке при недоступном API**.
- Импорт проверяет schema через `SAVE_SCHEMA_VERSION`, а не через захардкоженное значение.
- DB migrations: **12** в production после Stage 05. Schema 14 — это формат JSON-сохранения, а не новая DB-миграция.
- Production backup перед деплоем Stage 04: `endemion_life-manual-20261113T215227Z.dump` (10 MB), полный trial restore прошёл: 18 players, 45 lives, 1,716 snapshots, 8,344 history, 5,610 actions.
- Rollback: `0feb6d9`/`c280c16` безопасен (schema 13), пока нет schema-14 записей. После первой schema-14 записи откат требует восстановления БД из backup. `ca72b8b` не читает schema >8.
- GitHub: 2 moderate Dependabot alerts.
- Android signing: upload keystore находится вне репозитория в `G:\II\EndemionLife_keys`; подписанные AAB (4,370,349 B) и APK (4,517,430 B) собраны и проверены, сертификат SHA-256 `FD:83:...:DB:A5`. Play Console upload/listing, Play App Signing enrollment, data-safety/account-deletion declarations и device install остаются блокерами. Секреты в git не добавлены.

## Deployment history

Все Stage 02 и Stage 03 коммиты были развёрнуты последовательно 2026-11-13:

| UTC | Коммит | Результат |
|---|---|---|
| 12:48 | `b634a67` | STAGE 01 |
| 13:44 | `7325c8f` | docs |
| 14:25 | `2113ab4` | STAGE 02.1 |
| 15:41 | `875f2f1` | STAGE 02.2 |
| 16:59 | `6ab3384` | STAGE 02.3 |
| 18:13 | `fcc76f2` | STAGE 02.4 |
| 18:37 | `5f26f8e` | STAGE 02.5 |
| 18:42 | `c280c16` | STAGE 02.6 |
| 18:48 | `8fd0dfc` | release docs |
| 18:59 | `0feb6d9` | docs: deployment record |
| 20:40 | `7989731` | STAGE 03 |
| 21:59 | `cf7d098` | STAGE 04 |
| 23:04 | `9daaec2` | STAGE 05 |
| 23:44 | `4c786d6` | Portal code (dark) |
| 23:54 | `3f35fdc` | Portal ACTIVE |

`history.log`: `current=3f35fdc`, `previous=4c786d6`; PostgreSQL/Redis/backup/monitor остаются на прежних контейнерах.

## Открытые блокеры

- Production smoke Stage 05: публичные health/world проверены, SSE без аккаунта корректно возвращает 401; полный двухаккаунтный presence/SSE smoke требует Endemion ID тест-аккаунта (password registration в production отключён, `410 USE_ENDEMION_ID`).
- Portal: интеграция **ACTIVE**; JWKS 200, Life 401/INVALID_TOKEN и 200-profile через server-signed assertion проверены. Осталось: полный браузерный flow Portal → Life и мониторинг `portal.auth.*`/Portal `life.*`.
- Android: Play Console listing/upload, Play App Signing enrollment, data-safety/account-deletion compliance, CI signing-secret provisioning, device install. Release signing itself завершён.
- 2 moderate Dependabot alerts.
- Баланс: бизнес слишком редко проваливается (1.4%), murim имеет тяжёлый нижний хвост смертности, доступ к education tier 2+ сильно различается по мирам.
- Stage 03 развёрнут; естественное вымирание рода в soak 76,7% — балансовый риск для следующего этапа.
- Rollback на schema 8 невозможен без восстановления БД из backup.
