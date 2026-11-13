import { hashSeed, Rng } from "../rng.js";
import { clamp } from "../stats.js";
import { t, type LocalizedText } from "../i18n.js";
import type { EngineContext } from "../engine/context.js";
import type {
  GameState,
  WorldActivity,
  WorldFactionState,
  WorldInfluenceKind,
  WorldInfluenceState,
  WorldSettlementState,
  WorldState
} from "../types.js";
import type { UniverseDefinition } from "../universes/types.js";
import { getUniverse } from "../universes/registry.js";

export const MAX_WORLD_ACTIVITIES = 24;
export const MAX_WORLD_SETTLEMENTS = 6;

/** Stage 02.4: вид поселения. От него зависят цены дороги, события и местная экономика */
export const SETTLEMENT_KINDS = ["capital", "city", "frontier", "market", "sect", "fortress", "academy"] as const;
export type SettlementKind = (typeof SETTLEMENT_KINDS)[number];

export const SETTLEMENT_KIND_NAMES: Readonly<Record<SettlementKind, LocalizedText>> = {
  capital: t("Столица", "Capital"),
  city: t("Город", "City"),
  frontier: t("Пограничье", "Frontier"),
  market: t("Рынок", "Market"),
  sect: t("Обитель", "Sect"),
  fortress: t("Крепость", "Fortress"),
  academy: t("Академия", "Academy")
};

/**
 * Stage 02.4: устойчивые признаки поселения для событий и экономики. Это не второй каталог:
 * те же записи, что и раньше, получают тип и теги
 */
export const SETTLEMENT_TAGS = [
  "capital",
  "frontier",
  "market",
  "sect",
  "gate",
  "academy",
  "court",
  "guild",
  "mortal",
  "underworld",
  "wilds",
  "fortress",
  "order",
  "scholars",
  "social"
] as const;
export type SettlementTag = (typeof SETTLEMENT_TAGS)[number];

export const SETTLEMENT_TAG_NAMES: Readonly<Record<SettlementTag, LocalizedText>> = {
  capital: t("Столица", "Capital"),
  frontier: t("Рубеж", "Frontier"),
  market: t("Рынок", "Market"),
  sect: t("Секта", "Sect"),
  gate: t("Врата", "Gate"),
  academy: t("Академия", "Academy"),
  court: t("Двор", "Court"),
  guild: t("Гильдия", "Guild"),
  mortal: t("Смертные", "Mortal"),
  underworld: t("Дно", "Underworld"),
  wilds: t("Дикие земли", "Wilds"),
  fortress: t("Крепость", "Fortress"),
  order: t("Орден", "Order"),
  scholars: t("Учёные", "Scholars"),
  social: t("Свет", "Society")
};

export interface SettlementSeed {
  id: string;
  name: LocalizedText;
  kind: SettlementKind;
  tags: readonly SettlementTag[];
  /** Местный множитель заработка. 1 — как в прежние годы */
  wageFactor: number;
  /** Местный множитель стоимости жизни. 1 — как в прежние годы */
  costFactor: number;
  /** Базовая цена дороги до этого поселения; итоговая цена считается парой поселений */
  travelCost: number;
}

