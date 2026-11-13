// Save Engine: проверка и перевод сохранений в текущий формат. Сохранение — данные извне, ему не доверяем
import { bornInto, linkFamily } from "../character/birth.js";
import { NAME_POOLS } from "../character/names.js";
import { canAddRole, createNpc, rollNpcLife, type NpcContext } from "../character/npcs.js";
import { GameRuleError } from "../errors.js";
import { kinProblem, MIN_PARENT_AGE } from "../family/kin.js";
import { t } from "../i18n.js";
import { newLineage } from "../legacy/chronicle.js";
import { finishLife, foundLineage } from "../legacy/lineage.js";
import { Rng } from "../rng.js";
import { findEducation, findProfession, findSkill } from "../rpg/skills.js";
import { findTalent } from "../rpg/talents.js";
import { findUpbringing, statPointsProblem } from "../character/upbringing.js";
import { findObjective, newMastery } from "../endgame/mastery.js";
import { newAdventure } from "../adventure/adventure.js";
import { adventuresOf, placesOf } from "../adventure/content.js";
import { ADVENTURE_LOG_KINDS } from "../adventure/types.js";
import { MAX_ECONOMY_YEARS, newEconomy } from "../economy/economy.js";
import { MAX_REGION_LOG, newRegion, REGION_LOG_KINDS, STOCK_MAX } from "../economy/region.js";
import { findGood, goodsOf, MAX_STOCK } from "../economy/market.js";
import { HEALTH_MAX, MAX_CONDITION_DAMAGE, MAX_CONDITION_YEARS, MAX_HEALTH_CONDITIONS, healthValueFromResources, newHealthState } from "../life/health.js";
import { educationStep, MAX_EDUCATION_DURATION, newEducationState } from "../life/education.js";
import { findCareerTrack, maxCareerRank, newCareerState } from "../life/careers.js";
import { findProperty, MAX_ARREARS, newHouseholdState } from "../life/household.js";
import { findBusiness, MAX_BUSINESSES, MAX_BUSINESS_LOSSES, newBusinessState } from "../life/business.js";
import { RESOURCE_KEYS, STAT_KEYS, WEALTH_MAX } from "../stats.js";
import { MAX_WORLD_INFLUENCE, MAX_WORLD_INFLUENCE_ENTRIES, settlementSeeds } from "../world/state.js";
import { MAX_LOCATION_HISTORY, newLocationState } from "../world/location.js";
import type { UniverseDefinition } from "../universes/types.js";
import {
  CHRONICLE_KINDS,
  ECONOMY_CYCLES,
  ECONOMY_LINES,
  HEALTH_CONDITION_KINDS,
  HIDDEN_KEYS,
  LIFE_STAGES,
  NPC_DEATH_CAUSES,
  NPC_GOALS,
  NPC_LOG_KINDS,
  NPC_ROLES,
  NPC_STATUSES,
  NPC_STORY_STATUSES,
  RELATIONSHIP_TYPES,
  RESIDENCE_KINDS,
  SELF_ID,
  type GameState,
  type NpcRole,
  type NpcState,
  type UniverseId
} from "../types.js";
import { getUniverse, isUniverseId } from "../universes/registry.js";
import type { EngineContext } from "./context.js";
import { SAVE_SCHEMA_VERSION } from "./game.js";

type Migration = (save: Record<string, unknown>) => Record<string, unknown>;

/** Ремёсла Stage 01 хранились флагами job-*: в формате 2 это professionId */
const JOB_FLAGS: Readonly<Record<string, string>> = {
  "job-guard": "guard",
  "job-scholar": "scholar",
  "job-merchant": "merchant",
  "job-wanderer": "wanderer"
};

/** Люди, о которых Stage 01 помнил только флагом: в формате 2 у них появляются имя и история */
const FLAG_NPCS: readonly { flag: string; role: NpcRole }[] = [
  { flag: "childhood-friend", role: "friend" },
  { flag: "mentor", role: "mentor" },
  { flag: "in-love", role: "partner" },
  { flag: "married", role: "spouse" },
  { flag: "has-child", role: "child" }
];

/**
 * Формат 1 → 2 (Stage 01 → Stage 02). Ничего из прежнего сохранения не удаляется. Добавляются семья, таланты,
 * навыки, шкалы мира и скрытые характеристики. Всё выводится из seed жизни, поэтому перевод одного и того же
 * сохранения всегда даёт один результат. Состояние генератора жизни (rngState) не меняется
 */
function migrateV1(save: Record<string, unknown>): Record<string, unknown> {
  const character = save.character;
  if (!isRecord(character) || !isUniverseId(character.universeId) || typeof save.seed !== "string") return save;
  const universe = getUniverse(character.universeId);
  const life = isRecord(save.life) ? save.life : {};
  const age = isInt(life.age, 0) ? life.age : 0;
  const flags = isStringArray(save.flags) ? save.flags : [];
  const originProfile = universe.originProfiles[typeof character.originId === "string" ? character.originId : ""];
  const profession = Object.entries(JOB_FLAGS).find(([flag]) => flags.includes(flag))?.[1] ?? null;

  const state = {
    ...save,
    character: {
      ...character,
      socialClassId: originProfile?.socialClassId ?? universe.socialClasses[0]?.id ?? "",
      talents: [],
      weaknesses: [],
      skills: { ...(originProfile?.skills ?? {}) },
      professionId: profession !== null && findProfession(universe, profession) ? profession : null,
      educationId: null,
      specializationId: null,
      factions: { ...(originProfile?.factions ?? {}) }
    },
    background: { familyName: "", birthplace: t("", ""), omen: t("", ""), familyHistory: t("", ""), biography: [] },
    hidden: { potential: 5, destiny: 5, dormantTalents: [], familySecret: null, revealed: [] },
    npcs: [],
    nextNpcId: 1,
    meters: {},
    consequences: [],
    quest: null,
    questsDone: [],
    recentEvents: []
  } as unknown as GameState;

  // Рождение «задним числом»: возраст 0, чтобы семья получила верные возрасты и дату знакомства
  const rng = Rng.fromSeed(save.seed, "migrate-v2");
  state.life = { ...(state.life as object), age: 0 } as GameState["life"];
  bornInto({ state, rng, universe }, false);
  // Путь силы уже открыт — значит, ученик уже прошёл школу своего пути
  const pathFlag = universe.track.requiresFlag;
  const school = universe.education.find((e) => e.tier === 2);
  if (pathFlag && flags.includes(pathFlag) && school) state.character.educationId = school.id;

  state.life = { ...state.life, age };
  const ctx: NpcContext = { state, rng, universe };
  for (const { flag, role } of FLAG_NPCS) {
    if (flags.includes(flag) && canAddRole(state, role)) createNpc(ctx, role);
  }
  // Жизнь уже шла: родители, которым по годам пора было умереть, остаются в семейном древе, но не в жизни
  for (const npc of state.npcs) {
    if (npc.alive && age - npc.bornAt > universe.lifespan + 10) {
      npc.alive = false;
      npc.diedAt = Math.max(npc.metAt, npc.bornAt + universe.lifespan);
    }
  }
  // Таланты, которые Stage 01 уже успел бы проявить к этому возрасту, проявились
  if (age >= 16 && state.hidden.dormantTalents.length > 0) state.character.talents.push(state.hidden.dormantTalents.shift()!);
  return state as unknown as Record<string, unknown>;
}

