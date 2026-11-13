// Stage 02.6: детерминированный прогон жизни от рождения до смерти.
// Использует только публичные API пакета: newGame/applyAction/present*/parseSave и справочники мира.
// Ничего не мутирует вне applyAction: проверки и метрики читают состояние, но не меняют его.
import {
  applyAction,
  careerWage,
  checkChance,
  educationTier,
  findBusiness,
  findCareerTrack,
  findEducation,
  findEvent,
  findProperty,
  getUniverse,
  MAX_ADVENTURE_LOG,
  MAX_ARREARS,
  MAX_BUSINESSES,
  MAX_BUSINESS_LOSSES,
  MAX_CHRONICLE,
  MAX_ECONOMY_YEARS,
  MAX_EDUCATION_DURATION,
  MAX_HEALTH_CONDITIONS,
  MAX_LOCATION_HISTORY,
  MAX_NPCS,
  MAX_RELATIONSHIPS,
  MAX_STORY_RECORDS,
  MAX_WORLD_ACTIVITIES,
  newGame,
  parseSave,
  presentEvent,
  presentLocation,
  RECENT_LIMIT,
  SAVE_SCHEMA_VERSION,
  settlementSeeds,
  UNIVERSE_IDS,
  WEALTH_MAX,
  type ActionResult,
  type EventDefinition,
  type GameState,
  type HistoryEntry,
  type UniverseId
} from "../src/index.js";

export const SOAK_MAX_AGE = 90;
export const SOAK_PLAYBOOKS = ["scholar", "worker", "estate", "wanderer"] as const;
export type SoakPlaybook = (typeof SOAK_PLAYBOOKS)[number];

/** Предел состояния одной жизни. 256 КиБ с запасом: обычная жизнь занимает десятки килобайт. */
export const SOAK_STATE_BYTES_LIMIT = 256 * 1024;
/** Предел записей истории одной жизни: 90 лет не могут дать больше. */
export const SOAK_HISTORY_LIMIT = 600;
const MEMORY_LIMIT = 12;
const SCHEDULED_LIMIT = 20;
const CONSEQUENCE_LIMIT = 12;
const MAX_ACTIONS = 1200;
const ACTION_YEARS = 3;

/** Длина строки в UTF-8 без зависимости от Node/DOM: сохранение в основном кириллица. */
function utf8Length(text: string): number {
  let bytes = 0;
  for (const character of text) {
    const code = character.codePointAt(0)!;
    bytes += code <= 0x7f ? 1 : code <= 0x7ff ? 2 : code <= 0xffff ? 3 : 4;
  }
  return bytes;
}

export interface SoakOptions {
  /** Сколько жизней на каждый мир и каждый уклад игры. 3 = 72 жизни, 42 = 1008 жизней. */
  livesPerUniverse?: number;
  universeIds?: readonly UniverseId[];
  playbooks?: readonly SoakPlaybook[];
  maxAge?: number;
  /** Остановиться на первой ошибке инварианта вместо сбора всех нарушений. */
  failFast?: boolean;
}

export interface SoakLifeMetrics {
  universeId: UniverseId;
  playbook: SoakPlaybook;
  seed: string;
  /** Возраст смерти или возраст остановки прогона. */
  endAge: number;
  aliveAtEnd: boolean;
  deathCause: string | null;
  yearsLived: number;
  actions: number;
  historyEntries: number;
  events: number;
  educationTier: number;
  educationCompleted: boolean;
  everEmployed: boolean;
  everPromoted: boolean;
  everRetired: boolean;
  employedAtEnd: boolean;
  retiredAtEnd: boolean;
  professionId: string | null;
  finalRank: number;
  tenure: number;
  maxWage: number;
  everRented: boolean;
  everOwned: boolean;
  ownHomeAtEnd: boolean;
  homeConditionAtEnd: number;
  businessOpened: number;
  businessFailed: number;
  businessSold: number;
  businessClosed: number;
  businessActiveAtEnd: number;
  maxBusinessLevel: number;
  businessCapitalAtEnd: number;
  travels: number;
  visitedSettlements: number;
  travelSpend: number;
  finalWealth: number;
  peakWealth: number;
  minHealth: number;
  conditionsAtEnd: number;
  maxConditions: number;
  stateBytes: number;
  maxStateBytes: number;
  maxNpcs: number;
  maxScheduled: number;
  maxConsequences: number;
  maxMemory: number;
  maxRecentEvents: number;
  maxWorldActivities: number;
  maxEconomyYears: number;
  maxLocationHistory: number;
  maxSocialRelationships: number;
  maxSocialStories: number;
  maxChronicle: number;
  maxNames: number;
  maxMilestones: number;
  maxFlags: number;
  /** Короткий отпечаток финального состояния: для проверки детерминизма без хранения всех состояний. */
  fingerprint: string;
}

export interface SoakGroupMetrics {
  lives: number;
  deathMedian: number;
  deathP10: number;
  deathP90: number;
  aliveAtEnd: number;
  educationTier2Plus: number;
  everEmployed: number;
  everPromoted: number;
  everRetired: number;
  everRented: number;
  everOwned: number;
  businessLives: number;
  businessFailedLives: number;
  travelLives: number;
  finalWealthP50: number;
  finalWealthP90: number;
  conditionLives: number;
  deathCauses: Record<string, number>;
}

export interface SoakAggregate {
  lives: number;
  universes: UniverseId[];
  playbooks: SoakPlaybook[];
  maxAge: number;
  durationMs: number;
  deathAges: number[];
  deathCauses: Record<string, number>;
  educationTiers: Record<number, number>;
  conditionLives: number;
  minHealth: number;
  maxWage: number;
  byUniverse: Record<UniverseId, SoakGroupMetrics>;
  aliveAtEnd: number;
  everEmployed: number;
  everPromoted: number;
  everRetired: number;
  employedAtEnd: number;
  retiredAtEnd: number;
  everRented: number;
  everOwned: number;
  ownHomeAtEnd: number;
  businessLives: number;
  businessFailedLives: number;
  businessActiveAtEnd: number;
  travelLives: number;
  totalTravels: number;
  finalWealth: number[];
  peakWealth: number;
  capHits: number;
  stateBytes: number[];
  maxStateBytes: number;
  maxHistoryEntries: number;
  maxima: {
    npcs: number;
    conditions: number;
    scheduled: number;
    consequences: number;
    memory: number;
    recentEvents: number;
    worldActivities: number;
    economyYears: number;
    locationHistory: number;
    socialRelationships: number;
    socialStories: number;
    chronicle: number;
    names: number;
    milestones: number;
    flags: number;
  };
}

