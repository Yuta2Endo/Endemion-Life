// Таланты и слабости: общие (rpg/common.ts) и мира. Влияют на рост, проверки, путь силы, лечение и доход
import type { StatKey } from "../stats.js";
import type { CharacterState } from "../types.js";
import type { TalentDefinition, UniverseDefinition, WeaknessDefinition } from "../universes/types.js";
import { COMMON_TALENTS, COMMON_WEAKNESSES } from "./common.js";

/** Талант к характеристике проверки даёт +3%, слабость отнимает 4% */
export const TALENT_CHECK_BONUS = 0.03;
export const WEAKNESS_CHECK_PENALTY = 0.04;

const talentsByUniverse = new Map<string, readonly TalentDefinition[]>();
const weaknessesByUniverse = new Map<string, readonly WeaknessDefinition[]>();

export function allTalents(universe: UniverseDefinition): readonly TalentDefinition[] {
  let list = talentsByUniverse.get(universe.id);
  if (!list) {
    list = [...universe.talents, ...COMMON_TALENTS];
    talentsByUniverse.set(universe.id, list);
  }
  return list;
}

export function allWeaknesses(universe: UniverseDefinition): readonly WeaknessDefinition[] {
  let list = weaknessesByUniverse.get(universe.id);
  if (!list) {
    list = [...universe.weaknesses, ...COMMON_WEAKNESSES];
    weaknessesByUniverse.set(universe.id, list);
  }
  return list;
}

export function findTalent(universe: UniverseDefinition, id: string): TalentDefinition | undefined {
  return allTalents(universe).find((talent) => talent.id === id);
}

export function findWeakness(universe: UniverseDefinition, id: string): WeaknessDefinition | undefined {
  return allWeaknesses(universe).find((weakness) => weakness.id === id);
}

function talentsOf(universe: UniverseDefinition, character: CharacterState): TalentDefinition[] {
  return (character.talents ?? []).map((id) => findTalent(universe, id)).filter((talent) => talent !== undefined);
}

function weaknessesOf(universe: UniverseDefinition, character: CharacterState): WeaknessDefinition[] {
  return (character.weaknesses ?? []).map((id) => findWeakness(universe, id)).filter((weakness) => weakness !== undefined);
}

/** Сдвиг шанса проверки от талантов и слабостей, связанных с её характеристиками */
export function talentCheckModifier(universe: UniverseDefinition, character: CharacterState, stats: readonly StatKey[]): number {
  let modifier = 0;
  for (const talent of talentsOf(universe, character)) if (talent.checks?.some((stat) => stats.includes(stat))) modifier += TALENT_CHECK_BONUS;
  for (const weakness of weaknessesOf(universe, character)) if (weakness.checks?.some((stat) => stats.includes(stat))) modifier -= WEAKNESS_CHECK_PENALTY;
  return modifier;
}

/** Характеристики, которые таланты растят чаще остальных */
export function talentGrowth(universe: UniverseDefinition, character: CharacterState): StatKey[] {
  return [...new Set(talentsOf(universe, character).flatMap((talent) => talent.growth ?? []))];
}

/** Навыки, которые таланты растят каждый год */
export function talentSkills(universe: UniverseDefinition, character: CharacterState): string[] {
  return [...new Set(talentsOf(universe, character).flatMap((talent) => talent.skills ?? []))];
}

export function talentTrackFactor(universe: UniverseDefinition, character: CharacterState): number {
  let factor = 1;
  for (const talent of talentsOf(universe, character)) factor *= talent.trackFactor ?? 1;
  for (const weakness of weaknessesOf(universe, character)) factor *= weakness.trackFactor ?? 1;
  return factor;
}

export function healingFactor(universe: UniverseDefinition, character: CharacterState): number {
  return weaknessesOf(universe, character).reduce((factor, weakness) => factor * (weakness.healing ?? 1), 1);
}

export function incomeFactor(universe: UniverseDefinition, character: CharacterState): number {
  return weaknessesOf(universe, character).reduce((factor, weakness) => factor * (weakness.income ?? 1), 1);
}