/** Фамилия NPC формата 2 — хвост имени, если он совпадает с фамилией семьи или с фамилией из имён мира */
function familyNameOf(name: string, familyName: string, pool: readonly string[]): string {
  if (familyName && name.endsWith(` ${familyName}`)) return familyName;
  return pool.find((family) => family !== "" && name.endsWith(` ${family}`)) ?? "";
}

/**
 * Формат 2 → 3 (Stage 02 → Stage 03). Ничего не удаляется. NPC получают поля собственной жизни (из потока по id NPC),
 * связи родства выводятся из ролей, появляется род с записью об основании. Законченная жизнь формата 2 получает итог
 * в роду: её можно продолжить за наследника. Состояние генератора жизни (rngState) не меняется
 */
function migrateV2(save: Record<string, unknown>): Record<string, unknown> {
  const character = save.character;
  if (!isRecord(character) || !isUniverseId(character.universeId) || typeof save.seed !== "string" || !Array.isArray(save.npcs)) return save;
  const universe = getUniverse(character.universeId);
  const state = { ...save, lineage: newLineage(""), memory: [] } as unknown as GameState;
  const pool = NAME_POOLS[universe.id].family;
  const alive = state.life.alive;
  state.npcs = (save.npcs as Record<string, unknown>[]).map((raw) => {
    const npc = { ...raw } as unknown as NpcState;
    const life = rollNpcLife(state, universe, npc);
    return {
      ...npc,
      familyName: familyNameOf(npc.name, state.background.familyName, pool),
      status: npc.alive ? "alive" : "deceased",
      cause: npc.alive ? null : "unknown",
      parents: [],
      spouseId: null,
      formerSpouses: [],
      adopted: false,
      ...life,
      log: [],
      lifeGen: null
    } satisfies NpcState;
  });

  // Родство из ролей: семья при рождении, супруг, дети персонажа
  const kind = universe.originProfiles[state.character.originId]?.family ?? "full";
  state.lineage.selfParents = linkFamily(state.npcs, kind === "full" || kind === "orphan");
  const spouse = state.npcs.find((npc) => npc.role === "spouse" && npc.alive);
  if (spouse && alive) spouse.spouseId = SELF_ID;
  else if (spouse) spouse.formerSpouses = [SELF_ID];
  for (const npc of state.npcs) {
    if (npc.role !== "child" || npc.bornAt < MIN_PARENT_AGE) continue;
    const other = spouse && npc.bornAt - spouse.bornAt >= MIN_PARENT_AGE ? [spouse.id] : [];
    npc.parents = [SELF_ID, ...other];
  }
  state.lineage.name = state.background.familyName || state.character.name;
  const ctx: EngineContext = { state, rng: new Rng(state.rngState), universe, changes: [] };
  foundLineage(ctx);
  if (!alive) finishLife(ctx);
  return state as unknown as Record<string, unknown>;
}

/**
 * Формат 3 → 4 (Stage 04): только добавляется хозяйство с нейтральными значениями — обычные годы с нынешнего возраста,
 * без нехватки и без прошлых счетов. Ничего не удаляется, rngState и seed не трогаются, генератор не нужен
 */
function migrateV3(save: Record<string, unknown>): Record<string, unknown> {
  const life = save.life;
  const age = isRecord(life) && isInt(life.age, 0) ? life.age : 0;
  // Хозяйство формата 4 — без запаса товаров: его добавляет следующий шаг (4 → 5)
  const { goods: _goods, ...economy } = newEconomy(age);
  return { ...save, economy };
}

/** Формат 4 → 5 (Stage 04, рынок): только добавляется пустой запас товаров. Ничего не удаляется, генератор не нужен */
function migrateV4(save: Record<string, unknown>): Record<string, unknown> {
  const economy = save.economy;
  return isRecord(economy) ? { ...save, economy: { ...economy, goods: {} } } : save;
}

/** Формат 5 → 6 (Stage 05): только добавляется пустое приключение. Ничего не удаляется, генератор не нужен */
function migrateV5(save: Record<string, unknown>): Record<string, unknown> {
  return { ...save, adventure: newAdventure() };
}

/** Формат 6 → 7 (Stage 06): край с полным складом и нулевым напряжением. Ничего не удаляется, генератор не нужен */
function migrateV6(save: Record<string, unknown>): Record<string, unknown> {
  const character = save.character;
  const universeId = isRecord(character) && isUniverseId(character.universeId) ? character.universeId : "dark-fantasy";
  return { ...save, region: newRegion(universeId) };
}

/** Формат 7 → 8 (Stage 10): пустое мастерство. Ничего не удаляется, генератор не нужен */
function migrateV7(save: Record<string, unknown>): Record<string, unknown> {
  return { ...save, mastery: newMastery() };
}

/**
 * Формат 8 → 9 (Stage 02.1): длительное здоровье и болезни. Текущее здоровье — доля прежнего запаса сил,
 * мёртвые получают ту же причину смерти. Пустые состояния не выдумываются, rngState не меняется
 */
function migrateV8(save: Record<string, unknown>): Record<string, unknown> {
  const life = save.life;
  const character = save.character;
  const dead = isRecord(life) && life.alive === false;
  let value = dead ? 0 : HEALTH_MAX;
  if (!dead && isRecord(character)) {
    try {
      value = Math.max(1, healthValueFromResources(character as unknown as GameState["character"]));
    } catch {
      value = HEALTH_MAX;
    }
  }
  const health = newHealthState(value);
  if (dead && isRecord(life) && isText(life.deathCause)) health.deathCause = life.deathCause as GameState["life"]["deathCause"];
  return { ...save, health };
}

/**
 * Формат 9 → 10 (Stage 02.2): обучение и карьера. Старый диплом остаётся в character.educationId,
 * нынешний курс начинается пустым. Прежняя профессия становится первой ступенью карьеры:
 * жалованье и занятость не выдумываются, а выводятся из уже записанной работы. rngState и seed не меняются
 */
