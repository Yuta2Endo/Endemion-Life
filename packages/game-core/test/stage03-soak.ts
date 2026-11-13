// Stage 03.5: длинная династия — детерминированный прогон рода через смерть и наследование.
// Прогон пользуется только публичными действиями игры: newGame → advance/choose → смерть → succeed.
// Ничего не подменяет: наследника выбирает закон мира, а не фикстура; если наследников нет, род вымирает.
// advanceOrChoose из stage02-soak.ts здесь не переиспользуется: он всегда берёт первый доступный вариант,
// а династии нужен детерминированный семейный выбор и проверка границ поколения.
import {
  applyAction,
  businessSaleValue,
  checkChance,
  findBusiness,
  findEvent,
  findProperty,
  getUniverse,
  heirCandidates,
  INHERITANCE_LAWS,
  MAX_BUSINESSES,
  MAX_CHRONICLE,
  MAX_LOCATION_HISTORY,
  MAX_NPCS,
  MAX_RELATIONSHIPS,
  MAX_STORY_RECORDS,
  MAX_WORLD_ACTIVITIES,
  newGame,
  parseSave,
  presentEvent,
  SAVE_SCHEMA_VERSION,
  SELF_ID,
  succeed,
  UNIVERSE_IDS,
  WEALTH_MAX,
  type Effect,
  type EventDefinition,
  type GameState,
  type NpcState,
  type UniverseId
} from "../src/index.js";

/** Самый долгий срок жизни в шести мирах: база, раса и высшие ранги пути плюс запас. */
export const STAGE03_SOAK_MAX_AGE = 1_100;
export const STAGE03_TARGET_GENERATIONS = 5;
/** Предел состояния одной жизни; Stage 02 показал ~80 КиБ, здесь запас на пять поколений истории рода. */
export const STAGE03_STATE_BYTES_LIMIT = 512 * 1024;
/** В роду не может быть больше реликвий, чем в каталоге: по одной на каждый из шести миров. */
export const STAGE03_MAX_RELICS = 6;
/**
 * Границы инфляции Stage 03.5. Полный прогон 60 родов дал максимум хозяйства 3 824 и
 * медиану пятого поколения 1 960 против 203 в первом. Предел 12 000 — запас 3,1× к наблюдённому
 * максимуму; рост медианы ограничен 4× плюс 4 000 (наблюдённый рост 9,7× без пола и 4,99× в парах).
 * Жидкое золото растёт быстрее хозяйства из-за низкого старта, поэтому для него отдельный предел 16×.
 */
export const STAGE03_ESTATE_CAP = 12_000;
export const STAGE03_LIQUID_CAP = 12_000;
export const STAGE03_GEN5_ESTATE_MULTIPLIER = 4;
export const STAGE03_GEN5_LIQUID_MULTIPLIER = 16;
export const STAGE03_GROWTH_FLOOR = 4_000;
export const STAGE03_MEDIAN_ESTATE_RATIO_LIMIT = 10;
export const STAGE03_MEDIAN_LIQUID_RATIO_LIMIT = 20;
const ACTION_YEARS = 3;
const MAX_ACTIONS_PER_LIFE = 800;
const MAX_SHARES_REPORTED = 64;

export type DynastyPolicy = "lineage" | "drift";
export const DYNASTY_POLICIES: readonly DynastyPolicy[] = ["lineage", "drift"];

export interface DynastySoakOptions {
  /** Сколько родов на каждый мир. 2 = 12 родов, 10 = 60 родов. */
  dynastiesPerUniverse?: number;
  universeIds?: readonly UniverseId[];
  policies?: readonly DynastyPolicy[];
  targetGenerations?: number;
  maxAge?: number;
}

export interface GenerationMetrics {
  generation: number;
  universeId: UniverseId;
  policy: DynastyPolicy;
  /** Возраст в начале поколения (0 для основателя). */
  startAge: number;
  /** Возраст смерти. */
  endAge: number;
  deathCause: string | null;
  actions: number;
  liquidAtStart: number;
  estateAtStart: number;
  liquidAtEnd: number;
  heldAtEnd: number;
  estateAtEnd: number;
  peakLiquid: number;
  homeOwnedAtEnd: boolean;
  homeValueAtEnd: number;
  homeConditionAtEnd: number;
  businessesAtEnd: number;
  businessCapitalAtEnd: number;
  businessLiquidationAtEnd: number;
  relicsAtEnd: number;
  chronicleAtEnd: number;
  npcsAtEnd: number;
  stateBytesAtEnd: number;
  /** Наследник, которого выбрал закон, и что он получил. */
  heirId: string | null;
  heirRelation: string | null;
  heirAge: number | null;
  heirRegency: boolean;
  homeInherited: boolean;
  inheritanceGold: number;
  inheritanceHeld: number;
  levy: number;
  spouseShare: number;
  coheirShares: number;
  capLoss: number;
}

export interface DynastyMetrics {
  universeId: UniverseId;
  policy: DynastyPolicy;
  seed: string;
  /** Номер рода внутри мира и уклада; вместе с salt делает прогон воспроизводимым. */
  variant: number;
  generations: GenerationMetrics[];
  maxGeneration: number;
  targetReached: boolean;
  extinct: boolean;
  extinctionGeneration: number | null;
  /** Жизнь остановлена пределом возраста, а не смертью: род не вымер, но и не завершён. */
  endedAtCap: boolean;
  finalLiquid: number;
  finalEstate: number;
  actions: number;
  durationMs: number;
  predecessorIds: string[];
}

export interface GenerationAggregate {
  generation: number;
  dynasties: number;
  liquidMedian: number;
  liquidP90: number;
  liquidMax: number;
  estateMedian: number;
  estateP90: number;
  estateMax: number;
  capHits: number;
}

export interface DynastySoakAggregate {
  dynasties: number;
  universes: UniverseId[];
  policies: DynastyPolicy[];
  dynastiesPerUniverse: number;
  targetGenerations: number;
  maxAge: number;
  durationMs: number;
  reachedTarget: number;
  extinct: number;
  extinctByGeneration: Record<number, number>;
  endedAtCap: number;
  maxGeneration: number;
  medianGeneration: number;
  finalWealth: number[];
  finalEstate: number[];
  finalWealthMedian: number;
  finalEstateMedian: number;
  byGeneration: GenerationAggregate[];
  /** Пары «первое поколение → пятое поколение» только у родов, дошедших до цели. */
  targetCohort: {
    dynasties: number;
    gen1EstateMedian: number;
    gen5EstateMedian: number;
    gen1LiquidMedian: number;
    gen5LiquidMedian: number;
    medianEstateRatio: number;
    maxEstateRatio: number;
    medianLiquidRatio: number;
    maxLiquidRatio: number;
  };
  byUniverse: Record<UniverseId, {
    dynasties: number;
    reachedTarget: number;
    extinct: number;
    maxGeneration: number;
    medianGeneration: number;
  }>;
  byPolicy: Record<DynastyPolicy, {
    dynasties: number;
    reachedTarget: number;
    extinct: number;
    medianGeneration: number;
  }>;
  deathCauses: Record<string, number>;
  homesOwnedAtEnd: number;
  businessesAtEnd: number;
  relicsAtEnd: number;
  maxChronicle: number;
  maxNpcs: number;
  maxStateBytes: number;
  maxHomeValue: number;
  maxLiquid: number;
  maxEstate: number;
  totalActions: number;
  /** Сколько раз род действительно продолжался наследником. */
  successions: number;
  /** Покрытие механик наследования: опека, дом в натуре, сонаследники, вдова, казна. */
  minorSuccessions: number;
  heldSuccessions: number;
  heldTotal: number;
  homeInheritedSuccessions: number;
  coheirSuccessions: number;
  widowSuccessions: number;
  levyTotal: number;
  capLossTotal: number;
}

