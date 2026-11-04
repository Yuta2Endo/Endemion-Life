import { effectiveStats, meanStat } from "../character/derived.js";
import type { StatCheck } from "../narrative/types.js";
import { talentCheckModifier } from "../rpg/talents.js";
import { clamp } from "../stats.js";
import type { CharacterState, GameState } from "../types.js";
import { getUniverse } from "../universes/registry.js";

export const MIN_CHANCE = 0.05;
export const MAX_CHANCE = 0.95;
/** Навык на максимуме добавляет к шансу 25% */
const SKILL_WEIGHT = 0.0025;

/**
 * Шанс пройти проверку. Каждое очко среднего по характеристикам сверх сложности даёт +4%,
 * удача сдвигает шанс на 0,5% за очко от 10. Навык, таланты, слабости, шкалы мира и сила противника
 * сдвигают шанс дальше. Исход никогда не предрешён: от 5% до 95%.
 * Без state (сохранения Stage 01 до перевода, старые вызовы) учитываются только характеристики
 */
export function checkChance(character: CharacterState, check: StatCheck, state?: GameState): number {
  const stats = effectiveStats(character);
  let difficulty = check.difficulty + (check.perRank ?? 0) * character.track.rank;
  if (check.versus && state) {
    const rival = state.npcs.find((npc) => npc.alive && npc.role === check.versus);
    // Сила противника 1–100 переводится в шкалу характеристик: 50 — обычная сложность
    if (rival) difficulty += (rival.power - 50) / 5;
  }
  let chance = 0.5 + (meanStat(stats, check.stats) - difficulty) * 0.04 + (stats.luck - 10) * 0.005;
  if (check.skill) chance += (character.skills?.[check.skill] ?? 0) * SKILL_WEIGHT;
  if (state) {
    const universe = getUniverse(character.universeId);
    chance += talentCheckModifier(universe, character, check.stats);
    for (const meter of check.meters ?? []) {
      const initial = universe.meters.find((m) => m.id === meter.id)?.initial ?? meter.base;
      chance += ((state.meters[meter.id] ?? initial) - meter.base) * meter.per;
    }
  }
  return clamp(Math.round(chance * 100) / 100, MIN_CHANCE, MAX_CHANCE);
}