function migrateV9(save: Record<string, unknown>): Record<string, unknown> {
  const character = save.character;
  const life = save.life;
  const age = isRecord(life) && isInt(life.age, 0) ? life.age : 0;
  const career = newCareerState();
  if (isRecord(character) && isUniverseId(character.universeId) && typeof character.professionId === "string") {
    const track = findCareerTrack(character.universeId, character.professionId);
    if (track) {
      career.employed = true;
      career.since = age;
    }
  }
  return { ...save, education: newEducationState(), career };
}

/**
 * Формат 10 → 11 (Stage 02.3): жильё и своё дело. Старая жизнь не получает выдуманный дом
 * и не платит за него: она начинается без отдельного жилья и без дел. seed, rngState и все
 * прежние поля не меняются — миграция только добавляет два состояния
 */
function migrateV10(save: Record<string, unknown>): Record<string, unknown> {
  return { ...save, household: newHouseholdState(), business: newBusinessState() };
}

/**
 * Формат 11 → 12 (Stage 02.4): текущее поселение. Первое поселение мира — тот же дом,
 * который newWorldState создаёт с рождения. Если жизнь уже видела мир, берётся его первое
 * поселение: ссылка остаётся в существующем каталоге, второго каталога не появляется.
 * seed, rngState и все прежние поля не меняются
 */
function migrateV11(save: Record<string, unknown>): Record<string, unknown> {
  const character = save.character;
  const universeId = isRecord(character) && isUniverseId(character.universeId) ? character.universeId : "dark-fantasy";
  const universe = getUniverse(universeId);
  const life = save.life;
  const age = isRecord(life) && isInt(life.age, 0) ? life.age : 0;
  const world = save.world;
  const settlements = isRecord(world) && Array.isArray(world.settlements) ? world.settlements : [];
  const preferred = settlements.find(
    (item): item is { id: string } => isRecord(item) && typeof item.id === "string" && settlementSeeds(universe).some((seed) => seed.id === item.id)
  );
  return { ...save, location: newLocationState(universe, age, preferred?.id) };
}

/**
 * Формат 12 → 13 (Stage 02.5): уклад детства и очки характеристик. Поле character.creation
 * необязательное: старые жизни остаются без уклада, seed и rngState не меняются
 */
function migrateV12(save: Record<string, unknown>): Record<string, unknown> {
  return save;
}

/**
 * Формат 13 → 14 (Stage 03.1): в записи о наследстве появляется оценка имущества. Поле необязательное:
 * старые записи без assets остаются действительными и читаются как «только золото». Ничего не удаляется,
 * seed, rngState и прежние поля не меняются
 */
function migrateV13(save: Record<string, unknown>): Record<string, unknown> {
  return save;
}

/** Переходы между версиями формата: ключ — версия, из которой переводим. Новая версия формата добавляет сюда шаг */
const MIGRATIONS: Readonly<Record<number, Migration>> = {
  1: migrateV1,
  2: migrateV2,
  3: migrateV3,
  4: migrateV4,
  5: migrateV5,
  6: migrateV6,
  7: migrateV7,
  8: migrateV8,
  9: migrateV9,
  10: migrateV10,
  11: migrateV11,
  12: migrateV12,
  13: migrateV13
};