export interface DynastySoakRun {
  options: Required<Pick<DynastySoakOptions, "dynastiesPerUniverse" | "universeIds" | "policies" | "targetGenerations" | "maxAge">>;
  dynasties: DynastyMetrics[];
  aggregate: DynastySoakAggregate;
}

export class DynastySoakError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DynastySoakError";
  }
}

function invariant(condition: unknown, message: string): asserts condition {
  if (!condition) throw new DynastySoakError(message);
}

function isInt(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && Number.isInteger(value);
}

function utf8Length(text: string): number {
  let bytes = 0;
  for (const character of text) {
    const code = character.codePointAt(0)!;
    bytes += code <= 0x7f ? 1 : code <= 0x7ff ? 2 : code <= 0xffff ? 3 : 4;
  }
  return bytes;
}

function percentile(values: readonly number[], share: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.min(sorted.length - 1, Math.max(0, Math.round((sorted.length - 1) * share)));
  return sorted[index]!;
}

function round(value: number, digits = 1): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function widowOf(state: GameState): NpcState | undefined {
  return state.npcs.find(
    (npc) => npc.alive && npc.formerSpouses.includes(SELF_ID) && npc.log.some((entry) => entry.kind === "widowed" && entry.value === SELF_ID)
  );
}

/** Живое хозяйство: кошелёк + золото под опекой + дом по цене продажи + дела по цене выкупа. */
function estateOf(state: GameState): { liquid: number; held: number; home: number; businesses: number; total: number } {
  const liquid = state.character.wealth;
  const held = state.lineage.inheritance?.held ?? 0;
  const home = state.household.residence === "own" ? saleValueFor(state) : 0;
  const businesses = (state.business?.ventures ?? []).reduce((sum, venture) => sum + businessSaleValue(state, venture), 0);
  return { liquid, held, home, businesses, total: liquid + held + home + businesses };
}

/** saleValue импортирован из index, но локальная обёртка держит проверки в одном месте. */
function saleValueFor(state: GameState): number {
  if (state.household.residence !== "own") return 0;
  const property = findProperty(state.character.universeId, state.household.homeId ?? "");
  if (!property) return 0;
  const condition = Number.isFinite(state.household.condition) ? state.household.condition : 100;
  return Math.round(property.price * (0.55 + Math.max(0, Math.min(100, condition)) / 400));
}

/** Ссылки социальной памяти и родства должны указывать на существующих людей. */
function assertReferences(state: GameState, label: string): void {
  const ids = new Set<string>([SELF_ID, ...state.npcs.map((npc) => npc.id)]);
  invariant(new Set(state.npcs.map((npc) => npc.id)).size === state.npcs.length, `${label}: повтор id NPC`);
  for (const id of state.lineage.selfParents) invariant(ids.has(id), `${label}: selfParents ссылается на ${id}`);
  for (const npc of state.npcs) {
    for (const id of npc.parents) invariant(ids.has(id), `${label}: ${npc.id}.parents → ${id}`);
    if (npc.spouseId !== null) invariant(ids.has(npc.spouseId), `${label}: ${npc.id}.spouseId → ${npc.spouseId}`);
    for (const id of npc.formerSpouses) invariant(ids.has(id), `${label}: ${npc.id}.formerSpouses → ${id}`);
    invariant(npc.spouseId !== npc.id, `${label}: ${npc.id} в браке с собой`);
  }
  if (state.social) {
    invariant(state.social.relationships.length <= MAX_RELATIONSHIPS, `${label}: связей больше предела`);
    invariant(state.social.stories.length <= MAX_STORY_RECORDS, `${label}: сюжетов больше предела`);
    for (const item of state.social.relationships) {
      invariant(ids.has(item.a), `${label}: relationship.a → ${item.a}`);
      invariant(ids.has(item.b), `${label}: relationship.b → ${item.b}`);
      invariant(item.a !== item.b, `${label}: связь ${item.id} сама с собой`);
      invariant(item.a !== SELF_ID && item.b !== SELF_ID, `${label}: связь персонажа попала в память NPC`);
    }
    for (const item of state.social.stories) invariant(ids.has(item.npcId), `${label}: story.npcId → ${item.npcId}`);
  }
}

