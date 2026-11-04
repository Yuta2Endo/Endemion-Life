// Короткие конструкторы для описания контента: события вселенных читаются как сценарий, а не как JSON
import type { LocalizedText } from "../i18n.js";
import type { ResourceKey, StatKey } from "../stats.js";
import type { HiddenKey, NpcRole } from "../types.js";
import type { Condition, Effect, NpcRef, StatCheck } from "./types.js";

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
  death: (cause: LocalizedText): Effect => ({ type: "death", cause }),
  skill: (id: string, delta: number): Effect => ({ type: "skill", id, delta }),
  talent: (id: string): Effect => ({ type: "talent", id }),
  awakenTalent: (): Effect => ({ type: "awakenTalent" }),
  weakness: (id: string, add = true): Effect => ({ type: "weakness", id, add }),
  overcomeWeakness: (): Effect => ({ type: "overcomeWeakness" }),
  npc: (role: NpcRole): Effect => ({ type: "npc", role }),
  affinity: (role: NpcRef, delta: number): Effect => ({ type: "affinity", role, delta }),
  npcRole: (from: NpcRole, to: NpcRole): Effect => ({ type: "npcRole", from, to }),
  npcDies: (role: NpcRef): Effect => ({ type: "npcDies", role }),
  npcSkill: (role: NpcRole, delta: number): Effect => ({ type: "npcSkill", role, delta }),
  meter: (id: string, delta: number): Effect => ({ type: "meter", id, delta }),
  faction: (id: string, delta: number): Effect => ({ type: "faction", id, delta }),
  socialClass: (id: string): Effect => ({ type: "socialClass", id }),
  profession: (id: string): Effect => ({ type: "profession", id }),
  education: (id: string): Effect => ({ type: "education", id }),
  educationTier: (tier: number): Effect => ({ type: "educationTier", tier }),
  specialization: (id: string): Effect => ({ type: "specialization", id }),
  later: (id: string, inYears: number): Effect => ({ type: "later", id, inYears }),
  reveal: (key: HiddenKey): Effect => ({ type: "reveal", key })
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
  ability: (id: string): Condition => ({ type: "ability", id, has: true }),
  skill: (id: string, min: number): Condition => ({ type: "skill", id, min }),
  talent: (...ids: string[]): Condition => ({ type: "talent", ids, has: true }),
  weakness: (...ids: string[]): Condition => ({ type: "weakness", ids, has: true }),
  npc: (role: NpcRef): Condition => ({ type: "npc", role, has: true }),
  noNpc: (role: NpcRef): Condition => ({ type: "npc", role, has: false }),
  affinity: (role: NpcRef, min: number): Condition => ({ type: "affinity", role, min }),
  affinityAtMost: (role: NpcRef, max: number): Condition => ({ type: "affinity", role, max }),
  meter: (id: string, min: number): Condition => ({ type: "meter", id, min }),
  meterAtMost: (id: string, max: number): Condition => ({ type: "meter", id, max }),
  faction: (id: string, min: number): Condition => ({ type: "faction", id, min }),
  socialClass: (...ids: string[]): Condition => ({ type: "socialClass", ids }),
  standing: (min: number): Condition => ({ type: "standing", min }),
  standingAtMost: (max: number): Condition => ({ type: "standing", max }),
  profession: (...ids: string[]): Condition => ({ type: "profession", ids, has: true }),
  noProfession: (): Condition => ({ type: "profession", ids: [], has: false }),
  education: (min: number): Condition => ({ type: "education", min }),
  educationAtMost: (max: number): Condition => ({ type: "education", max }),
  specialization: (): Condition => ({ type: "specialization", has: true }),
  noSpecialization: (): Condition => ({ type: "specialization", has: false }),
  dormantTalent: (): Condition => ({ type: "dormantTalent", has: true }),
  hidden: (key: "potential" | "destiny", min: number): Condition => ({ type: "hidden", key, min }),
  secretHidden: (): Condition => ({ type: "secret", revealed: false }),
  quest: (active = true): Condition => ({ type: "quest", active }),
  yearsLeft: (max: number): Condition => ({ type: "yearsLeft", max })
};

/** Проверка. extra — навык, шкалы мира и противник, которые сдвигают шанс */
export function check(stats: StatKey[], difficulty: number, perRank?: number, extra: Omit<StatCheck, "stats" | "difficulty" | "perRank"> = {}): StatCheck {
  const base: StatCheck = perRank === undefined ? { stats, difficulty } : { stats, difficulty, perRank };
  return { ...base, ...extra };
}
