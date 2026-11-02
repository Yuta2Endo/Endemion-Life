import { effectiveStats, meanStat } from "../character/derived.js";
import type { StatKey } from "../stats.js";
import type { GameState } from "../types.js";

/** Ремесло кормит: доход за год зависит от характеристик, нужных в этом деле */
const JOBS: readonly { flag: string; base: number; stats: StatKey[] }[] = [
  { flag: "job-merchant", base: 4, stats: ["charisma", "intelligence"] },
  { flag: "job-scholar", base: 3, stats: ["intelligence", "wisdom"] },
  { flag: "job-guard", base: 3, stats: ["strength", "vitality"] },
  { flag: "job-wanderer", base: 1, stats: ["luck", "agility"] },
  { flag: "guild-member", base: 6, stats: ["strength", "agility"] }
];

export function yearlyIncome(state: GameState): number {
  const stats = effectiveStats(state.character);
  let income = 0;
  for (const job of JOBS) {
    if (state.flags.includes(job.flag)) income += job.base + Math.floor(meanStat(stats, job.stats) / 4);
  }
  // Ремесло без особой специальности тоже приносит немного
  if (income === 0 && state.flags.includes("profession")) income = 2 + Math.floor(meanStat(stats, []) / 6);
  return income;
}
