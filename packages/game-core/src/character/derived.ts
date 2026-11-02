// Показатели, которые вычисляются из состояния и не хранятся: итоговые характеристики, запасы, продолжительность жизни
import { getUniverse } from "../universes/registry.js";
import { clamp, entriesOf, STAT_KEYS, STAT_MAX, STAT_MIN, type Resources, type StatKey, type Stats } from "../stats.js";
import type { CharacterState } from "../types.js";

export const MAX_LEVEL = 100;

/** Опыт, нужный для перехода с уровня level на следующий */
export function xpForLevel(level: number): number {
  return 100 * level;
}

/** Прибавка к характеристикам от текущего ранга пути */
export function rankBonus(character: CharacterState): Partial<Stats> {
  const rank = getUniverse(character.universeId).track.ranks[character.track.rank];
  return rank?.statBonus ?? {};
}

/** Характеристики с бонусом ранга: по ним идут все проверки и условия */
export function effectiveStats(character: CharacterState): Stats {
  const stats = { ...character.stats };
  for (const [key, bonus] of entriesOf(rankBonus(character))) {
    stats[key] = clamp(stats[key] + bonus, STAT_MIN, STAT_MAX);
  }
  return stats;
}

export function meanStat(stats: Stats, keys: readonly StatKey[]): number {
  const used = keys.length ? keys : STAT_KEYS;
  return used.reduce((sum, key) => sum + stats[key], 0) / used.length;
}

/** Предельные запасы здоровья, энергии, маны и выносливости */
export function maxResources(character: CharacterState): Resources {
  const s = effectiveStats(character);
  const rank = character.track.rank;
  return {
    health: 40 + s.vitality * 4 + (character.level - 1) * 5 + rank * 15,
    energy: 60 + s.willpower * 2,
    mana: 10 + (s.intelligence + s.wisdom) * 2 + rank * 20,
    stamina: 40 + (s.vitality + s.strength) * 2
  };
}

/** Сколько лет отпущено персонажу: базовая жизнь мира, раса и ранги пути */
export function lifespanOf(character: CharacterState): number {
  const universe = getUniverse(character.universeId);
  const race = universe.races.find((r) => r.id === character.raceId);
  let years = universe.lifespan + (race?.lifespanBonus ?? 0);
  for (const rank of universe.track.ranks.slice(0, character.track.rank + 1)) years += rank.lifespanBonus ?? 0;
  return years;
}

/** Порог очков для следующего ранга. null — достигнут высший ранг */
export function nextRankThreshold(character: CharacterState): number | null {
  return getUniverse(character.universeId).track.ranks[character.track.rank + 1]?.threshold ?? null;
}

/** Очки пути упёрлись в порог: дальше только через прорыв */
export function isTrackReady(character: CharacterState): boolean {
  const threshold = nextRankThreshold(character);
  return threshold !== null && character.track.points >= threshold;
}