export interface SoakRun {
  options: Required<Pick<SoakOptions, "livesPerUniverse" | "universeIds" | "playbooks" | "maxAge">>;
  lifeMetrics: SoakLifeMetrics[];
  aggregate: SoakAggregate;
}

export class SoakInvariantError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SoakInvariantError";
  }
}

function invariant(condition: unknown, message: string): asserts condition {
  if (!condition) throw new SoakInvariantError(message);
}

function isFiniteInt(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && Number.isInteger(value);
}



function percentile(values: readonly number[], share: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.min(sorted.length - 1, Math.max(0, Math.round((sorted.length - 1) * share)));
  return sorted[index]!;
}

function mean(values: readonly number[]): number {
  return values.length === 0 ? 0 : values.reduce((sum, value) => sum + value, 0) / values.length;
}

function round(value: number, digits = 1): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function groupMetrics(lives: readonly SoakLifeMetrics[]): SoakGroupMetrics {
  const deaths = lives.filter((life) => !life.aliveAtEnd).map((life) => life.endAge);
  const wealth = lives.map((life) => life.finalWealth);
  const deathCauses: Record<string, number> = {};
  for (const life of lives) {
    if (!life.aliveAtEnd && life.deathCause !== null) deathCauses[life.deathCause] = (deathCauses[life.deathCause] ?? 0) + 1;
  }
  return {
    lives: lives.length,
    deathMedian: percentile(deaths, 0.5),
    deathP10: percentile(deaths, 0.1),
    deathP90: percentile(deaths, 0.9),
    aliveAtEnd: lives.filter((life) => life.aliveAtEnd).length,
    educationTier2Plus: lives.filter((life) => life.educationTier >= 2).length,
    everEmployed: lives.filter((life) => life.everEmployed).length,
    everPromoted: lives.filter((life) => life.everPromoted).length,
    everRetired: lives.filter((life) => life.everRetired).length,
    everRented: lives.filter((life) => life.everRented).length,
    everOwned: lives.filter((life) => life.everOwned).length,
    businessLives: lives.filter((life) => life.businessOpened > 0).length,
    businessFailedLives: lives.filter((life) => life.businessFailed > 0).length,
    travelLives: lives.filter((life) => life.travels > 0).length,
    finalWealthP50: percentile(wealth, 0.5),
    finalWealthP90: percentile(wealth, 0.9),
    conditionLives: lives.filter((life) => life.maxConditions > 0).length,
    deathCauses
  };
}

/** Глубокая проверка на NaN/Infinity: сохранение не должно содержать нечисловых чисел. */
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

function assertEducation(state: GameState, label: string): void {
  const universe = getUniverse(state.character.universeId);
  const education = state.education;
  const completedTier = educationTier(universe, state.character);
  if (education.currentId !== null) {
    const current = findEducation(universe, education.currentId);
    invariant(current !== undefined, `${label}: неизвестный курс обучения ${education.currentId}`);
    invariant(education.duration >= 1 && education.duration <= MAX_EDUCATION_DURATION, `${label}: длительность курса ${education.duration}`);
    invariant(education.progress >= 0 && education.progress < education.duration, `${label}: прогресс курса ${education.progress}/${education.duration}`);
    invariant(education.startedAt >= 0 && education.startedAt <= state.life.age, `${label}: курс начат в будущем`);
    invariant(education.progress <= state.life.age - education.startedAt, `${label}: прогресс курса обгоняет возраст`);
    invariant(current.tier === completedTier + 1, `${label}: курс ступени ${current.tier} без предыдущей (${completedTier})`);
  } else {
    invariant(education.progress === 0 && education.duration === 0 && education.startedAt === 0, `${label}: пустой курс с ненулевыми полями`);
  }
}

function assertCareer(state: GameState, label: string): void {
  const career = state.career;
  invariant(!(career.employed && career.retired), `${label}: одновременно работает и на покое`);
  invariant(career.employed !== true || state.character.professionId !== null, `${label}: работает без профессии`);
  invariant(career.retired !== true || state.character.professionId !== null, `${label}: на покое без профессии`);
  invariant(isFiniteInt(career.rank) && career.rank >= 0, `${label}: ступень карьеры ${career.rank}`);
  invariant(isFiniteInt(career.since) && career.since >= 0 && career.since <= state.life.age, `${label}: карьера начата в будущем`);
  invariant(isFiniteInt(career.tenure) && career.tenure >= 0 && career.tenure <= state.life.age, `${label}: стаж ${career.tenure} больше возраста`);
  const track = findCareerTrack(state.character.universeId, state.character.professionId);
  if (state.character.professionId !== null) {
    invariant(track !== undefined, `${label}: профессия без карьерного пути ${state.character.professionId}`);
    invariant(career.rank <= track.ranks.length - 1, `${label}: ступень ${career.rank} выше лестницы`);
    if (career.employed) {
      const wage = careerWage(state);
      invariant(Number.isFinite(wage) && wage > 0, `${label}: работа без жалованья (${wage})`);
    }
  } else {
    invariant(career.rank === 0 && career.tenure === 0 && career.since === 0, `${label}: карьера без профессии не пуста`);
  }
}

function assertHousehold(state: GameState, label: string): void {
  const household = state.household;
  invariant(household.since >= 0 && household.since <= state.life.age, `${label}: жильё начато в будущем`);
  invariant(household.arrears >= 0 && household.arrears <= MAX_ARREARS, `${label}: долг по жилью ${household.arrears}`);
  if (household.residence === "homeless") {
    invariant(household.homeId === null && household.condition === 0, `${label}: бездомный с домом`);
    return;
  }
  invariant(household.homeId !== null, `${label}: жильё без дома`);
  const property = findProperty(state.character.universeId, household.homeId);
  invariant(property !== undefined, `${label}: неизвестный дом ${household.homeId}`);
  invariant(household.condition >= 0 && household.condition <= 100, `${label}: состояние дома ${household.condition}`);
  if (household.residence === "rent") {
    invariant(property.rent > 0 && household.condition === 0, `${label}: аренда с невозможными полями`);
  }
}

