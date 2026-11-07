# Endemion Life — Stage 01 Report

**Статус:** реализовано и выложено в production  
**Последнее обновление:** 2026-11-07  
**Production:** <https://life.endemion.online>  
**Текущий релиз:** `1c5bb41616cdeb4d916ee6349a9a16d3f1e34f28`  
**Предыдущий релиз для rollback:** `4f3f91bf1c5b64e9851a8b57347b481909f34ce3`

## 1. Итог Stage 01

Stage 01 расширил базовую механику одной жизни до полноценного жизненного опыта:

- игрок может выбрать степень автоматизации продвижения жизни;
- возрастные milestones используют существующий narrative engine;
- история жизни представляется как хроника поверх существующего `HistoryEntry`;
- отложенные consequences сохраняют связь с решением, которое их вызвало;
- живая жизнь имеет current summary;
- завершённая жизнь имеет расширенный final summary;
- timeline показывает решения, последствия и provenance;
- milestone ages настроены для всех шести миров;
- сервер остаётся authoritative для облачной игры;
- старые saves остаются совместимыми.

Отдельный второй event engine, отдельная база хроники или второй источник истины не создавались. Хроника строится projection-функцией `toLifeChronicle` из уже сохраняемой истории.

## 2. Реализованные функции

### 2.1. Режимы продвижения жизни

Добавлены три режима:

| Режим | Поведение |
| --- | --- |
| `manual` | обычное ручное продвижение; автоматические milestone-паузы не создаются |
| `auto` | жизнь продвигается автоматически через обычный `advance`, milestones проходят без отдельной остановки |
| `milestones` | жизнь останавливается на возрастных рубежах и ждёт выбора игрока |

Состояние режима хранится в `GameState`, передаётся через `LifeView` и сохраняется в cloud/local store.

UI-компонент: `apps/web/src/components/play/auto-life-controls.tsx`.

### 2.2. Age milestones

Milestones интегрированы в существующий поток:

```text
advance → pending event → presentEvent → choose → applyAction
```

Каждый milestone:

- имеет возраст и event id `milestone.<age>`;
- создаёт обычное pending event;
- предлагает выборы;
- применяет обычные effects;
- попадает в `HistoryEntry` и `memory`;
- не создаётся повторно после прохождения;
- фильтруется по lifespan персонажа.

Для всех шести миров заданы явные milestone-конфигурации:

- academy;
- dark-fantasy;
- hunter;
- isekai;
- murim;
- xianxia.

Сами тексты milestone-событий остаются общими age-based narrative definitions, а доступные возраста задаются конфигурацией мира.

### 2.3. Life chronicle

Добавлена projection-модель `LifeChronicleEntry` в:

```text
packages/game-core/src/life/chronicle.ts
```

Она предоставляет:

- category;
- importance;
- decision;
- consequence;
- связанные изменения и персонажей;
- `sourceEventId`;
- `consequenceOf`;
- ссылку на исходный `HistoryEntry`.

Хроника не хранится отдельной таблицей. Источником остаётся PostgreSQL/localStorage history с существующей пагинацией и rollback-поведением.

### 2.4. Provenance delayed consequences

Для delayed consequence теперь сохраняется цепочка:

```text
решение игрока → ConsequenceState.source → HistoryEntry.sourceEventId → LifeChronicleEntry.consequenceOf
```

В timeline consequence показывает, каким решением он был вызван.

Это сохраняет смысл долгосрочных последствий: игрок видит не только изменение ресурсов через несколько лет, но и связь с предыдущим выбором.

### 2.5. Current-life summary

Для живой жизни добавлено `CurrentLifeSummaryView`.

Summary показывает:

- имя и мир;
- текущий возраст и lifespan;
- жизненный этап;
- профессию;
- wealth, reputation и karma;
- level;
- количество живых людей рядом;
- последние значимые решения;
- число ожидающих delayed consequences;
- прогресс milestones и следующий milestone.

Projection строится сервером и локальным store одинаково через `presentLegacy`.

### 2.6. Final summary

Для завершённой жизни сохранён существующий final summary и расширена общая модель legacy view. Финальный экран продолжает показывать:

- score и title;
- прожитый возраст и причину смерти;
- профессию и социальное положение;
- семью и отношения;
- ключевые решения;
- влияние на мир;
- achievements;
- threads и наследников;
- выбор продолжения рода.

Current summary и final summary используют один компонент `LifeSummary`, но показываются в соответствующих состояниях жизни.

### 2.7. Timeline UI

Timeline поддерживает:

- категории хроники;
- age labels;
- выбор записи;
- detail/inspection state;
- responsive layout;
- загрузку более ранних записей;
- отображение decisions и checks;
- отображение provenance delayed consequences;
- empty state;
- RU/EN labels.

