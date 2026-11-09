import { describe, expect, it } from "vitest";
import {
  applyAction,
  deepClone,
  getUniverse,
  heirCandidates,
  presentEvent,
  succeed,
  UNIVERSE_IDS,
  worldMetrics,
  worldTick,
  type GameState,
  type UniverseId,
  type WorldMetrics,
} from "../src/index.js";
import type { EngineContext } from "../src/engine/context.js";
import type { Effect } from "../src/narrative/types.js";
import { findEvent } from "../src/narrative/selection.js";
import { Rng } from "../src/rng.js";
import { start } from "./helpers.js";

const GENERATIONS = 10;
const YEARS_PER_GENERATION = 25;
const TOTAL_YEARS = GENERATIONS * YEARS_PER_GENERATION;
const HIGH_RENOWN = 60;
const LATE_GAME_PROSPERITY = 95;

function makeCtx(state: GameState, universeId: UniverseId): EngineContext {
  return {
    state,
    rng: Rng.fromSeed(`s13-world-${universeId}`, "world"),
    universe: getUniverse(universeId),
    changes: [],
  };
}

interface BlockSample {
  generation: number;
  year: number;
  metrics: WorldMetrics;
}

interface SyntheticSoak {
  universeId: UniverseId;
  renown: number;
  blocks: BlockSample[];
  samples: WorldMetrics[];
  years: number;
}

function syntheticSoak(universeId: UniverseId, renown: number): SyntheticSoak {
  const state = start({ seed: `s13-syn-${universeId}-${renown}`, universeId });
  const ctx = makeCtx(state, universeId);
  const blocks: BlockSample[] = [];
  const samples: WorldMetrics[] = [];
  for (let generation = 1; generation <= GENERATIONS; generation++) {
    for (let year = 1; year <= YEARS_PER_GENERATION; year++) {
      state.life.age = (generation - 1) * YEARS_PER_GENERATION + year;
      state.lineage.renown = renown;
      worldTick(ctx);
      samples.push(worldMetrics(state));
    }
    blocks.push({ generation, year: state.life.age, metrics: worldMetrics(state) });
  }
  return { universeId, renown, blocks, samples, years: state.life.age };
}

