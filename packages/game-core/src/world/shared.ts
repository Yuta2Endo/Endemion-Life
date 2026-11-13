/**
 * Stage 04 — Living Worlds: общий мир сервера.
 *
 * Это отдельная проекция, а не часть сохранения жизни. Она живёт по своим правилам:
 * сезонный tick, детерминированный от seed и номера сезона, команды администратора,
 * воспроизведение журнала команд и сверка с мирами отдельных жизней.
 *
 * Движок чистый: никаких базы, сети и времени. Одинаковый seed и одинаковые команды
 * всегда дают одинаковое состояние и одинаковую контрольную сумму.
 */
import { deepClone } from "../clone.js";
import { goodsOf } from "../economy/market.js";
import { GameRuleError } from "../errors.js";
import { fillText, t, type LocalizedText } from "../i18n.js";
import { hashSeed, Rng } from "../rng.js";
import { clamp } from "../stats.js";
import { getUniverse, isUniverseId } from "../universes/registry.js";
import type { UniverseId } from "../types.js";
import type { WorldState } from "../types.js";
import { newWorldState, settlementSeeds, SETTLEMENT_KINDS, SETTLEMENT_TAGS, type SettlementKind, type SettlementTag } from "./state.js";

/** Версия формата общего мира. Растёт только при несовместимом изменении полей */
export const SHARED_WORLD_VERSION = 1;
/** Первый сезон мира. Tick всегда увеличивает сезон ровно на один */
export const SHARED_WORLD_START_SEASON = 1;
/** Сколько последних событий хранится в состоянии. Старые события остаются в таблице WorldEvent */
export const MAX_SHARED_WORLD_EVENTS = 40;
export const SHARED_POPULATION_MIN = 100;
export const SHARED_POPULATION_MAX = 1_000_000;
export const SHARED_GOOD_SUPPLY_MIN = 0;
export const SHARED_GOOD_SUPPLY_MAX = 100;
/** Наценка лавки общего мира. Не связана с рынком отдельной жизни */
export const SHARED_BUY_MARKUP = 1.2;
/** Скидка скупщика общего мира */
export const SHARED_SELL_DISCOUNT = 0.7;

export const SHARED_WORLD_EVENT_KINDS = ["trade", "politics", "crisis", "discovery", "festival", "unrest", "admin"] as const;
export type SharedWorldEventKind = (typeof SHARED_WORLD_EVENT_KINDS)[number];

export interface SharedWorldGood {
  id: string;
  name: LocalizedText;
  description: LocalizedText;
  /** Базовая цена товара в обычный сезон */
  base: number;
  /** Запас на складе поселения, 0…100 */
  supply: number;
  /** Цена покупки, выводится из base и supply */
  buy: number;
  /** Цена продажи, выводится из base и supply */
  sell: number;
}

export interface SharedWorldSettlement {
  id: string;
  name: LocalizedText;
  kind: SettlementKind;
  tags: SettlementTag[];
  wageFactor: number;
  costFactor: number;
  travelCost: number;
  population: number;
  prosperity: number;
  stability: number;
  dominantFactionId: string | null;
  goods: SharedWorldGood[];
}

export interface SharedWorldFaction {
  id: string;
  name: LocalizedText;
  power: number;
  influence: number;
  standing: number;
}

export interface SharedWorldEvent {
  id: string;
  season: number;
  kind: SharedWorldEventKind;
  title: LocalizedText;
  text: LocalizedText;
  settlementId?: string;
  factionId?: string;
  /** 1 — местная новость, 5 — событие мирового масштаба */
  severity: number;
}

export interface SharedWorldState {
  version: number;
  universeId: UniverseId;
  seed: string;
  season: number;
  settlements: SharedWorldSettlement[];
  factions: SharedWorldFaction[];
  events: SharedWorldEvent[];
}

export interface SharedWorldEventInput {
  /** Если не задан, id выводится детерминированно из команды и состояния */
  id?: string;
  kind: SharedWorldEventKind;
  title: LocalizedText;
  text: LocalizedText;
  settlementId?: string;
  factionId?: string;
  severity: number;
}

/**
 * Команды общего мира. tick делает сезонный шаг; остальные команды — правки администратора,
 * они не двигают сезон, но попадают в журнал и проходят те же проверки.
 */
export type SharedWorldCommand =
  | { type: "tick" }
  | ({ type: "event" } & SharedWorldEventInput)
  | {
      type: "settlement";
      settlementId: string;
      population?: number;
      prosperity?: number;
      stability?: number;
      dominantFactionId?: string | null;
    }
  | {
      type: "faction";
      factionId: string;
      power?: number;
      influence?: number;
      standing?: number;
    };

interface TickEventTemplate {
  kind: SharedWorldEventKind;
  target: "settlement" | "faction";
  title: LocalizedText;
  text: LocalizedText;
  severity: number;
}