/** Полная проверка границы поколения: сохранение, лимиты, дубли, ссылки, хозяйство. */
export function assertDynastyState(state: GameState, label: string, expectedGeneration?: number, freshInheritance = false): void {
  const json = JSON.stringify(state);
  const restored = parseSave(JSON.parse(json));
  invariant(restored.schemaVersion === SAVE_SCHEMA_VERSION, `${label}: round trip дал формат ${restored.schemaVersion}`);
  invariant(SAVE_SCHEMA_VERSION === 14, `${label}: схема изменилась (${SAVE_SCHEMA_VERSION})`);
  invariant(JSON.stringify(restored) === json, `${label}: round trip изменил состояние`);
  invariant(state.schemaVersion === 14, `${label}: формат ${state.schemaVersion}`);
  if (expectedGeneration !== undefined) invariant(state.lineage.generation === expectedGeneration, `${label}: поколение ${state.lineage.generation} вместо ${expectedGeneration}`);
  invariant(isInt(state.version) && state.version >= 1, `${label}: версия ${state.version}`);
  invariant(isInt(state.nextSeq) && state.nextSeq >= 1, `${label}: nextSeq ${state.nextSeq}`);
  invariant(isInt(state.nextNpcId) && state.nextNpcId >= 1, `${label}: nextNpcId ${state.nextNpcId}`);
  invariant(isInt(state.life.age) && state.life.age >= 0 && state.life.age <= STAGE03_SOAK_MAX_AGE + 10, `${label}: возраст ${state.life.age}`);
  invariant(isInt(state.character.wealth) && state.character.wealth >= 0 && state.character.wealth <= WEALTH_MAX, `${label}: золото ${state.character.wealth}`);
  invariant(isInt(state.lineage.epoch), `${label}: эпоха рода ${state.lineage.epoch}`);

  // Смерть и продолжение рода
  if (state.life.alive) {
    invariant(state.life.deathAge === null && state.life.deathCause === null, `${label}: живой персонаж с причиной смерти`);
    invariant(state.lineage.continuedBy === null, `${label}: живой персонаж уже продолжен`);
  } else {
    invariant(state.life.deathAge === state.life.age, `${label}: возраст смерти ${state.life.deathAge} ≠ ${state.life.age}`);
    invariant(state.life.deathCause !== null, `${label}: смерть без причины`);
  }
  invariant(state.lineage.lives.length === state.lineage.generation - (state.life.alive ? 1 : 0), `${label}: записей жизней ${state.lineage.lives.length} при поколении ${state.lineage.generation}`);
  invariant(new Set(state.lineage.lives.map((life) => life.gen)).size === state.lineage.lives.length, `${label}: повтор поколения в летописи`);

  // Люди
  invariant(state.npcs.length <= MAX_NPCS, `${label}: людей ${state.npcs.length} больше предела ${MAX_NPCS}`);
  invariant(state.life.alive || state.npcs.every((npc) => npc.id !== SELF_ID), `${label}: SELF_ID попал в список NPC`);
  for (const npc of state.npcs) {
    invariant(npc.wealth >= 0 && npc.wealth <= WEALTH_MAX, `${label}: золото ${npc.id} = ${npc.wealth}`);
    invariant(npc.health >= -100 && npc.health <= 100, `${label}: здоровье ${npc.id} = ${npc.health}`);
    invariant(npc.alive === (npc.status !== "deceased"), `${label}: статус ${npc.id} расходится с alive`);
    invariant(npc.alive === (npc.diedAt === null), `${label}: diedAt ${npc.id} расходится с alive`);
  }
  assertReferences(state, label);

  // Жильё: один дом, аренда или собственный
  if (state.household.residence === "homeless") {
    invariant(state.household.homeId === null, `${label}: дом есть при бездомности`);
  } else {
    invariant(state.household.homeId !== null, `${label}: жилье ${state.household.residence} без дома`);
    invariant(findProperty(state.character.universeId, state.household.homeId) !== undefined, `${label}: неизвестный дом ${state.household.homeId}`);
    invariant(state.household.condition >= 0 && state.household.condition <= 100, `${label}: состояние дома ${state.household.condition}`);
  }
  invariant(state.household.arrears >= 0, `${label}: долг по жилью ${state.household.arrears}`);

  // Дела: не больше двух, без повторов
  invariant(state.business.ventures.length <= MAX_BUSINESSES, `${label}: дел ${state.business.ventures.length} больше ${MAX_BUSINESSES}`);
  const ventureIds = new Set<string>();
  for (const venture of state.business.ventures) {
    invariant(!ventureIds.has(venture.id), `${label}: повтор дела ${venture.id}`);
    ventureIds.add(venture.id);
    invariant(findBusiness(state.character.universeId, venture.id) !== undefined, `${label}: неизвестное дело ${venture.id}`);
    invariant(venture.capital >= 0 && venture.capital <= WEALTH_MAX, `${label}: капитал ${venture.id} = ${venture.capital}`);
    invariant(venture.level >= 0 && venture.level <= 2, `${label}: ступень ${venture.id} = ${venture.level}`);
    invariant(venture.losses >= 0, `${label}: убытки ${venture.id} = ${venture.losses}`);
  }

  // Реликвии: без дублей и не больше каталога
  invariant(state.lineage.relics.length <= STAGE03_MAX_RELICS, `${label}: реликвий ${state.lineage.relics.length}`);
  invariant(new Set(state.lineage.relics.map((relic) => relic.id)).size === state.lineage.relics.length, `${label}: повтор реликвии`);

  // Хроника и социальные пределы
  invariant(state.lineage.chronicle.length <= MAX_CHRONICLE, `${label}: хроника ${state.lineage.chronicle.length} больше ${MAX_CHRONICLE}`);
  invariant(new Set(state.lineage.chronicle.map((entry) => entry.id)).size === state.lineage.chronicle.length, `${label}: повтор записи хроники`);
  invariant(state.location.history.length <= MAX_LOCATION_HISTORY, `${label}: история переездов ${state.location.history.length}`);
  if (state.world) {
    invariant(state.world.tick >= 0, `${label}: тик мира ${state.world.tick}`);
    invariant(state.world.activities.length <= MAX_WORLD_ACTIVITIES, `${label}: событий мира ${state.world.activities.length}`);
  }

  // Наследство: доли, опека и состав имущества
  const inheritance = state.lineage.inheritance;
  if (inheritance) {
    invariant(inheritance.fromGen === state.lineage.generation - 1, `${label}: наследство от поколения ${inheritance.fromGen}`);
    invariant(inheritance.wealth >= 0 && inheritance.wealth <= WEALTH_MAX, `${label}: золото наследства ${inheritance.wealth}`);
    invariant(inheritance.held >= 0 && inheritance.held <= WEALTH_MAX, `${label}: золото под опекой ${inheritance.held}`);
    if (freshInheritance) {
      invariant(inheritance.held === 0 || inheritance.held === inheritance.wealth, `${label}: опека ${inheritance.held} не совпадает с долей ${inheritance.wealth}`);
    }
    invariant(inheritance.controlAge >= 0 && inheritance.controlAge <= 30, `${label}: возраст опеки ${inheritance.controlAge}`);
    invariant(inheritance.shares.length <= MAX_SHARES_REPORTED, `${label}: долей ${inheritance.shares.length}`);
    invariant(new Set(inheritance.relics).size === inheritance.relics.length, `${label}: повтор реликвии в наследстве`);
    if (freshInheritance) {
      invariant(inheritance.relics.length === state.lineage.relics.length, `${label}: реликвии наследства и рода расходятся`);
    }
    for (const reward of inheritance.shares) {
      invariant(reward.amount >= 0 && reward.amount <= WEALTH_MAX, `${label}: доля ${reward.npcId} = ${reward.amount}`);
      if (freshInheritance) invariant(state.npcs.some((npc) => npc.id === reward.npcId), `${label}: доля у отсутствующего ${reward.npcId}`);
    }
    const assets = inheritance.assets;
    if (assets) {
      invariant(assets.liquid >= 0, `${label}: жидкое наследство ${assets.liquid}`);
      invariant(assets.home === null || (assets.home.value >= 0 && findProperty(state.character.universeId, assets.home.id) !== undefined), `${label}: дом наследства`);
      invariant(new Set(assets.businesses.map((item) => item.id)).size === assets.businesses.length, `${label}: повтор дела в наследстве`);
      invariant(assets.total === assets.liquid + (assets.home?.value ?? 0) + assets.businesses.reduce((sum, item) => sum + item.value, 0), `${label}: итог наследства не сходится`);
    }
  }

  // Числа состояния остаются конечными
  assertFiniteNumbers(state, label);
}

