// Life Engine: что происходит с персонажем за один прожитый год
import { effectiveStats, lifespanOf, maxResources, meanStat } from "../character/derived.js";
import { TEMPERAMENTS } from "../character/temperaments.js";
import { applyEffect, changeResource, changeSkill, changeStat, gainTrack, gainXp, isTrackOpen, kill } from "../engine/effects.js";
import type { EngineContext } from "../engine/context.js";
import { findProfession, pathSkill } from "../rpg/skills.js";
import { healingFactor, talentGrowth, talentSkills, talentTrackFactor } from "../rpg/talents.js";
import { STAT_KEYS, type StatKey } from "../stats.js";
import type { LifeStage } from "../types.js";
import { worldTrackFactor } from "../world/rules.js";
import { DEATH_CAUSES, naturalDeathChance } from "./death.js";
import { yearlyIncome } from "./income.js";
import { stageForAge } from "./stages.js";

/** Сколько раз за год пробуется рост характеристик и с какой вероятностью */
const GROWTH: Readonly<Record<LifeStage, { rolls: number; chance: number }>> = {
  infant: { rolls: 1, chance: 0.5 },
  child: { rolls: 2, chance: 0.8 },
  teen: { rolls: 2, chance: 0.8 },
  adult: { rolls: 1, chance: 0.35 },
  middle: { rolls: 1, chance: 0.15 },
  elder: { rolls: 0, chance: 0 }
};

const BODY_STATS: readonly StatKey[] = ["strength", "agility", "vitality"];

export interface YearSummary {
  previousStage: LifeStage;
  stageChanged: boolean;
  diedOfAge: boolean;
}

/** Потенциал 1–10 сдвигает рост: 5 — как в Stage 01, 10 — на треть быстрее */
function potentialFactor(ctx: EngineContext): number {
  return 1 + ((ctx.state.hidden?.potential ?? 5) - 5) * 0.06;
}

function growStats(ctx: EngineContext, stage: LifeStage): void {
  const c = ctx.state.character;
  const temperament = TEMPERAMENTS.find((x) => x.id === c.temperamentId);
  const growth = [...(temperament?.growth ?? []), ...talentGrowth(ctx.universe, c)];
  const { rolls, chance } = GROWTH[stage];
  for (let i = 0; i < rolls; i++) {
    if (!ctx.rng.chance(Math.min(0.95, chance * potentialFactor(ctx)))) continue;
    // Характер и таланты направляют рост: чаще растёт то, к чему лежит душа
    const pool = growth.length && ctx.rng.chance(0.65) ? growth : STAT_KEYS;
    changeStat(ctx, ctx.rng.pick(pool), 1);
  }
  // Старость забирает силы тела. Высокий ранг пути замедляет увядание
  if (stage === "elder" && ctx.rng.chance(Math.max(0.1, 0.5 - c.track.rank * 0.1))) {
    changeStat(ctx, ctx.rng.pick(BODY_STATS), -1);
  }
}

/** Навыки растут от талантов, ремесла и пути силы. В историю года пишется только итог */
function growSkills(ctx: EngineContext): void {
  const state = ctx.state;
  const c = state.character;
  if (state.life.age < 6) return;
  for (const id of talentSkills(ctx.universe, c)) if (ctx.rng.chance(0.5)) changeSkill(ctx, id, 1);
  const profession = c.professionId ? findProfession(ctx.universe, c.professionId) : undefined;
  if (profession && ctx.rng.chance(0.7)) changeSkill(ctx, profession.skill, 1);
  if (isTrackOpen(ctx) && state.life.age >= ctx.universe.track.minAge) {
    const mentor = state.npcs.some((npc) => npc.alive && npc.role === "mentor" && npc.affinity >= 0) || state.flags.includes("mentor");
    if (ctx.rng.chance(mentor ? 0.8 : 0.4)) changeSkill(ctx, pathSkill(ctx.universe).id, 1);
  }
}

function restore(ctx: EngineContext, stage: LifeStage): void {
  const c = ctx.state.character;
  const max = maxResources(c);
  const stats = effectiveStats(c);
  const healing = Math.round((max.health * (stage === "elder" ? 0.1 : 0.25) + stats.vitality / 2) * healingFactor(ctx.universe, c));
  changeResource(ctx, "health", healing);
  // Энергия, мана и выносливость за год восстанавливаются полностью. В историю это не пишется
  c.resources.energy = max.energy;
  c.resources.mana = max.mana;
  c.resources.stamina = max.stamina;
  ctx.changes = ctx.changes.filter((change) => change.kind !== "resource" || change.key === "health");
}

function trainTrack(ctx: EngineContext): void {
  const track = ctx.universe.track;
  const state = ctx.state;
  const c = state.character;
  if (state.life.age < track.minAge || !isTrackOpen(ctx)) return;
  const mentor = state.flags.includes("mentor") || state.npcs.some((npc) => npc.alive && npc.role === "mentor" && npc.affinity >= 0) ? 1 : 0;
  const base = (meanStat(effectiveStats(c), track.stats) * track.yearlyFactor) / 2 + mentor;
  const factor = talentTrackFactor(ctx.universe, c) * worldTrackFactor(state) * potentialFactor(ctx);
  gainTrack(ctx, ctx.rng.round(base * factor));
}

/** Прожить один год: возраст, рост, навыки, восстановление, путь силы, опыт, доход и проверка старости */
export function ageOneYear(ctx: EngineContext): YearSummary {
  const life = ctx.state.life;
  const c = ctx.state.character;
  const previousStage = life.stage;

  life.age += 1;
  life.stage = stageForAge(life.age, lifespanOf(c));

  growStats(ctx, life.stage);
  growSkills(ctx);
  trainTrack(ctx);
  if (life.age >= 5) gainXp(ctx, ctx.rng.round(4 + effectiveStats(c).wisdom / 5));
  const income = yearlyIncome(ctx.state);
  if (income > 0) applyEffect(ctx, { type: "wealth", delta: income });
  restore(ctx, life.stage);

  let diedOfAge = false;
  if (ctx.rng.chance(naturalDeathChance(c, life.age))) {
    kill(ctx, DEATH_CAUSES.oldAge);
    diedOfAge = true;
  }
  return { previousStage, stageChanged: previousStage !== life.stage, diedOfAge };
}