/** Событие сезона у каждого мира своё. Текст подставляет имя поселения или фракции */
const TICK_EVENT_TEMPLATES: Readonly<Record<UniverseId, readonly TickEventTemplate[]>> = {
  "dark-fantasy": [
    {
      kind: "crisis",
      target: "settlement",
      title: t("Шёпот Мглы", "Whispers in the Mist"),
      text: t("Мгла забирает людей у стен {settlement}. Стража недосчитывается патрулей.", "The Mist takes people beyond the walls of {settlement}. The watch is short of patrols."),
      severity: 3
    },
    {
      kind: "politics",
      target: "faction",
      title: t("Орден требует десятину", "The Order demands a tithe"),
      text: t("{faction} усиливает надзор над дорогами и требует десятину с обозов.", "{faction} tightens its hold on the roads and demands a tithe from caravans."),
      severity: 2
    },
    {
      kind: "discovery",
      target: "settlement",
      title: t("Находка в пепле", "A find in the ash"),
      text: t("В окрестностях {settlement} нашли старый склад, переживший падение королевства.", "An old storehouse that survived the fall of the kingdom was found near {settlement}."),
      severity: 1
    }
  ],
  isekai: [
    {
      kind: "trade",
      target: "settlement",
      title: t("Караван Системы", "A System caravan"),
      text: t("Через {settlement} прошёл караван: цены на местном рынке дрогнули.", "A caravan passed through {settlement}: prices at the local market shifted."),
      severity: 2
    },
    {
      kind: "politics",
      target: "faction",
      title: t("Гильдия меняет правила", "The Guild changes the rules"),
      text: t("{faction} объявляет новый устав для искателей и повышает взносы.", "{faction} issues a new charter for adventurers and raises its dues."),
      severity: 2
    },
    {
      kind: "discovery",
      target: "settlement",
      title: t("Подземелье открылось", "A dungeon opens"),
      text: t("У {settlement} открылся новый ярус подземелья. Искатели спешат туда.", "A new dungeon floor opened near {settlement}. Adventurers are rushing there."),
      severity: 3
    }
  ],
  murim: [
    {
      kind: "unrest",
      target: "settlement",
      title: t("Стычка школ", "A clash of schools"),
      text: t("У стен {settlement} сошлись ученики двух школ. Город замер в ожидании.", "Disciples of two schools met outside {settlement}. The city holds its breath."),
      severity: 2
    },
    {
      kind: "politics",
      target: "faction",
      title: t("Союз требует ответа", "The Alliance demands an answer"),
      text: t("{faction} собирает старейшин: от их решения зависит, кто будет охранять дороги.", "{faction} gathers the elders: their decision will determine who guards the roads."),
      severity: 3
    },
    {
      kind: "festival",
      target: "settlement",
      title: t("Чайный сезон", "Tea season"),
      text: t("В {settlement} начался чайный сезон. Купцы довольны, стража отдыхает.", "The tea season has begun in {settlement}. Merchants are pleased and the watch rests."),
      severity: 1
    }
  ],
  xianxia: [
    {
      kind: "discovery",
      target: "settlement",
      title: t("Туман над вершиной", "Mist over the peak"),
      text: t("Над {settlement} поднялся туман: старшие ищут знак нового постижения.", "Mist rose over {settlement}: the elders search for a sign of new insight."),
      severity: 2
    },
    {
      kind: "politics",
      target: "faction",
      title: t("Совет старейшин", "The council of elders"),
      text: t("{faction} созывает совет. Место у алтаря снова делят заново.", "{faction} convenes the council. The place at the altar is contested once more."),
      severity: 2
    },
    {
      kind: "crisis",
      target: "settlement",
      title: t("Искажение ци", "A qi deviation"),
      text: t("В {settlement} сбилось течение ци: лекари просят помощи у соседних школ.", "The flow of qi faltered in {settlement}: healers ask neighbouring schools for help."),
      severity: 4
    }
  ],
  hunter: [
    {
      kind: "crisis",
      target: "settlement",
      title: t("Прорыв Врат", "A Gate breaks"),
      text: t("Рядом с {settlement} открылись Врата. Ассоциация объявила набор.", "A Gate opened near {settlement}. The Association has issued a call for hunters."),
      severity: 4
    },
    {
      kind: "trade",
      target: "faction",
      title: t("Ассоциация платит", "The Association pays"),
      text: t("{faction} повышает выплаты за зачистки: желающих становится больше.", "{faction} raises raid payouts: more hunters are signing up."),
      severity: 2
    },
    {
      kind: "discovery",
      target: "settlement",
      title: t("Новый рейд", "A new raid"),
      text: t("Разведка {settlement} нашла проход, о котором молчали карты.", "Scouts from {settlement} found a passage the maps had kept silent about."),
      severity: 2
    }
  ],
  academy: [
    {
      kind: "politics",
      target: "faction",
      title: t("Скандал при дворе", "A court scandal"),
      text: t("{faction} оказалась в центре сплетен. Салоны обсуждают письма.", "{faction} is at the centre of a scandal. The salons are discussing letters."),
      severity: 3
    },
    {
      kind: "festival",
      target: "settlement",
      title: t("Бал Розы", "The Rose Ball"),
      text: t("В {settlement} дают бал. Приглашения уже разосланы.", "A ball is being held in {settlement}. The invitations are already out."),
      severity: 1
    },
    {
      kind: "discovery",
      target: "settlement",
      title: t("Запретная секция", "The forbidden section"),
      text: t("В библиотеке {settlement} нашли дверь, которой нет на плане.", "A door that is not on any plan was found in the library of {settlement}."),
      severity: 2
    }
  ]
};