function assertFiniteNumbers(value: unknown, where: string, seen = new Set<object>()): void {
  if (typeof value === "number") {
    invariant(Number.isFinite(value), `${where}: не конечное число (${value})`);
    return;
  }
  if (typeof value !== "object" || value === null) return;
  if (seen.has(value)) return;
  seen.add(value);
  if (Array.isArray(value)) {
    value.forEach((item, index) => assertFiniteNumbers(item, `${where}[${index}]`, seen));
    return;
  }
  for (const [key, item] of Object.entries(value)) assertFiniteNumbers(item, `${where}.${key}`, seen);
}

/** Семейный уклад: выбор, который ведёт род дальше. Не меняет правил — только выбирает из доступного. */
function familyScore(effect: Effect): number {
  switch (effect.type) {
    case "npc":
      if (effect.role === "child") return 900;
      if (effect.role === "spouse") return 800;
      if (effect.role === "partner") return 500;
      return 40;
    case "adopt":
      return 700;
    case "npcRole":
      if (effect.to === "spouse") return 850;
      if (effect.to === "ex-partner") return -200;
      return 0;
    case "flag":
      if (effect.set && (effect.flag === "married" || effect.flag === "has-child" || effect.flag === "in-love")) return 400;
      if (!effect.set && (effect.flag === "married" || effect.flag === "has-child" || effect.flag === "in-love")) return -300;
      return 0;
    case "affinity":
      if (effect.role === "child") return 120 + effect.delta;
      if (effect.role === "spouse" || effect.role === "family") return 80 + effect.delta;
      return effect.delta * 0.2;
    case "npcDies":
      return effect.role === "child" || effect.role === "spouse" || effect.role === "family" ? -900 : -200;
    case "kinMissing":
      return -400;
    case "resource":
      if (effect.resource === "health") return effect.delta * 4;
      return effect.delta * 0.3;
    case "death":
      return -100_000;
    case "condition":
      return -500 * (effect.severity ?? 1);
    case "cure":
      return 60;
    case "wealth":
      return Math.max(-30, Math.min(30, effect.delta * 0.1));
    case "reputation":
      return effect.delta * 0.4;
    case "karma":
      return effect.delta * 0.3;
    case "stat":
      return effect.delta > 0 ? 3 : -6;
    case "skill":
      return effect.delta > 0 ? 3 : -3;
    case "track":
      return effect.delta > 0 ? effect.delta * 0.5 : effect.delta;
    case "meter": {
      return effect.delta * 0.2;
    }
    case "weakness":
      return effect.add ? -40 : 40;
    case "talent":
      return 30;
    case "relic":
      return 50;
    case "loseRelic":
      return -50;
    default:
      return 0;
  }
}

function effectScore(state: GameState, effect: Effect): number {
  return familyScore(effect);
}

/** Оценка варианта: ожидаемая ценность успеха и провала с учётом проверки. */
function choiceScore(state: GameState, choice: EventDefinition["choices"][number], policy: DynastyPolicy): number {
  if (policy === "drift") {
    let score = 0;
    for (const effect of choice.success.effects) if (effect.type === "death") score -= 100_000;
    for (const effect of choice.failure?.effects ?? []) if (effect.type === "death") score -= 100_000;
    return score;
  }
  const success = choice.success.effects.reduce((sum, effect) => sum + effectScore(state, effect), 0);
  if (!choice.check) return success;
  const chance = checkChance(state.character, choice.check, state);
  const failure = (choice.failure?.effects ?? []).reduce((sum, effect) => sum + effectScore(state, effect), 0);
  return success * chance + failure * (1 - chance);
}

function choosePending(state: GameState, policy: DynastyPolicy, variant: number, step: number): string {
  const view = presentEvent(state);
  invariant(view !== null, `нет представления ожидающего события ${state.pending?.eventId ?? ""}`);
  const universe = getUniverse(state.character.universeId);
  const event = findEvent(universe, state.pending!.eventId);
  invariant(event !== undefined, `событие ${state.pending!.eventId} не найдено`);
  const available = view.choices.filter((choice) => choice.available);
  invariant(available.length > 0, `событие ${event.id} без доступных вариантов`);
  const scored = available.map((viewChoice, index) => {
    const definition = event.choices.find((choice) => choice.id === viewChoice.id);
    invariant(definition !== undefined, `вариант ${viewChoice.id} не найден в событии`);
    return { id: viewChoice.id, score: choiceScore(state, definition, policy), index };
  });
  const best = Math.max(...scored.map((item) => item.score));
  const top = scored.filter((item) => Number.isFinite(item.score) && item.score === best);
  invariant(top.length > 0, `событие ${event.id}: не удалось сравнить варианты`);
  // Равные варианты разводятся детерминированно: разные seeds и роды дают разные жизни.
  return top[(variant + step) % top.length]!.id;
}

interface LifePlay {
  dead: GameState;
  actions: number;
  peakLiquid: number;
  startLiquid: number;
  startHeld: number;
  startEstate: number;
}

/** Одна жизнь: детерминированно отвечает на события и проживает годы безопасными порциями. */
function playLife(state: GameState, policy: DynastyPolicy, variant: number, salt: number, maxAge: number, label: string): LifePlay {
  let current = state;
  let actions = 0;
  let peakLiquid = current.character.wealth + (current.lineage.inheritance?.held ?? 0);
  const start = estateOf(current);
  const startLiquid = current.character.wealth;
  const startHeld = current.lineage.inheritance?.held ?? 0;
  while (current.life.alive && current.life.age < maxAge) {
    invariant(actions < MAX_ACTIONS_PER_LIFE, `${label}: слишком много действий (${actions})`);
    const years = Math.max(1, Math.min(ACTION_YEARS, maxAge - current.life.age));
    const action = current.pending
      ? { type: "choose" as const, choiceId: choosePending(current, policy, variant, actions + salt) }
      : { type: "advance" as const, years };
    const result = applyAction(current, action);
    invariant(result.state.version === current.version + 1, `${label}: версия ${current.version} → ${result.state.version}`);
    invariant(result.state.life.age >= current.life.age, `${label}: возраст уменьшился`);
    current = result.state;
    actions += 1;
    peakLiquid = Math.max(peakLiquid, current.character.wealth + (current.lineage.inheritance?.held ?? 0));
  }
  if (current.life.alive) {
    // Дожить до предела и не умереть — тоже исход: фиксируем его, но не подменяем смерть.
    invariant(current.life.age >= maxAge, `${label}: жизнь остановилась в ${current.life.age} без смерти`);
  }
  return { dead: current, actions, peakLiquid, startLiquid, startHeld, startEstate: start.total };
}