function assertBusiness(state: GameState, label: string): void {
  invariant(state.business.ventures.length <= MAX_BUSINESSES, `${label}: дел больше ${MAX_BUSINESSES}`);
  const seen = new Set<string>();
  for (const venture of state.business.ventures) {
    invariant(!seen.has(venture.id), `${label}: повтор дела ${venture.id}`);
    seen.add(venture.id);
    const definition = findBusiness(state.character.universeId, venture.id);
    invariant(definition !== undefined, `${label}: неизвестное дело ${venture.id}`);
    invariant(venture.foundedAge >= 0 && venture.foundedAge <= state.life.age, `${label}: дело открыто в будущем`);
    invariant(venture.level >= 0 && venture.level <= definition.maxLevel, `${label}: ступень дела ${venture.level}`);
    invariant(venture.capital >= 0 && venture.capital <= WEALTH_MAX, `${label}: капитал дела ${venture.capital}`);
    invariant(venture.years >= 0 && venture.years <= state.life.age - venture.foundedAge, `${label}: годы дела обгоняют возраст`);
    invariant(venture.losses >= 0 && venture.losses <= MAX_BUSINESS_LOSSES, `${label}: убыточные годы ${venture.losses}`);
  }
}

function assertLocation(state: GameState, label: string): void {
  const seeds = settlementSeeds(getUniverse(state.character.universeId));
  const known = new Set(seeds.map((seed) => seed.id));
  invariant(known.has(state.location.settlementId), `${label}: неизвестное поселение ${state.location.settlementId}`);
  invariant(state.location.history.length <= MAX_LOCATION_HISTORY, `${label}: история переездов больше предела`);
  for (const move of state.location.history) {
    invariant(known.has(move.from) && known.has(move.to) && move.from !== move.to, `${label}: переезд в неизвестное место`);
    invariant(move.age >= 0 && move.age <= state.life.age, `${label}: переезд в будущем`);
    invariant(move.cost >= 0 && move.cost <= WEALTH_MAX, `${label}: цена переезда ${move.cost}`);
  }
}

function assertHealth(state: GameState, label: string): void {
  invariant(isFiniteInt(state.health.value) && state.health.value >= 0 && state.health.value <= 100, `${label}: здоровье ${state.health.value}`);
  invariant(state.health.conditions.length <= MAX_HEALTH_CONDITIONS, `${label}: болезней больше ${MAX_HEALTH_CONDITIONS}`);
  const ids = new Set<string>();
  for (const condition of state.health.conditions) {
    invariant(!ids.has(condition.id), `${label}: повтор болезни ${condition.id}`);
    ids.add(condition.id);
    invariant(condition.severity >= 1 && condition.severity <= 3, `${label}: тяжесть ${condition.severity}`);
    invariant(condition.damage >= 1 && condition.damage <= 20, `${label}: урон болезни ${condition.damage}`);
    invariant(condition.remaining >= 0 && condition.remaining <= 20, `${label}: срок болезни ${condition.remaining}`);
    invariant(condition.onsetAge >= 0 && condition.onsetAge <= state.life.age, `${label}: болезнь началась в будущем`);
    invariant(typeof condition.recoverable === "boolean" && typeof condition.lethal === "boolean", `${label}: флаги болезни`);
  }
  if (!state.life.alive) invariant(state.health.deathCause === state.life.deathCause, `${label}: причины смерти расходятся`);
}

function assertCommon(state: GameState, label: string): void {
  invariant(isFiniteInt(state.life.age) && state.life.age >= 0 && state.life.age <= SOAK_MAX_AGE + 30, `${label}: возраст ${state.life.age}`);
  invariant(isFiniteInt(state.version) && state.version >= 1, `${label}: версия ${state.version}`);
  invariant(isFiniteInt(state.nextSeq) && state.nextSeq >= 1, `${label}: номер истории ${state.nextSeq}`);
  invariant(isFiniteInt(state.character.wealth) && state.character.wealth >= 0 && state.character.wealth <= WEALTH_MAX, `${label}: золото ${state.character.wealth}`);
  for (const [key, value] of Object.entries(state.character.stats)) {
    invariant(isFiniteInt(value) && value >= 1 && value <= 100, `${label}: характеристика ${key} = ${value}`);
  }
  for (const [key, value] of Object.entries(state.character.resources)) {
    invariant(isFiniteInt(value) && value >= 0, `${label}: запас ${key} = ${value}`);
  }
  for (const [key, value] of Object.entries(state.character.skills)) {
    invariant(isFiniteInt(value) && value >= 0 && value <= 100, `${label}: навык ${key} = ${value}`);
  }
  invariant(state.character.reputation >= -100 && state.character.reputation <= 100, `${label}: репутация`);
  invariant(state.character.karma >= -100 && state.character.karma <= 100, `${label}: карма`);
  const ranks = getUniverse(state.character.universeId).track.ranks;
  invariant(state.character.track.rank >= 0 && state.character.track.rank < ranks.length, `${label}: ранг пути ${state.character.track.rank}`);
  invariant(state.character.track.points >= 0, `${label}: очки пути ${state.character.track.points}`);
  invariant(state.npcs.length <= MAX_NPCS, `${label}: людей больше ${MAX_NPCS}`);
  invariant(new Set(state.npcs.map((npc) => npc.id)).size === state.npcs.length, `${label}: повтор id человека`);
  invariant(state.pending === null || state.pending.age <= state.life.age, `${label}: ожидающее событие из будущего`);
  invariant(state.scheduled.length <= SCHEDULED_LIMIT, `${label}: очередь событий ${state.scheduled.length}`);
  invariant(state.consequences.length <= CONSEQUENCE_LIMIT, `${label}: последствий ${state.consequences.length}`);
  invariant(state.memory.length <= MEMORY_LIMIT, `${label}: решений ${state.memory.length}`);
  invariant(state.recentEvents.length <= RECENT_LIMIT, `${label}: недавних событий ${state.recentEvents.length}`);
  invariant(new Set(state.flags).size === state.flags.length, `${label}: повтор флага`);
  invariant(state.milestones.triggered.length <= 100, `${label}: вех ${state.milestones.triggered.length}`);
  // Прогон — одна жизнь без наследования: род не должен сам двигаться вперёд.
  invariant(state.lineage.generation === 1, `${label}: род перешёл в поколение ${state.lineage.generation}`);
  invariant(state.lineage.continuedBy === null, `${label}: жизнь продолжили наследником`);
  invariant(state.lineage.lives.length <= 1, `${label}: в роду больше одной сыгранной жизни`);
  const world = state.world;
  if (world) {
    invariant(world.tick >= 0 && world.tick <= state.life.age, `${label}: тик мира ${world.tick} обгоняет возраст`);
    invariant(world.activities.length <= MAX_WORLD_ACTIVITIES, `${label}: событий мира ${world.activities.length}`);
  }
  invariant(state.economy.years.length <= MAX_ECONOMY_YEARS, `${label}: лет хозяйства ${state.economy.years.length}`);
  invariant(state.economy.hardship >= 0 && state.economy.hardship <= 100, `${label}: нужда ${state.economy.hardship}`);
  invariant((state.lineage.chronicle ?? []).length <= MAX_CHRONICLE, `${label}: хроника рода больше ${MAX_CHRONICLE}`);
  if (state.social) {
    invariant(state.social.relationships.length <= MAX_RELATIONSHIPS, `${label}: связей ${state.social.relationships.length}`);
    invariant(state.social.stories.length <= MAX_STORY_RECORDS, `${label}: сюжетов ${state.social.stories.length}`);
  }
  if (state.adventure) invariant(state.adventure.log.length <= MAX_ADVENTURE_LOG, `${label}: журнал приключений`);
  for (const [id, value] of Object.entries(state.occurrences)) {
    invariant(isFiniteInt(value) && value >= 0, `${label}: счётчик ${id} = ${value}`);
    const last = state.lastSeen[id];
    invariant(last === undefined || (isFiniteInt(last) && last <= state.life.age), `${label}: последний раз ${id} в будущем`);
  }
  for (const value of Object.values(state.lastSeen)) invariant(isFiniteInt(value) && value >= 0, `${label}: возраст lastSeen`);
  if (!state.life.alive) {
    invariant(state.life.deathAge === state.life.age, `${label}: возраст смерти ${state.life.deathAge} не совпадает с ${state.life.age}`);
    invariant(state.life.deathCause !== null, `${label}: смерть без причины`);
  }
}