/** Детерминированный seed общего мира для вселенной */
export function sharedWorldSeed(universeId: UniverseId): string {
  return `shared:${universeId}:v1`;
}

/** Множитель цены от запаса: пустой склад дороже полного. 0.8…1.2 */
export function sharedSupplyFactor(supply: number): number {
  const value = clamp(Math.round(finiteNumber(supply, 0)), SHARED_GOOD_SUPPLY_MIN, SHARED_GOOD_SUPPLY_MAX);
  return 0.8 + (SHARED_GOOD_SUPPLY_MAX - value) * 0.004;
}

/** Цены общего мира выводятся только из base и supply; рынок жизни на них не влияет */
export function sharedGoodPrices(base: number, supply: number): { buy: number; sell: number } {
  const factor = sharedSupplyFactor(supply);
  const priceBase = Math.max(1, finiteNumber(base, 1));
  return {
    buy: Math.max(1, Math.ceil(priceBase * factor * SHARED_BUY_MARKUP)),
    sell: Math.max(0, Math.floor(priceBase * factor * SHARED_SELL_DISCOUNT))
  };
}

function finiteNumber(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function initialSupply(settlementIndex: number, goodIndex: number): number {
  return 54 + ((settlementIndex * 11 + goodIndex * 7) % 21);
}

/** Новый общий мир. Без seed он выводится из id вселенной и одинаков у всех, кто его читает */
export function newSharedWorld(universeId: UniverseId, seed: string = sharedWorldSeed(universeId)): SharedWorldState {
  if (typeof seed !== "string" || seed.trim().length === 0 || seed.length > 64) {
    throw new GameRuleError("INVALID_INPUT", "seed общего мира должен быть строкой от 1 до 64 символов");
  }
  if (!isUniverseId(universeId)) {
    throw new GameRuleError("INVALID_INPUT", `Неизвестная вселенная: ${String(universeId)}`);
  }
  const universe = getUniverse(universeId);
  const base = newWorldState(universe);
  const seeds = settlementSeeds(universe);
  const goods = goodsOf(universeId);

  const settlements: SharedWorldSettlement[] = seeds.map((settlementSeed, settlementIndex) => {
    const start = base.settlements.find((item) => item.id === settlementSeed.id);
    return {
      id: settlementSeed.id,
      name: settlementSeed.name,
      kind: settlementSeed.kind,
      tags: [...settlementSeed.tags],
      wageFactor: settlementSeed.wageFactor,
      costFactor: settlementSeed.costFactor,
      travelCost: settlementSeed.travelCost,
      population: start?.population ?? SHARED_POPULATION_MIN,
      prosperity: start?.prosperity ?? 50,
      stability: start?.stability ?? 50,
      dominantFactionId: start?.dominantFactionId ?? universe.factions[0]?.id ?? null,
      goods: goods.map((good, goodIndex) => {
        const supply = initialSupply(settlementIndex, goodIndex);
        const prices = sharedGoodPrices(good.base, supply);
        return {
          id: good.id,
          name: good.name,
          description: good.description,
          base: good.base,
          supply,
          buy: prices.buy,
          sell: prices.sell
        };
      })
    };
  });

  const factions: SharedWorldFaction[] = universe.factions.map((faction) => {
    const start = base.factions.find((item) => item.id === faction.id);
    return {
      id: faction.id,
      name: faction.name,
      power: start?.power ?? 40,
      influence: start?.influence ?? 0,
      standing: start?.standing ?? 0
    };
  });

  const state: SharedWorldState = {
    version: SHARED_WORLD_VERSION,
    universeId,
    seed,
    season: SHARED_WORLD_START_SEASON,
    settlements,
    factions,
    events: []
  };
  // Каталоги неизменяемы, но состояние — самостоятельные данные: не даём ему делить ссылки с каталогом
  return deepClone(state);
}

/** Применить одну команду. Исходное состояние не меняется */
export function applySharedWorldCommand(state: SharedWorldState, command: SharedWorldCommand): SharedWorldState {
  const next = deepClone(state);
  if (!command || typeof command !== "object") return next;
  switch (command.type) {
    case "tick":
      return tickSharedWorld(next);
    case "event":
      return appendAdminEvent(next, command);
    case "settlement":
      return applySettlementCommand(next, command);
    case "faction":
      return applyFactionCommand(next, command);
    default:
      return next;
  }
}

/** Воспроизвести состояние из seed и журнала команд. Тот же журнал всегда даёт тот же checksum */
export function replaySharedWorld(universeId: UniverseId, seed: string, commands: readonly SharedWorldCommand[]): SharedWorldState {
  let state = newSharedWorld(universeId, seed);
  for (const command of commands) state = applySharedWorldCommand(state, command);
  return state;
}

function tickSharedWorld(source: SharedWorldState): SharedWorldState {
  const state = deepClone(source);
  const season = state.season + 1;
  const rng = Rng.fromSeed(state.seed, `shared:${season}`);
  state.season = season;

  for (const settlement of state.settlements) {
    const prosperityDrift =
      rng.int(-2, 2) + (settlement.stability >= 65 ? 1 : settlement.stability <= 30 ? -1 : 0);
    settlement.prosperity = clamp(Math.round(settlement.prosperity + prosperityDrift), 0, 100);
    const stabilityDrift =
      rng.int(-1, 1) + (settlement.prosperity >= 60 ? 1 : settlement.prosperity <= 25 ? -1 : 0);
    settlement.stability = clamp(Math.round(settlement.stability + stabilityDrift), 0, 100);
    const populationDelta =
      Math.round(settlement.population * ((settlement.prosperity - 50) / 4000)) + rng.int(-25, 25);
    settlement.population = clamp(
      Math.round(settlement.population + populationDelta),
      SHARED_POPULATION_MIN,
      SHARED_POPULATION_MAX
    );
    for (const good of settlement.goods) {
      const demand = Math.ceil(settlement.population / 150_000);
      const regen = rng.int(4, 9) + (settlement.prosperity >= 60 ? 1 : settlement.prosperity <= 25 ? -1 : 0);
      good.supply = clamp(good.supply + regen - demand, SHARED_GOOD_SUPPLY_MIN, SHARED_GOOD_SUPPLY_MAX);
      const prices = sharedGoodPrices(good.base, good.supply);
      good.buy = prices.buy;
      good.sell = prices.sell;
    }
  }

  for (const faction of state.factions) {
    faction.influence = clamp(faction.influence + rng.int(-2, 2), -100, 100);
    const powerDrift = rng.int(-1, 1) + (faction.influence >= 25 ? 1 : faction.influence <= -25 ? -1 : 0);
    faction.power = clamp(faction.power + powerDrift, 0, 100);
    faction.standing = clamp(
      Math.round((faction.power - 50) * 0.7 + faction.influence * 0.3 + rng.int(-1, 1)),
      -100,
      100
    );
  }

  const settlement = state.settlements.length > 0 ? rng.pick(state.settlements) : undefined;
  const faction = state.factions.length > 0 ? rng.pick(state.factions) : undefined;
  const template = rng.pick(TICK_EVENT_TEMPLATES[state.universeId]);
  const vars = {
    settlement: settlement?.name ?? t("Поселение", "Settlement"),
    faction: faction?.name ?? t("Фракция", "Faction")
  };
  const event: SharedWorldEvent = {
    id: `tick:${state.universeId}:${season}:${template.kind}:${
      template.target === "faction" ? faction?.id ?? "none" : settlement?.id ?? "none"
    }`,
    season,
    kind: template.kind,
    title: fillText(template.title, vars),
    text: fillText(template.text, vars),
    severity: clamp(template.severity + rng.int(-1, 1), 1, 5)
  };
  if (template.target === "faction") {
    if (faction) event.factionId = faction.id;
  } else if (settlement) {
    event.settlementId = settlement.id;
  }
  pushEvent(state, event);
  return state;
}

function applySettlementCommand(
  state: SharedWorldState,
  command: Extract<SharedWorldCommand, { type: "settlement" }>
): SharedWorldState {
  const settlement = state.settlements.find((item) => item.id === command.settlementId);
  if (!settlement) return state;
  if (command.population !== undefined && Number.isFinite(command.population)) {
    settlement.population = clamp(
      Math.round(command.population),
      SHARED_POPULATION_MIN,
      SHARED_POPULATION_MAX
    );
  }
  if (command.prosperity !== undefined && Number.isFinite(command.prosperity)) {
    settlement.prosperity = clamp(Math.round(command.prosperity), 0, 100);
  }
  if (command.stability !== undefined && Number.isFinite(command.stability)) {
    settlement.stability = clamp(Math.round(command.stability), 0, 100);
  }
  if (command.dominantFactionId === null) {
    settlement.dominantFactionId = null;
  } else if (
    typeof command.dominantFactionId === "string" &&
    state.factions.some((faction) => faction.id === command.dominantFactionId)
  ) {
    settlement.dominantFactionId = command.dominantFactionId;
  }
  return state;
}

function applyFactionCommand(
  state: SharedWorldState,
  command: Extract<SharedWorldCommand, { type: "faction" }>
): SharedWorldState {
  const faction = state.factions.find((item) => item.id === command.factionId);
  if (!faction) return state;
  if (command.power !== undefined && Number.isFinite(command.power)) {
    faction.power = clamp(Math.round(command.power), 0, 100);
  }
  if (command.influence !== undefined && Number.isFinite(command.influence)) {
    faction.influence = clamp(Math.round(command.influence), -100, 100);
  }
  if (command.standing !== undefined && Number.isFinite(command.standing)) {
    faction.standing = clamp(Math.round(command.standing), -100, 100);
  }
  return state;
}

function appendAdminEvent(
  state: SharedWorldState,
  command: Extract<SharedWorldCommand, { type: "event" }>
): SharedWorldState {
  if (!isLocalized(command.title) || !isLocalized(command.text)) return state;
  if (!(SHARED_WORLD_EVENT_KINDS as readonly string[]).includes(command.kind)) return state;
  const settlementId =
    typeof command.settlementId === "string" && state.settlements.some((item) => item.id === command.settlementId)
      ? command.settlementId
      : undefined;
  const factionId =
    typeof command.factionId === "string" && state.factions.some((item) => item.id === command.factionId)
      ? command.factionId
      : undefined;
  if (typeof command.settlementId === "string" && !settlementId) return state;
  if (typeof command.factionId === "string" && !factionId) return state;
  const severity = clamp(Math.round(finiteNumber(command.severity, 1)), 1, 5);
  const event: SharedWorldEvent = {
    id: command.id ?? adminEventId(state, command, settlementId, factionId, severity),
    season: state.season,
    kind: command.kind,
    title: command.title,
    text: command.text,
    severity
  };
  if (settlementId) event.settlementId = settlementId;
  if (factionId) event.factionId = factionId;
  pushEvent(state, event);
  return state;
}

function adminEventId(
  state: SharedWorldState,
  command: Extract<SharedWorldCommand, { type: "event" }>,
  settlementId: string | undefined,
  factionId: string | undefined,
  severity: number
): string {
  const source = [
    state.universeId,
    state.season,
    command.kind,
    settlementId ?? "-",
    factionId ?? "-",
    severity,
    command.title.ru,
    command.text.ru,
    state.events.length,
    sharedWorldChecksum(state).slice(0, 8)
  ].join("|");
  return `admin:${state.universeId}:${hashSeed(source).toString(16).padStart(8, "0")}`;
}

function pushEvent(state: SharedWorldState, event: SharedWorldEvent): void {
  state.events.unshift(event);
  state.events = state.events.slice(0, MAX_SHARED_WORLD_EVENTS);
}

// ——— Контрольная сумма и проверка формы ———

function canonicalLocalized(value: LocalizedText): { ru: string; en: string } {
  return { ru: value.ru, en: value.en };
}

/** Сравнение по кодовым точкам, а не localeCompare: checksum не должен зависеть от локали ICU */
function compareIds(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

function canonicalNumber(value: unknown, path: string): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new GameRuleError("INVALID_SAVE", `Общий мир: ${path} должно быть конечным числом`);
  }
  return value;
}

