# Endemion Life — статус проекта

**Обновлено:** 2026-11-15 (R4.4 settlement orders deployed)<br>
**Ветка:** `main`  
**HEAD:** `a9ef364` (R4.4 settlement orders)<br>
**Production:** R4.4 + R4.3 + R4.2 + R4.1 + R3.4 + R3.3 + R3.2 + R3.1 + R2.3 + R2.2 + R2.1 + R1.2 + R1.1 + STAGE 06.3 + Stage 06.2 + design phases 0-8 + Endemion ID fix, save schema **14**; runtime `a9ef364`, deployed 2026-11-15 11:33 UTC; migrations **20** (guild 13, market 14, profile 15, families 16, treasury 17, rewards 18, fee 19, orders 20)<br>
**Production code:** `a9ef364`; DB migrations **20**, additive<br>
**Rollback:** `a09ee65`; migration 20 is additive.<br>
**Рабочее дерево:** docs record being updated; unrelated Android/itch/lockfile changes preserved; 74 Stage 11 reports/docx untracked.

**Endemion ID shared-world hotfix (deployed):** пользователи Endemion ID больше не считаются гостями. `SessionService.requireAccount` и `AuthService.me` признают `players.endemion_sub` полноценной учётной записью, а web-панель присутствия проверяет и `account`, и `endemionId`. Присутствие, вклад в мир, гильдии и рынок доступны после входа через Endemion ID; гости без `endemion_sub` остаются в solo-режиме. Commit `d9313dd`, deploy run `43612503324`, backup `endemion_life-manual-20261114T155304Z.dump`. См. `docs/incidents/2026-11-14-endemion-id-shared-world.md`.

**Stage 06.2 player market (deployed):** публичная доска объявлений по мирам, account-only создание/покупка/отмена, атомарный обмен товара и золота, append-only ledger, история и snapshots обоих персонажей, защита restore после сделки и отмена offer при succession. Save schema остаётся **14**; БД-миграция **14** additive. Deploy run `43608818425` success, production `0661018`, 14 миграций. См. `docs/stage-06/STAGE_06_2_PLAYER_MARKET.md`.

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
| STAGE 06.2 (Player Market) | Offers, atomic goods/gold settlement, ledger, restore guard, succession cancel | **COMPLETE; deployed, schema 14, migration 14** - см. `docs/stage-06/STAGE_06_2_PLAYER_MARKET.md` |
| STAGE 06.3 (Player Profile) | Public/private profile, stats, badges, recent lives, guilds, data export/delete | **COMPLETE; deployed, schema 14, migration 15** - см. `docs/stage-06/STAGE_06_3_PLAYER_PROFILE.md` |
| R1.1 (First Life Guide) | Adaptive chapter guide, goal progress, first-life checklist | **COMPLETE; deployed, no schema/API changes** - см. `docs/planning/R1_1_FIRST_LIFE_GUIDE.md` |
| R1.2 (First-Life Analytics) | Guide signals + server-derived first-life funnel | **COMPLETE; deployed, no save/DB migration** - см. `docs/planning/R1_2_FIRST_LIFE_ANALYTICS.md` |
| R2.1 (Player Families) | Account-level family, roles, invitations/consent, audit, Web UI | **COMPLETE; deployed, schema 14, migration 16** - см. `docs/planning/R2_1_FAMILIES.md` |
| R2.2 (Family Estate) | Treasury ledger, inheritance consent, cross-account succession backend + web UI | **COMPLETE; deployed, schema 14, migration 17** - см. `docs/planning/R2_2_FAMILY_ESTATE.md` |
| R2.3 (Family Chronicle) | Derived house chronicle: audits + member life milestones, API + web panel | **COMPLETE; deployed, no migration** - см. `docs/planning/R2_3_FAMILY_CHRONICLE.md` |
| R3.1 (World Scheduler) | Automatic shared-world tick every 15 minutes, six universes | **COMPLETE; deployed, no migration** - см. `docs/planning/R3_1_WORLD_SCHEDULER.md` |
| R3.2 (Season Chronicle) | Season list, event history API, season rail and event panel on `/worlds` | **COMPLETE; deployed, no migration** - см. `docs/planning/R3_2_SEASON_CHRONICLE.md` |
| R3.3 (Season Goals) | Shared prosperity/stability/faction goals and settlement-map view | **COMPLETE; deployed, no migration** - см. `docs/planning/R3_3_SEASON_GOALS.md` |
| R3.4 (Season Rewards) | Goal reward pool, claim to a life, idempotency, web claim panel | **COMPLETE; deployed, schema 14, migration 18** - см. `docs/planning/R3_4_SEASON_REWARDS.md` |
| R4.1 (Market Fee) | 5% seller-side sink, dynamic shared prices | **COMPLETE; deployed, schema 14, migration 19** - см. `docs/planning/R4_1_MARKET_FEE.md` |
| R4.2 (Price History) | Season price history, changes, event influence panel | **COMPLETE; deployed, no migration** - см. `docs/planning/R4_2_PRICE_HISTORY.md` |
| R4.3 (Event Prices) | World events apply one-season price pressure to settlements | **COMPLETE; deployed, no migration** - см. `docs/planning/R4_3_EVENT_PRICES.md` |
| R4.4 (Settlement Orders) | Seasonal goods orders, gold rewards, idempotent fulfilment, web board | **COMPLETE; deployed, schema 14, migration 20** - см. `docs/planning/R4_4_SETTLEMENT_ORDERS.md` |
| R4.5 (Family Enterprise) | Treasury-funded family enterprise, levels, seasonal income, web controls | **IMPLEMENTED LOCALLY; release pending; migration 21 additive** - см. `docs/planning/R4_5_FAMILY_ENTERPRISE.md` |

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


