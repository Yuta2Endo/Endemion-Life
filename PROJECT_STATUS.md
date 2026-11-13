# Endemion Life — статус проекта

**Обновлено:** 2026-11-13 (STAGE 01 stabilization; production deploy)
**Ветка:** `main`, HEAD `b634a67`
**Production:** `b634a67` — задеплоен 2026-11-13 12:48:51 UTC, previous/rollback `ca72b8b`
**origin/main:** `b634a67`
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
- Блокеры релиза: commit/push approval, portal decision, Android signing/Play compliance, production deploy approval.

## Post-release addendum (2026-11-13)

STAGE 01 stabilization is now committed and pushed: `d19be69` → `cd2e6a9` → `3fe71aa`; `origin/main` = `3fe71aa`. CI run **43425468438 — success**, Security run **43425468466 — success**. Deploy run **43426512519 — waiting for production environment approval; not approved**, so production remains `ca72b8b`.

The working tree still contains only the intentionally excluded portal wiring (`.env.example`, `apps/api/src/app.module.ts`, `apps/api/src/config.ts`), untracked `apps/api/src/portal/`, 74 Stage 11 reports, and the blueprint `.docx`. Android signing/Play compliance and portal approval remain external owner blockers. The GitHub release is complete; deployment has not been performed.
