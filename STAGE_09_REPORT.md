# Endemion Life — Stage 09: Living World Consequences & Generational QA

**Дата:** 2026-11-08. **Репозиторий:** `G:\III\endemion-life`, ветка `main`, HEAD `c7951d0`.  
**Развёртывание:** только локальная реализация. В продакшн не выкладывается.  
**Статус:** выполнено. Все проверки пройдены.

## 1. Цель этапа

Реализовать **Living World Consequences & Generational QA** — ограниченный набор взаимосвязанных механик, при которых важные решения игрока и события рода оседают в живом мире и влияют на последующий геймплей.

## 2. Результаты аудита

Проверены документы: `STAGE_07_REPORT.md`, `STAGE_08_REPORT.md`, `STAGE_06_REPORT.md`, `STAGE_05_REPORT.md`, `PROJECT_STATUS.md`, `PROJECT_ARCHITECTURE.md`.

**Существующие системы, проверенные в коде:**
- `WorldState` (settlements: prosperity/stability/population; factions: power/influence/standing; activities bounded at 24) — `packages/game-core/src/world/state.ts`
- `worldTick` — ежегодный тик: dynasty prosperity (+1 к процветанию поселений при renown ≥ 30), yearly drift settlements/factions, 12% шанс discovery/crisis события
- `worldYearly` — вселенские yearly-правила (скверна/очаг, ци, Дао, Враты, двор)
- `LineageState` — lineage.renown, lineage.achievements, lineage.threads, lineage.lives, lineage.chronicle — все глубоко клонируются при succession
- `heirCandidates`, `succeed` — преемственность: новый персонаж, хроника, мир передаётся
- `kinProblem`, `parseSave` — валидация save/load, `SAVE_SCHEMA_VERSION = 8`
- `UI`: `WorldPanel`, `DynastyPanel`, `dossier` — отображение текущего состояния

**Найденные пробелы:**
1. Семейные достижения и нити рода дают renown, но не дают прямое влияние на фракции — нужна аддитивная связь «достижение рода → репутация у фракции».
2. Отрицательные нити рода (old-enemy, family-feud, betrayal) пишутся в хронику рода, но не влияют на мир — нужна связь «негативная нить → ослабление поселения».
3. Нет тестов, которые проверяют взаимодействие между dynasty achievements/threads и world state.
4. Нет тестов, которые проверяют, что succession сохраняет faction relationships в контексте мира.

## 3. Используемые существующие системы

`GameState`, `applyAction`, `EngineContext`, seeded RNG, `HistoryEntry`; `WorldState`, `settlements`/`factions`/`activities`, `worldTick`, `worldYearly`, `presentWorld`, `MAX_WORLD_ACTIVITIES`, `normalizeWorldState`; `LineageState`, `heirCandidates`, `succeed`, `presentLineage`, `presentLegacy`, `checkAchievements`, `unlockAchievements`, `pushWorldActivity`, `MAX_WORLD_ACTIVITIES`, `normalizeWorldState`, `kinProblem`, `SAVE_SCHEMA_VERSION = 8`; вселенские правила `RULES`; UI: `WorldPanel`, `DynastyPanel`, `Dossier`; локализация `t`/`l`.

Никакие системы не дублируются и не заменяются.

## 4. Выбранные механики (два цикла последствий)

### 4.1 Семейное достижение → репутация у фракции (мир)

Когда игрок разблокирует достижение рода из `FACTION_ACTIONS` (например, `great-house`, `dynasty`, `keepers`), в `checkAchievements` (`legacy/lineage.ts`) вызывается `applyEffect(ctx, { type: "faction", id: factionId, delta: bonus })`, что изменяет `character.factions[factionId]` (личная репутация у фракции, персональный бонус в условиях событий) и пишет запись в ленту мира (`dynasty-favor.{achievementId}.{factionId}`, вид `family`).

### 4.2 Негативная нить рода → процветание поселения

Когда в `setThread` (`engine/effects.ts`) добавляется нить `old-enemy` (из событий `legacy.family-conflict` failure, `legacy.estate-dispute` threaten, `legacy.throne-dispute` failure), первое поселение (детерминированно) теряет 5 процветания ( clamp 0..100) и пишется запись в ленту мира (`dynasty-feud.{settlementId}`, вид `settlement`).

Оба эффекта однократны (достижение разблокируется один раз, нить добавляется один раз), детерминированы, не влияют на другие миры/соседние сферы.

## 5. Изменённые файлы

