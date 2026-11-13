# Endemion Life — статус проекта

**Обновлено:** 2026-11-14 (STAGE 02 complete)
**Ветка:** `main`, HEAD `c280c16`
**Production:** `b634a67` — schema 8; STAGE 02 не задеплоен, previous/rollback `ca72b8b`
**origin/main:** `c280c16`
**Рабочее дерево:** только незакоммиченная portal-интеграция (`.env.example`, `app.module.ts`, `config.ts`, `apps/api/src/portal/`) и untracked Stage 11 reports/docx. Подробности — `docs/stage-01/REPOSITORY_PROVENANCE.md`.

## Текущий статус

STAGE 01 (Core Stabilization) реализован, проверен, **закоммичен и запушен**: `d19be69`, `cd2e6a9`, `3fe71aa`, `b634a67`. CI и Security на `3fe71aa` — **success**. Production обновлён до `b634a67`; серверная история: `deploy b634a67 ok from ca72b8b`. GitHub Deploy run 43426512519 показывает failure на пост-деплой/отчётном шаге, лог недоступен (404 BlobNotFound); это не отменяет успешный серверный деплой и проверенный health. Portal-интеграция (`apps/api/src/portal/`, `PORTAL_*`) остаётся вне релиза до решения владельца продукта.

| Этап | Название | Статус |
|------|----------|--------|
| STAGE 00 | Complete Project Audit | завершён, отчёты в `docs/audit/` |
| STAGE 01 (исторический) | Life Experience Upgrade | завершён |
| STAGE 02–09 | Living world, dynasty, social, economy, region | завершены |
| STAGE 10–16 | Mastery, live windows, insights | реализованы в production |
| STAGE 11.x | Portal integration | только локально, решение не принято |
| STAGE 01 (стабилизация) | Core Stabilization | **COMPLETED WITH BLOCKERS** — см. `docs/stage-01/STAGE_01_REPORT.md` |
| STAGE 02 (Advanced Life Simulation) | Health, education/career, household/property/business, travel, creation agency, balance/soak | **COMPLETE в репозитории; не задеплоен**. См. `docs/stage-02/STAGE_02_6_REPORT.md` |

## STAGE 02 — Advanced Life Simulation

STAGE 02.1–02.6 реализованы, проверены и запушены. HEAD `c280c16`; `SAVE_SCHEMA_VERSION = 13`. Production остаётся на `b634a67` schema 8: Deploy для `c280c16` ожидает approval и не одобрен.

- Health/illness/injury/cause of death; schema 9.
- Education and career ladder; schema 10.
- Household/property/business; schema 11.
- Travel between existing settlements; schema 12.
- Upbringing packages and limited point-buy; schema 13.
- Deterministic 1008-life soak: no negative wealth, no NaN, state max 78.2 KiB, 74-year median death age.
- Полный soak: `ENDEMION_FULL_SOAK=1` в `packages/game-core/test/stage02-balance-soak.test.ts`.

## Проверено в STAGE 01

- game-core: **610/610** тестов
- API unit: **74/74**
- shared: **12/12**
- API e2e: **111/111**
- Web Playwright: **62/62** (desktop + Pixel 7)
- TypeScript, lint, production web build: без ошибок
- Android: debug APK и unsigned release AAB собраны (JDK 21, SDK 36)
- CSP, HSTS, mobile overflow 320/390/412: проверены

## Технические детали

- `SAVE_SCHEMA_VERSION = 8`; схема сохранения в STAGE 01 не менялась.
- Совместимость форматов 1–8 сохраняется; добавлены проверки форматов 5–8.
- API: порт 4000; web: 3000. Локальный режим остаётся запасным для web, но **не создаёт новые жизни в Android-оболочке при недоступном API**.
- Миграции: 10 аддитивных; production backup и rollback — см. `docs/stage-01/RELEASE_READINESS.md`.
- Блокеры релиза: production deploy approval для schema 13, portal decision, Android signing/Play compliance.

## Post-release addendum (2026-11-13)

STAGE 01 stabilization is now committed and pushed: `d19be69` → `cd2e6a9` → `3fe71aa`; `origin/main` = `3fe71aa`. CI run **43425468438 — success**, Security run **43425468466 — success**. Deploy run **43426512519 — waiting for production environment approval; not approved**, so production remains `ca72b8b`.

The working tree still contains only the intentionally excluded portal wiring (`.env.example`, `apps/api/src/app.module.ts`, `apps/api/src/config.ts`), untracked `apps/api/src/portal/`, 74 Stage 11 reports, and the blueprint `.docx`. Android signing/Play compliance and portal approval remain external owner blockers. The GitHub release is complete; deployment has not been performed.

## Stage 02 addendum (2026-11-14)

STAGE 02.1–02.6 committed/pushed: `2113ab4` (health) → `875f2f1` (education/career) → `6ab3384` (household/property/business) → `fcc76f2` (travel) → `5f26f8e` (creation agency) → `c280c16` (balance/soak). CI и Security — success. Deploy для `c280c16` ожидает production approval и **не одобрен**; production остаётся `b634a67` schema 8.

Проверки Stage 02: game-core **679/679**, API e2e **118/118**, API unit **74/74**, shared **18/18**, web **20/20**; typecheck, lint, web build — PASS. Полный soak на 1008 жизней: median death 74, wealth median 240/max 2195, no negative wealth, max state 78.2 KiB. Технический долг и риски — в `docs/stage-02/BALANCE_SOAK.md` и `TECHNICAL_DEBT.md`.