Основные файлы:

- `apps/web/src/components/play/timeline.tsx`;
- `apps/web/src/components/play/life-summary.tsx`;
- `apps/web/src/components/play/play-screen.tsx`;
- `apps/web/src/lib/messages.ts`.

## 3. Server/shared integration

Сервер продолжает выполнять действия через существующий authoritative pipeline:

```text
API → LivesService → applyAction → persisted GameState + HistoryEntry
```

Изменения не требуют отдельной миграции базы:

- новые поля `HistoryEntry` optional;
- save schema остался `8`;
- старые saves нормализуются на границе action/presentation;
- существующие `HistoryEntry.data` остаются совместимыми;
- API history сохраняет прежнюю pagination contract.

Import schema расширен optional-полями provenance, чтобы старые локальные истории продолжали приниматься.

## 4. Тесты и проверки

### Game core

Команда:

```bash
pnpm --filter @endemion/game-core test
```

Результат на последнем релизе:

```text
24 test files passed
315 tests passed
```

Включая проверки:

- persistence progression mode;
- backward-compatible save parsing;
- milestone pending event flow;
- auto vs milestones behavior;
- chronicle projection;
- delayed consequence scheduling;
- delayed consequence provenance;
- lifespan filtering;
- world content integrity.

### TypeScript

Команда:

```bash
pnpm -r typecheck
```

Результат: успешно для `game-core`, `shared`, `web`, `api`, `database` и `ui`.

### Production build

Проверены:

```bash
pnpm --filter @endemion/game-core build
pnpm --filter @endemion/shared build
pnpm --filter @endemion/web build
```

Также production Docker images собраны для:

- `migrate`;
- `api`;
- `web`;
- `nginx`.

Каждый image проверен label:

```text
org.opencontainers.image.revision=1c5bb41616cdeb4d916ee6349a9a16d3f1e34f28
```

## 5. Production deployment

Релиз опубликован через ограниченный SSH gateway.

Перед deployment:

- создан backup PostgreSQL;
- новых миграций не было;
- инфраструктурные compose-файлы не менялись;
- загружены четыре image;
- загружен git bundle с commit release.

После deployment:

- `migrate` завершился успешно;
- `api` healthy;
- `web` healthy;
- `nginx` healthy;
- `postgres` healthy;
- `redis` healthy.

Внешний health-check прошёл:

```text
OK /api/health status=ok
OK /
OK /worlds
OK /api/universes
```

Production сейчас работает на commit `1c5bb41616cdeb4d916ee6349a9a16d3f1e34f28`.

## 6. Изменённые ключевые файлы

### Game core

- `packages/game-core/src/types.ts`;
- `packages/game-core/src/engine/game.ts`;
- `packages/game-core/src/narrative/consequences.ts`;
- `packages/game-core/src/life/chronicle.ts`;
- `packages/game-core/src/life/milestones.ts`;
- `packages/game-core/src/legacy/present.ts`;
- `packages/game-core/src/world/rules.ts`;
- milestone configurations in `packages/game-core/src/universes/*.ts`.

### Shared/API contract

- `packages/shared/src/schemas.ts`;
- existing `LifeView`/history contract reused without a new persistence source.

### Web

- `apps/web/src/components/play/auto-life-controls.tsx`;
- `apps/web/src/components/play/life-summary.tsx`;
- `apps/web/src/components/play/play-screen.tsx`;
- `apps/web/src/components/play/timeline.tsx`;
- `apps/web/src/lib/messages.ts`.

## 7. Commits

### Foundation

```text
4f3f91bf1c5b64e9851a8b57347b481909f34ce3
Add life progression modes and chronicle milestones
```

### Completion

```text
1c5bb41616cdeb4d916ee6349a9a16d3f1e34f28
Complete life chronicle summaries and provenance
```

## 8. Оставшиеся follow-up задачи

Stage 01 production scope завершён. Остались задачи качества и синхронизации:

1. Добавить отдельные Playwright E2E-сценарии для новых UI-функций:
   - переключение progression modes;
   - milestone flow;
   - current summary;
   - timeline provenance;
   - responsive timeline inspection.
2. Синхронизировать два локальных Stage 01 commit с `origin/main`.
3. Не включать в этот релиз пользовательские удаления stage-документов и untracked Android/asset-файлы.
4. После E2E-проверок перейти к следующему согласованному этапу — улучшению lineage/legacy UX или Android-порту.

## 9. Rollback

Для возврата к предыдущему production-релизу сохранён:

```text
4f3f91bf1c5b64e9851a8b57347b481909f34ce3
```

Серверный deployment script автоматически создаёт backup и проверяет health после переключения релиза.
