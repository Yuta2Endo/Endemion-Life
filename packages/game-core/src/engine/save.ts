// Save Engine: проверка и перевод сохранений в текущий формат. Сохранение — данные извне, ему не доверяем
import { GameRuleError } from "../errors.js";
import { RESOURCE_KEYS, STAT_KEYS } from "../stats.js";
import { LIFE_STAGES, type GameState } from "../types.js";
import { getUniverse, isUniverseId } from "../universes/registry.js";
import { SAVE_SCHEMA_VERSION } from "./game.js";

type Migration = (save: Record<string, unknown>) => Record<string, unknown>;

/** Переходы между версиями формата: ключ — версия, из которой переводим. Новая версия формата добавляет сюда шаг */
const MIGRATIONS: Readonly<Record<number, Migration>> = {};

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
  if (!isRecord(life) || !isInt(life.age, 0) || !LIFE_STAGES.includes(life.stage as never) || typeof life.alive !== "boolean") fail("life");
  if (!isStringArray(save.flags)) fail("flags");
  if (!isCounter(save.occurrences) || !isCounter(save.lastSeen)) fail("occurrences");
  if (save.pending !== null && !(isRecord(save.pending) && typeof save.pending.eventId === "string" && isInt(save.pending.age, 0))) fail("pending");
  if (!Array.isArray(save.scheduled) || !save.scheduled.every((s) => isRecord(s) && typeof s.eventId === "string" && isInt(s.age, 0))) fail("scheduled");
  return save as unknown as GameState;
}