/** Проверка сохранения и возврат тех же чисел: сохранение — единственный источник истины. */
function stateBytes(state: GameState, label: string): number {
  const json = JSON.stringify(state);
  const parsed = parseSave(JSON.parse(json));
  invariant(JSON.stringify(parsed) === json, `${label}: сохранение не пережило JSON`);
  return utf8Length(json);
}

function generationFrom(state: GameState, play: LifePlay, policy: DynastyPolicy): GenerationMetrics {
  const liquid = state.character.wealth;
  const held = state.lineage.inheritance?.held ?? 0;
  const home = state.household.residence === "own" ? saleValueFor(state) : 0;
  const businessLiquidation = state.business.ventures.reduce((sum, venture) => sum + businessSaleValue(state, venture), 0);
  const estate = liquid + held + home + businessLiquidation;
  return {
    generation: state.lineage.generation,
    universeId: state.character.universeId,
    policy,
    startAge: 0,
    endAge: state.life.age,
    deathCause: state.life.deathCause?.en ?? null,
    actions: play.actions,
    liquidAtStart: 0,
    estateAtStart: 0,
    liquidAtEnd: liquid,
    heldAtEnd: held,
    estateAtEnd: estate,
    peakLiquid: play.peakLiquid,
    homeOwnedAtEnd: state.household.residence === "own",
    homeValueAtEnd: home,
    homeConditionAtEnd: state.household.condition,
    businessesAtEnd: state.business.ventures.length,
    businessCapitalAtEnd: state.business.ventures.reduce((sum, venture) => sum + venture.capital, 0),
    businessLiquidationAtEnd: businessLiquidation,
    relicsAtEnd: state.lineage.relics.length,
    chronicleAtEnd: state.lineage.chronicle.length,
    npcsAtEnd: state.npcs.length,
    stateBytesAtEnd: 0,
    heirId: null,
    heirRelation: null,
    heirAge: null,
    heirRegency: false,
    homeInherited: false,
    inheritanceGold: 0,
    inheritanceHeld: 0,
    levy: 0,
    spouseShare: 0,
    coheirShares: 0,
    capLoss: 0
  };
}

/** Проверка сохранения хозяйства: всё имущество умершего распределено, ничего не удвоилось. */
function assertEstateConservation(dead: GameState, heirState: GameState, record: NonNullable<GameState["lineage"]["inheritance"]>, label: string): {
  levy: number;
  spouseShare: number;
  coheirShares: number;
  capLoss: number;
} {
  const law = INHERITANCE_LAWS[dead.character.universeId];
  const priorHeld = dead.lineage.inheritance?.held ?? 0;
  const preLiquid = dead.character.wealth + priorHeld;
  const preHome = dead.household.residence === "own" ? saleValueFor(dead) : 0;
  const preBusinesses = dead.business.ventures.map((venture) => ({ id: venture.id, value: businessSaleValue(dead, venture) }));
  const preTotal = preLiquid + preHome + preBusinesses.reduce((sum, item) => sum + item.value, 0);

  invariant(record.assets !== undefined, `${label}: запись наследства без оценки имущества`);
  const assets = record.assets;
  invariant(assets.liquid === preLiquid, `${label}: жидкое наследство ${assets.liquid} ≠ ${preLiquid}`);
  invariant((assets.home?.value ?? 0) === preHome, `${label}: дом наследства ${assets.home?.value ?? 0} ≠ ${preHome}`);
  invariant(assets.businesses.length === preBusinesses.length, `${label}: дел в наследстве ${assets.businesses.length} ≠ ${preBusinesses.length}`);
  for (const [index, item] of assets.businesses.entries()) {
    invariant(item.id === preBusinesses[index]!.id && item.value === preBusinesses[index]!.value, `${label}: дело ${item.id} оценено иначе`);
  }
  invariant(assets.total === preTotal, `${label}: итог наследства ${assets.total} ≠ ${preTotal}`);
  invariant(heirState.business.ventures.length === 0, `${label}: дела предшественника не проданы в наследство`);

  const levy = Math.round(preTotal * law.levy);
  const widow = widowOf(dead);
  const spouseShare = widow ? Math.round((preTotal - levy) * law.spouseShare) : 0;
  const shares = record.shares.reduce((sum, item) => sum + item.amount, 0);
  invariant(shares <= WEALTH_MAX, `${label}: сумма долей ${shares}`);
  const homeInKind = record.homeInherited ? preHome : 0;
  invariant(levy + spouseShare + record.wealth + shares + homeInKind === preTotal, `${label}: наследуемое имущество не сходится: ${levy}+${spouseShare}+${record.wealth}+${shares}+${homeInKind} ≠ ${preTotal}`);

  const heirGold = record.ownWealth + (record.held > 0 ? 0 : record.wealth);
  const capLoss = Math.max(0, heirGold - WEALTH_MAX);
  const expected = Math.min(WEALTH_MAX, heirGold);
  invariant(heirState.character.wealth === expected, `${label}: кошелёк наследника ${heirState.character.wealth} ≠ ${expected}`);
  const homeAfter = heirState.household.residence === "own" ? saleValueFor(heirState) : 0;
  const expectedHome = record.homeInherited ? preHome : 0;
  // Единственное округление: состояние дома при передаче округляется до целого, поэтому
  // оценка проданного дома после наследования может отличаться на 1 золото.
  const homeRounding = expectedHome - homeAfter;
  invariant(Math.abs(homeRounding) <= 1, `${label}: дом после наследования ${homeAfter} ≠ ${expectedHome}`);
  invariant(
    heirState.character.wealth + homeAfter + shares + spouseShare + levy + record.held + homeRounding === preTotal + record.ownWealth - capLoss,
    `${label}: итог после наследования не сходится (казна ${levy}, супруг ${spouseShare}, доли ${shares}, опека ${record.held}, округление дома ${homeRounding}, потеря от предела ${capLoss})`
  );

  if (widow) {
    const after = heirState.npcs.find((npc) => npc.id === widow.id);
    invariant(after !== undefined, `${label}: вдова выпала из рода`);
    invariant(after.wealth === widow.wealth + spouseShare, `${label}: доля вдовы ${after.wealth - widow.wealth} ≠ ${spouseShare}`);
  }
  for (const share of record.shares) {
    const npc = heirState.npcs.find((item) => item.id === share.npcId);
    invariant(npc !== undefined && npc.wealth >= share.amount, `${label}: сонаследник ${share.npcId} не получил ${share.amount}`);
  }
  return { levy, spouseShare, coheirShares: shares, capLoss };
}