## STAGE 06.3 — Player Profile (deployed 2026-11-14 17:18 UTC)

- Profile hub on `/account`: Endemion ID/identity header, editable headline (48), bio (280), favourite world, visibility `public | friends | private`.
- Server-computed statistics: lives, alive/dead, generations, best age, worlds, guilds, friends, trades, shared-world contributions, chronicle entries.
- Ten badges with progress: first life, dynasty, elder, worldwalker, merchant, house founder, social, world-shaker, chronicler, lineage keeper.
- Recent lives and guild memberships, with links to play and social.
- Public profile page `/players/[id]`; public/friends/private access enforced server-side; owner email is never exposed to other players.
- Account data controls: JSON export of player/lives/sessions via `GET /api/auth/export`; irreversible account deletion with typed `DELETE` confirmation via `DELETE /api/auth/account`.
- API: `GET /api/profile/me`, `PATCH /api/profile/me`, `GET /api/profile/:playerId`.
- DB: additive migration `20261114170000_stage06_player_profile` adds `headline`, `bio`, `favorite_universe_id`, `profile_visibility`, `profile_updated_at` to `players`; save schema stays **14**.
- Verification: API e2e **154/154** (5 new profile tests); web production build PASS; profile UI e2e **2/2** desktop+mobile; account+design e2e **18/18**; full web suite 73/76 with 3 transient create-life failures in the shared full run that passed 16/16 on targeted rerun.
- Known limitations: avatar/name remain Endemion ID-owned; no avatar upload; no activity feed beyond recent lives; friend-only visibility is implemented server-side but has no dedicated browser test.

- Deployment: commit `66aab0a`, deploy run `43619988961` success; history `17:18:23Z deploy-start 66aab0a from 6eee520` → `17:18:52Z deploy 66aab0a ok`. Backup `endemion_life-manual-20261114T170958Z.dump` passed checksum, table-of-contents and trial restore: 14 migrations, 19 players, 59 lives.
- Production verification: HEAD `66aab0a`, clean tree, migrations `15`, all seven containers healthy, `/api/health` 200 DB/Redis up, `/api/profile/me` 401 unauthenticated, public `/api/profile/:id` returned `access=public`, 12 lives, 10 badges and `account=null` for a real public player.


## R1.1 — First Life Guide (deployed 2026-11-14 18:57 UTC)