const SETTLEMENTS: Readonly<Record<string, readonly SettlementSeed[]>> = {
  "dark-fantasy": [
    { id: "ash-capital", name: t("Пепельная столица", "Ashen Capital"), kind: "capital", tags: ["capital", "court", "order"], wageFactor: 1, costFactor: 1, travelCost: 4 },
    { id: "mist-border", name: t("Граница Мглы", "Mist Border"), kind: "frontier", tags: ["frontier", "wilds", "order"], wageFactor: 1.12, costFactor: 0.9, travelCost: 8 },
    { id: "ember-watch", name: t("Эмберская стража", "Ember Watch"), kind: "fortress", tags: ["fortress", "order", "frontier"], wageFactor: 0.95, costFactor: 1.1, travelCost: 6 }
  ],
  isekai: [
    { id: "system-city", name: t("Город Системы", "System City"), kind: "capital", tags: ["capital", "guild", "market"], wageFactor: 1, costFactor: 1, travelCost: 5 },
    { id: "frontier", name: t("Пограничье", "The Frontier"), kind: "frontier", tags: ["frontier", "wilds", "guild"], wageFactor: 1.1, costFactor: 0.9, travelCost: 7 },
    { id: "sky-road", name: t("Небесная дорога", "Sky Road"), kind: "city", tags: ["market", "guild", "wilds"], wageFactor: 0.92, costFactor: 1.12, travelCost: 6 }
  ],
  murim: [
    { id: "nine-rivers", name: t("Город Девяти рек", "City of Nine Rivers"), kind: "capital", tags: ["capital", "market", "guild"], wageFactor: 1, costFactor: 1, travelCost: 5 },
    { id: "orthodox-valley", name: t("Долина Союза", "Orthodox Valley"), kind: "sect", tags: ["sect", "order", "wilds"], wageFactor: 0.94, costFactor: 0.88, travelCost: 7 },
    { id: "black-market", name: t("Чёрный рынок", "Black Market"), kind: "market", tags: ["market", "underworld", "guild"], wageFactor: 1.15, costFactor: 1.05, travelCost: 6 }
  ],
  xianxia: [
    { id: "cloud-peak", name: t("Облачная вершина", "Cloud Peak"), kind: "sect", tags: ["sect", "wilds", "order"], wageFactor: 1, costFactor: 1, travelCost: 5 },
    { id: "mortal-realm", name: t("Земли смертных", "Mortal Realm"), kind: "market", tags: ["mortal", "market", "wilds"], wageFactor: 1.08, costFactor: 0.82, travelCost: 6 },
    { id: "jade-gate", name: t("Нефритовые врата", "Jade Gate"), kind: "city", tags: ["capital", "market", "mortal"], wageFactor: 0.9, costFactor: 1.15, travelCost: 7 }
  ],
  hunter: [
    { id: "neo-seoul", name: t("Нео-Сеул", "Neo-Seoul"), kind: "capital", tags: ["capital", "guild", "market"], wageFactor: 1, costFactor: 1, travelCost: 5 },
    { id: "gate-district", name: t("Район Врат", "Gate District"), kind: "frontier", tags: ["gate", "frontier", "wilds"], wageFactor: 1.18, costFactor: 0.98, travelCost: 7 },
    { id: "association-hub", name: t("Центр Ассоциации", "Association Hub"), kind: "city", tags: ["guild", "capital", "market"], wageFactor: 0.93, costFactor: 1.12, travelCost: 6 }
  ],
  academy: [
    { id: "lirevale", name: t("Лиреваль", "Lirevale"), kind: "capital", tags: ["capital", "court", "market"], wageFactor: 1, costFactor: 1, travelCost: 5 },
    { id: "academy-quarter", name: t("Академический квартал", "Academy Quarter"), kind: "academy", tags: ["academy", "scholars", "court"], wageFactor: 0.92, costFactor: 0.9, travelCost: 6 },
    { id: "rose-salon", name: t("Розовый салон", "Rose Salon"), kind: "city", tags: ["court", "social", "market"], wageFactor: 1.06, costFactor: 1.18, travelCost: 7 }
  ]
};

export function settlementSeeds(universe: UniverseDefinition): readonly SettlementSeed[] {
  return SETTLEMENTS[universe.id] ?? [];
}

/** Поселение по id из того же каталога, что и world.settlements. undefined — чужая или неизвестная ссылка */
export function findSettlementSeed(universe: UniverseDefinition, id: string): SettlementSeed | undefined {
  return settlementSeeds(universe).find((item) => item.id === id);
}

/** Есть ли у поселения один из тегов. Пустой список тегов совпадает с любым поселением */
export function settlementHasTag(seed: SettlementSeed | undefined, tags: readonly string[] | undefined): boolean {
  if (!seed) return false;
  if (!tags || tags.length === 0) return true;
  return tags.some((tag) => (seed.tags as readonly string[]).includes(tag));
}

/** Наибольшее по модулю многолетнее влияние рода на одну сущность мира */
export const MAX_WORLD_INFLUENCE = 5;
/** Сколько поселений и сколько фракций род может держать под своим влиянием */
export const MAX_WORLD_INFLUENCE_ENTRIES = 8;