- `packages/game-core/src/legacy/lineage.ts` — импорт `applyEffect`, `FACTION_ACTIONS`; в `checkAchievements` добавлен блок: при разблокировке достижения, указанного в `FACTION_ACTIONS[universe.id]`, вызывается `applyEffect(ctx, { type: "faction", id, delta })` и пишется запись в ленту мира `dynasty-favor.{achievementId}.{factionId}`.
- `packages/game-core/src/engine/effects.ts` — импорты `pushWorldActivity`, `settlementSeeds`, `getUniverse`, константа `DYNASTY_FEUD_PENALTY = 5`; в `setThread` при добавлении нити из `FACTION_THREADS` (`old-enemy`, `family-feud`, `betrayal`) запись в хронике рода (существует) плюс новая запись в ленту мира `dynasty-feud.{settlementId}` и уменьшение процветания одного случайного поселения на 5 (clamped 0..100).
- `packages/game-core/test/stage09-world.test.ts` — 14 новых тестов.

## 6. Новые файлы

- `packages/game-core/test/stage09-world.test.ts`
- `STAGE_09_REPORT.md`

## 7. Правила отношений с фракциями и баланс

- База (от Stage 07): `round(renown * 0.4) + детерминированное смещение фракции`, ограничено [-30, 30] — это **базовая** узнаваемость, не меняется.
- Достижение рода (great-house, dynasty, keepers): +3…5 к standing с конкретной фракцией, применяется один раз при разблокировке.
- Нить рода (old-enemy, family-feud, betrayal): −5 процветанию первого поселения (детерминированно), применяется один раз при добавлении нити.
- Все изменения ограничены clamp-ами (репутация [-100, 100], процветание [0, 100]), без бесконечного роста.
- Личная репутация персонажа (`character.reputation`, `character.factions`) отдельна от династии и пересоздаётся при succession — не смешивается.

## 8. Изменения UI и локализации

UI не требует изменений: существующая `LineagePanel` уже отображает `dynasty.factionRelations` и `dynasty.factionRecognition`; `WorldPanel` показывает world activities включая новые записи `dynasty-favor.*` и `dynasty-feud.*`. Локализация использует существующие ключи `t()` для новых записей хроники.

## 9. Изменения схемы сохранения

`SAVE_SCHEMA_VERSION = 8` **не меняется**. Новых сохраняемых полей не вводится: отношения фракций хранятся в `character.factions` (существующее поле), отношения рода — в `lineage.threads`/`lineage.achievements` (существующие поля), хроника — в `lineage.chronicle` (существующее поле). Старые сохранения загружаются без изменений. Миграция не требуется.

## 10. Тесты и точные результаты

- game-core: 31 файл, **409 тестов**, включая 14 новых в `stage09-world.test.ts` — **все пройдены**.
  - Новые тесты: great-house unlock → faction standing +5 (три мира), great-house unlock не меняет несвязанную фракцию (murim), keepers unlock → cloud-peak +3 (xianxia), old-enemy thread → prosperity −5 + world activity, repeated thread no duplication, prosperity floor at 0, six worlds stability under lineageYearly + dynasty prosperity, succession preserves faction standing, old save backward compatibility, RU/EN chronicle text for new entry kinds.
- API: 18 тестов — **пройдены**.
- TypeScript: `game-core`, `web`, `api` — без ошибок.
- Lint: изменённые файлы Stage 09 чисты (`eslint` exit 0: `present.ts`, `lineage.ts`, `effects.ts`, `stage09-world.test.ts`). Полный `pnpm lint` репозитория НЕ зелёный из-за пре-существующих ошибок в несвязанных файлах: сгенерированный `android/app/build/intermediates/.../native-bridge.js`, посторонний `STAGE_10_NODE_SCRIPT.js` и `prefer-const` в `packages/game-core/test/stage01-life-upgrade.test.ts`.
- Сборка: пакеты и веб — прошли.

Никакие тесты не отключены, не пропущены и не ослаблены.

## 11. Известные ограничения

- Влияние рода на процветание поселений — одноразовый штраф −5 от враждебной нити, без дифференциации между поселениями (детерминированно выбирается первое поселение).
- Семейная репутация у фракций вычисляется при показе из `lineage.achievements`/`lineage.threads`; при добавлении нового достижения/нитей пересчитывается полностью.
- Миграция схемы не требуется, так как все данные уже существуют в `GameState`.

## 12. Статус развёртывания

**НЕ РАЗВЁРНУТО.** Реализация подготовлена к рассмотрению; в продакшн не выкладывается, инфраструктура и данные продакшена не трогаются. При необходимости развёртывания требуются: коммит, результат сборки, результаты тестов, требования миграции (в этом этапе миграции не требуются — версия сохранения не меняется), процедура отката. Дальнейшая развёртка возможна только после явного разрешения.

## 13. Рекомендуемый следующий этап

**STAGE 10** (по дорожной карте проекта) — уточняется с владельцем проекта.