function fail(reason: string): never {
  throw new GameRuleError("INVALID_SAVE", `Сохранение повреждено: ${reason}`);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isInt(value: unknown, min = Number.MIN_SAFE_INTEGER, max = Number.MAX_SAFE_INTEGER): value is number {
  return Number.isInteger(value) && (value as number) >= min && (value as number) <= max;
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

function isCounter(value: unknown): value is Record<string, number> {
  return isRecord(value) && Object.values(value).every((n) => isInt(n, 0));
}

function isIntRecord(value: unknown, min: number, max: number): value is Record<string, number> {
  return isRecord(value) && Object.values(value).every((n) => isInt(n, min, max));
}

function isText(value: unknown): boolean {
  return isRecord(value) && typeof value.ru === "string" && typeof value.en === "string";
}

function isNullableString(value: unknown): boolean {
  return value === null || typeof value === "string";
}

export function migrateSave(raw: unknown): Record<string, unknown> {
  if (!isRecord(raw)) fail("не объект");
  let save = raw;
  let version = save.schemaVersion;
  if (!isInt(version, 1)) fail("нет версии формата");
  if (version > SAVE_SCHEMA_VERSION) fail(`формат ${version} новее игры (${SAVE_SCHEMA_VERSION})`);
  while (version < SAVE_SCHEMA_VERSION) {
    const step = MIGRATIONS[version];
    if (!step) fail(`нет перехода с формата ${version}`);
    save = { ...step(save), schemaVersion: version + 1 };
    version += 1;
  }
  return save;
}

const NPC_ID = /^n[0-9]{1,6}$/;

function isPersonId(value: unknown): value is string {
  return typeof value === "string" && (value === SELF_ID || NPC_ID.test(value));
}

function oneOf<T extends string>(list: readonly T[], value: unknown): value is T {
  return typeof value === "string" && (list as readonly string[]).includes(value);
}

/**
 * Stage 02.5: выбор при рождении необязателен. Если он записан, уклад должен существовать
 * в мире, его навыки и талант — быть в каталоге, а очки не выходить за бюджет.
 */
function checkCreation(character: Record<string, unknown>, universe: UniverseDefinition): void {
  const creation = character.creation;
  if (creation === undefined) return;
  if (!isRecord(creation)) fail("character.creation");
  if (creation.upbringingId !== undefined) {
    if (typeof creation.upbringingId !== "string") fail("character.creation.upbringingId");
    const upbringing = findUpbringing(universe, creation.upbringingId);
    if (!upbringing) fail("character.creation.upbringingId");
    for (const skillId of Object.keys(upbringing.skills)) {
      if (!findSkill(universe, skillId)) fail("character.creation.skill");
    }
    if (!findTalent(universe, upbringing.talentId)) fail("character.creation.talent");
  }
  if (creation.statPoints !== undefined) {
    const problem = statPointsProblem(creation.statPoints);
    if (problem) fail(problem);
  }
}

/** NPC формата 3. diedAt и записи журнала могут быть меньше нуля: предки умирали до рождения текущего персонажа */
function checkNpc(npc: unknown, universeId: string): void {
  if (!isRecord(npc)) fail("npc");
  if (typeof npc.id !== "string" || !NPC_ID.test(npc.id) || typeof npc.name !== "string" || npc.name.length === 0) fail("npc.id");
  if (!NPC_ROLES.includes(npc.role as NpcRole)) fail("npc.role");
  if (npc.gender !== "female" && npc.gender !== "male") fail("npc.gender");
  if (!isInt(npc.bornAt) || !isInt(npc.metAt, 0) || !isInt(npc.affinity, -100, 100) || !isInt(npc.power, 0, 100)) fail("npc.numbers");
  if (typeof npc.alive !== "boolean" || !(npc.diedAt === null || isInt(npc.diedAt))) fail("npc.alive");
  if (!isText(npc.occupation) || !isText(npc.bio) || typeof npc.traitId !== "string" || typeof npc.temperamentId !== "string") fail("npc.text");
  if (!isNullableString(npc.skillId) || !(npc.interactedAt === null || isInt(npc.interactedAt, 0))) fail("npc.skill");
  // Stage 03
  if (typeof npc.familyName !== "string" || !oneOf(NPC_STATUSES, npc.status) || !(npc.cause === null || oneOf(NPC_DEATH_CAUSES, npc.cause))) fail("npc.status");
  if (npc.alive !== (npc.status !== "deceased") || (npc.alive && npc.diedAt !== null) || (!npc.alive && npc.diedAt === null)) fail("npc.status");
  const universe = getUniverse(universeId as never);
  if (!universe.races.some((r) => r.id === npc.raceId) || !universe.socialClasses.some((c) => c.id === npc.socialClassId)) fail("npc.class");
  if (!Array.isArray(npc.parents) || !npc.parents.every(isPersonId) || !(npc.spouseId === null || isPersonId(npc.spouseId))) fail("npc.kin");
  if (!Array.isArray(npc.formerSpouses) || !npc.formerSpouses.every(isPersonId) || typeof npc.adopted !== "boolean") fail("npc.kin");
  if (!(npc.professionId === null || (typeof npc.professionId === "string" && findProfession(universe, npc.professionId)))) fail("npc.profession");
  if (!isInt(npc.careerRank, 0, 3) || !isInt(npc.educationTier, 0, 3) || !isInt(npc.health, -100, 100) || !isInt(npc.wealth, 0)) fail("npc.life");
  if (!isNullableString(npc.factionId) || !(npc.goal === null || oneOf(NPC_GOALS, npc.goal)) || !isNullableString(npc.talentId) || !isNullableString(npc.weaknessId)) fail("npc.life");
  if (!Array.isArray(npc.log) || npc.log.length > 50 || !npc.log.every((e) => isRecord(e) && isInt(e.at) && oneOf(NPC_LOG_KINDS, e.kind) && (e.value === undefined || typeof e.value === "string"))) fail("npc.log");
  if (!(npc.lifeGen === null || isInt(npc.lifeGen, 1))) fail("npc.lifeGen");
}

function isValues(value: unknown): value is Record<string, string | number> {
  return isRecord(value) && Object.values(value).every((v) => typeof v === "string" || (typeof v === "number" && Number.isFinite(v)));
}

/** Многолетнее влияние рода: закрытые категории, известные id, целые значения в допустимых пределах */
function checkInfluenceEntries(value: unknown, kind: "settlement" | "faction", universe: UniverseDefinition): void {
  if (!Array.isArray(value) || value.length > MAX_WORLD_INFLUENCE_ENTRIES) fail("lineage.worldInfluence");
  const ids = new Set<string>();
  for (const entry of value) {
    if (!isRecord(entry) || typeof entry.id !== "string" || !isInt(entry.value, -MAX_WORLD_INFLUENCE, MAX_WORLD_INFLUENCE)) fail("lineage.worldInfluence");
    const known = kind === "settlement"
      ? settlementSeeds(universe).some((item) => item.id === entry.id)
      : universe.factions.some((item) => item.id === entry.id);
    if (!known || ids.has(entry.id)) fail("lineage.worldInfluence");
    ids.add(entry.id);
  }
}

/** Род формата 3: структура, лимиты и ссылки */
function checkLineage(lineage: unknown, universe: UniverseDefinition): void {
  if (!isRecord(lineage)) fail("lineage");
  if (typeof lineage.name !== "string" || !isInt(lineage.generation, 1, 1000) || !isInt(lineage.epoch)) fail("lineage.generation");
  if (!Array.isArray(lineage.selfParents) || lineage.selfParents.length > 2 || !lineage.selfParents.every((id) => typeof id === "string" && NPC_ID.test(id)) || typeof lineage.selfAdopted !== "boolean") fail("lineage.parents");
  if (!isInt(lineage.renown, -100, 100) || !isInt(lineage.startRenown, -100, 100)) fail("lineage.renown");
  if (!Array.isArray(lineage.lives) || !lineage.lives.every((x) => isRecord(x) && isInt(x.gen, 1) && typeof x.name === "string" && isInt(x.age, 0) && isInt(x.score, 0, 100) && isInt(x.born) && typeof x.titleId === "string" && (x.npcId === null || typeof x.npcId === "string") && (x.cause === null || isText(x.cause)))) fail("lineage.lives");
  if (!Array.isArray(lineage.chronicle) || lineage.chronicle.length > 1000) fail("lineage.chronicle");
  for (const entry of lineage.chronicle) {
    if (!isRecord(entry) || !isInt(entry.id, 1) || !isInt(entry.year) || !isInt(entry.gen, 1) || !oneOf(CHRONICLE_KINDS, entry.kind)) fail("lineage.chronicle");
    if (!Array.isArray(entry.who) || !entry.who.every(isPersonId) || !isValues(entry.v) || typeof entry.src !== "string" || !(entry.link === null || isInt(entry.link, 1))) fail("lineage.chronicle");
  }
  if (!isInt(lineage.nextEntry, 1) || !isInt(lineage.archived, 0)) fail("lineage.nextEntry");
  if (!Array.isArray(lineage.achievements) || !lineage.achievements.every((a) => isRecord(a) && typeof a.id === "string" && isInt(a.gen, 1) && isInt(a.age, 0))) fail("lineage.achievements");
  if (new Set((lineage.achievements as { id: string }[]).map((a) => a.id)).size !== lineage.achievements.length) fail("lineage.achievements");
  const traits = lineage.traits;
  if (!isRecord(traits) || !isCounter(traits.talents) || !isCounter(traits.weaknesses)) fail("lineage.traits");
  if (!Array.isArray(lineage.threads) || lineage.threads.length > 20 || !lineage.threads.every((x) => isRecord(x) && typeof x.id === "string" && isInt(x.year) && isInt(x.gen, 1) && typeof x.src === "string")) fail("lineage.threads");
  if (!Array.isArray(lineage.pending) || lineage.pending.length > 20 || !lineage.pending.every((x) => isRecord(x) && typeof x.id === "string" && isInt(x.year) && typeof x.src === "string" && (x.entry === null || isInt(x.entry, 1)))) fail("lineage.pending");
  if (!isCounter(lineage.stories) || !(lineage.continuedBy === null || (typeof lineage.continuedBy === "string" && NPC_ID.test(lineage.continuedBy)))) fail("lineage.stories");
  if (!isRecord(lineage.names) || !Object.values(lineage.names).every((n) => typeof n === "string")) fail("lineage.names");
  const inheritance = lineage.inheritance;
  if (inheritance !== null && !(isRecord(inheritance) && isInt(inheritance.fromGen, 1) && typeof inheritance.fromName === "string" && isInt(inheritance.wealth, 0) && isInt(inheritance.held, 0) && isInt(inheritance.controlAge, 0) && Array.isArray(inheritance.shares) && isStringArray(inheritance.talents) && isStringArray(inheritance.weaknesses) && isStringArray(inheritance.threads) && isStringArray(inheritance.flags))) fail("lineage.inheritance");
  if (isRecord(inheritance)) {
    if (inheritance.homeInherited !== undefined && typeof inheritance.homeInherited !== "boolean") fail("lineage.inheritance.homeInherited");
    const assets = inheritance.assets;
    if (assets !== undefined) {
      if (!isRecord(assets) || !isInt(assets.liquid, 0, WEALTH_MAX) || !isInt(assets.total, 0)) fail("lineage.inheritance.assets");
      if (!Array.isArray(assets.businesses) || assets.businesses.length > MAX_BUSINESSES) fail("lineage.inheritance.assets.businesses");
      let businessValue = 0;
      for (const business of assets.businesses) {
        if (!isRecord(business) || typeof business.id !== "string" || !findBusiness(universe.id, business.id) || !isInt(business.value, 0, WEALTH_MAX)) fail("lineage.inheritance.assets.businesses");
        businessValue += business.value;
      }
      let homeValue = 0;
      if (assets.home !== null) {
        if (!isRecord(assets.home) || typeof assets.home.id !== "string" || !findProperty(universe.id, assets.home.id) || !isInt(assets.home.value, 0, WEALTH_MAX)) fail("lineage.inheritance.assets.home");
        homeValue = assets.home.value;
      }
      if (assets.total !== assets.liquid + homeValue + businessValue) fail("lineage.inheritance.assets.total");
      if (inheritance.homeInherited === true && assets.home === null) fail("lineage.inheritance.homeInherited");
    }
  }
  const relics = lineage.relics as unknown[];
  if (Array.isArray(relics)) {
    if (!relics.every((r: unknown) => isRecord(r) && typeof r.id === "string" && isText(r.name) && isText(r.description) && isInt(r.acquiredGen, 0) && isInt(r.acquiredAge, 0) && typeof r.source === "string")) {
      fail("lineage.relics");
    }
    if (new Set(relics.map((r: unknown) => (r as { id: string }).id)).size !== relics.length) {
      fail("lineage.relics");
    }
  }
  const storyProgress = lineage.storyProgress;
  if (storyProgress !== undefined && !isRecord(storyProgress)) fail("lineage.storyProgress");
  if (isRecord(storyProgress)) {
    for (const [, value] of Object.entries(storyProgress)) {
      if (!isRecord(value)) fail("lineage.storyProgress");
      const progress = value as { stage: number; completed: boolean; choices: Record<string, string> };
      if (!isInt(progress.stage, 0)) fail("lineage.storyProgress");
      if (typeof progress.completed !== "boolean") fail("lineage.storyProgress");
      if (!isRecord(progress.choices)) fail("lineage.storyProgress");
      for (const choiceValue of Object.values(progress.choices)) {
        if (typeof choiceValue !== "string") fail("lineage.storyProgress");
      }
    }
  }
  const influence = lineage.worldInfluence;
  if (influence !== undefined) {
    if (!isRecord(influence)) fail("lineage.worldInfluence");
    checkInfluenceEntries(influence.settlements, "settlement", universe);
    checkInfluenceEntries(influence.factions, "faction", universe);
  }
}

/** Хозяйство формата 4: цикл, нехватка, статьи последнего года и итоги лет — с лимитами */
function checkEconomy(economy: unknown, universeId: UniverseId): void {
  if (!isRecord(economy) || !oneOf(ECONOMY_CYCLES, economy.cycle) || !isInt(economy.cycleSince, 0) || !isInt(economy.hardship, 0, 100)) fail("economy");
  const last = economy.last;
  const isLine = (x: unknown) => isRecord(x) && oneOf(ECONOMY_LINES, x.id) && isInt(x.amount, -WEALTH_MAX, WEALTH_MAX);
  if (last !== null && !(isRecord(last) && isInt(last.age, 0) && isInt(last.shortfall, 0, WEALTH_MAX) && Array.isArray(last.lines) && last.lines.length <= ECONOMY_LINES.length && last.lines.every(isLine))) fail("economy.last");
  const isYear = (x: unknown) => isRecord(x) && isInt(x.age, 0) && isInt(x.income, 0, WEALTH_MAX) && isInt(x.expenses, 0, WEALTH_MAX) && isInt(x.shortfall, 0, WEALTH_MAX);
  if (!Array.isArray(economy.years) || economy.years.length > MAX_ECONOMY_YEARS || !economy.years.every(isYear)) fail("economy.years");
  // Формат 5: запас товаров — только товары рынка этого мира, от 1 до MAX_STOCK
  const goods = economy.goods;
  if (!isRecord(goods) || !Object.entries(goods).every(([id, n]) => findGood(universeId, id) !== undefined && isInt(n, 1, MAX_STOCK))) fail("economy.goods");
}

const MAX_ADVENTURE_LIST = 32;

/** Приключение формата 6: только места и приключения этого мира, одно активное, журнал с лимитом */
function checkAdventure(adventure: unknown, universeId: UniverseId): void {
  if (!isRecord(adventure)) fail("adventure");
  const places = new Set(placesOf(universeId).map((place) => place.id));
  const adventures = new Set(adventuresOf(universeId).map((item) => item.id));
  const known = (id: string) => places.has(id) || adventures.has(id);
  if (!isStringArray(adventure.discovered) || adventure.discovered.length > MAX_ADVENTURE_LIST || !adventure.discovered.every((id) => places.has(id))) fail("adventure.discovered");
  if (new Set(adventure.discovered).size !== adventure.discovered.length) fail("adventure.discovered");
  const active = adventure.active;
  if (active !== null) {
    if (!isRecord(active) || !adventures.has(String(active.id)) || typeof active.step !== "string" || !isInt(active.since, 0)) fail("adventure.active");
    const definition = adventuresOf(universeId).find((item) => item.id === active.id);
    if (!definition?.steps.some((step) => step.id === active.step)) fail("adventure.active.step");
  }
  for (const key of ["done", "failed"] as const) {
    const list = adventure[key];
    if (!isStringArray(list) || list.length > MAX_ADVENTURE_LIST || !list.every((id) => adventures.has(id)) || new Set(list).size !== list.length) fail(`adventure.${key}`);
  }
  if (!Array.isArray(adventure.log) || adventure.log.length > MAX_ADVENTURE_LIST) fail("adventure.log");
  for (const entry of adventure.log) {
    if (!isRecord(entry) || !known(String(entry.adventureId)) || !isInt(entry.age, 0) || !oneOf(ADVENTURE_LOG_KINDS, entry.kind)) fail("adventure.log");
  }
}

/** Край формата 7: склад только по товарам мира, числа в пределах, след — по id приключений */
/** Мастерство формата 8: только известные цели и навыки этого мира, без повторов */
function checkMastery(mastery: unknown, universeId: UniverseId): void {
  if (!isRecord(mastery)) fail("mastery");
  const universe = getUniverse(universeId);
  if (!isStringArray(mastery.objectives) || mastery.objectives.length > 16 || !mastery.objectives.every((id) => findObjective(id))) fail("mastery.objectives");
  if (new Set(mastery.objectives).size !== mastery.objectives.length) fail("mastery.objectives");
  if (!isStringArray(mastery.skills) || mastery.skills.length > 16 || !mastery.skills.every((id) => findSkill(universe, id))) fail("mastery.skills");
  if (new Set(mastery.skills).size !== mastery.skills.length) fail("mastery.skills");
}

/** Stage 03: социальная память необязательна, но если она есть — ссылки, типы и границы должны быть валидны. */
function checkSocial(social: unknown, ids: ReadonlySet<string>): void {
  if (!isRecord(social)) fail("social");
  const relationships = social.relationships;
  if (!Array.isArray(relationships) || relationships.length > 400) fail("social.relationships");
  const pairs = new Set<string>();
  for (const item of relationships) {
    if (!isRecord(item) || !isInt(item.id, 1)) fail("social.relationship");
    if (!isPersonId(item.a) || !isPersonId(item.b) || item.a === item.b || !ids.has(item.a) || !ids.has(item.b)) fail("social.relationship.ids");
    const pair = item.a < item.b ? `${item.a}|${item.b}` : `${item.b}|${item.a}`;
    if (pairs.has(pair)) fail("social.relationship.pair");
    pairs.add(pair);
    if (!oneOf(RELATIONSHIP_TYPES, item.type) || !isInt(item.strength, -100, 100) || !isInt(item.trust, 0, 100)) fail("social.relationship.value");
    if (!isInt(item.since, 0) || !isInt(item.updatedAt, 0) || typeof item.source !== "string") fail("social.relationship.meta");
  }
  const stories = social.stories;
  if (!Array.isArray(stories) || stories.length > 200) fail("social.stories");
  const seen = new Set<string>();
  for (const item of stories) {
    if (!isRecord(item) || typeof item.id !== "string" || item.id.length === 0) fail("social.story.id");
    if (!isPersonId(item.npcId) || !ids.has(item.npcId) || typeof item.storyId !== "string" || item.storyId.length === 0) fail("social.story.npc");
    const key = `${item.npcId}::${item.storyId}`;
    if (seen.has(key)) fail("social.story.duplicate");
    seen.add(key);
    if (!oneOf(NPC_STORY_STATUSES, item.status) || !isInt(item.stage, 0, 32)) fail("social.story.status");
    if (!isInt(item.since, 0) || !isInt(item.updatedAt, 0) || typeof item.source !== "string") fail("social.story.meta");
  }
  if (!isInt(social.nextRelationshipId, 1) || !isInt(social.nextStoryId, 1)) fail("social.next");
}

function checkRegion(region: unknown, universeId: UniverseId): void {
  if (!isRecord(region)) fail("region");
  const goods = new Set(goodsOf(universeId).map((item) => item.id));
  const adventures = new Set(adventuresOf(universeId).map((item) => item.id));
  const stock = region.stock;
  if (!isRecord(stock) || !Object.entries(stock).every(([id, n]) => goods.has(id) && isInt(n, 0, STOCK_MAX))) fail("region.stock");
  if (!isInt(region.strain, 0, 100) || !isInt(region.prosperity, 0, 100)) fail("region.strain");
  if (!isStringArray(region.seen) || region.seen.length > MAX_ADVENTURE_LIST || !region.seen.every((id) => adventures.has(id)) || new Set(region.seen).size !== region.seen.length) fail("region.seen");
  if (!Array.isArray(region.log) || region.log.length > MAX_REGION_LOG) fail("region.log");
  for (const entry of region.log) {
    if (!isRecord(entry) || !isInt(entry.age, 0) || !oneOf(REGION_LOG_KINDS, entry.kind)) fail("region.log");
  }
}

/** Stage 02.1: здоровье 0–100 и ограниченный список уникальных состояний с допустимыми числами */
function checkHealth(health: unknown): void {
  if (!isRecord(health)) fail("health");
  if (!isInt(health.value, 0, HEALTH_MAX)) fail("health.value");
  if (!(health.deathCause === null || isText(health.deathCause))) fail("health.deathCause");
  if (!Array.isArray(health.conditions) || health.conditions.length > MAX_HEALTH_CONDITIONS) fail("health.conditions");
  const ids = new Set<string>();
  for (const condition of health.conditions) {
    if (!isRecord(condition) || typeof condition.id !== "string" || condition.id.length === 0 || condition.id.length > 80) fail("health.condition.id");
    if (ids.has(condition.id)) fail("health.condition.duplicate");
    ids.add(condition.id);
    if (!oneOf(HEALTH_CONDITION_KINDS, condition.kind)) fail("health.condition.kind");
    if (!isInt(condition.severity, 1, 3) || !isInt(condition.onsetAge, 0) || !isInt(condition.remaining, 0, MAX_CONDITION_YEARS)) fail("health.condition.numbers");
    if (!isInt(condition.damage, 1, MAX_CONDITION_DAMAGE)) fail("health.condition.damage");
    if (typeof condition.source !== "string" || condition.source.length > 100) fail("health.condition.source");
    if (typeof condition.recoverable !== "boolean" || typeof condition.lethal !== "boolean") fail("health.condition.flags");
  }
}

/**
 * Stage 02.2: обучение. Пройденная ступень одна (character.educationId), текущий курс — не выше следующей.
 * Прогресс не может догнать длительность: такой курс должен был уже завершиться
 */
function checkEducation(education: unknown, character: Record<string, unknown>, universe: UniverseDefinition, age: number): void {
  if (!isRecord(education) || !isNullableString(education.currentId)) fail("education");
  const completed = typeof character.educationId === "string" ? findEducation(universe, character.educationId) : undefined;
  if (character.educationId !== null && !completed) fail("education.completed");
  if (education.currentId === null) {
    if (education.progress !== 0 || education.duration !== 0 || education.startedAt !== 0) fail("education.idle");
    return;
  }
  const current = typeof education.currentId === "string" ? findEducation(universe, education.currentId) : undefined;
  const step = current ? educationStep(current.tier) : undefined;
  if (!current || !step) fail("education.current");
  if ((completed?.tier ?? 0) + 1 !== current.tier) fail("education.prerequisite");
  if (!isInt(education.startedAt, 0) || !isInt(education.progress, 0) || !isInt(education.duration, 1, MAX_EDUCATION_DURATION)) fail("education.numbers");
  if (education.progress >= education.duration) fail("education.progress");
  if (education.duration !== step.duration) fail("education.duration");
  if (education.startedAt < step.minAge || education.startedAt > age) fail("education.startedAt");
  if (education.progress > age - education.startedAt) fail("education.progress.age");
}

/** Stage 02.2: карьера. Работа — character.professionId, второго jobId нет. Покой и работа несовместимы */
function checkCareer(career: unknown, character: Record<string, unknown>, universe: UniverseDefinition, age: number): void {
  if (!isRecord(career)) fail("career");
  if (typeof career.employed !== "boolean" || typeof career.retired !== "boolean") fail("career.flags");
  if (career.employed && career.retired) fail("career.conflict");
  if (!isInt(career.rank, 0, 2) || !isInt(career.since, 0) || !isInt(career.tenure, 0)) fail("career.numbers");
  if (career.since > age || career.tenure > age) fail("career.numbers");
  const job = typeof character.professionId === "string" ? character.professionId : null;
  if (job !== null && !findProfession(universe, job)) fail("career.profession");
  if (career.employed && job === null) fail("career.employed");
  if (career.retired && job === null) fail("career.retired");
  if (job === null) {
    if (career.rank !== 0 || career.tenure !== 0 || career.since !== 0) fail("career.idle");
    return;
  }
  const track = findCareerTrack(universe.id, job);
  if (!track) fail("career.track");
  if (career.rank > maxCareerRank(track)) fail("career.rank");
}

/**
 * Stage 02.3: жильё. Бездомный не имеет дома и состояния; аренда и собственность ссылаются
 * на дом каталога этого мира. У аренды состояние всегда 0: дом чинит хозяин
 */
function checkHousehold(household: unknown, universeId: UniverseId, age: number): void {
  if (!isRecord(household) || !oneOf(RESIDENCE_KINDS, household.residence) || !isNullableString(household.homeId)) fail("household");
  if (!isInt(household.since, 0, age) || !isInt(household.condition, 0, 100) || !isInt(household.arrears, 0, MAX_ARREARS)) fail("household.numbers");
  if (household.residence === "homeless") {
    if (household.homeId !== null || household.condition !== 0) fail("household.homeless");
    return;
  }
  const property = typeof household.homeId === "string" ? findProperty(universeId, household.homeId) : undefined;
  if (!property) fail("household.home");
  if (household.residence === "rent" && (property.rent <= 0 || household.condition !== 0)) fail("household.rent");
}

/** Stage 02.3: свои дела. Только дела этого мира, без повторов, числа в допустимых пределах */
function checkBusiness(business: unknown, universeId: UniverseId, age: number): void {
  if (!isRecord(business) || !Array.isArray(business.ventures) || business.ventures.length > MAX_BUSINESSES) fail("business");
  const seen = new Set<string>();
  for (const venture of business.ventures) {
    if (!isRecord(venture) || typeof venture.id !== "string") fail("business.id");
    const definition = findBusiness(universeId, venture.id);
    if (!definition || seen.has(venture.id)) fail("business.id");
    seen.add(venture.id);
    if (!isInt(venture.foundedAge, 0, age) || !isInt(venture.level, 0, definition.maxLevel) || !isInt(venture.capital, 0, WEALTH_MAX)) fail("business.numbers");
    if (!isInt(venture.years, 0, Math.max(0, age - venture.foundedAge)) || !isInt(venture.losses, 0, MAX_BUSINESS_LOSSES)) fail("business.years");
    if (!(venture.lastNet === null || isInt(venture.lastNet, -WEALTH_MAX, WEALTH_MAX))) fail("business.net");
  }
}

/** Stage 02.4: текущее поселение и переезды. Только id этого мира, возраст не в будущем, цена в пределах золота */
function checkLocation(location: unknown, universeId: UniverseId, age: number): void {
  if (!isRecord(location)) fail("location");
  const universe = getUniverse(universeId);
  const seeds = settlementSeeds(universe);
  if (typeof location.settlementId !== "string" || !seeds.some((seed) => seed.id === location.settlementId)) fail("location.settlement");
  // since — справочная дата переезда. Старые снимки и тесты могут менять возраст назад, поэтому не сверяем её с age
  if (!isInt(location.since, 0)) fail("location.since");
  if (!Array.isArray(location.history) || location.history.length > MAX_LOCATION_HISTORY) fail("location.history");
  for (const move of location.history) {
    if (!isRecord(move) || typeof move.from !== "string" || typeof move.to !== "string" || move.from === move.to) fail("location.move");
    if (!seeds.some((seed) => seed.id === move.from) || !seeds.some((seed) => seed.id === move.to)) fail("location.move");
    if (!isInt(move.age, 0, age) || !isInt(move.cost, 0, WEALTH_MAX)) fail("location.move");
  }
}

/** Проверяет сохранение и возвращает состояние игры. Бросает INVALID_SAVE, если что-то не так */
export function parseSave(raw: unknown): GameState {
  const save = migrateSave(raw);
  const c = save.character;
  const life = save.life;
  if (typeof save.seed !== "string" || save.seed.length === 0) fail("seed");
  if (!isInt(save.rngState, 0, 0xffffffff)) fail("rngState");
  if (!isInt(save.version, 1)) fail("version");
  if (!isInt(save.nextSeq, 1)) fail("nextSeq");
  if (!isRecord(c)) fail("character");
  if (!isUniverseId(c.universeId)) fail("universeId");
  const universe = getUniverse(c.universeId);
  if (typeof c.name !== "string" || c.name.length === 0) fail("name");
  if (c.gender !== "female" && c.gender !== "male") fail("gender");
  if (!universe.races.some((r) => r.id === c.raceId)) fail("raceId");
  if (!universe.origins.some((o) => o.id === c.originId)) fail("originId");
  if (typeof c.temperamentId !== "string") fail("temperamentId");
  if (!isRecord(c.stats) || !STAT_KEYS.every((key) => isInt((c.stats as Record<string, unknown>)[key], 1, 100))) fail("stats");
  if (!isRecord(c.resources) || !RESOURCE_KEYS.every((key) => isInt((c.resources as Record<string, unknown>)[key], 0))) fail("resources");
  for (const key of ["level", "xp"] as const) if (!isInt(c[key], 0)) fail(key);
  if (!isInt(c.wealth, 0, WEALTH_MAX)) fail("wealth");
  if (!isInt(c.reputation, -100, 100) || !isInt(c.karma, -100, 100)) fail("reputation/karma");
  if (!isStringArray(c.abilities)) fail("abilities");
  const track = c.track;
  if (!isRecord(track) || !isInt(track.points, 0) || !isInt(track.rank, 0, universe.track.ranks.length - 1)) fail("track");
  if (!universe.socialClasses.some((s) => s.id === c.socialClassId)) fail("socialClassId");
  if (!isStringArray(c.talents) || !isStringArray(c.weaknesses)) fail("talents");
  if (!isIntRecord(c.skills, 0, 100)) fail("skills");
  if (!isIntRecord(c.factions, -100, 100)) fail("factions");
  if (!isNullableString(c.professionId) || !isNullableString(c.educationId) || !isNullableString(c.specializationId)) fail("profession");
  if (typeof c.professionId === "string" && !findProfession(universe, c.professionId)) fail("profession.id");
  if (typeof c.educationId === "string" && !findEducation(universe, c.educationId)) fail("education.id");
  if (typeof c.specializationId === "string" && !universe.specializations.some((item) => item.id === c.specializationId)) fail("specialization.id");
  checkCreation(c, universe);
  if (!isRecord(life) || !isInt(life.age, 0) || !LIFE_STAGES.includes(life.stage as never) || typeof life.alive !== "boolean") fail("life");
  checkHealth(save.health);
  checkEducation(save.education, c, universe, life.age);
  checkCareer(save.career, c, universe, life.age);
  checkHousehold(save.household, c.universeId, life.age);
  checkBusiness(save.business, c.universeId, life.age);
  checkLocation(save.location, c.universeId, life.age);
  if (!isStringArray(save.flags)) fail("flags");
  if (save.autoMode !== undefined && !["manual", "auto", "milestones"].includes(save.autoMode as string)) fail("autoMode");
  if (save.milestones !== undefined && (!isRecord(save.milestones) || !isStringArray(save.milestones.triggered) || save.milestones.triggered.length > 100)) fail("milestones");
  const characterStoryProgress = c.storyProgress;
  if (characterStoryProgress !== undefined && !isRecord(characterStoryProgress)) fail("character.storyProgress");
  if (isRecord(characterStoryProgress)) {
    for (const [, value] of Object.entries(characterStoryProgress)) {
      if (!isRecord(value)) fail("character.storyProgress");
      const progress = value as { stage: number; completed: boolean; choices: Record<string, string> };
      if (!isInt(progress.stage, 0)) fail("character.storyProgress");
      if (typeof progress.completed !== "boolean") fail("character.storyProgress");
      if (!isRecord(progress.choices)) fail("character.storyProgress");
      for (const choiceValue of Object.values(progress.choices)) {
        if (typeof choiceValue !== "string") fail("character.storyProgress");
      }
    }
  }
  if (!isCounter(save.occurrences) || !isCounter(save.lastSeen)) fail("occurrences");
  if (save.pending !== null && !(isRecord(save.pending) && typeof save.pending.eventId === "string" && isInt(save.pending.age, 0))) fail("pending");
  if (!Array.isArray(save.scheduled) || !save.scheduled.every((s) => isRecord(s) && typeof s.eventId === "string" && isInt(s.age, 0))) fail("scheduled");

  const background = save.background;
  if (!isRecord(background) || typeof background.familyName !== "string" || !isText(background.birthplace) || !isText(background.omen) || !isText(background.familyHistory)) fail("background");
  if (!Array.isArray(background.biography) || !background.biography.every(isText)) fail("biography");
  const hidden = save.hidden;
  if (!isRecord(hidden) || !isInt(hidden.potential, 1, 10) || !isInt(hidden.destiny, 1, 10) || !isStringArray(hidden.dormantTalents) || !isNullableString(hidden.familySecret)) fail("hidden");
  if (!isStringArray(hidden.revealed) || !hidden.revealed.every((key) => (HIDDEN_KEYS as readonly string[]).includes(key))) fail("hidden.revealed");
  if (!Array.isArray(save.npcs) || save.npcs.length > 200) fail("npcs");
  for (const npc of save.npcs) checkNpc(npc, c.universeId);
  if (new Set((save.npcs as { id: string }[]).map((npc) => npc.id)).size !== save.npcs.length) fail("npcs.id");
  if (!isInt(save.nextNpcId, 1)) fail("nextNpcId");
  if (!isIntRecord(save.meters, -1000, 1000)) fail("meters");
  if (!Array.isArray(save.consequences) || !save.consequences.every((x) => isRecord(x) && typeof x.id === "string" && isInt(x.age, 0) && typeof x.source === "string")) fail("consequences");
  if (save.quest !== null && !(isRecord(save.quest) && typeof save.quest.id === "string" && isInt(save.quest.since, 0))) fail("quest");
  if (!isStringArray(save.questsDone) || !isStringArray(save.recentEvents)) fail("questsDone");
  checkLineage(save.lineage, universe);
  if (!Array.isArray(save.memory) || save.memory.length > 50 || !save.memory.every((m) => isRecord(m) && isInt(m.age, 0) && typeof m.eventId === "string" && typeof m.choiceId === "string" && (m.success === null || typeof m.success === "boolean") && isInt(m.weight, 0))) fail("memory");
  checkEconomy(save.economy, c.universeId);
  checkAdventure(save.adventure, c.universeId);
  checkRegion(save.region, c.universeId);
  checkMastery(save.mastery, c.universeId);
  if (save.world !== undefined && (!isRecord(save.world) || !isInt(save.world.tick, 0) || !Array.isArray(save.world.settlements) || !Array.isArray(save.world.factions) || !Array.isArray(save.world.activities))) fail("world");
  if (save.social !== undefined) {
    const ids = new Set<string>([SELF_ID, ...(save.npcs as { id: string }[]).map((npc) => npc.id)]);
    checkSocial(save.social, ids);
  }
  // Родство: ни циклов, ни родителей младше детей, ни брака с умершим
  const problem = kinProblem(save as unknown as GameState);
  if (problem) fail(`родство: ${problem}`);
  return save as unknown as GameState;
}