function assertState(state: GameState, label: string): void {
  assertCommon(state, label);
  assertHealth(state, label);
  assertEducation(state, label);
  assertCareer(state, label);
  assertHousehold(state, label);
  assertBusiness(state, label);
  assertLocation(state, label);
}

function checkRoundTrip(state: GameState, label: string): number {
  const json = JSON.stringify(state);
  const parsed = parseSave(JSON.parse(json));
  invariant(parsed.schemaVersion === SAVE_SCHEMA_VERSION, `${label}: round trip дал формат ${parsed.schemaVersion}`);
  invariant(parsed.seed === state.seed && parsed.rngState === state.rngState, `${label}: round trip потерял seed/rngState`);
  invariant(parsed.life.age === state.life.age && parsed.version === state.version, `${label}: round trip потерял возраст/версию`);
  invariant(JSON.stringify(parsed) === json, `${label}: round trip изменил состояние`);
  return utf8Length(json);
}

function effectTypeScore(type: string, playbook: SoakPlaybook, state: GameState): number {
  switch (type) {
    case "enrollEducation":
      return playbook === "scholar" ? 130 : playbook === "estate" ? 85 : playbook === "worker" ? 60 : 45;
    case "education":
      return playbook === "scholar" ? 110 : playbook === "estate" ? 70 : 50;
    case "startCareer":
      return playbook === "worker" ? 100 : playbook === "wanderer" ? 85 : playbook === "estate" ? 60 : 50;
    case "promoteCareer":
      return playbook === "worker" ? 90 : playbook === "wanderer" ? 65 : playbook === "estate" ? 55 : 60;
    case "retireCareer":
      return state.life.age >= 45 ? 80 : -30;
    case "loseCareer":
      return -45;
    case "rentHome":
      return playbook === "estate" ? 60 : playbook === "worker" ? 40 : 30;
    case "buyProperty":
      return playbook === "estate" ? 110 : playbook === "worker" ? 65 : playbook === "scholar" ? 50 : 35;
    case "sellProperty":
      return -45;
    case "repairProperty":
      return 35;
    case "neglectHome":
      return -70;
    case "startBusiness":
      return playbook === "estate" ? 105 : playbook === "worker" ? 70 : playbook === "wanderer" ? 50 : 40;
    case "investBusiness":
      return 25;
    case "sellBusiness":
      return -30;
    case "closeBusiness":
      return -40;
    case "cure":
      return 45;
    case "condition":
      return -120;
    case "death":
      return -10_000;
    case "npcDies":
      return -180;
    case "weakness":
      return -15;
    case "talent":
      return 12;
    case "specialization":
      return 18;
    case "npc":
      return 12;
    case "wealth":
      return 0;
    case "resource":
      return 0;
    case "reputation":
      return 0;
    case "karma":
      return 0;
    default:
      return 0;
  }
}

function effectDetailScore(effect: EventDefinition["choices"][number]["success"]["effects"][number], playbook: SoakPlaybook, state: GameState): number {
  const base = effectTypeScore(effect.type, playbook, state);
  if (effect.type === "wealth") return Math.max(-30, Math.min(25, effect.delta * 0.2));
  if (effect.type === "resource") {
    if (effect.resource === "health") return effect.delta < 0 ? effect.delta * 8 : effect.delta * 1.5;
    return Math.max(-5, Math.min(5, effect.delta * 0.2));
  }
  if (effect.type === "reputation") return effect.delta * 0.8;
  if (effect.type === "karma") return effect.delta * 0.5;
  if (effect.type === "stat") return effect.delta > 0 ? 3 : -6;
  if (effect.type === "skill") return effect.delta > 0 ? 3 : -3;
  if (effect.type === "track") return effect.delta > 0 ? effect.delta * 0.4 : effect.delta * 0.8;
  if (effect.type === "flag") {
    if (effect.flag === "demonic-path") return playbook === "wanderer" ? -15 : -45;
    if (effect.flag === "martial-school") return 15;
    if (effect.flag === "mist-oath") return -12;
    if (effect.flag === "order-oath") return 12;
    return effect.set ? 3 : -3;
  }
  if (effect.type === "meter") {
    const meter = getUniverse(state.character.universeId).meters.find((item) => item.id === effect.id);
    if (meter?.danger) return effect.delta > 0 ? effect.delta * -3 : effect.delta * -2;
    return effect.delta * 0.2;
  }
  if (effect.type === "npc" || effect.type === "npcDies" || effect.type === "weakness" || effect.type === "talent") return base;
  return base;
}

