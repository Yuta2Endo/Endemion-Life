# Endemion Life — статус проекта

**Ветка:** `main`, HEAD `c7951d0` (не зафиксировано: изменения Stage 03 + Stage 04 + Stage 05 + Stage 06 + Stage 07 + Stage 08 + Stage 09).  
**Развёртывание:** только локально. В продакшн не выкладывается.

## Этапы

| Этап | Название | Статус | Отчёт |
|------|----------|--------|-------|
| STAGE 01 | Life Experience Upgrade | завершён | STAGE_01_REPORT.md |
| STAGE 02 | Living World Engine | завершён | STAGE_02_REPORT.md |
| STAGE 03 | NPC Life & Social Simulation | завершён | STAGE_03_REPORT.md |
| STAGE 04 | Family, Dynasty & Legacy Engine | завершён | STAGE_04_REPORT.md |
| STAGE 05 | Living World & Generational Continuity | завершён | STAGE_05_REPORT.md |
| STAGE 06 | World Balance, Simulation Integrity & Generational QA | завершён | STAGE_06_REPORT.md |
| STAGE 07 | Dynasty Identity, Reputation & World Recognition | завершён | STAGE_07_REPORT.md |
| STAGE 08 | Dynasty Chronicle & Action-Based Faction Relations | завершён | STAGE_08_REPORT.md |
| STAGE 09 | Living World Consequences & Faction Dynamics | завершён | STAGE_09_REPORT.md |
| STAGE 10 | — | не начат | — |

## Stage 09 (текущий)

Реализовано: две логики последствий живого мира — достижение рода укрепляет отношения с фракцией (+3…5 репутации), враждебная нить рода ослабляет процветание одного поселения (−5); обе детерминированы, однократны, ограничены [-30, 30]; не дублируют Stage 05–08 системы; тесты, документация. Схема сохранения не меняется (SAVE_SCHEMA_VERSION = 8).  
Не реализовано (по плану, не блокирует): дифференциация влияния рода по конкретным действиям beyond существующих достижений/нитей — перенесено на STAGE 10+.

## Проверки

- game-core: 31 файлов / 395 тестов — пройдено
- API: 18 тестов — пройдено
- E2E (game.spec.ts, legacy.spec.ts): 36/36 — пройдено
- TypeScript (game-core, web, api): без ошибок
- Сборка пакетов и веба: прошла
- Lint: без ошибок

## Технические детали

- `SAVE_SCHEMA_VERSION = 8` (изменений схемы в Stage 04 не требуется)
- Порт API: 4000, веб: 3000; локальный режимlocalStorage сохранён как запасной