- Adaptive guide at the top of the life desk: chapter title, concrete next action, life goal/progress, first-life checklist.
- Checklist is local-only per life: first decision, adulthood, dossier opened; it can be hidden.
- No save schema, API or database changes.
- Files: `apps/web/src/components/play/life-guide.tsx`, `apps/web/src/components/play/life-guide.test.tsx`, `apps/web/e2e/guide.spec.ts`, `play-screen.tsx`.
- Verification: web unit **30/30**, guide e2e **2/2**, game+design e2e **44/44**, production build PASS, typecheck PASS.
- Master plan for the wider program: `docs/planning/GAME_IMPROVEMENT_MASTER_PLAN.md`.

- Deployment: commit `68b4390`, Deploy run `43629174412` success; history `18:57:24Z deploy-start 68b4390 from f1a829f` → `18:57:53Z deploy 68b4390 ok`.
- Production verification: HEAD `68b4390`, clean tree, seven healthy containers, `/api/health` 200 DB/Redis up, `/play/:id` 200, CSP active.


## R1.2 — First-life analytics (deployed 2026-11-15)

- Client signal: `POST /api/insights/guide` with `{ lifeId, event }`; events `view | advance | event | dossier | dismiss`.
- The server checks life ownership, reads world and age from the database, and deduplicates by `lifeId:event:age`.
- No names, emails, free-form text or IP are stored in the signal. Failure never blocks play.
- Server-derived funnel: `GET /api/insights/funnel?days=30`, ops-only via `x-live-ops`.
- Counts: lives created, distinct players, reached age 18, made at least one decision, completed life, continued lineage; guide counters and per-world creation counts.
- Admin `/insights` now loads the funnel alongside the existing facts summary.
- No save schema change and no database migration; guide facts use the existing 90-day `insights` table.
- Verification: API e2e **156/156**, new R1.2 API tests **2/2**, game-core **775/775**, web **30/30**, guide/design e2e **14/14**, typecheck PASS, build PASS, lint 0 errors (pre-existing `play-screen.tsx:175` warning).
- Known limitation: `LIVE_OPS_TOKEN` is absent from production compose by default, so the funnel UI remains closed until the token is supplied.
- Deployment: commits `24bd586` + `fa85733`, CI 43633271755 success, Security 43633271915 success, Deploy 43633594162 success; history `19:56:11Z deploy-start fa85733 from 84db808` → `19:56:39Z deploy fa85733 ok`; backup `endemion_life-manual-20261114T193932Z.dump` trial-restored; production `/api/health` 200 and play page 200.


## R2.1 — Player Families (deployed 2026-11-14 21:05 UTC)

- Account-level family foundation on `/social`: create a family in a universe, public or invite-only visibility, motto, description, members, roles (leader/elder/member), invitations with explicit consent, accept/decline, leave, kick, leadership transfer and disband.
- One family per player per universe; unique family name per universe; cap 30 members; leader cannot leave while the family has other members.
- Audit log records create, update, invite, accept, leave, kick, transfer and disband.
- API: `GET/POST /api/families`, `GET/PATCH /api/families/:id`, invite/accept/decline/leave/kick/transfer/disband and `GET /api/families/:id/audit`; all account-only.
- DB migration **16** `20261115120000_r2_1_families`: `families`, `family_members`, `family_invites`, `family_audits`; additive only. Save schema stays **14**.
- Web: `family-panel.tsx` on `/social`; RU/EN; guest CTA; no horizontal overflow.
- Verification: API e2e **162/162** (6 new family tests); family UI e2e **2/2** desktop+mobile; full web e2e **79 passed, 1 skipped**; web production build PASS; typecheck PASS; targeted lint clean (root lint blocked by unrelated dirty Android/itch files).
- Deployed: CI 43639405025 success; Security success; manual Deploy 43639822446 with `allow_migrations=true` succeeded; production HEAD `5a0010a`, 16 migrations, `/api/families` 401 without a session.
- Not implemented in this slice: shared estate/treasury mechanics, cross-account inheritance, guardianship/regency, family chronicle, family chat. `treasury` and `reputation` columns exist as foundation but no transfer mechanics.
- Rollback: application rollback is safe; migration 16 is additive. Do not drop family tables during rollback.