/** Профессиональное предпочтение уклада: не меняет правила, только выбирает из уже доступных вариантов. */
function professionBonus(professionId: string, playbook: SoakPlaybook): number {
  const scholarly = new Set(["scholar", "court-mage", "gate-analyst", "alchemist", "diplomat", "physician", "relic-dealer"]);
  const working = new Set(["guard", "laborer", "lamplighter", "hollow-hunter", "escort", "raid-hunter", "duellist"]);
  const estate = new Set(["merchant", "inventor", "talisman-maker", "relic-dealer", "court-mage"]);
  const wandering = new Set(["wanderer", "adventurer", "herb-gatherer", "informant", "hunter-streamer", "diplomat"]);
  if (playbook === "scholar" && scholarly.has(professionId)) return 12;
  if (playbook === "worker" && working.has(professionId)) return 12;
  if (playbook === "estate" && estate.has(professionId)) return 12;
  if (playbook === "wanderer" && wandering.has(professionId)) return 12;
  return 0;
}

function choiceScore(state: GameState, choice: EventDefinition["choices"][number], playbook: SoakPlaybook): number {
  let success = 0;
  for (const effect of choice.success.effects) {
    success += effectDetailScore(effect, playbook, state);
    if ((effect.type === "startCareer" || effect.type === "profession") && "id" in effect) success += professionBonus(effect.id, playbook);
  }
  // Проверка: ожидаемая ценность с учётом шанса и провала. Смерть в провале всегда отталкивает.
  if (choice.check) {
    const chance = checkChance(state.character, choice.check, state);
    let failure = 0;
    for (const effect of choice.failure?.effects ?? []) failure += effectDetailScore(effect, playbook, state);
    const expected = success * chance + failure * (1 - chance);
    return expected + (choice.failure ? 0 : success * (1 - chance));
  }
  return success;
}

function pendingSelection(state: GameState, playbook: SoakPlaybook, variant: number, step: number): string {
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
    return { id: viewChoice.id, score: choiceScore(state, definition, playbook), index };
  });
  const best = Math.max(...scored.map((item) => item.score));
  const top = scored.filter((item) => item.score === best);
  // Равные варианты разводятся детерминированно: разные уклады и seeds дают разные жизни.
  return top[(variant + step) % top.length]!.id;
}

function travelAges(playbook: SoakPlaybook): readonly number[] {
  switch (playbook) {
    case "scholar":
      return [30];
    case "worker":
      return [22];
    case "estate":
      return [20, 40];
    case "wanderer":
      return [18, 25, 35, 50, 65];
  }
}

function chooseTravelDestination(state: GameState, variant: number, travelIndex: number): string | null {
  const view = presentLocation(state);
  const available = view.destinations.filter((destination) => !destination.current && destination.affordable);
  if (available.length === 0) return null;
  return available[(variant + travelIndex) % available.length]!.id;
}

function fingerprint(state: GameState): string {
  return JSON.stringify({
    seed: state.seed,
    rngState: state.rngState,
    version: state.version,
    nextSeq: state.nextSeq,
    age: state.life.age,
    alive: state.life.alive,
    wealth: state.character.wealth,
    health: state.health.value,
    education: state.education,
    career: state.career,
    household: state.household,
    business: state.business.ventures.map((venture) => [venture.id, venture.level, venture.capital, venture.losses]),
    location: state.location,
    npcs: state.npcs.map((npc) => [npc.id, npc.alive, npc.role, npc.affinity]),
    memory: state.memory,
    occurrenceKeys: Object.keys(state.occurrences).sort()
  });
}

interface MutableLifeStats {
  everEmployed: boolean;
  everPromoted: boolean;
  everRetired: boolean;
  everRented: boolean;
  everOwned: boolean;
  businessOpened: number;
  businessFailed: number;
  businessSold: number;
  businessClosed: number;
  maxBusinessLevel: number;
  peakWealth: number;
  maxWage: number;
  minHealth: number;
  maxConditions: number;
  maxStateBytes: number;
  maxNpcs: number;
  maxScheduled: number;
  maxConsequences: number;
  maxMemory: number;
  maxRecentEvents: number;
  maxWorldActivities: number;
  maxEconomyYears: number;
  maxLocationHistory: number;
  maxSocialRelationships: number;
  maxSocialStories: number;
  maxChronicle: number;
  maxNames: number;
  maxMilestones: number;
  maxFlags: number;
  events: number;
}

function freshStats(): MutableLifeStats {
  return {
    everEmployed: false,
    everPromoted: false,
    everRetired: false,
    everRented: false,
    everOwned: false,
    businessOpened: 0,
    businessFailed: 0,
    businessSold: 0,
    businessClosed: 0,
    maxBusinessLevel: 0,
    peakWealth: 0,
    maxWage: 0,
    minHealth: 100,
    maxConditions: 0,
    maxStateBytes: 0,
    maxNpcs: 0,
    maxScheduled: 0,
    maxConsequences: 0,
    maxMemory: 0,
    maxRecentEvents: 0,
    maxWorldActivities: 0,
    maxEconomyYears: 0,
    maxLocationHistory: 0,
    maxSocialRelationships: 0,
    maxSocialStories: 0,
    maxChronicle: 0,
    maxNames: 0,
    maxMilestones: 0,
    maxFlags: 0,
    events: 0
  };
}

function absorb(state: GameState, stats: MutableLifeStats, entries: readonly HistoryEntry[]): void {
  stats.events += entries.filter((entry) => entry.kind === "event").length;
  if (state.career.employed) stats.everEmployed = true;
  if (state.career.rank > 0) stats.everPromoted = true;
  if (state.career.retired) stats.everRetired = true;
  if (state.household.residence === "rent") stats.everRented = true;
  if (state.household.residence === "own") stats.everOwned = true;
  for (const entry of entries) {
    for (const change of entry.changes) {
      if (change.kind !== "business") continue;
      if (change.value === "opened") stats.businessOpened += 1;
      if (change.value === "failed") stats.businessFailed += 1;
      if (change.value === "sold") stats.businessSold += 1;
      if (change.value === "closed") stats.businessClosed += 1;
    }
  }
  for (const venture of state.business.ventures) stats.maxBusinessLevel = Math.max(stats.maxBusinessLevel, venture.level);
  if (state.career.employed) stats.maxWage = Math.max(stats.maxWage, careerWage(state));
  stats.peakWealth = Math.max(stats.peakWealth, state.character.wealth);
  stats.minHealth = Math.min(stats.minHealth, state.health.value);
  stats.maxConditions = Math.max(stats.maxConditions, state.health.conditions.length);
  stats.maxNpcs = Math.max(stats.maxNpcs, state.npcs.length);
  stats.maxScheduled = Math.max(stats.maxScheduled, state.scheduled.length);
  stats.maxConsequences = Math.max(stats.maxConsequences, state.consequences.length);
  stats.maxMemory = Math.max(stats.maxMemory, state.memory.length);
  stats.maxRecentEvents = Math.max(stats.maxRecentEvents, state.recentEvents.length);
  stats.maxWorldActivities = Math.max(stats.maxWorldActivities, state.world?.activities.length ?? 0);
  stats.maxEconomyYears = Math.max(stats.maxEconomyYears, state.economy.years.length);
  stats.maxLocationHistory = Math.max(stats.maxLocationHistory, state.location.history.length);
  stats.maxSocialRelationships = Math.max(stats.maxSocialRelationships, state.social?.relationships.length ?? 0);
  stats.maxSocialStories = Math.max(stats.maxSocialStories, state.social?.stories.length ?? 0);
  stats.maxChronicle = Math.max(stats.maxChronicle, state.lineage.chronicle.length);
  stats.maxNames = Math.max(stats.maxNames, Object.keys(state.lineage.names).length);
  stats.maxMilestones = Math.max(stats.maxMilestones, state.milestones.triggered.length);
  stats.maxFlags = Math.max(stats.maxFlags, state.flags.length);
}

