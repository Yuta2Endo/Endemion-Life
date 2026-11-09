# Endemion Life — Stage 10: Аудит валидации симуляции мира

**Дата:** 2026-11-08. **Репозиторий:** `G:\III\endemion-life`, ветка `main`, HEAD `c7951d0`.
**Тип этапа:** аудит интеграции + регрессия + минимальные корректировки. Не новый функционал.
**Развёртывание:** запрещено. **Commit / Push:** не выполнялись.

## 1. Метод

Проверены документы `STAGE_01_REPORT.md`, `PROJECT_STATUS.md`, `PROJECT_ARCHITECTURE.md`, отчёты `STAGE_05..09_REPORT.md`; затем — фактический код и тесты. Все пути и имена проверены в репозитории.

Примечание о нумерации: внутренний `stage10-mastery.test.ts` в репозитории относится к другой теме (освоение мира/мастерство). Этот этап — именно **валидация симуляции мира после Stage 09**, согласно заданию. Посторонних itch.io-артефактов не обнаружено.

## 2. Проверенные системы

- `packages/game-core/src/world/state.ts` — `WorldState`, `worldTick`, `normalizeWorldState`, `pushWorldActivity`, `MAX_WORLD_ACTIVITIES`, `DYNASTY_PROSPERITY_RENOWN`, `DYNASTY_RENOWN_RECOGNIZED/DISGRACED`.
- `packages/game-core/src/engine/effects.ts` — `setThread`, `FACTION_THREADS`, `DYNASTY_FEUD_PENALTY`, `changeFaction` (`FACTION_LIMIT = 100`).
- `packages/game-core/src/legacy/lineage.ts` — `checkAchievements`, применение `FACTION_ACTIONS`, хроника `faction`/`milestone`, `DYNASTY_FEED_IDS`, `DYNASTY_MILESTONE_IDS`.
- `packages/game-core/src/legacy/present.ts` — `FACTION_ACTIONS`, `dynastyIdentity`, `factionRecognition`, `dynastyFactionRelations`, `presentLineage`.
- `packages/game-core/src/legacy/achievements.ts` — `unlockAchievements` (возвращает только новые достижения).
- `packages/game-core/src/legacy/succession.ts` — перенос мира наследнику, пересчёт `character.factions`.
- `packages/game-core/src/engine/game.ts`, `save.ts` — `SAVE_SCHEMA_VERSION = 8`, `migrateSave`, `parseSave`, миграции v1..v7.
- Тесты `stage05..09`, `stage10-mastery`, `save`, `stage02` — регрессионная база.

## 3. Карта интеграции Stage 09

| Механика | Источник | Потребители | Однократность |
|---|---|---|---|
| Достижение рода → репутация персонажа у фракции | `FACTION_ACTIONS` + `checkAchievements` (`legacy/lineage.ts:91-107`) | `character.factions`, лента мира `dynasty-favor.*` | Да: `unlockAchievements` возвращает только новые; достижение хранится в `lineage.achievements` |
| Враждебная нить → процветание поселения | `setThread` (`engine/effects.ts:246-265`) | `world.settlements[0].prosperity`, хроника `faction`, лента `dynasty-feud.*` | Да: нить добавляется при `index === -1`, повторный вызов не срабатывает |
| Высокая слава → рост поселений | `worldTick` (`world/state.ts:146-160`) | все поселения `+1` процветание, лента `dynasty-prosperity.*` | Ежегодно (задумано), ограничено clamp 0..100 |
| Признание/позор рода (±50) | `checkAchievements` (`legacy/lineage.ts:114-139`) | лента `dynasty-recognized.*` / `dynasty-disgraced.*` | Да: дедупликация по префиксу id активности |
| Отношение рода к фракции (производное) | `dynastyFactionRelations` (`legacy/present.ts:827-853`) | `presentLineage().dynasty.factionRelations`, UI | Не хранится: пересчитывается из `lineage`, дублей нет |

## 4. Однократность и дубли

- Достижения: `unlockAchievements` пропускает уже полученные (`have.has(id)`), поэтому бонус фракции и веха хроники применяются один раз.
- Нити: `setThread` срабатывает только при отсутствии нити и при `threads.length < MAX_THREADS`.
- Лента мира: id активностей содержат возраст/тик, но одноразовые события (favor/feud/recognized/disgraced) дедуплицируются проверками по префиксу.
- `worldTick` намеренно применяет `+1` процветания каждый год при славе ≥ 30 — это не дубль, а ежегодный дрейф, ограниченный сверху.

## 5. Сохранение / загрузка

