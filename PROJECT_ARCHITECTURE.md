# Endemion Life — архитектура проекта

## Стек

- `packages/game-core` — игровое ядро (TS, Vitest):生成 персонажа, годовый цикл, события, NPC, мир, экономика, рынок, мастерство, род и наследование.
- `packages/shared` — представления API (`LifeView`, `LineageView`, `SuccessionResponse` и др.).
- `packages/database` — Prisma + миграции (PostgreSQL).
- `apps/api` — NestJS API: жизни, действия, наследование, импорт, авторизация.
- `apps/web` — Next.js (App Router, Playwright E2E): игровой экран, досье, род, список жизней.
- `apps/android` — Capacitor обёртка (не в фокусе Stage 09).

## Основные модули game-core

- `character/` — генератор, характеристики, таланты, навыки, социальные связи NPC, собственная жизнь NPC.
- `family/kin.ts` — граф родства (родители, супруг), вычисление отношений, валидация `kinProblem`.
- `family/events.ts` — рождение, брак, развод, смерть, усыновление, наследование имущества NPC, хроника.
- `legacy/` — законы наследования, преемственность `succeed`, хроника рода, итог жизни `scoreLife`, достижения рода, сюжеты поколений, представления `present.ts`, идентичность рода и узнаваемость у фракций (Stage 07), действие-зависимые отношения с фракциями и вехи рода в хронике (Stage 08).
- `engine/game.ts` — acciones, год, смерть, конец жизни.
- `engine/save.ts` — парсинг и валидация сохранений (включая родство и формат LineageState).
- `world/state.ts` — состояние мира, поселения, фракции, лента событий, `worldTick`, влияние рода на процветание поселений (`DYNASTY_PROSPERITY_RENOWN`, Stage 05), пороги признания рода (`DYNASTY_RENOWN_RECONIZED` / `DYNASTY_RENOWN_DISGRACED`, Stage 07).
- `rng.ts` — детерминированный `hashSeed`/`Rng`.
- `engine/view.ts` — представления событий и персонажа, флаг `isMilestone` для возрастных рубежей (Stage 06).
- `life/milestones.ts` — возрастные рубежи, `milestoneAt`, `isMilestoneEvent`, `milestoneEvent` (Stage 01/06).

## Поток данных преемственности (Stage 04)

Смерть персонажа → `ending()` → `finishLife()` (итог жизни в `lineage.lives`, хроника) → экран смерти → игрок выбирает наследника → `succeed()` (сервер: транзакция + `actionId`; локально: дедупликация по `actionId`) → новая жизнь наследника с записью о продолжении рода в ленте мира, предыдущая закрыта как `previous`, хроника рода передаётся целиком.

## Сохранения

Одиночный JSON-объект `GameState`, версия `SAVE_SCHEMA_VERSION = 8`, валидация при парсинге (`parseSave`/`migrateSave`), старые форматы мигрируются без потери данных.

## Локализация

RU/EN через `apps/web/src/lib/messages.ts` и `packages/game-core/src/i18n.ts`.