function playLife(universeId: UniverseId, playbook: SoakPlaybook, variant: number, maxAge: number, label: string): SoakLifeMetrics {
  const seed = `stage02-soak-${universeId}-${playbook}-${variant}`;
  const created = newGame({ seed, universeId });
  let state = created.state;
  let lastSeq = 0;
  let historyEntries = 0;
  let actions = 0;
  let lastAge = state.life.age;
  let lastVersion = state.version;
  let travels = 0;
  let travelSpend = 0;
  let travelIndex = 0;
  const pendingTravelAges = new Set(travelAges(playbook));
  const visited = new Set([state.location.settlementId]);
  const stats = freshStats();

  const acceptEntries = (entries: readonly HistoryEntry[], where: string): void => {
    for (const entry of entries) {
      invariant(entry.seq === lastSeq + 1, `${label}/${where}: пропуск истории ${lastSeq} → ${entry.seq}`);
      invariant(entry.age >= 0 && entry.age <= state.life.age, `${label}/${where}: запись истории из будущего (${entry.age} > ${state.life.age})`);
      lastSeq = entry.seq;
      historyEntries += 1;
    }
    invariant(lastSeq === state.nextSeq - 1, `${label}/${where}: nextSeq ${state.nextSeq} не следует за историей ${lastSeq}`);
    invariant(historyEntries <= SOAK_HISTORY_LIMIT, `${label}/${where}: история жизни ${historyEntries} записей`);
  };

  acceptEntries(created.entries, "birth");
  assertState(state, `${label}/birth`);
  absorb(state, stats, created.entries);

  let nextSample = 8;
  while (state.life.alive && state.life.age < maxAge) {
    invariant(actions < MAX_ACTIONS, `${label}: слишком много действий (${actions})`);
    const previous = state;
    let result: ActionResult | null;
    if (state.pending) {
      const choiceId = pendingSelection(state, playbook, variant, actions);
      result = applyAction(state, { type: "choose", choiceId });
    } else {
      const age = state.life.age;
      if (pendingTravelAges.has(age)) {
        const destination = chooseTravelDestination(state, variant, travelIndex);
        pendingTravelAges.delete(age);
        if (destination !== null) {
          const beforeWealth = state.character.wealth;
          result = applyAction(state, { type: "travel", settlementId: destination });
          travelIndex += 1;
          travels += 1;
          travelSpend += beforeWealth - result.state.character.wealth;
          visited.add(result.state.location.settlementId);
        } else {
          result = null;
        }
      } else {
        result = null;
      }
      if (!result) {
        const years = Math.max(1, Math.min(ACTION_YEARS, maxAge - age));
        result = applyAction(state, { type: "advance", years });
      }
    }
    state = result.state;
    actions += 1;
    invariant(state.version === lastVersion + 1, `${label}/action ${actions}: версия ${lastVersion} → ${state.version}`);
    invariant(state.life.age >= lastAge, `${label}/action ${actions}: возраст уменьшился ${lastAge} → ${state.life.age}`);
    lastAge = state.life.age;
    lastVersion = state.version;
    acceptEntries(result.entries, `action ${actions}`);
    assertState(state, `${label}/action ${actions}`);
    absorb(state, stats, result.entries);
    if (actions >= nextSample) {
      nextSample += 8;
      assertFiniteNumbers(state, `${label}/action ${actions}`);
      const bytes = checkRoundTrip(state, `${label}/action ${actions}`);
      stats.maxStateBytes = Math.max(stats.maxStateBytes, bytes);
    }
    invariant(previous !== state, `${label}/action ${actions}: действие не вернуло новое состояние`);
  }

  assertFiniteNumbers(state, `${label}/end`);
  const stateBytes = checkRoundTrip(state, `${label}/end`);
  stats.maxStateBytes = Math.max(stats.maxStateBytes, stateBytes);
  absorb(state, stats, []);

  return {
    universeId,
    playbook,
    seed,
    endAge: state.life.age,
    aliveAtEnd: state.life.alive,
    deathCause: state.life.deathCause?.en ?? null,
    yearsLived: state.life.age,
    actions,
    historyEntries,
    events: stats.events,
    educationTier: educationTier(getUniverse(universeId), state.character),
    educationCompleted: state.character.educationId !== null,
    everEmployed: stats.everEmployed,
    everPromoted: stats.everPromoted,
    everRetired: stats.everRetired,
    employedAtEnd: state.career.employed,
    retiredAtEnd: state.career.retired,
    professionId: state.character.professionId,
    finalRank: state.career.rank,
    tenure: state.career.tenure,
    maxWage: stats.maxWage,
    everRented: stats.everRented,
    everOwned: stats.everOwned,
    ownHomeAtEnd: state.household.residence === "own",
    homeConditionAtEnd: state.household.condition,
    businessOpened: stats.businessOpened,
    businessFailed: stats.businessFailed,
    businessSold: stats.businessSold,
    businessClosed: stats.businessClosed,
    businessActiveAtEnd: state.business.ventures.length,
    maxBusinessLevel: stats.maxBusinessLevel,
    businessCapitalAtEnd: state.business.ventures.reduce((sum, venture) => sum + venture.capital, 0),
    travels,
    visitedSettlements: visited.size,
    travelSpend,
    finalWealth: state.character.wealth,
    peakWealth: stats.peakWealth,
    minHealth: stats.minHealth,
    conditionsAtEnd: state.health.conditions.length,
    maxConditions: stats.maxConditions,
    stateBytes,
    maxStateBytes: stats.maxStateBytes,
    maxNpcs: stats.maxNpcs,
    maxScheduled: stats.maxScheduled,
    maxConsequences: stats.maxConsequences,
    maxMemory: stats.maxMemory,
    maxRecentEvents: stats.maxRecentEvents,
    maxWorldActivities: stats.maxWorldActivities,
    maxEconomyYears: stats.maxEconomyYears,
    maxLocationHistory: stats.maxLocationHistory,
    maxSocialRelationships: stats.maxSocialRelationships,
    maxSocialStories: stats.maxSocialStories,
    maxChronicle: stats.maxChronicle,
    maxNames: stats.maxNames,
    maxMilestones: stats.maxMilestones,
    maxFlags: stats.maxFlags,
    fingerprint: fingerprint(state)
  };
}