/**
 * Каноническая стабильная сериализация: порядок полей фиксирован, поселения, фракции и товары
 * отсортированы по id, теги — по алфавиту. Журнал событий сохраняет порядок: новые сверху.
 */
export function canonicalSharedWorldJson(state: SharedWorldState): string {
  if (!state || typeof state !== "object") {
    throw new GameRuleError("INVALID_SAVE", "Общий мир: состояние не объект");
  }
  const settlements = [...state.settlements]
    .sort((a, b) => compareIds(a.id, b.id))
    .map((settlement) => ({
      id: settlement.id,
      name: canonicalLocalized(settlement.name),
      kind: settlement.kind,
      tags: [...settlement.tags].sort(compareIds),
      wageFactor: canonicalNumber(settlement.wageFactor, `settlement.${settlement.id}.wageFactor`),
      costFactor: canonicalNumber(settlement.costFactor, `settlement.${settlement.id}.costFactor`),
      travelCost: canonicalNumber(settlement.travelCost, `settlement.${settlement.id}.travelCost`),
      population: canonicalNumber(settlement.population, `settlement.${settlement.id}.population`),
      prosperity: canonicalNumber(settlement.prosperity, `settlement.${settlement.id}.prosperity`),
      stability: canonicalNumber(settlement.stability, `settlement.${settlement.id}.stability`),
      dominantFactionId: settlement.dominantFactionId,
      goods: [...settlement.goods]
        .sort((a, b) => compareIds(a.id, b.id))
        .map((good) => ({
          id: good.id,
          name: canonicalLocalized(good.name),
          description: canonicalLocalized(good.description),
          base: canonicalNumber(good.base, `settlement.${settlement.id}.good.${good.id}.base`),
          supply: canonicalNumber(good.supply, `settlement.${settlement.id}.good.${good.id}.supply`),
          buy: canonicalNumber(good.buy, `settlement.${settlement.id}.good.${good.id}.buy`),
          sell: canonicalNumber(good.sell, `settlement.${settlement.id}.good.${good.id}.sell`)
        }))
    }));
  const factions = [...state.factions]
    .sort((a, b) => compareIds(a.id, b.id))
    .map((faction) => ({
      id: faction.id,
      name: canonicalLocalized(faction.name),
      power: canonicalNumber(faction.power, `faction.${faction.id}.power`),
      influence: canonicalNumber(faction.influence, `faction.${faction.id}.influence`),
      standing: canonicalNumber(faction.standing, `faction.${faction.id}.standing`)
    }));
  const events = state.events.map((event) => ({
    id: event.id,
    season: canonicalNumber(event.season, `event.${event.id}.season`),
    kind: event.kind,
    title: canonicalLocalized(event.title),
    text: canonicalLocalized(event.text),
    ...(event.settlementId === undefined ? {} : { settlementId: event.settlementId }),
    ...(event.factionId === undefined ? {} : { factionId: event.factionId }),
    severity: canonicalNumber(event.severity, `event.${event.id}.severity`)
  }));
  return JSON.stringify({
    version: canonicalNumber(state.version, "version"),
    universeId: state.universeId,
    seed: state.seed,
    season: canonicalNumber(state.season, "season"),
    settlements,
    factions,
    events
  });
}