export function emptyWorldInfluence(): WorldInfluenceState {
  return { settlements: [], factions: [] };
}

/** Значение многолетнего влияния рода на сущность; отсутствующая запись — 0 */
export function worldInfluenceValue(influence: WorldInfluenceState | undefined, kind: WorldInfluenceKind, id: string): number {
  const list = kind === "settlement" ? influence?.settlements : influence?.factions;
  return list?.find((entry) => entry.id === id)?.value ?? 0;
}

/**
 * Годовой сдвиг процветания поселения от многолетнего влияния рода. Ограничен −2…+2,
 * чтобы даже максимальное влияние не заменяло остальную экономику мира.
 */
export function settlementInfluenceDrift(value: number): number {
  if (value >= 3) return 2;
  if (value >= 1) return 1;
  if (value <= -3) return -2;
  if (value <= -1) return -1;
  return 0;
}

/** Надбавка к производному отношению фракции: влияние рода усиливает или ослабляет фракцию на ±10 */
export function factionInfluenceBonus(value: number): number {
  return clamp(value, -MAX_WORLD_INFLUENCE, MAX_WORLD_INFLUENCE) * 2;
}

/**
 * Меняет многолетнее влияние рода на поселение или фракцию. Неизвестная сущность — тихий no-op,
 * значение зажимается ±MAX_WORLD_INFLUENCE, нулевые записи удаляются, число записей ограничено.
 */
export function changeWorldInfluence(ctx: EngineContext, kind: WorldInfluenceKind, id: string, delta: number): void {
  const known = kind === "settlement"
    ? settlementSeeds(ctx.universe).some((item) => item.id === id)
    : ctx.universe.factions.some((item) => item.id === id);
  if (!known || !Number.isFinite(delta) || delta === 0) return;
  const lineage = ctx.state.lineage;
  lineage.worldInfluence ??= emptyWorldInfluence();
  const list = kind === "settlement" ? lineage.worldInfluence.settlements : lineage.worldInfluence.factions;
  const entry = list.find((item) => item.id === id);
  if (!entry) {
    if (list.length >= MAX_WORLD_INFLUENCE_ENTRIES) return;
    const value = clamp(Math.trunc(delta), -MAX_WORLD_INFLUENCE, MAX_WORLD_INFLUENCE);
    if (value !== 0) list.push({ id, value });
    return;
  }
  entry.value = clamp(entry.value + Math.trunc(delta), -MAX_WORLD_INFLUENCE, MAX_WORLD_INFLUENCE);
  if (entry.value === 0) list.splice(list.indexOf(entry), 1);
}

export function newWorldState(universe: UniverseDefinition): WorldState {
  const settlements = settlementSeeds(universe).slice(0, MAX_WORLD_SETTLEMENTS).map((seed, index) => ({
    id: seed.id,
    population: 1000 + index * 450,
    prosperity: 48 + index * 4,
    stability: 58 - index * 3,
    dominantFactionId: universe.factions[index % Math.max(1, universe.factions.length)]?.id ?? null
  }));
  const factions = universe.factions.map((faction, index) => ({
    id: faction.id,
    power: 35 + (index % 3) * 8,
    influence: 0,
    standing: 0
  }));
  return { tick: 0, settlements, factions, activities: [] };
}

function validNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

