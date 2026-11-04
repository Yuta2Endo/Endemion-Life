// Save Engine: проверка и перевод сохранений в текущий формат. Сохранение — данные извне, ему не доверяем
import { bornInto } from "../character/birth.js";
import { canAddRole, createNpc, type NpcContext } from "../character/npcs.js";
import { GameRuleError } from "../errors.js";
import { t } from "../i18n.js";
import { Rng } from "../rng.js";
import { findProfession } from "../rpg/skills.js";
import { RESOURCE_KEYS, STAT_KEYS } from "../stats.js";
import { HIDDEN_KEYS, LIFE_STAGES, NPC_ROLES, type GameState, type NpcRole } from "../types.js";
import { getUniverse, isUniverseId } from "../universes/registry.js";
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

/** Переходы между версиями формата: ключ — версия, из которой переводим. Новая версия формата добавляет сюда шаг */
const MIGRATIONS: Readonly<Record<number, Migration>> = {
  1: migrateV1
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

function checkNpc(npc: unknown): void {
  if (!isRecord(npc)) fail("npc");
  if (typeof npc.id !== "string" || typeof npc.name !== "string" || npc.name.length === 0) fail("npc.id");
  if (!NPC_ROLES.includes(npc.role as NpcRole)) fail("npc.role");
  if (npc.gender !== "female" && npc.gender !== "male") fail("npc.gender");
  if (!isInt(npc.bornAt) || !isInt(npc.metAt, 0) || !isInt(npc.affinity, -100, 100) || !isInt(npc.power, 0, 100)) fail("npc.numbers");
  if (typeof npc.alive !== "boolean" || !(npc.diedAt === null || isInt(npc.diedAt, 0))) fail("npc.alive");
  if (!isText(npc.occupation) || !isText(npc.bio) || typeof npc.traitId !== "string" || typeof npc.temperamentId !== "string") fail("npc.text");
  if (!isNullableString(npc.skillId) || !(npc.interactedAt === null || isInt(npc.interactedAt, 0))) fail("npc.skill");
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
  for (const key of ["level", "xp", "wealth"] as const) if (!isInt(c[key], 0)) fail(key);
  if (!isInt(c.reputation, -100, 100) || !isInt(c.karma, -100, 100)) fail("reputation/karma");
  if (!isStringArray(c.abilities)) fail("abilities");
  const track = c.track;
  if (!isRecord(track) || !isInt(track.points, 0) || !isInt(track.rank, 0, universe.track.ranks.length - 1)) fail("track");
  if (!universe.socialClasses.some((s) => s.id === c.socialClassId)) fail("socialClassId");
  if (!isStringArray(c.talents) || !isStringArray(c.weaknesses)) fail("talents");
  if (!isIntRecord(c.skills, 0, 100)) fail("skills");
  if (!isIntRecord(c.factions, -100, 100)) fail("factions");
  if (!isNullableString(c.professionId) || !isNullableString(c.educationId) || !isNullableString(c.specializationId)) fail("profession");
  if (!isRecord(life) || !isInt(life.age, 0) || !LIFE_STAGES.includes(life.stage as never) || typeof life.alive !== "boolean") fail("life");
  if (!isStringArray(save.flags)) fail("flags");
  if (!isCounter(save.occurrences) || !isCounter(save.lastSeen)) fail("occurrences");
  if (save.pending !== null && !(isRecord(save.pending) && typeof save.pending.eventId === "string" && isInt(save.pending.age, 0))) fail("pending");
  if (!Array.isArray(save.scheduled) || !save.scheduled.every((s) => isRecord(s) && typeof s.eventId === "string" && isInt(s.age, 0))) fail("scheduled");

  const background = save.background;
  if (!isRecord(background) || typeof background.familyName !== "string" || !isText(background.birthplace) || !isText(background.omen) || !isText(background.familyHistory)) fail("background");
  if (!Array.isArray(background.biography) || !background.biography.every(isText)) fail("biography");
  const hidden = save.hidden;
  if (!isRecord(hidden) || !isInt(hidden.potential, 1, 10) || !isInt(hidden.destiny, 1, 10) || !isStringArray(hidden.dormantTalents) || !isNullableString(hidden.familySecret)) fail("hidden");
  if (!isStringArray(hidden.revealed) || !hidden.revealed.every((key) => (HIDDEN_KEYS as readonly string[]).includes(key))) fail("hidden.revealed");
  if (!Array.isArray(save.npcs)) fail("npcs");
  save.npcs.forEach(checkNpc);
  if (new Set((save.npcs as { id: string }[]).map((npc) => npc.id)).size !== save.npcs.length) fail("npcs.id");
  if (!isInt(save.nextNpcId, 1)) fail("nextNpcId");
  if (!isIntRecord(save.meters, -1000, 1000)) fail("meters");
  if (!Array.isArray(save.consequences) || !save.consequences.every((x) => isRecord(x) && typeof x.id === "string" && isInt(x.age, 0) && typeof x.source === "string")) fail("consequences");
  if (save.quest !== null && !(isRecord(save.quest) && typeof save.quest.id === "string" && isInt(save.quest.since, 0))) fail("quest");
  if (!isStringArray(save.questsDone) || !isStringArray(save.recentEvents)) fail("questsDone");
  return save as unknown as GameState;
}