/** Один род: жизни до смерти, законный наследник, следующее поколение. */
export function runDynasty(universeId: UniverseId, policy: DynastyPolicy, variant: number, options: { targetGenerations?: number; maxAge?: number } = {}): DynastyMetrics {
  const targetGenerations = options.targetGenerations ?? STAGE03_TARGET_GENERATIONS;
  const maxAge = options.maxAge ?? STAGE03_SOAK_MAX_AGE;
  const seed = `stage03-soak-${universeId}-${policy}-${variant}`;
  const startedAt = Date.now();
  let state = newGame({ seed, universeId }).state;
  assertDynastyState(state, `${seed}/birth`, 1);
  const generations: GenerationMetrics[] = [];
  const predecessorIds: string[] = [];
  let actions = 0;
  let extinct = false;
  let extinctionGeneration: number | null = null;
  let endedAtCap = false;

  for (let generation = 1; generation <= targetGenerations; generation++) {
    invariant(state.lineage.generation === generation, `${seed}: поколение ${state.lineage.generation} вместо ${generation}`);
    const startBytes = stateBytes(state, `${seed}/gen${generation}/start`);
    const start = estateOf(state);
    const play = playLife(state, policy, variant, generation, maxAge, `${seed}/gen${generation}`);
    actions += play.actions;
    const dead = play.dead;
    assertDynastyState(dead, `${seed}/gen${generation}/death`, generation);
    const bytes = Math.max(startBytes, stateBytes(dead, `${seed}/gen${generation}/end`));

    const row = generationFrom(dead, play, policy);
    row.startAge = state.life.age;
    row.liquidAtStart = start.liquid;
    row.estateAtStart = start.total;
    row.stateBytesAtEnd = bytes;
    generations.push(row);

    if (!dead.life.alive) {
      // Жизнь закончилась смертью: дальше решает закон наследования.
    } else {
      // Дожить до верхнего предела — не смерть и не вымирание: фиксируем остановку отдельно.
      endedAtCap = true;
      break;
    }

    if (generation >= targetGenerations) break;

    const candidates = heirCandidates(dead);
    const primary = candidates.find((candidate) => candidate.primary && candidate.available);
    if (!primary) {
      extinct = true;
      extinctionGeneration = generation;
      break;
    }
    const result = succeed(dead, primary.npc.id, `stage03-salt-${universeId}-${variant}-${generation}`);
    invariant(result.previous.lineage.continuedBy === primary.npc.id, `${seed}/gen${generation}: род не отмечен продолженным`);
    assertDynastyState(result.state, `${seed}/gen${generation}/heir`, generation + 1, true);
    const record = result.state.lineage.inheritance;
    invariant(record !== null, `${seed}/gen${generation}: нет записи о наследстве`);
    invariant(record.fromNpcId.length > 0, `${seed}/gen${generation}: наследство без предшественника`);
    invariant(!predecessorIds.includes(record.fromNpcId), `${seed}/gen${generation}: повтор предшественника ${record.fromNpcId}`);
    predecessorIds.push(record.fromNpcId);
    invariant(result.state.lineage.generation === generation + 1, `${seed}/gen${generation}: поколение не выросло на единицу`);
    const conservation = assertEstateConservation(dead, result.state, record, `${seed}/gen${generation}`);
    row.heirId = primary.npc.id;
    row.heirRelation = primary.relation;
    row.heirAge = primary.age;
    row.heirRegency = primary.regency;
    row.homeInherited = record.homeInherited === true;
    row.inheritanceGold = record.wealth;
    row.inheritanceHeld = record.held;
    row.levy = conservation.levy;
    row.spouseShare = conservation.spouseShare;
    row.coheirShares = conservation.coheirShares;
    row.capLoss = conservation.capLoss;
    state = result.state;
  }

  const last = generations[generations.length - 1]!;
  return {
    universeId,
    policy,
    seed,
    variant,
    generations,
    maxGeneration: last.generation,
    targetReached: last.generation >= targetGenerations,
    extinct,
    extinctionGeneration,
    endedAtCap,
    finalLiquid: last.liquidAtEnd + last.heldAtEnd,
    finalEstate: last.estateAtEnd,
    actions,
    durationMs: Date.now() - startedAt,
    predecessorIds
  };
}

function groupGeneration(dynasties: readonly DynastyMetrics[], generation: number): GenerationAggregate {
  const rows = dynasties.flatMap((dynasty) => dynasty.generations.filter((row) => row.generation === generation));
  const liquid = rows.map((row) => row.liquidAtEnd + row.heldAtEnd);
  const estate = rows.map((row) => row.estateAtEnd);
  return {
    generation,
    dynasties: rows.length,
    liquidMedian: percentile(liquid, 0.5),
    liquidP90: percentile(liquid, 0.9),
    liquidMax: liquid.length > 0 ? Math.max(...liquid) : 0,
    estateMedian: percentile(estate, 0.5),
    estateP90: percentile(estate, 0.9),
    estateMax: estate.length > 0 ? Math.max(...estate) : 0,
    capHits: rows.filter((row) => row.liquidAtEnd + row.heldAtEnd >= WEALTH_MAX).length
  };
}

