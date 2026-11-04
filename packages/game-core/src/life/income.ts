import { effectiveStats, meanStat } from "../character/derived.js";
import { findProfession } from "../rpg/skills.js";
import { incomeFactor } from "../rpg/talents.js";
import type { StatKey } from "../stats.js";
import type { GameState } from "../types.js";
import { getUniverse } from "../universes/registry.js";

/** Ремёсла Stage 01 по флагам. Сохранения Stage 01 переводятся в professionId, но флаги остаются */
const JOBS: readonly { flag: string; base: number; stats: StatKey[] }[] = [
  { flag: "guild-member", base: 6, stats: ["strength", "agility"] }
];

/** Доход за год: ремесло (с навыком), сословие и гильдия. Мотовство съедает часть */
export function yearlyIncome(state: GameState): number {
  const universe = getUniverse(state.character.universeId);
  const c = state.character;
  const stats = effectiveStats(c);
  let income = 0;
  const profession = c.professionId ? findProfession(universe, c.professionId) : undefined;
  if (profession) income += profession.base + Math.floor(meanStat(stats, profession.stats) / 4) + Math.floor((c.skills[profession.skill] ?? 0) / 10);
  for (const job of JOBS) {
    if (state.flags.includes(job.flag)) income += job.base + Math.floor(meanStat(stats, job.stats) / 4);
  }
  // Ремесло без особой специальности тоже приносит немного
  if (income === 0 && state.flags.includes("profession")) income = 2 + Math.floor(meanStat(stats, []) / 6);
  // Сословие кормит взрослых: рента знати, жалованье, подаяние
  if (state.life.age >= 16) income += universe.socialClasses.find((s) => s.id === c.socialClassId)?.income ?? 0;
  return Math.max(0, Math.round(income * incomeFactor(universe, c)));
}