function mean(values: readonly number[]): number {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function percentile(values: readonly number[], share: number): number {
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.min(sorted.length - 1, Math.max(0, Math.round((sorted.length - 1) * share)));
  return sorted[index]!;
}

interface SoakSummary {
  prosperityMean: number;
  prosperityP50: number;
  prosperityP90: number;
  prosperityMin: number;
  stabilityMean: number;
  fullySaturatedBlocks: number;
  firstFullySaturatedGeneration: number;
  final: WorldMetrics;
}

function summarize(soak: SyntheticSoak): SoakSummary {
  const prosperity = soak.samples.map((metrics) => metrics.settlements.prosperity.mean);
  const stability = soak.samples.map((metrics) => metrics.settlements.stability.mean);
  const full = soak.blocks.filter((block) => block.metrics.settlements.atProsperityMax === block.metrics.settlements.count);
  return {
    prosperityMean: mean(prosperity),
    prosperityP50: percentile(prosperity, 0.5),
    prosperityP90: percentile(prosperity, 0.9),
    prosperityMin: Math.min(...prosperity),
    stabilityMean: mean(stability),
    fullySaturatedBlocks: full.length,
    firstFullySaturatedGeneration: full[0]?.generation ?? 0,
    final: soak.blocks[soak.blocks.length - 1]!.metrics,
  };
}

function expectBounded(metrics: WorldMetrics): void {
  expect(metrics.hasWorld).toBe(true);
  expect(metrics.settlements.count).toBe(3);
  expect(metrics.settlements.prosperity.min).toBeGreaterThanOrEqual(0);
  expect(metrics.settlements.prosperity.max).toBeLessThanOrEqual(100);
  expect(metrics.settlements.stability.min).toBeGreaterThanOrEqual(0);
  expect(metrics.settlements.stability.max).toBeLessThanOrEqual(100);
  expect(metrics.factions.relation.min).toBeGreaterThanOrEqual(-30);
  expect(metrics.factions.relation.max).toBeLessThanOrEqual(30);
  expect(metrics.activities.count).toBeLessThanOrEqual(24);
  expect(Number.isFinite(metrics.settlements.prosperity.mean)).toBe(true);
  expect(Number.isFinite(metrics.settlements.stability.mean)).toBe(true);
  expect(Number.isFinite(metrics.dynastyRenown)).toBe(true);
}

function scoreEffects(effects: readonly Effect[]): number {
  let total = 0;
  for (const effect of effects) {
    if (effect.type === "npc" && effect.role === "child") total += 1000;
    if (effect.type === "adopt") total += 1000;
    if (effect.type === "npc" && effect.role === "spouse") total += 800;
    if (effect.type === "npcRole" && effect.to === "spouse") total += 800;
    if (effect.type === "flag" && effect.flag === "married" && effect.set) total += 600;
    if (effect.type === "npc" && effect.role === "partner") total += 300;
    if (effect.type === "flag" && effect.flag === "in-love" && effect.set) total += 200;
    if (effect.type === "death") total -= 2000;
    if (effect.type === "resource" && effect.resource === "health" && effect.delta < 0) total += effect.delta;
  }
  return total;
}

function pickFamilyChoice(state: GameState, variant: number, step: number): string {
  const view = presentEvent(state);
  if (!view) throw new Error("pending event is missing from the view");
  const event = findEvent(getUniverse(state.character.universeId), state.pending!.eventId);
  const available = view.choices.filter((choice) => choice.available);
  const scored = available.map((choice) => {
    const definition = event?.choices.find((item) => item.id === choice.id);
    return { id: choice.id, value: definition ? scoreEffects(definition.success.effects) : 0 };
  });
  const family = scored.filter((item) => item.value > 0);
  if (family.length > 0) {
    const best = Math.max(...family.map((item) => item.value));
    const top = family.filter((item) => item.value === best);
    return top[variant % top.length]!.id;
  }
  const safe = scored.filter((item) => item.value >= 0);
  const pool = safe.length > 0 ? safe : scored;
  return pool[(step * 3 + variant * 7 + 1) % pool.length]!.id;
}

function playFamilyLife(state: GameState, maxSteps: number, variant: number): GameState {
  let current = state;
  for (let step = 0; step < maxSteps && current.life.alive; step++) {
    current = applyAction(current, current.pending
      ? { type: "choose", choiceId: pickFamilyChoice(current, variant, step) }
      : { type: "advance" }).state;
  }
  return current;
}

function livingChildren(state: GameState, id: string): number {
  return state.npcs.filter((npc) => npc.alive && npc.parents.includes(id)).length;
}

interface ChainSample {
  generation: number;
  startAge: number;
  endAge: number;
  attempts: number;
  prosperity: number;
  stability: number;
  renown: number;
  atProsperityMax: number;
}

interface RealisticChain {
  universeId: UniverseId;
  completed: number;
  years: number;
  attempts: number;
  maxAttempts: number;
  samples: ChainSample[];
  metrics: WorldMetrics;
}

function runRealisticChain(universeId: UniverseId, limit = 48): RealisticChain {
  let state = start({ seed: `s13-real-${universeId}`, universeId });
  const samples: ChainSample[] = [];
  let years = 0;
  let attempts = 0;
  let maxAttempts = 0;
  for (let generation = 1; generation <= GENERATIONS; generation++) {
    const startAge = state.life.age;
    let found: { dead: GameState; heirId: string; endAge: number } | null = null;
    let tries = 0;
    for (; tries < limit && !found; tries++) {
      const result = playFamilyLife(deepClone(state), 1000, tries);
      if (!result.life.alive) {
        const best = heirCandidates(result)
          .filter((candidate) => candidate.available)
          .map((candidate) => ({ candidate, kids: livingChildren(result, candidate.npc.id) }))
          .sort((a, b) => b.kids - a.kids || a.candidate.age - b.candidate.age || a.candidate.npc.id.localeCompare(b.candidate.npc.id))[0];
        if (best) found = { dead: result, heirId: best.candidate.npc.id, endAge: result.life.age };
      }
    }
    attempts += tries;
    maxAttempts = Math.max(maxAttempts, tries);
    if (!found) {
      return { universeId, completed: generation - 1, years, attempts, maxAttempts, samples, metrics: worldMetrics(state) };
    }
    years += found.endAge;
    const metrics = worldMetrics(found.dead);
    samples.push({
      generation,
      startAge,
      endAge: found.endAge,
      attempts: tries,
      prosperity: metrics.settlements.prosperity.mean,
      stability: metrics.settlements.stability.mean,
      renown: metrics.dynastyRenown,
      atProsperityMax: metrics.settlements.atProsperityMax,
    });
    state = succeed(found.dead, found.heirId, `s13-real-${universeId}-${generation}`).state;
  }
  return { universeId, completed: GENERATIONS, years, attempts, maxAttempts, samples, metrics: worldMetrics(state) };
}

describe("Stage 13: late-game synthetic soak", () => {
  it("keeps all six worlds saturated in prosperity and stability across ten generations", () => {
    for (const universeId of UNIVERSE_IDS) {
      const high = summarize(syntheticSoak(universeId, HIGH_RENOWN));
      const control = summarize(syntheticSoak(universeId, 0));
      expect(high.final.settlements.prosperity.mean).toBeGreaterThanOrEqual(LATE_GAME_PROSPERITY);
      expect(high.final.settlements.stability.mean).toBeGreaterThanOrEqual(LATE_GAME_PROSPERITY);
      expect(high.final.settlements.atProsperityMax).toBeGreaterThanOrEqual(1);
      expect(high.prosperityP50).toBeGreaterThanOrEqual(LATE_GAME_PROSPERITY);
      expect(high.fullySaturatedBlocks).toBeGreaterThanOrEqual(1);
      expect(high.firstFullySaturatedGeneration).toBeGreaterThanOrEqual(1);
      expect(high.firstFullySaturatedGeneration).toBeLessThanOrEqual(GENERATIONS);
      expect(high.prosperityMean).toBeGreaterThan(control.prosperityMean + 20);
      expect(high.prosperityP90).toBeGreaterThanOrEqual(99);
      expect(high.prosperityMin).toBeGreaterThan(40);
      expect(high.stabilityMean).toBeGreaterThan(control.stabilityMean + 10);
      expect(control.final.settlements.prosperity.mean).toBeLessThan(80);
      expect(control.prosperityP90).toBeLessThan(80);
      expect(control.fullySaturatedBlocks).toBe(0);
      expectBounded(high.final);
      expectBounded(control.final);
    }
  }, 120000);

  it("is deterministic when the same soak runs twice", () => {
    for (const universeId of UNIVERSE_IDS) {
      expect(syntheticSoak(universeId, HIGH_RENOWN)).toEqual(syntheticSoak(universeId, HIGH_RENOWN));
    }
  }, 120000);

  it("stays inside world bounds and produces finite metrics for all 250 years", () => {
    for (const universeId of UNIVERSE_IDS) {
      for (const renown of [0, HIGH_RENOWN]) {
        const soak = syntheticSoak(universeId, renown);
        expect(soak.blocks).toHaveLength(GENERATIONS);
        expect(soak.samples).toHaveLength(TOTAL_YEARS);
        expect(soak.years).toBe(TOTAL_YEARS);
        expect(soak.blocks[soak.blocks.length - 1]!.metrics.tick).toBe(TOTAL_YEARS);
        for (const metrics of soak.samples) expectBounded(metrics);
      }
    }
  }, 120000);
});

describe("Stage 13: realistic succession chains", () => {
  it("stays bounded while reaching as many generations as the rules allow", () => {
    const chains = UNIVERSE_IDS.map((universeId) => runRealisticChain(universeId));
    for (const chain of chains) {
      expect(chain.completed).toBeGreaterThanOrEqual(1);
      expect(chain.completed).toBeLessThanOrEqual(GENERATIONS);
      expect(chain.years).toBeGreaterThan(0);
      expect(chain.attempts).toBeGreaterThanOrEqual(chain.completed);
      expectBounded(chain.metrics);
    }
    expect(chains.reduce((sum, chain) => sum + chain.completed, 0)).toBeGreaterThanOrEqual(6);
  }, 300000);

  it("is deterministic when a realistic chain runs twice", () => {
    expect(runRealisticChain("dark-fantasy")).toEqual(runRealisticChain("dark-fantasy"));
  }, 120000);
});
