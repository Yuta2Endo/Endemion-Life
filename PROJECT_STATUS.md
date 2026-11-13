# Endemion Life — статус проекта

**Обновлено:** 2026-11-14 (STAGE 02 deployed)  
**Ветка:** `main`  
**Код Stage 02:** `c280c16`<br>
**Release/docs commit:** `0feb6d9`<br>
**Production:** STAGE 02, save schema **13**, deployed 2026-11-13 18:59 UTC<br>
**Production HEAD:** `0feb6d9` (code `c280c16`)<br>
**Rollback:** `8fd0dfc` или `c280c16` (schema 13). `ca72b8b` — только вместе с восстановлением БД из backup.<br>
**Рабочее дерево:** незакоммиченные portal-интеграция (`.env.example`, `app.module.ts`, `config.ts`, `apps/api/src/portal/`) и Stage 03.1–03.5 (schema 14); untracked Stage 11 reports/docx. Подробности — `docs/stage-01/REPOSITORY_PROVENANCE.md`.

**Stage 03 (2026-11-14):** реализован и проверен в рабочем дереве на `0feb6d9`; **не закоммичен и не развёрнут**. Production остаётся STAGE 02, schema 13. См. `docs/stage-03/STAGE_03_REPORT.md` и `docs/stage-03/RELEASE_RECORD.md`.

## Текущий статус

STAGE 00 (аудит), STAGE 01 (стабилизация) и STAGE 02 (Advanced Life Simulation) завершены. STAGE 02 развёрнут в production: сохранения schema 13, все шесть миров, здоровье, образование/карьера, жильё/бизнес, путешествия и создание персонажа.

Production проверен 2026-11-13 после деплоя:

- `/api/health` — HTTP 200, database/redis up;
- `/worlds` — HTTP 200;
- `/api/universes` — HTTP 200, все шесть миров;
- CSP активен, контейнеры api/web/nginx healthy;
- ошибок `INVALID_SAVE`/migration в логах не обнаружено;
- schema 9 жизни читаются кодом schema 13; новые schema 13 записи появятся после действий игроков.

| Этап | Название | Статус |
|------|----------|--------|
| STAGE 00 | Complete Project Audit | завершён, отчёты в `docs/audit/` |
| STAGE 01 (исторический) | Life Experience Upgrade | завершён |
| STAGE 02–09 | Living world, dynasty, social, economy, region | завершены |
| STAGE 10–16 | Mastery, live windows, insights | реализованы в production |
| STAGE 11.x | Portal integration | только локально, решение не принято |
| STAGE 01 (стабилизация) | Core Stabilization | **COMPLETED WITH BLOCKERS** — см. `docs/stage-01/STAGE_01_REPORT.md` |
| STAGE 02 (Advanced Life Simulation) | Health, education/career, household/property/business, travel, creation agency, balance/soak | **COMPLETE; deployed, schema 13** — см. `docs/stage-02/RELEASE_RECORD.md` |
| STAGE 03 (Dynasty & Legacy) | Relics, continuity, heir agency, six laws, long-run soak | **COMPLETE LOCALLY; schema 14; not committed/deployed** — см. `docs/stage-03/STAGE_03_REPORT.md` |

## STAGE 02 — Advanced Life Simulation

STAGE 02.1–02.6 реализованы, проверены, запушены и развёрнуты. `SAVE_SCHEMA_VERSION = 13`.

- Health/illness/injury/cause of death; schema 9.
- Education and career ladder; schema 10.
- Household/property/business; schema 11.
- Travel between existing settlements; schema 12.
- Upbringing packages and limited point-buy; schema 13.
- Deterministic 1008-life soak: no negative wealth, no NaN, state max 78.2 KiB, 74-year median death age.
- Полный soak: `ENDEMION_FULL_SOAK=1` в `packages/game-core/test/stage02-balance-soak.test.ts`.

## STAGE 03 — Dynasty & Legacy (локально, 2026-11-14)

STAGE 03.1–03.5 реализованы и проверены в рабочем дереве на `0feb6d9`. **Не закоммичены и не развёрнуты**; production остаётся STAGE 02, schema 13. `SAVE_SCHEMA_VERSION = 14`, миграция 13 → 14 additive.

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
- Stage 03 не выкачен: production schema 13, код `c280c16` / docs `0feb6d9`.

## Проверки (снимок Stage 02)

- game-core: **679/679**
- API unit: **74/74**
- shared: **18/18**
- API e2e: **118/118**
- web: **20/20**
- TypeScript, lint, production web build: PASS
- CI и Security на `0feb6d9`: **success**
- Android: debug APK и unsigned release AAB собраны (JDK 21, SDK 36); signing/Play submission не завершены

## Технические детали

- Production `SAVE_SCHEMA_VERSION = 13`; в рабочем дереве Stage 03 — **14**. Совместимость форматов 1–14 сохраняется через аддитивные миграции.
- API: порт 4000; web: 3000. Локальный режим остаётся запасным для web, но **не создаёт новые жизни в Android-оболочке при недоступном API**.
- Импорт проверяет schema через `SAVE_SCHEMA_VERSION`, а не через захардкоженное значение.
- DB migrations: 10 аддитивных; schema 13 — это формат JSON-сохранения, а не новая DB-миграция.
- Production backup перед деплоем: `endemion_life-manual-20261113T184449Z.dump` (10.3 MB), полный trial restore прошёл: 18 players, 45 lives, 1,716 snapshots, 8,344 history, 5,610 actions.
- Rollback: `c280c16` безопасен (schema 13). `ca72b8b` не читает schema >8; откат на него требует восстановления БД из backup и потери действий после backup.
- GitHub: 2 moderate Dependabot alerts.

## Deployment history

Все Stage 02 коммиты были развёрнуты последовательно 2026-11-13:

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

`history.log`: `current=0feb6d9`, `previous=8fd0dfc`; PostgreSQL/Redis/backup/monitor остаются на прежних контейнерах.

## Открытые блокеры

- Portal integration: решение владельца, код вне релиза.
- Android: release signing, Play Console listing, data-safety/account-deletion compliance.
- 2 moderate Dependabot alerts.
- Баланс: бизнес слишком редко проваливается (1.4%), murim имеет тяжёлый нижний хвост смертности, доступ к education tier 2+ сильно различается по мирам.
- Stage 03: локально готов и проверен, но не закоммичен и не развёрнут; нужно отдельное решение владельца. Естественное вымирание рода 76,7% — балансовый риск.
- Rollback на schema 8 невозможен без восстановления БД из backup.