export function runStage03Soak(options: DynastySoakOptions = {}): DynastySoakRun {
  const dynastiesPerUniverse = options.dynastiesPerUniverse ?? 2;
  const universeIds = options.universeIds ?? UNIVERSE_IDS;
  const policies = options.policies ?? DYNASTY_POLICIES;
  const targetGenerations = options.targetGenerations ?? STAGE03_TARGET_GENERATIONS;
  const maxAge = options.maxAge ?? STAGE03_SOAK_MAX_AGE;
  invariant(isInt(dynastiesPerUniverse) && dynastiesPerUniverse > 0, "dynastiesPerUniverse должен быть положительным целым");
  invariant(isInt(targetGenerations) && targetGenerations >= 2 && targetGenerations <= 20, "targetGenerations вне разумных границ");
  invariant(isInt(maxAge) && maxAge >= 20 && maxAge <= 1_100, "maxAge вне разумных границ");
  invariant(policies.length > 0, "нужен хотя бы один уклад");

  const startedAt = Date.now();
  const dynasties: DynastyMetrics[] = [];
  for (const universeId of universeIds) {
    for (let variant = 0; variant < dynastiesPerUniverse; variant++) {
      const policy = policies[variant % policies.length]!;
      dynasties.push(runDynasty(universeId, policy, variant, { targetGenerations, maxAge }));
    }
  }

  const deathCauses: Record<string, number> = {};
  for (const dynasty of dynasties) {
    for (const row of dynasty.generations) {
      if (row.deathCause !== null) deathCauses[row.deathCause] = (deathCauses[row.deathCause] ?? 0) + 1;
    }
  }
  const finalRows = dynasties.map((dynasty) => dynasty.generations[dynasty.generations.length - 1]!);
  const successionRows = dynasties.flatMap((dynasty) => dynasty.generations.filter((row) => row.heirId !== null));
  const targetDynasties = dynasties.filter((dynasty) => dynasty.targetReached);
  const pairedEstate: number[] = [];
  const pairedLiquid: number[] = [];
  for (const dynasty of targetDynasties) {
    const first = dynasty.generations.find((row) => row.generation === 1);
    const last = dynasty.generations.find((row) => row.generation === targetGenerations);
    if (!first || !last) continue;
    pairedEstate.push(last.estateAtEnd / Math.max(1, first.estateAtEnd));
    pairedLiquid.push((last.liquidAtEnd + last.heldAtEnd) / Math.max(1, first.liquidAtEnd + first.heldAtEnd));
  }
  const targetCohort = {
    dynasties: pairedEstate.length,
    gen1EstateMedian: percentile(targetDynasties.flatMap((dynasty) => dynasty.generations.filter((row) => row.generation === 1).map((row) => row.estateAtEnd)), 0.5),
    gen5EstateMedian: percentile(targetDynasties.flatMap((dynasty) => dynasty.generations.filter((row) => row.generation === targetGenerations).map((row) => row.estateAtEnd)), 0.5),
    gen1LiquidMedian: percentile(targetDynasties.flatMap((dynasty) => dynasty.generations.filter((row) => row.generation === 1).map((row) => row.liquidAtEnd + row.heldAtEnd)), 0.5),
    gen5LiquidMedian: percentile(targetDynasties.flatMap((dynasty) => dynasty.generations.filter((row) => row.generation === targetGenerations).map((row) => row.liquidAtEnd + row.heldAtEnd)), 0.5),
    medianEstateRatio: percentile(pairedEstate, 0.5),
    maxEstateRatio: pairedEstate.length > 0 ? Math.max(...pairedEstate) : 0,
    medianLiquidRatio: percentile(pairedLiquid, 0.5),
    maxLiquidRatio: pairedLiquid.length > 0 ? Math.max(...pairedLiquid) : 0
  };
  const extinctByGeneration: Record<number, number> = {};
  for (const dynasty of dynasties) {
    if (dynasty.extinctionGeneration !== null) extinctByGeneration[dynasty.extinctionGeneration] = (extinctByGeneration[dynasty.extinctionGeneration] ?? 0) + 1;
  }
  const generations = dynasties.map((dynasty) => dynasty.maxGeneration);
  const byUniverse = Object.fromEntries(universeIds.map((universeId) => {
    const group = dynasties.filter((dynasty) => dynasty.universeId === universeId);
    const groupGenerations = group.map((dynasty) => dynasty.maxGeneration);
    return [universeId, {
      dynasties: group.length,
      reachedTarget: group.filter((dynasty) => dynasty.targetReached).length,
      extinct: group.filter((dynasty) => dynasty.extinct).length,
      maxGeneration: groupGenerations.length > 0 ? Math.max(...groupGenerations) : 0,
      medianGeneration: percentile(groupGenerations, 0.5)
    }];
  })) as DynastySoakAggregate["byUniverse"];
  const byPolicy = Object.fromEntries(policies.map((policy) => {
    const group = dynasties.filter((dynasty) => dynasty.policy === policy);
    const groupGenerations = group.map((dynasty) => dynasty.maxGeneration);
    return [policy, {
      dynasties: group.length,
      reachedTarget: group.filter((dynasty) => dynasty.targetReached).length,
      extinct: group.filter((dynasty) => dynasty.extinct).length,
      medianGeneration: percentile(groupGenerations, 0.5)
    }];
  })) as DynastySoakAggregate["byPolicy"];

  const aggregate: DynastySoakAggregate = {
    dynasties: dynasties.length,
    universes: [...universeIds],
    policies: [...policies],
    dynastiesPerUniverse,
    targetGenerations,
    maxAge,
    durationMs: Date.now() - startedAt,
    reachedTarget: dynasties.filter((dynasty) => dynasty.targetReached).length,
    extinct: dynasties.filter((dynasty) => dynasty.extinct).length,
    extinctByGeneration,
    endedAtCap: dynasties.filter((dynasty) => dynasty.endedAtCap).length,
    maxGeneration: generations.length > 0 ? Math.max(...generations) : 0,
    medianGeneration: percentile(generations, 0.5),
    finalWealth: finalRows.map((row) => row.liquidAtEnd + row.heldAtEnd),
    finalEstate: finalRows.map((row) => row.estateAtEnd),
    finalWealthMedian: percentile(finalRows.map((row) => row.liquidAtEnd + row.heldAtEnd), 0.5),
    finalEstateMedian: percentile(finalRows.map((row) => row.estateAtEnd), 0.5),
    byGeneration: Array.from({ length: targetGenerations }, (_, index) => groupGeneration(dynasties, index + 1)),
    targetCohort,
    byUniverse,
    byPolicy,
    deathCauses,
    homesOwnedAtEnd: finalRows.filter((row) => row.homeOwnedAtEnd).length,
    businessesAtEnd: finalRows.reduce((sum, row) => sum + row.businessesAtEnd, 0),
    relicsAtEnd: finalRows.reduce((sum, row) => sum + row.relicsAtEnd, 0),
    maxChronicle: Math.max(...finalRows.map((row) => row.chronicleAtEnd)),
    maxNpcs: Math.max(...finalRows.map((row) => row.npcsAtEnd)),
    maxStateBytes: Math.max(...finalRows.map((row) => row.stateBytesAtEnd)),
    maxHomeValue: Math.max(...finalRows.map((row) => row.homeValueAtEnd)),
    maxLiquid: Math.max(...finalRows.map((row) => row.liquidAtEnd + row.heldAtEnd)),
    maxEstate: Math.max(...finalRows.map((row) => row.estateAtEnd)),
    totalActions: dynasties.reduce((sum, dynasty) => sum + dynasty.actions, 0),
    successions: successionRows.length,
    minorSuccessions: successionRows.filter((row) => row.heirRegency).length,
    heldSuccessions: successionRows.filter((row) => row.inheritanceHeld > 0).length,
    heldTotal: successionRows.reduce((sum, row) => sum + row.inheritanceHeld, 0),
    homeInheritedSuccessions: successionRows.filter((row) => row.homeInherited).length,
    coheirSuccessions: successionRows.filter((row) => row.coheirShares > 0).length,
    widowSuccessions: successionRows.filter((row) => row.spouseShare > 0).length,
    levyTotal: successionRows.reduce((sum, row) => sum + row.levy, 0),
    capLossTotal: successionRows.reduce((sum, row) => sum + row.capLoss, 0)
  };

  invariant(aggregate.maxStateBytes <= STAGE03_STATE_BYTES_LIMIT, `размер состояния ${aggregate.maxStateBytes} больше предела ${STAGE03_STATE_BYTES_LIMIT}`);
  for (const row of dynasties.flatMap((dynasty) => dynasty.generations)) {
    invariant(row.liquidAtEnd >= 0, `${row.universeId}: отрицательное золото ${row.liquidAtEnd}`);
    invariant(row.estateAtEnd >= 0, `${row.universeId}: отрицательное хозяйство ${row.estateAtEnd}`);
    invariant(row.businessesAtEnd <= MAX_BUSINESSES, `${row.universeId}: дел ${row.businessesAtEnd}`);
    invariant(row.relicsAtEnd <= STAGE03_MAX_RELICS, `${row.universeId}: реликвий ${row.relicsAtEnd}`);
  }

  return {
    options: { dynastiesPerUniverse, universeIds, policies, targetGenerations, maxAge },
    dynasties,
    aggregate
  };
}

