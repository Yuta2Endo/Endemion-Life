// Character Engine: персонаж при рождении. Всё случайное идёт из Rng, поэтому один seed даёт одного и того же персонажа.
// Здесь броски Stage 01 (пол, раса, происхождение, характер, имя, характеристики). Семья, таланты и тайны — в birth.ts
import { GameRuleError } from "../errors.js";
import type { Rng } from "../rng.js";
import { BIRTH_STAT_MAX, clamp, entriesOf, KARMA_LIMIT, REPUTATION_LIMIT, STAT_KEYS, STAT_MIN, type Stats, type StatMods } from "../stats.js";
import { GENDERS, type CharacterState, type Gender, type UniverseId } from "../types.js";
import { getUniverse, isUniverseId } from "../universes/registry.js";
import type { OriginDefinition, RaceDefinition } from "../universes/types.js";
import { maxResources } from "./derived.js";
import { fullName } from "./names.js";
import { TEMPERAMENTS, type TemperamentDefinition } from "./temperaments.js";

export const NAME_MIN_LENGTH = 2;
export const NAME_MAX_LENGTH = 40;
/** Буквы любых алфавитов, пробел, дефис, апостроф и точка: без разметки и управляющих символов */
const NAME_PATTERN = /^[\p{L}\p{M}][\p{L}\p{M} '’.-]*$/u;

/** Что игрок может выбрать сам. Всё, что не выбрано, решает случай */
export interface CharacterInput {
  universeId: UniverseId;
  name?: string;
  gender?: Gender;
  raceId?: string;
  originId?: string;
  temperamentId?: string;
}

export interface GeneratedCharacter {
  character: CharacterState;
  /** Флаги происхождения: с них начинается жизнь (клятва, корень духа, школа) */
  flags: string[];
  /** Имя выбрал случай: фамилию семьи можно взять из него */
  generatedName: boolean;
}

export function normalizeName(name: string): string {
  return name.normalize("NFC").replace(/\s+/g, " ").trim();
}

export function validateName(name: string): string {
  const clean = normalizeName(name);
  if (clean.length < NAME_MIN_LENGTH || clean.length > NAME_MAX_LENGTH || !NAME_PATTERN.test(clean)) {
    throw new GameRuleError("INVALID_INPUT", `Имя: от ${NAME_MIN_LENGTH} до ${NAME_MAX_LENGTH} букв, без цифр и знаков`);
  }
  return clean;
}

function findOrThrow<T extends { id: string }>(items: readonly T[], id: string, what: string): T {
  const item = items.find((x) => x.id === id);
  if (!item) throw new GameRuleError("INVALID_INPUT", `Неизвестное значение «${what}»: ${id}`);
  return item;
}

function addMods(stats: Stats, mods: StatMods | undefined): void {
  for (const [key, delta] of entriesOf(mods)) stats[key] += delta;
}

/** Проверяет выбор игрока до броска костей: так ошибка не зависит от seed */
export function validateCharacterInput(input: CharacterInput): void {
  if (!isUniverseId(input.universeId)) throw new GameRuleError("INVALID_INPUT", "Неизвестная вселенная");
  const universe = getUniverse(input.universeId);
  if (input.gender !== undefined && !GENDERS.includes(input.gender)) throw new GameRuleError("INVALID_INPUT", "Неизвестный пол");
  if (input.raceId !== undefined) findOrThrow(universe.races, input.raceId, "раса");
  if (input.originId !== undefined) findOrThrow(universe.origins, input.originId, "происхождение");
  if (input.temperamentId !== undefined) findOrThrow(TEMPERAMENTS, input.temperamentId, "характер");
  if (input.name !== undefined) validateName(input.name);
}

export function generateCharacter(input: CharacterInput, rng: Rng): GeneratedCharacter {
  validateCharacterInput(input);
  const universe = getUniverse(input.universeId);

  // Порядок бросков фиксирован: пол, раса, происхождение, характер, имя, характеристики.
  // Выбор игрока тоже «тратит» бросок, поэтому характеристики не зависят от того, что выбрано вручную
  const genderRoll: Gender = rng.pick(GENDERS);
  const raceRoll: RaceDefinition = rng.pick(universe.races);
  const originRoll = rng.weighted(universe.origins, (o) => o.weight ?? 1) as OriginDefinition;
  const temperamentRoll: TemperamentDefinition = rng.pick(TEMPERAMENTS);
  const nameIndexes = [rng.next(), rng.next()];

  const gender = input.gender ?? genderRoll;
  const race = input.raceId ? findOrThrow(universe.races, input.raceId, "раса") : raceRoll;
  const origin = input.originId ? findOrThrow(universe.origins, input.originId, "происхождение") : originRoll;
  const temperament = input.temperamentId ? findOrThrow(TEMPERAMENTS, input.temperamentId, "характер") : temperamentRoll;

  let pick = 0;
  const name = input.name
    ? validateName(input.name)
    : fullName(universe.id, gender, (length) => Math.floor((nameIndexes[pick++ % nameIndexes.length] ?? 0) * length));

  // Сумма двух костей: средние значения выпадают чаще крайних
  const stats = Object.fromEntries(STAT_KEYS.map((key) => [key, rng.int(2, 5) + rng.int(2, 5)])) as Stats;
  addMods(stats, race.statMods);
  addMods(stats, origin.statMods);
  addMods(stats, temperament.statMods);
  for (const key of STAT_KEYS) stats[key] = clamp(stats[key], STAT_MIN, BIRTH_STAT_MAX);

  const character: CharacterState = {
    name,
    gender,
    universeId: universe.id,
    raceId: race.id,
    originId: origin.id,
    temperamentId: temperament.id,
    stats,
    resources: { health: 0, energy: 0, mana: 0, stamina: 0 },
    level: 1,
    xp: 0,
    reputation: clamp(origin.reputation ?? 0, -REPUTATION_LIMIT, REPUTATION_LIMIT),
    karma: clamp((origin.karma ?? 0) + (temperament.karma ?? 0), -KARMA_LIMIT, KARMA_LIMIT),
    wealth: origin.wealth,
    abilities: [...(origin.abilities ?? [])],
    track: { points: 0, rank: 0 },
    socialClassId: universe.originProfiles[origin.id]?.socialClassId ?? universe.socialClasses[0]?.id ?? "",
    talents: [],
    weaknesses: [],
    skills: { ...(universe.originProfiles[origin.id]?.skills ?? {}) },
    professionId: null,
    educationId: null,
    specializationId: null,
    factions: { ...(universe.originProfiles[origin.id]?.factions ?? {}) },
    goal: null,
    goalProgress: 0
  };
  character.resources = maxResources(character);
  return { character, flags: [...(origin.flags ?? [])], generatedName: !input.name };
}