/** Нормализует отсутствующее поле в старых saves, сохраняя значения только в допустимых пределах. */
export function normalizeWorldState(value: unknown, universe: UniverseDefinition): WorldState {
  const fallback = newWorldState(universe);
  if (!value || typeof value !== "object" || Array.isArray(value)) return fallback;
  const raw = value as Partial<WorldState>;
  const sourceSettlements = Array.isArray(raw.settlements) ? raw.settlements : [];
  const sourceFactions = Array.isArray(raw.factions) ? raw.factions : [];
  const settlements = fallback.settlements.map((base) => {
    const item = sourceSettlements.find((candidate) => candidate && typeof candidate === "object" && candidate.id === base.id);
    return {
      ...base,
      population: validNumber(item?.population) ? clamp(Math.round(item.population), 100, 1_000_000) : base.population,
      prosperity: validNumber(item?.prosperity) ? clamp(Math.round(item.prosperity), 0, 100) : base.prosperity,
      stability: validNumber(item?.stability) ? clamp(Math.round(item.stability), 0, 100) : base.stability,
      dominantFactionId: typeof item?.dominantFactionId === "string" && universe.factions.some((faction) => faction.id === item.dominantFactionId) ? item.dominantFactionId : base.dominantFactionId
    };
  });
  const factions = fallback.factions.map((base) => {
    const item = sourceFactions.find((candidate) => candidate && typeof candidate === "object" && candidate.id === base.id);
    return {
      ...base,
      power: validNumber(item?.power) ? clamp(Math.round(item.power), 0, 100) : base.power,
      influence: validNumber(item?.influence) ? clamp(Math.round(item.influence), -100, 100) : base.influence,
      standing: validNumber(item?.standing) ? clamp(Math.round(item.standing), -100, 100) : base.standing
    };
  });
  const activities = Array.isArray(raw.activities)
    ? raw.activities.filter((item): item is WorldActivity => Boolean(item && typeof item === "object" && typeof item.id === "string" && validNumber(item.age) && typeof item.title === "object" && typeof item.text === "object")).slice(0, MAX_WORLD_ACTIVITIES)
    : [];
  return {
    tick: validNumber(raw.tick) ? Math.max(0, Math.floor(raw.tick)) : fallback.tick,
    settlements,
    factions,
    activities
  };
}

function addActivity(state: WorldState, activity: WorldActivity): void {
  state.activities.unshift(activity);
  state.activities = state.activities.slice(0, MAX_WORLD_ACTIVITIES);
}

function activity(ctx: EngineContext, kind: WorldActivity["kind"], id: string, title: LocalizedText, text: LocalizedText): void {
  const world = ctx.state.world ?? newWorldState(ctx.universe);
  ctx.state.world = world;
  addActivity(world, { id: `${id}.${ctx.state.life.age}.${world.tick}`, age: ctx.state.life.age, kind, title, text });
}

/** Один deterministic world tick; вызывается только из существующего yearly pipeline. */
export function pushWorldActivity(ctx: EngineContext, kind: WorldActivity["kind"], id: string, title: LocalizedText, text: LocalizedText): void {
  activity(ctx, kind, id, title, text);
}

/** Славу рода, при которой dynastie начинает заметно влиять на процветание поселений */
export const DYNASTY_PROSPERITY_RENOWN = 30;
/** Славу рода, при которой мир начинает узнавать род позитивно */
export const DYNASTY_RENOWN_RECOGNIZED = 50;
/** Славу рода, при которой мир начинает узнавать род негативно */
export const DYNASTY_RENOWN_DISGRACED = -50;