- `SAVE_SCHEMA_VERSION = 8`; цепочка миграций v1→…→v8 (`migrateSave`).
- Stage 09 **не добавляет** сохраняемых полей: отношения фракций живут в `character.factions` (валидируется `isIntRecord(-100..100)`), отношения рода выводятся из `lineage.achievements`/`lineage.threads`, хроника — `lineage.chronicle`.
- `normalizeWorldState` отбрасывает `NaN`/`Infinity` (`Number.isFinite`), зажимает `prosperity/stability` в [0,100], `standing/influence` в [-100,100], `power` в [0,100], фильтрует битые активности, ограничивает ленту 24 записями.
- Старые сохранения без `world` читаются (покрыто `stage06-balance`: «сохранение без поля world остаётся читаемым»); при действии мир создаётся/нормализуется.
- Повышать версию схемы не требуется.

## 6. Шесть миров

| Мир (`id`) | Правила `FACTION_ACTIONS` | Фракции резолвятся | Изоляция |
|---|---|---|---|
| Academy (`academy`) | imperial-court ← great-house +5; magic-tower ← keepers +3 | да | только свои фракции |
| Ashen Kingdoms (`dark-fantasy`) | order-of-ash ← great-house +5; crown ← great-house +3 | да | только свои фракции |
| Hunter (`hunter`) | association ← dynasty +3; hanseong-corp ← great-house +5 | да | только свои фракции |
| Ardenveil (`isekai`) | merchant-league ← dynasty +3 | да | только свои фракции |
| Nine Rivers (`murim`) | orthodox-alliance ← old-enemy penalty 8 | да | только свои фракции |
| Heavenly Limit (`xianxia`) | cloud-peak ← keepers +3 | да | только свои фракции |

Все `id` фракций из `FACTION_ACTIONS` существуют в определениях соответствующих вселенных (проверено кодом и тестом `stage10-world-integration`). Глобальные `FACTION_THREADS` (`old-enemy`, `family-feud`, `betrayal`) ослабляют первое поселение в любом мире — это существующее общее правило Stage 09, а не утечка между мирами.

## 7. Найденные дефекты

Критических дефектов интеграции не обнаружено. Зафиксированы низкорисковые замечания:

1. **Дублирование порогов** `DYNASTY_RENOWN_RECOGNIZED = 50` / `DYNASTY_RENOWN_DISGRACED = -50` в `world/state.ts` (экспортируются) и локально в `present.ts` (строки ~765/767). Значения совпадают; риск расхождения при будущей правке. Код не менялся (поведение корректно).
2. **Выбор поселения для штрафа вражды** — `setThread` использует `world.settlements[0]` (детерминированно), а не случайное поселение. Это корректно и детерминированно; формулировка в `STAGE_09_REPORT.md` исправлена.
3. **`setThread` при `state.world === undefined`** уменьшает процветание временного `newWorldState`, которое не присваивается обратно; затем `pushWorldActivity` создаёт новый мир. В обычном потоке `world` всегда инициализирован; не воспроизводится на практике.
4. **Косметика теста Stage 09**: `stage09-world.test.ts` содержит BOM и mojibake в одном комментарии/названиях `describe` («в†’», «вЂ”»). Логика не затронута, тесты проходят. Не менялось, чтобы не создавать лишний шум.
5. **Пре-существующие ошибки lint вне Stage 10**: сгенерированный `android/app/build/intermediates/.../native-bridge.js` и `prefer-const` в `packages/game-core/test/stage01-life-upgrade.test.ts`. К Stage 10 не относятся.

## 8. Риски и ограничения

- Ежегодный `worldTick` при высокой славе повышает процветание всех поселений на 1 — при долгих прогонах мир «богатеет» до потолка 100 (ограничено, не дефект, но влияет на баланс).
- Отношения рода — производные от истории рода, не отдельный счётчик; при отображении пересчитываются полностью (дёшево, но не кэшируется).
- Штраф вражды не привязан к фракции/поселению конкретной нити (общий −5 первому поселению).
- Полный `pnpm lint` репозитория НЕ зелёный из-за несвязанных файлов (см. п.7.5); это не регрессия Stage 10.

## 9. Покрытие тестами

Существующие тесты уже покрывают большую часть сценариев: `stage05-world-dynasty` (влияние рода/преемственность/детерминизм), `stage06-balance` (границы, детерминизм, отсутствие `world`, миграция v6→v8), `stage07`/`stage08` (идентичность, отношения, хроника, клампы ±30, save/load), `stage09-world` (14 тестов: бонусы фракций, штраф вражды, пол 0, шесть миров, save/load, RU/EN).

Добавлен `packages/game-core/test/stage10-world-integration.test.ts` (9 тестов) на пробелы:
сосуществование нескольких последствий, нить+отношение одновременно, санитайзинг `NaN`/`Infinity`, отсутствующий `world` при тике, идемпотентность достижения, комбинированный save/load, сохранение мира и отсутствие повторного штрафа при наследовании, изоляция правил фракций по мирам, отсутствие утечки между мирами.