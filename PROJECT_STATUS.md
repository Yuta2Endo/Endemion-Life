# Endemion Life — статус проекта

**Обновлено:** 2026-11-14 (STAGE 02 deployed)  
**Ветка:** `main`  
**Код Stage 02:** `c280c16`  
**Release/docs commit:** `8fd0dfc`  
**Production:** STAGE 02, save schema **13**, deployed 2026-11-13 18:48 UTC  
**Production HEAD:** `8fd0dfc` (code `c280c16`)  
**Rollback:** `8fd0dfc` или `c280c16` (schema 13). `ca72b8b` — только вместе с восстановлением БД из backup.  
**Рабочее дерево:** только незакоммиченная portal-интеграция (`.env.example`, `app.module.ts`, `config.ts`, `apps/api/src/portal/`) и untracked Stage 11 reports/docx. Подробности — `docs/stage-01/REPOSITORY_PROVENANCE.md`.

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

## STAGE 02 — Advanced Life Simulation

STAGE 02.1–02.6 реализованы, проверены, запушены и развёрнуты. `SAVE_SCHEMA_VERSION = 13`.

- Health/illness/injury/cause of death; schema 9.
- Education and career ladder; schema 10.
- Household/property/business; schema 11.
- Travel between existing settlements; schema 12.
- Upbringing packages and limited point-buy; schema 13.
- Deterministic 1008-life soak: no negative wealth, no NaN, state max 78.2 KiB, 74-year median death age.
- Полный soak: `ENDEMION_FULL_SOAK=1` в `packages/game-core/test/stage02-balance-soak.test.ts`.

## Проверки

- game-core: **679/679**
- API unit: **74/74**
- shared: **18/18**
- API e2e: **118/118**
- web: **20/20**
- TypeScript, lint, production web build: PASS
- CI и Security на `8fd0dfc`: **success**
- Android: debug APK и unsigned release AAB собраны (JDK 21, SDK 36); signing/Play submission не завершены

## Технические детали

- `SAVE_SCHEMA_VERSION = 13`; совместимость форматов 1–13 сохраняется через аддитивные миграции.
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

`history.log`: `current=8fd0dfc`, `previous=c280c16`; PostgreSQL/Redis/backup/monitor остаются на прежних контейнерах.

## Открытые блокеры

- Portal integration: решение владельца, код вне релиза.
- Android: release signing, Play Console listing, data-safety/account-deletion compliance.
- 2 moderate Dependabot alerts.
- Баланс: бизнес слишком редко проваливается (1.4%), murim имеет тяжёлый нижний хвост смертности, доступ к education tier 2+ сильно различается по мирам.
- Rollback на schema 8 невозможен без восстановления БД из backup.