/** Проверка границ инфляции: абсолютный предел на род и рост медиан от первого поколения к пятому. */
export function assertStage03Inflation(run: DynastySoakRun): void {
  for (const dynasty of run.dynasties) {
    for (const row of dynasty.generations) {
      const liquid = row.liquidAtEnd + row.heldAtEnd;
      invariant(liquid <= STAGE03_LIQUID_CAP, `${dynasty.seed}/gen${row.generation}: жидкое золото ${liquid} выше предела ${STAGE03_LIQUID_CAP}`);
      invariant(row.estateAtEnd <= STAGE03_ESTATE_CAP, `${dynasty.seed}/gen${row.generation}: хозяйство ${row.estateAtEnd} выше предела ${STAGE03_ESTATE_CAP}`);
    }
  }
  const cohort = run.aggregate.targetCohort;
  if (cohort.dynasties === 0) return;
  const estateBound = STAGE03_GEN5_ESTATE_MULTIPLIER * cohort.gen1EstateMedian + STAGE03_GROWTH_FLOOR;
  const liquidBound = STAGE03_GEN5_LIQUID_MULTIPLIER * cohort.gen1LiquidMedian + STAGE03_GROWTH_FLOOR;
  invariant(cohort.gen5EstateMedian <= estateBound, `медиана хозяйства 5-го поколения ${cohort.gen5EstateMedian} выше предела ${estateBound} (${cohort.gen1EstateMedian} × ${STAGE03_GEN5_ESTATE_MULTIPLIER} + ${STAGE03_GROWTH_FLOOR})`);
  invariant(cohort.gen5LiquidMedian <= liquidBound, `медиана золота 5-го поколения ${cohort.gen5LiquidMedian} выше предела ${liquidBound} (${cohort.gen1LiquidMedian} × ${STAGE03_GEN5_LIQUID_MULTIPLIER} + ${STAGE03_GROWTH_FLOOR})`);
  invariant(cohort.medianEstateRatio <= STAGE03_MEDIAN_ESTATE_RATIO_LIMIT, `медианный рост хозяйства ${round(cohort.medianEstateRatio, 2)}× выше предела ${STAGE03_MEDIAN_ESTATE_RATIO_LIMIT}×`);
  invariant(cohort.medianLiquidRatio <= STAGE03_MEDIAN_LIQUID_RATIO_LIMIT, `медианный рост золота ${round(cohort.medianLiquidRatio, 2)}× выше предела ${STAGE03_MEDIAN_LIQUID_RATIO_LIMIT}×`);
}

export function formatStage03Soak(run: DynastySoakRun): string {
  const a = run.aggregate;
  const generations = a.byGeneration.map((row) => `  gen ${row.generation}: dynasties ${row.dynasties}, liquid p50 ${row.liquidMedian}/p90 ${row.liquidP90}/max ${row.liquidMax}, estate p50 ${row.estateMedian}/p90 ${row.estateP90}/max ${row.estateMax}, cap ${row.capHits}`);
  const causes = Object.entries(a.deathCauses).sort((left, right) => right[1] - left[1]).map(([cause, count]) => `${cause}: ${count}`).join("; ");
  const universes = a.universes.map((universeId) => {
    const g = a.byUniverse[universeId];
    return `  ${universeId}: dynasties ${g.dynasties}, reached ${g.reachedTarget}, extinct ${g.extinct}, max gen ${g.maxGeneration}, median gen ${g.medianGeneration}`;
  });
  const policies = a.policies.map((policy) => {
    const g = a.byPolicy[policy];
    return `  ${policy}: dynasties ${g.dynasties}, reached ${g.reachedTarget}, extinct ${g.extinct}, median gen ${g.medianGeneration}`;
  });
  const extinct = Object.entries(a.extinctByGeneration).sort((left, right) => Number(left[0]) - Number(right[0])).map(([gen, count]) => `gen ${gen}: ${count}`).join(", ");
  return [
    `Stage 03.5 dynasty soak — ${a.dynasties} dynasties (${a.universes.length} universes × ${a.dynastiesPerUniverse}), target ${a.targetGenerations} generations, ${a.durationMs} ms`,
    `Dynasties: reached target ${a.reachedTarget}/${a.dynasties}, extinct ${a.extinct}, stopped at age cap ${a.endedAtCap}, max generation ${a.maxGeneration}, median generation ${a.medianGeneration}; extinction by generation: ${extinct || "none"}`,
    `Target cohort: ${a.targetCohort.dynasties} dynasties; gen1 estate p50 ${a.targetCohort.gen1EstateMedian} → gen5 ${a.targetCohort.gen5EstateMedian}; paired ratio p50 ${round(a.targetCohort.medianEstateRatio, 2)}×, max ${round(a.targetCohort.maxEstateRatio, 2)}×; liquid p50 ${a.targetCohort.gen1LiquidMedian} → ${a.targetCohort.gen5LiquidMedian}, ratio p50 ${round(a.targetCohort.medianLiquidRatio, 2)}×, max ${round(a.targetCohort.maxLiquidRatio, 2)}×`,
    `Actions: ${a.totalActions}; deaths: ${causes || "none"}`,
    `Successions: ${a.successions} total, minor/regency ${a.minorSuccessions}, held ${a.heldSuccessions} (${a.heldTotal} gold), home in kind ${a.homeInheritedSuccessions}, coheirs ${a.coheirSuccessions}, widow ${a.widowSuccessions}, levy ${a.levyTotal}, cap loss ${a.capLossTotal}`,
    `At final generation: homes owned ${a.homesOwnedAtEnd}, businesses ${a.businessesAtEnd}, relics ${a.relicsAtEnd}, max chronicle ${a.maxChronicle}, max NPCs ${a.maxNpcs}`,
    `State: max ${a.maxStateBytes} B (${round(a.maxStateBytes / 1024)} KiB)`,
    `Wealth: final liquid p50 ${a.finalWealthMedian}, max ${a.maxLiquid}; final estate p50 ${a.finalEstateMedian}, max ${a.maxEstate}; max home value ${a.maxHomeValue}`,
    "By generation:",
    ...generations,
    "By universe:",
    ...universes,
    "By policy:",
    ...policies
  ].join("\n");
}
