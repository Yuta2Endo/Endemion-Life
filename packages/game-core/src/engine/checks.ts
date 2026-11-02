import { effectiveStats, meanStat } from "../character/derived.js";
import type { StatCheck } from "../narrative/types.js";
import { clamp } from "../stats.js";
import type { CharacterState } from "../types.js";

export const MIN_CHANCE = 0.05;
export const MAX_CHANCE = 0.95;

/**
 * Шанс пройти проверку. Каждое очко среднего по характеристикам сверх сложности даёт +4%,
 * удача сдвигает шанс на 0,5% за очко от 10. Исход никогда не предрешён: от 5% до 95%
 */
export function checkChance(character: CharacterState, check: StatCheck): number {
  const stats = effectiveStats(character);
  const difficulty = check.difficulty + (check.perRank ?? 0) * character.track.rank;
  const chance = 0.5 + (meanStat(stats, check.stats) - difficulty) * 0.04 + (stats.luck - 10) * 0.005;
  return clamp(Math.round(chance * 100) / 100, MIN_CHANCE, MAX_CHANCE);
}
