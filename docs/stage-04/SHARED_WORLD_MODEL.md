# Общий мир: модель данных

## Назначение

Общий мир — серверная проекция мира вселенной, не зависящая от конкретной жизни.
Она отвечает на вопросы «какой сейчас сезон», «что происходит в поселениях», «как
изменились фракции» и «что случилось в этом сезоне».

`packages/game-core/src/world/shared.ts` остаётся чистым: без БД, сети, времени и
`Math.random`.

## `SharedWorldState`

```ts
interface SharedWorldState {
  version: 1;
  universeId: UniverseId;
  seed: string;
  season: number;            // ≥ 1
  settlements: SharedWorldSettlement[];
  factions: SharedWorldFaction[];
  events: SharedWorldEvent[]; // новые сверху, не больше 40
}
```

### Поселение

```ts
interface SharedWorldSettlement {
  id: string;
  name: LocalizedText;         // { ru, en }
  kind: SettlementKind;        // capital | city | frontier | market | sect | fortress | academy
  tags: SettlementTag[];
  wageFactor: number;          // > 0
  costFactor: number;          // > 0
  travelCost: number;          // ≥ 0
  population: number;          // 100…1 000 000
  prosperity: number;          // 0…100
  stability: number;           // 0…100
  dominantFactionId: string | null;
  goods: SharedWorldGood[];
}
```

Каталог поселений — существующие `settlementSeeds` из `world/state.ts`. Общий мир не
создаёт второй каталог: id, имена, вид, теги и коэффициенты берутся оттуда.

### Товар

```ts
interface SharedWorldGood {
  id: string;
  name: LocalizedText;
  description: LocalizedText;
  base: number;   // из economy/market.ts
  supply: number; // 0…100
  buy: number;    // выводится из base и supply
  sell: number;   // выводится из base и supply
}
```

Цены общего мира **не связаны** с рынком отдельной жизни:

```text
supplyFactor = 0.8 + (100 − supply) × 0.004      // 0.8…1.2
buy          = max(1, ceil(base × supplyFactor × 1.2))
sell         = max(0, floor(base × supplyFactor × 0.7))
```

При любом запасе `buy > sell`.

### Фракция

```ts
interface SharedWorldFaction {
  id: string;
  name: LocalizedText;
  power: number;      // 0…100
  influence: number;  // −100…100
  standing: number;   // −100…100
}
```

Каталог фракций — `universe.factions`.

### Событие

```ts
interface SharedWorldEvent {
  id: string;
  season: number;
  kind: "trade" | "politics" | "crisis" | "discovery" | "festival" | "unrest" | "admin";
  title: LocalizedText;
  text: LocalizedText;
  settlementId?: string;
  factionId?: string;
  severity: number; // 1…5
}
```

В состоянии хранятся 40 последних событий (`MAX_SHARED_WORLD_EVENTS`). В таблице
`world_events` остаются все события всех сезонов.

## Начальное состояние

`newSharedWorld(universeId, seed = sharedWorldSeed(universeId))`:

- три поселения из каталога вселенной;
- по три товара в каждом поселении;
- стартовые население/процветание/стабильность/сила/влияние/репутация берутся из
  `newWorldState(universe)`;
- начальный запас товара детерминирован индексом поселения и товара;
- сезон 1, событий нет.

`sharedWorldSeed(universeId) = "shared:<universeId>:v1"`. Поэтому ленивое создание
всегда даёт одинаковый мир.

## Команды

```ts
type SharedWorldCommand =
  | { type: "tick" }
  | { type: "event"; kind; title; text; settlementId?; factionId?; severity; id? }
  | { type: "settlement"; settlementId; population?; prosperity?; stability?; dominantFactionId? }
  | { type: "faction"; factionId; power?; influence?; standing? };
```

- `tick` — единственная команда, которая меняет сезон.
- `event`, `settlement`, `faction` — правки администратора. Сезон не меняется.
- Неизвестное поселение/фракция в engine-команде — no-op; API проверяет цель и отвечает
  404, чтобы ошибка не попала в журнал.
- Числа в engine зажимаются, в API дополнительно проверяются zod-схемой (400).

## Контрольная сумма

`sharedWorldChecksum(state)` — 32 hex-символа от канонического JSON:

- фиксированный порядок полей;
- поселения, фракции и товары отсортированы по id;
- теги отсортированы;
- события сохраняют порядок (новые сверху);
- нечисловые/бесконечные значения — ошибка `INVALID_SAVE`.

Это отпечаток для обнаружения дрейфа, **не** криптографическая подпись.

`canonicalSharedWorldJson(state)` возвращает ту же каноническую строку.

## Проверка формы

`validateSharedWorldState(value)` → `{ ok, problems[] }`.
`parseSharedWorldState(value)` / `parseSharedWorld(value)` → состояние или
`GameRuleError("INVALID_SAVE")`.

Проверяются: версия, вселенная, seed, сезон, уникальность id, каталоги, локализация,
диапазоны, ссылки событий на существующие поселения/фракции, лимит событий,
`buy > sell`.

## Сверка

`reconcileSharedWorld(shared, perLifeWorld)` сравнивает одно состояние жизни
(`WorldState` из game-core) с общим миром. Допуски:

- население: ±20% (не меньше ±50);
- процветание и стабильность: ±15;
- сила/влияние/репутация фракции: ±20;
- доминирующая фракция должна совпадать.

Ответ содержит `total/aligned/drifted/missing` и до трёх примеров на секцию. В примерах
только id и локализованное имя поселения/фракции, числовые расхождения и флаг
доминирующей фракции. Игрок, жизнь и seed не попадают в сверку.

## Инварианты

1. Один `World` на `universeId`.
2. Один снимок на `(worldId, season)`.
3. Одна строка проекции на `(worldId, settlementId)` и `(worldId, factionId)`.
4. `World.season === World.state.season`, `World.checksum === sharedWorldChecksum(state)`.
5. `world_events.id` детерминирован и уникален (в id входит вселенная).
6. `world_commands.seq` растёт без пропусков в пределах мира.
7. Ни одна операция жизни не пишет в таблицы `worlds*`, `settlements`, `factions`.