export function worldTick(ctx: EngineContext): void {
  const state = ctx.state.world ?? newWorldState(ctx.universe);
  ctx.state.world = state;
  const rng = new Rng(hashSeed(`${ctx.state.seed}::world::${ctx.state.life.age}::${ctx.rng.state}`));
  state.tick = ctx.state.life.age;

  // Влияние рода на мир: процветающий дом поднимает поселения, которые он опекает.
  const renown = ctx.state.lineage.renown;
  const dynastyName = ctx.state.lineage.name;
  const seeds = settlementSeeds(ctx.universe);
  const settlementName = (id: string) => seeds.find((item) => item.id === id)?.name ?? t(id, id);
  if (renown >= DYNASTY_PROSPERITY_RENOWN && state.settlements.length > 0) {
    for (const settlement of state.settlements) {
      const before = settlement.prosperity;
      settlement.prosperity = clamp(settlement.prosperity + 1, 0, 100);
      if (settlement.prosperity !== before) {
        activity(
          ctx,
          "settlement",
          `dynasty-prosperity.${settlement.id}`,
          t("Влияние рода на поселение", "The dynasty strengthens a settlement"),
          t(`${settlementName(settlement.id).ru} процветает благодаря роду ${dynastyName}.`, `${settlementName(settlement.id).en} prospers through the ${dynastyName} dynasty.`)
        );
      }
    }
  }
  for (const settlement of state.settlements) {
    const beforeStability = settlement.stability;
    const cycleDrift = ctx.state.economy.cycle === "boom" ? 2 : ctx.state.economy.cycle === "slump" ? -2 : 0;
    const influenceDrift = settlementInfluenceDrift(worldInfluenceValue(ctx.state.lineage.worldInfluence, "settlement", settlement.id));
    settlement.prosperity = clamp(settlement.prosperity + cycleDrift + influenceDrift + rng.int(-1, 1), 0, 100);
    settlement.stability = clamp(settlement.stability + (settlement.prosperity >= 60 ? 1 : settlement.prosperity <= 25 ? -2 : 0) + rng.int(-1, 1), 0, 100);
    settlement.population = clamp(Math.round(settlement.population * (1 + (settlement.prosperity - 45) / 5000)), 100, 1_000_000);
    if (beforeStability >= 35 && settlement.stability < 35) {
      activity(ctx, "crisis", `unrest.${settlement.id}`, t("Беспокойство в поселении", "Unrest in a settlement"), t(`${settlement.id} переживает тяжёлый год: люди требуют перемен.`, `${settlement.id} is having a hard year: people are demanding change.`));
    } else if (beforeStability < 70 && settlement.stability >= 70) {
      activity(ctx, "settlement", `recovery.${settlement.id}`, t("Поселение оправляется", "A settlement recovers"), t(`${settlement.id} возвращает порядок и надежду.`, `${settlement.id} restores order and hope.`));
    }
  }
  for (const faction of state.factions) {
    const characterStanding = ctx.state.character.factions[faction.id] ?? 0;
    faction.influence = clamp(Math.round((faction.influence * 3 + characterStanding) / 4), -100, 100);
    faction.power = clamp(faction.power + (faction.influence > 30 ? 1 : faction.influence < -30 ? -1 : 0) + rng.int(-1, 1), 0, 100);
    const influenceBonus = factionInfluenceBonus(worldInfluenceValue(ctx.state.lineage.worldInfluence, "faction", faction.id));
    faction.standing = clamp(Math.round((faction.power - 50) * 0.8 + faction.influence * 0.2) + influenceBonus, -100, 100);
  }
  if (rng.chance(0.12) && state.settlements.length > 0) {
    const settlement = rng.pick(state.settlements);
    activity(ctx, settlement.stability < 40 ? "crisis" : "discovery", `world.${settlement.id}`, settlement.stability < 40 ? t("Тревожные вести", "Troubling news") : t("Новая возможность", "A new opportunity"), settlement.stability < 40 ? t("Издалека приходят вести о разбое и нехватке припасов.", "Reports of raids and scarce supplies arrive from afar.") : t("Купцы и мастера находят новый путь к этому месту.", "Merchants and makers find a new route to this place."));
  }
}

export interface WorldViewSettlement extends WorldSettlementState {
  name: LocalizedText;
}

export interface WorldViewFaction extends WorldFactionState {
  name: LocalizedText;
}

export interface WorldView {
  tick: number;
  settlements: WorldViewSettlement[];
  factions: WorldViewFaction[];
  activities: WorldActivity[];
}

export function presentWorld(state: GameState): WorldView {
  const universe = ctxUniverse(state);
  const world = normalizeWorldState(state.world, universe);
  const seeds = settlementSeeds(universe);
  const names = new Map(seeds.map((item) => [item.id, item.name]));
  return {
    tick: world.tick,
    settlements: world.settlements.map((settlement) => ({ ...settlement, name: names.get(settlement.id) ?? t(settlement.id, settlement.id) })),
    factions: world.factions.map((faction) => ({ ...faction, name: universe.factions.find((item) => item.id === faction.id)?.name ?? t(faction.id, faction.id) })),
    activities: world.activities
  };
}

function ctxUniverse(state: GameState): UniverseDefinition {
  // Kept local to avoid making WorldView callers depend on engine context.
  return getUniverse(state.character.universeId);
}