export function runStage02Soak(options: SoakOptions = {}): SoakRun {
  const livesPerUniverse = options.livesPerUniverse ?? 3;
  const universeIds = options.universeIds ?? UNIVERSE_IDS;
  const playbooks = options.playbooks ?? SOAK_PLAYBOOKS;
  const maxAge = options.maxAge ?? SOAK_MAX_AGE;
  invariant(Number.isInteger(livesPerUniverse) && livesPerUniverse > 0, "livesPerUniverse должен быть положительным целым");
  invariant(Number.isInteger(maxAge) && maxAge > 0 && maxAge <= 120, "maxAge вне разумных границ");
  const startedAt = Date.now();
  const lifeMetrics: SoakLifeMetrics[] = [];
  for (const universeId of universeIds) {
    for (const playbook of playbooks) {
      for (let variant = 0; variant < livesPerUniverse; variant++) {
        lifeMetrics.push(playLife(universeId, playbook, variant, maxAge, `${universeId}/${playbook}/${variant}`));
      }
    }
  }

  const deathAges = lifeMetrics.filter((life) => !life.aliveAtEnd).map((life) => life.endAge);
  const deathCauses: Record<string, number> = {};
  for (const life of lifeMetrics) {
    if (!life.aliveAtEnd && life.deathCause !== null) deathCauses[life.deathCause] = (deathCauses[life.deathCause] ?? 0) + 1;
  }
  const educationTiers: Record<number, number> = { 0: 0, 1: 0, 2: 0, 3: 0 };
  for (const life of lifeMetrics) educationTiers[life.educationTier] = (educationTiers[life.educationTier] ?? 0) + 1;
  const finalWealth = lifeMetrics.map((life) => life.finalWealth);
  const businessLives = lifeMetrics.filter((life) => life.businessOpened > 0).length;
  const byUniverse = Object.fromEntries(universeIds.map((universeId) => [universeId, groupMetrics(lifeMetrics.filter((life) => life.universeId === universeId))])) as Record<UniverseId, SoakGroupMetrics>;

  const aggregate: SoakAggregate = {
    lives: lifeMetrics.length,
    universes: [...universeIds],
    playbooks: [...playbooks],
    maxAge,
    durationMs: Date.now() - startedAt,
    deathAges,
    deathCauses,
    educationTiers,
    conditionLives: lifeMetrics.filter((life) => life.maxConditions > 0).length,
    minHealth: lifeMetrics.reduce((lowest, life) => Math.min(lowest, life.minHealth), 100),
    maxWage: lifeMetrics.reduce((highest, life) => Math.max(highest, life.maxWage), 0),
    byUniverse,
    aliveAtEnd: lifeMetrics.filter((life) => life.aliveAtEnd).length,
    everEmployed: lifeMetrics.filter((life) => life.everEmployed).length,
    everPromoted: lifeMetrics.filter((life) => life.everPromoted).length,
    everRetired: lifeMetrics.filter((life) => life.everRetired).length,
    employedAtEnd: lifeMetrics.filter((life) => life.employedAtEnd).length,
    retiredAtEnd: lifeMetrics.filter((life) => life.retiredAtEnd).length,
    everRented: lifeMetrics.filter((life) => life.everRented).length,
    everOwned: lifeMetrics.filter((life) => life.everOwned).length,
    ownHomeAtEnd: lifeMetrics.filter((life) => life.ownHomeAtEnd).length,
    businessLives,
    businessFailedLives: lifeMetrics.filter((life) => life.businessFailed > 0).length,
    businessActiveAtEnd: lifeMetrics.filter((life) => life.businessActiveAtEnd > 0).length,
    travelLives: lifeMetrics.filter((life) => life.travels > 0).length,
    totalTravels: lifeMetrics.reduce((sum, life) => sum + life.travels, 0),
    finalWealth,
    peakWealth: lifeMetrics.reduce((best, life) => Math.max(best, life.peakWealth), 0),
    capHits: lifeMetrics.filter((life) => life.peakWealth >= WEALTH_MAX).length,
    stateBytes: lifeMetrics.map((life) => life.stateBytes),
    maxStateBytes: lifeMetrics.reduce((best, life) => Math.max(best, life.maxStateBytes), 0),
    maxHistoryEntries: lifeMetrics.reduce((best, life) => Math.max(best, life.historyEntries), 0),
    maxima: {
      npcs: lifeMetrics.reduce((best, life) => Math.max(best, life.maxNpcs), 0),
      conditions: lifeMetrics.reduce((best, life) => Math.max(best, life.maxConditions), 0),
      scheduled: lifeMetrics.reduce((best, life) => Math.max(best, life.maxScheduled), 0),
      consequences: lifeMetrics.reduce((best, life) => Math.max(best, life.maxConsequences), 0),
      memory: lifeMetrics.reduce((best, life) => Math.max(best, life.maxMemory), 0),
      recentEvents: lifeMetrics.reduce((best, life) => Math.max(best, life.maxRecentEvents), 0),
      worldActivities: lifeMetrics.reduce((best, life) => Math.max(best, life.maxWorldActivities), 0),
      economyYears: lifeMetrics.reduce((best, life) => Math.max(best, life.maxEconomyYears), 0),
      locationHistory: lifeMetrics.reduce((best, life) => Math.max(best, life.maxLocationHistory), 0),
      socialRelationships: lifeMetrics.reduce((best, life) => Math.max(best, life.maxSocialRelationships), 0),
      socialStories: lifeMetrics.reduce((best, life) => Math.max(best, life.maxSocialStories), 0),
      chronicle: lifeMetrics.reduce((best, life) => Math.max(best, life.maxChronicle), 0),
      names: lifeMetrics.reduce((best, life) => Math.max(best, life.maxNames), 0),
      milestones: lifeMetrics.reduce((best, life) => Math.max(best, life.maxMilestones), 0),
      flags: lifeMetrics.reduce((best, life) => Math.max(best, life.maxFlags), 0)
    }
  };

  // Жёсткие пределы состояния: ни одна жизнь не может выйти за них, даже в полном прогоне.
  invariant(aggregate.maxStateBytes <= SOAK_STATE_BYTES_LIMIT, `размер состояния ${aggregate.maxStateBytes} больше предела ${SOAK_STATE_BYTES_LIMIT}`);
  invariant(aggregate.maxHistoryEntries <= SOAK_HISTORY_LIMIT, `история жизни ${aggregate.maxHistoryEntries} больше предела ${SOAK_HISTORY_LIMIT}`);
  invariant(aggregate.maxima.npcs <= MAX_NPCS, `людей ${aggregate.maxima.npcs} больше предела`);
  invariant(aggregate.maxima.conditions <= MAX_HEALTH_CONDITIONS, `болезней ${aggregate.maxima.conditions} больше предела`);

  return {
    options: { livesPerUniverse, universeIds, playbooks, maxAge },
    lifeMetrics,
    aggregate
  };
}