/** Короткий отпечаток состояния (32 hex-символа). Не криптографическая подпись, а проверка дрейфа */
export function sharedWorldChecksum(state: SharedWorldState): string {
  const canonical = canonicalSharedWorldJson(state);
  return [
    hashSeed(canonical),
    hashSeed(`shared-world:${canonical}`),
    hashSeed(`endemion:${canonical}:shared`),
    hashSeed(`${canonical.length}:shared-world:endemion`)
  ]
    .map((value) => value.toString(16).padStart(8, "0"))
    .join("");
}

export interface SharedWorldValidation {
  ok: boolean;
  problems: string[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function isLocalized(value: unknown): value is LocalizedText {
  return isRecord(value) && typeof value.ru === "string" && value.ru.trim().length > 0 && typeof value.en === "string" && value.en.trim().length > 0;
}

function isIntegerIn(value: unknown, min: number, max: number): boolean {
  return typeof value === "number" && Number.isInteger(value) && value >= min && value <= max;
}

/**
 * Проверка состояния общего мира. Не исправляет значения: повреждённое состояние нельзя
 * незаметно превратить в другое, иначе replay перестанет сходиться.
 */
export function validateSharedWorldState(value: unknown): SharedWorldValidation {
  const problems: string[] = [];
  if (!isRecord(value)) return { ok: false, problems: ["состояние не объект"] };
  if (value.version !== SHARED_WORLD_VERSION) problems.push(`version должен быть ${SHARED_WORLD_VERSION}`);
  if (!isUniverseId(value.universeId)) problems.push("неизвестный universeId");
  if (typeof value.seed !== "string" || value.seed.trim().length === 0 || value.seed.length > 64) {
    problems.push("seed должен быть строкой от 1 до 64 символов");
  }
  if (!isIntegerIn(value.season, SHARED_WORLD_START_SEASON, 1_000_000)) problems.push("season должен быть целым числом ≥ 1");
  if (!Array.isArray(value.settlements) || value.settlements.length === 0) {
    problems.push("settlements должен быть непустым массивом");
  }
  if (!Array.isArray(value.factions) || value.factions.length === 0) {
    problems.push("factions должен быть непустым массивом");
  }
  if (!Array.isArray(value.events)) problems.push("events должен быть массивом");
  if (problems.length > 0 && (!Array.isArray(value.settlements) || !Array.isArray(value.factions))) {
    return { ok: false, problems };
  }

  const universe = isUniverseId(value.universeId) ? getUniverse(value.universeId) : null;
  const knownSettlements = new Set(universe ? settlementSeeds(universe).map((item) => item.id) : []);
  const knownFactions = new Set(universe?.factions.map((item) => item.id) ?? []);
  const knownGoods = new Set(universe ? goodsOf(universe.id).map((item) => item.id) : []);
  const settlementIds = new Set<string>();
  const factionIds = new Set<string>();
  const eventIds = new Set<string>();
  const season = typeof value.season === "number" ? value.season : 0;

  for (const [index, raw] of (value.settlements as unknown[]).entries()) {
    const path = `settlements[${index}]`;
    if (!isRecord(raw)) {
      problems.push(`${path} не объект`);
      continue;
    }
    if (typeof raw.id !== "string" || raw.id.length === 0) problems.push(`${path}.id пуст`);
    else {
      if (settlementIds.has(raw.id)) problems.push(`${path}.id повторяется`);
      settlementIds.add(raw.id);
      if (knownSettlements.size > 0 && !knownSettlements.has(raw.id)) problems.push(`${path}.id не из каталога мира`);
    }
    if (!isLocalized(raw.name)) problems.push(`${path}.name без двух языков`);
    if (!(SETTLEMENT_KINDS as readonly string[]).includes(String(raw.kind))) problems.push(`${path}.kind неизвестен`);
    if (!Array.isArray(raw.tags) || raw.tags.some((tag) => !(SETTLEMENT_TAGS as readonly string[]).includes(String(tag)))) {
      problems.push(`${path}.tags содержит неизвестный тег`);
    }
    for (const field of ["wageFactor", "costFactor", "travelCost"] as const) {
      if (typeof raw[field] !== "number" || !Number.isFinite(raw[field]) || (field === "travelCost" ? raw[field] < 0 : raw[field] <= 0)) {
        problems.push(`${path}.${field} вне предела`);
      }
    }
    if (!isIntegerIn(raw.population, SHARED_POPULATION_MIN, SHARED_POPULATION_MAX)) problems.push(`${path}.population вне предела`);
    if (!isIntegerIn(raw.prosperity, 0, 100)) problems.push(`${path}.prosperity вне предела`);
    if (!isIntegerIn(raw.stability, 0, 100)) problems.push(`${path}.stability вне предела`);
    if (raw.dominantFactionId !== null && (typeof raw.dominantFactionId !== "string" || !knownFactions.has(raw.dominantFactionId))) {
      problems.push(`${path}.dominantFactionId неизвестен`);
    }
    if (!Array.isArray(raw.goods) || raw.goods.length === 0) {
      problems.push(`${path}.goods пуст`);
      continue;
    }
    const goodIds = new Set<string>();
    for (const good of raw.goods as unknown[]) {
      if (!isRecord(good)) {
        problems.push(`${path}.goods содержит не объект`);
        continue;
      }
      if (typeof good.id !== "string" || good.id.length === 0) problems.push(`${path}.goods.id пуст`);
      else {
        if (goodIds.has(good.id)) problems.push(`${path}.goods.id повторяется`);
        goodIds.add(good.id);
        if (knownGoods.size > 0 && !knownGoods.has(good.id)) problems.push(`${path}.goods.id не из каталога мира`);
      }
      if (!isLocalized(good.name)) problems.push(`${path}.goods.${String(good.id)}.name без двух языков`);
      if (!isLocalized(good.description)) problems.push(`${path}.goods.${String(good.id)}.description без двух языков`);
      if (typeof good.base !== "number" || !Number.isFinite(good.base) || good.base <= 0) problems.push(`${path}.goods.${String(good.id)}.base вне предела`);
      if (!isIntegerIn(good.supply, SHARED_GOOD_SUPPLY_MIN, SHARED_GOOD_SUPPLY_MAX)) problems.push(`${path}.goods.${String(good.id)}.supply вне предела`);
      if (!isIntegerIn(good.buy, 1, Number.MAX_SAFE_INTEGER)) problems.push(`${path}.goods.${String(good.id)}.buy вне предела`);
      if (!isIntegerIn(good.sell, 0, Number.MAX_SAFE_INTEGER)) problems.push(`${path}.goods.${String(good.id)}.sell вне предела`);
      if (typeof good.buy === "number" && typeof good.sell === "number" && good.buy <= good.sell) problems.push(`${path}.goods.${String(good.id)}: покупка не дороже продажи`);
    }
  }

  for (const [index, raw] of (value.factions as unknown[]).entries()) {
    const path = `factions[${index}]`;
    if (!isRecord(raw)) {
      problems.push(`${path} не объект`);
      continue;
    }
    if (typeof raw.id !== "string" || raw.id.length === 0) problems.push(`${path}.id пуст`);
    else {
      if (factionIds.has(raw.id)) problems.push(`${path}.id повторяется`);
      factionIds.add(raw.id);
      if (knownFactions.size > 0 && !knownFactions.has(raw.id)) problems.push(`${path}.id не из каталога мира`);
    }
    if (!isLocalized(raw.name)) problems.push(`${path}.name без двух языков`);
    if (!isIntegerIn(raw.power, 0, 100)) problems.push(`${path}.power вне предела`);
    if (!isIntegerIn(raw.influence, -100, 100)) problems.push(`${path}.influence вне предела`);
    if (!isIntegerIn(raw.standing, -100, 100)) problems.push(`${path}.standing вне предела`);
  }

  if (!Array.isArray(value.events)) return { ok: problems.length === 0, problems };
  if (value.events.length > MAX_SHARED_WORLD_EVENTS) problems.push(`events больше ${MAX_SHARED_WORLD_EVENTS}`);
  for (const [index, raw] of (value.events as unknown[]).entries()) {
    const path = `events[${index}]`;
    if (!isRecord(raw)) {
      problems.push(`${path} не объект`);
      continue;
    }
    if (typeof raw.id !== "string" || raw.id.length === 0) problems.push(`${path}.id пуст`);
    else {
      if (eventIds.has(raw.id)) problems.push(`${path}.id повторяется`);
      eventIds.add(raw.id);
    }
    if (!isIntegerIn(raw.season, SHARED_WORLD_START_SEASON, Math.max(SHARED_WORLD_START_SEASON, season))) problems.push(`${path}.season вне предела`);
    if (!(SHARED_WORLD_EVENT_KINDS as readonly string[]).includes(String(raw.kind))) problems.push(`${path}.kind неизвестен`);
    if (!isLocalized(raw.title)) problems.push(`${path}.title без двух языков`);
    if (!isLocalized(raw.text)) problems.push(`${path}.text без двух языков`);
    if (!isIntegerIn(raw.severity, 1, 5)) problems.push(`${path}.severity вне предела 1…5`);
    if (raw.settlementId !== undefined && (typeof raw.settlementId !== "string" || !settlementIds.has(raw.settlementId))) {
      problems.push(`${path}.settlementId неизвестен`);
    }
    if (raw.factionId !== undefined && (typeof raw.factionId !== "string" || !factionIds.has(raw.factionId))) {
      problems.push(`${path}.factionId неизвестен`);
    }
  }

  return { ok: problems.length === 0, problems };
}

/** Разобрать сохранённое состояние. Битое состояние — ошибка, а не молчаливая замена */
export function parseSharedWorldState(value: unknown): SharedWorldState {
  const result = validateSharedWorldState(value);
  if (!result.ok) throw new GameRuleError("INVALID_SAVE", `Повреждённое состояние общего мира: ${result.problems[0] ?? "неизвестная ошибка"}`);
  return deepClone(value as SharedWorldState);
}

/** Короткий псевдоним для вызывающих, которым не важен суффикс State */
export const parseSharedWorld = parseSharedWorldState;

// ——— Сверка общего мира с миром отдельной жизни ———

export interface SharedWorldSettlementComparison {
  settlementId: string;
  name: LocalizedText;
  status: "aligned" | "drifted" | "missing";
  populationDelta: number;
  prosperityDelta: number;
  stabilityDelta: number;
  dominantFactionMatches: boolean;
}

export interface SharedWorldFactionComparison {
  factionId: string;
  name: LocalizedText;
  status: "aligned" | "drifted" | "missing";
  powerDelta: number;
  influenceDelta: number;
  standingDelta: number;
}

export interface SharedWorldReconciliationSection<T> {
  total: number;
  aligned: number;
  drifted: number;
  missing: number;
  examples: T[];
}

export interface SharedWorldReconciliation {
  universeId: UniverseId;
  season: number;
  aligned: boolean;
  settlements: SharedWorldReconciliationSection<SharedWorldSettlementComparison>;
  factions: SharedWorldReconciliationSection<SharedWorldFactionComparison>;
}

/** Допуски сверки. Мир жизни и общий мир живут отдельно, поэтому небольшое расхождение — норма */
export const RECONCILIATION_TOLERANCE = {
  populationRatio: 0.2,
  prosperity: 15,
  stability: 15,
  faction: 20
} as const;

function driftScore(values: readonly number[]): number {
  return values.reduce((sum, value) => sum + Math.abs(value), 0);
}

/**
 * Сверка одного мира жизни с общим миром. Возвращает только счётчики и примеры расхождений:
 * ни игрока, ни жизни, ни её seed в ответ не попадают.
 */
export function reconcileSharedWorld(shared: SharedWorldState, perLifeWorld: WorldState): SharedWorldReconciliation {
  const perLifeSettlements = new Map(perLifeWorld.settlements.map((item) => [item.id, item]));
  const perLifeFactions = new Map(perLifeWorld.factions.map((item) => [item.id, item]));

  const settlementComparisons: SharedWorldSettlementComparison[] = shared.settlements.map((settlement) => {
    const other = perLifeSettlements.get(settlement.id);
    if (!other) {
      return {
        settlementId: settlement.id,
        name: settlement.name,
        status: "missing",
        populationDelta: 0,
        prosperityDelta: 0,
        stabilityDelta: 0,
        dominantFactionMatches: false
      };
    }
    const populationDelta = other.population - settlement.population;
    const prosperityDelta = other.prosperity - settlement.prosperity;
    const stabilityDelta = other.stability - settlement.stability;
    const dominantFactionMatches = other.dominantFactionId === settlement.dominantFactionId;
    const populationTolerance = Math.max(50, Math.round(settlement.population * RECONCILIATION_TOLERANCE.populationRatio));
    const aligned =
      Math.abs(populationDelta) <= populationTolerance &&
      Math.abs(prosperityDelta) <= RECONCILIATION_TOLERANCE.prosperity &&
      Math.abs(stabilityDelta) <= RECONCILIATION_TOLERANCE.stability &&
      dominantFactionMatches;
    return {
      settlementId: settlement.id,
      name: settlement.name,
      status: aligned ? "aligned" : "drifted",
      populationDelta,
      prosperityDelta,
      stabilityDelta,
      dominantFactionMatches
    };
  });

  const factionComparisons: SharedWorldFactionComparison[] = shared.factions.map((faction) => {
    const other = perLifeFactions.get(faction.id);
    if (!other) {
      return {
        factionId: faction.id,
        name: faction.name,
        status: "missing",
        powerDelta: 0,
        influenceDelta: 0,
        standingDelta: 0
      };
    }
    const powerDelta = other.power - faction.power;
    const influenceDelta = other.influence - faction.influence;
    const standingDelta = other.standing - faction.standing;
    const aligned =
      Math.abs(powerDelta) <= RECONCILIATION_TOLERANCE.faction &&
      Math.abs(influenceDelta) <= RECONCILIATION_TOLERANCE.faction &&
      Math.abs(standingDelta) <= RECONCILIATION_TOLERANCE.faction;
    return {
      factionId: faction.id,
      name: faction.name,
      status: aligned ? "aligned" : "drifted",
      powerDelta,
      influenceDelta,
      standingDelta
    };
  });

  const settlementExamples = settlementComparisons
    .filter((item) => item.status !== "aligned")
    .sort((a, b) => {
      if (a.status !== b.status) return a.status === "missing" ? -1 : 1;
      return driftScore([b.populationDelta / 100, b.prosperityDelta, b.stabilityDelta]) -
        driftScore([a.populationDelta / 100, a.prosperityDelta, a.stabilityDelta]);
    })
    .slice(0, 3);
  const factionExamples = factionComparisons
    .filter((item) => item.status !== "aligned")
    .sort((a, b) => {
      if (a.status !== b.status) return a.status === "missing" ? -1 : 1;
      return driftScore([b.powerDelta, b.influenceDelta, b.standingDelta]) - driftScore([a.powerDelta, a.influenceDelta, a.standingDelta]);
    })
    .slice(0, 3);

  const settlements: SharedWorldReconciliationSection<SharedWorldSettlementComparison> = {
    total: settlementComparisons.length,
    aligned: settlementComparisons.filter((item) => item.status === "aligned").length,
    drifted: settlementComparisons.filter((item) => item.status === "drifted").length,
    missing: settlementComparisons.filter((item) => item.status === "missing").length,
    examples: settlementExamples
  };
  const factions: SharedWorldReconciliationSection<SharedWorldFactionComparison> = {
    total: factionComparisons.length,
    aligned: factionComparisons.filter((item) => item.status === "aligned").length,
    drifted: factionComparisons.filter((item) => item.status === "drifted").length,
    missing: factionComparisons.filter((item) => item.status === "missing").length,
    examples: factionExamples
  };

  return {
    universeId: shared.universeId,
    season: shared.season,
    aligned: settlements.drifted === 0 && settlements.missing === 0 && factions.drifted === 0 && factions.missing === 0,
    settlements,
    factions
  };
}
