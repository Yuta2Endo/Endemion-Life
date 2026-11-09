// Stage 11: долгосрочная проверка симуляции мира (синтетический стресс + реалистичные поколения)
import { describe, expect, it } from "vitest";
import {
  deepClone,
  getUniverse,
  heirCandidates,
  succeed,
  UNIVERSE_IDS,
  worldMetrics,
  worldTick,
  type GameState,
  type UniverseId,
  type WorldMetrics,
} from "../src/index.js";
import type { EngineContext } from "../src/engine/context.js";
import { Rng } from "../src/rng.js";
import { playLife, start } from "./helpers.js";

function makeCtx(state: GameState, seed = "s11-ctx"): EngineContext {
  return {
    state,
    rng: Rng.fromSeed(seed, "world"),
    universe: getUniverse(state.character.universeId),
    changes: [],
  };
}

/** Синтетический стресс: N лет с принудительно удерживаемой славой рода (изолирует дрейф worldTick). */
function runSynthetic(universeId: UniverseId, years: number, renown: number): WorldMetrics {
  const state = start({ seed: `s11-syn-${universeId}-${renown}`, universeId });
  const ctx = makeCtx(state);
  for (let year = 1; year <= years; year++) {
    state.life.age = year;
    state.lineage.renown = renown;
    worldTick(ctx);
  }
  return worldMetrics(state);
}

interface RealisticRun {
  completed: number;
  years: number;
  metrics: WorldMetrics;
}

/** Реалистичная игра: до generations поколений через естественную смерть и наследование. */
function runRealistic(universeId: UniverseId, generations: number, tag: string): RealisticRun {
  let state = start({ seed: `${tag}-${universeId}`, universeId });
  let completed = 0;
  let years = 0;
  for (let generation = 1; generation <= generations; generation++) {
    let found: { dead: GameState; heirId: string; years: number } | null = null;
    for (let attempt = 0; attempt < 10 && !found; attempt++) {
      const attemptState = deepClone(state);
      const result = playLife(attemptState, 400, (count, step) => (step * 3 + attempt * 7 + 1) % count);
      if (!result.state.life.alive) {
        const heir = heirCandidates(result.state).find((candidate) => candidate.available);
        if (heir) found = { dead: result.state, heirId: heir.npc.id, years: result.state.life.age };
      }
    }
    if (!found) break;
    years += found.years;
    state = succeed(found.dead, found.heirId, `${tag}-${universeId}-${generation}`).state;
    completed = generation;
  }
  return { completed, years, metrics: worldMetrics(state) };
}

function expectBounded(metrics: WorldMetrics): void {
  expect(metrics.hasWorld).toBe(true);
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

describe("Stage 11: синтетический стресс дрейфа процветания", () => {
  it("высокая слава за 80 лет насыщает процветание, при славе 0 — нет (все шесть миров)", () => {
    for (const universeId of UNIVERSE_IDS) {
      const high = runSynthetic(universeId, 80, 60);
      const control = runSynthetic(universeId, 80, 0);
      expectBounded(high);
      expectBounded(control);
      // Дрейф: хотя бы одно поселение достигает верхней границы, среднее заметно выше контроля.
      expect(high.settlements.atProsperityMax).toBeGreaterThanOrEqual(1);
      expect(high.settlements.prosperity.mean).toBeGreaterThan(control.settlements.prosperity.mean + 20);
      // Контроль без высокой славы не насыщается.
      expect(control.settlements.atProsperityMax).toBe(0);
      expect(control.settlements.prosperity.mean).toBeLessThan(80);
      // Стабильность следует за процветанием, но остаётся в границах.
      expect(high.settlements.stability.mean).toBeGreaterThanOrEqual(90);
    }
  }, 30000);

  it("синтетический прогон детерминирован", () => {
    for (const universeId of UNIVERSE_IDS) {
      expect(runSynthetic(universeId, 40, 60)).toEqual(runSynthetic(universeId, 40, 60));
    }
  }, 30000);
});

describe("Stage 11: реалистичные поколения", () => {
  it("до шести поколений на мир: без падений, метрики ограничены", () => {
    let totalCompleted = 0;
    for (const universeId of UNIVERSE_IDS) {
      const run = runRealistic(universeId, 6, "s11real");
      totalCompleted += run.completed;
      expect(run.completed).toBeGreaterThanOrEqual(0);
      expect(run.completed).toBeLessThanOrEqual(6);
      expect(run.years).toBeGreaterThanOrEqual(0);
      expectBounded(run.metrics);
    }
    // Реалистичный путь действительно исполняется хотя бы в одном мире.
    expect(totalCompleted).toBeGreaterThanOrEqual(1);
  }, 60000);
});