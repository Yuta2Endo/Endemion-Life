# Endemion Life — статус проекта

**Обновлено:** 2026-11-13 (STAGE 01 stabilization)
**Ветка:** `main`, HEAD `cda9a39`
**Production:** `ca72b8b` (release 04.5.4), проверено в STAGE 00
**origin/main:** `c7951d0` — production-коммиты ещё не отправлены в GitHub
**Рабочее дерево:** изменено (STAGE 01 stabilization + незакоммиченная portal-интеграция). Подробности — `docs/stage-01/REPOSITORY_PROVENANCE.md`.

## Текущий статус

STAGE 01 (Core Stabilization) реализован и проверен локально. Изменения **не закоммичены и не развёрнуты**. Portal-интеграция (`apps/api/src/portal/`, `PORTAL_*`) остаётся вне релиза до решения владельца продукта. Production не изменялся.

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
