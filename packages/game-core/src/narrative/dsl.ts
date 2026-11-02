// Короткие конструкторы для описания контента: события вселенных читаются как сценарий, а не как JSON
import type { LocalizedText } from "../i18n.js";
import type { ResourceKey, StatKey } from "../stats.js";
import type { Condition, Effect, StatCheck } from "./types.js";

export const fx = {
  stat: (stat: StatKey, delta: number): Effect => ({ type: "stat", stat, delta }),
  res: (resource: ResourceKey, delta: number): Effect => ({ type: "resource", resource, delta }),
  health: (delta: number): Effect => ({ type: "resource", resource: "health", delta }),
  rep: (delta: number): Effect => ({ type: "reputation", delta }),
  karma: (delta: number): Effect => ({ type: "karma", delta }),
  wealth: (delta: number): Effect => ({ type: "wealth", delta }),
  xp: (amount: number): Effect => ({ type: "xp", amount }),
  track: (delta: number): Effect => ({ type: "track", delta }),
  breakthrough: (): Effect => ({ type: "breakthrough" }),
  flag: (flag: string, set = true): Effect => ({ type: "flag", flag, set }),
  ability: (id: string): Effect => ({ type: "ability", id }),
  schedule: (eventId: string, inYears: number): Effect => ({ type: "schedule", eventId, inYears }),
  death: (cause: LocalizedText): Effect => ({ type: "death", cause })
};

export const when = {
  stat: (stat: StatKey, min: number): Condition => ({ type: "stat", stat, min }),
  flag: (flag: string): Condition => ({ type: "flag", flag, has: true }),
  noFlag: (flag: string): Condition => ({ type: "flag", flag, has: false }),
  karmaAtLeast: (min: number): Condition => ({ type: "karma", min }),
  karmaAtMost: (max: number): Condition => ({ type: "karma", max }),
  reputation: (min: number): Condition => ({ type: "reputation", min }),
  wealth: (min: number): Condition => ({ type: "wealth", min }),
  level: (min: number): Condition => ({ type: "level", min }),
  rank: (min: number): Condition => ({ type: "rank", min }),
  rankAtMost: (max: number): Condition => ({ type: "rank", max }),
  trackReady: (): Condition => ({ type: "trackReady" }),
  origin: (...ids: string[]): Condition => ({ type: "origin", ids }),
  race: (...ids: string[]): Condition => ({ type: "race", ids }),
  ability: (id: string): Condition => ({ type: "ability", id, has: true })
};

export function check(stats: StatKey[], difficulty: number, perRank?: number): StatCheck {
  return perRank === undefined ? { stats, difficulty } : { stats, difficulty, perRank };
}