export function formatSoakMetrics(run: SoakRun): string {
  const { aggregate: a } = run;
  const p10 = percentile(a.deathAges, 0.1);
  const p50 = percentile(a.deathAges, 0.5);
  const p90 = percentile(a.deathAges, 0.9);
  const average = (values: readonly number[]): number => round(mean(values));
  const causes = Object.entries(a.deathCauses)
    .sort((left, right) => right[1] - left[1])
    .map(([cause, count]) => `${cause}: ${count}`)
    .join("; ");
  const total = a.lives || 1;
  const share = (count: number): string => `${round((count / total) * 100)}%`;
  return [
    `Stage 02.6 soak — ${a.lives} lives (${a.universes.length} universes × ${a.playbooks.length} playbooks × ${run.options.livesPerUniverse} seeds), max age ${a.maxAge}, ${a.durationMs} ms`,
    `Death age: p10 ${p10}, median ${p50}, p90 ${p90}, average ${average(a.deathAges)}; alive at ${a.maxAge}: ${a.aliveAtEnd}`,
    `Death causes: ${causes || "none"}`,
    `Education: none ${share(a.educationTiers[0] ?? 0)}, tier1 ${share(a.educationTiers[1] ?? 0)}, tier2 ${share(a.educationTiers[2] ?? 0)}, tier3 ${share(a.educationTiers[3] ?? 0)}`,
    `Health: lives with a condition ${share(a.conditionLives)}, lowest health ${a.minHealth}`,
    `Career: ever employed ${share(a.everEmployed)}, promoted ${share(a.everPromoted)}, ever retired ${share(a.everRetired)}; employed at end ${share(a.employedAtEnd)}, retired at end ${share(a.retiredAtEnd)}; highest wage ${a.maxWage}`,
    `Home: ever rented ${share(a.everRented)}, ever owned ${share(a.everOwned)}, owned at end ${share(a.ownHomeAtEnd)}`,
    `Business: opened ${share(a.businessLives)}, failed ${share(a.businessFailedLives)}, active at end ${share(a.businessActiveAtEnd)}`,
    `Travel: used ${share(a.travelLives)}, total moves ${a.totalTravels}, average moves per life ${round(a.totalTravels / total, 2)}`,
    `Wealth at end: p10 ${percentile(a.finalWealth, 0.1)}, median ${percentile(a.finalWealth, 0.5)}, p90 ${percentile(a.finalWealth, 0.9)}, max ${Math.max(...a.finalWealth)}; peak ${a.peakWealth}; cap hits ${a.capHits}`,
    `State: avg ${average(a.stateBytes)} B, max ${a.maxStateBytes} B (${round(a.maxStateBytes / 1024)} KiB); max history ${a.maxHistoryEntries}`,
    `Maxima: npcs ${a.maxima.npcs}, conditions ${a.maxima.conditions}, scheduled ${a.maxima.scheduled}, consequences ${a.maxima.consequences}, memory ${a.maxima.memory}, recent ${a.maxima.recentEvents}, world log ${a.maxima.worldActivities}, economy years ${a.maxima.economyYears}, location moves ${a.maxima.locationHistory}, social ${a.maxima.socialRelationships}/${a.maxima.socialStories}, chronicle ${a.maxima.chronicle}, names ${a.maxima.names}, milestones ${a.maxima.milestones}, flags ${a.maxima.flags}`,
    ...a.universes.map((universeId) => {
      const group = a.byUniverse[universeId];
      const groupShare = (count: number): string => `${round((count / (group.lives || 1)) * 100)}%`;
      const causes = Object.entries(group.deathCauses)
        .sort((left, right) => right[1] - left[1])
        .map(([cause, count]) => `${cause.replace(/^Passed away peacefully of /, "").replace(/^The /, "")} ${count}`)
        .join(", ");
      return `  ${universeId}: deaths p10 ${group.deathP10}/median ${group.deathMedian}/p90 ${group.deathP90} (${causes}), alive@90 ${group.aliveAtEnd}, edu2+ ${groupShare(group.educationTier2Plus)}, employed ${groupShare(group.everEmployed)}, promoted ${groupShare(group.everPromoted)}, retired ${groupShare(group.everRetired)}, rented ${groupShare(group.everRented)}, owned ${groupShare(group.everOwned)}, business ${groupShare(group.businessLives)} (failed ${groupShare(group.businessFailedLives)}), travel ${groupShare(group.travelLives)}, wealth p50 ${group.finalWealthP50}/p90 ${group.finalWealthP90}, conditions ${groupShare(group.conditionLives)}`;
    })
  ].join("\n");
}

export function findSoakLife(run: SoakRun, universeId: UniverseId, playbook: SoakPlaybook, seedIndex: number): SoakLifeMetrics {
  const index = run.lifeMetrics.findIndex((life) => life.universeId === universeId && life.playbook === playbook && life.seed.endsWith(`-${seedIndex}`));
  invariant(index !== -1, `жизнь ${universeId}/${playbook}/${seedIndex} не найдена`);
  return run.lifeMetrics[index]!;
}
