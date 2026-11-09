// Stage 11: чистые производные метрики мира
import { describe, expect, it } from "vitest";
import { getUniverse, presentLineage, worldMetrics } from "../src/index.js";
import { DYNASTY_RENOWN_DISGRACED, DYNASTY_RENOWN_RECOGNIZED } from "../src/world/state.js";
import { start } from "./helpers.js";

describe("Stage 11: метрики мира", () => {
  it("отсутствующий мир безопасен: нулевые сводки и count = 0", () => {
    const state = start({ seed: "s11-metrics-noworld", universeId: "academy" });
    delete state.world;
    const metrics = worldMetrics(state);
    expect(metrics.hasWorld).toBe(false);
    expect(metrics.settlements.count).toBe(0);
    expect(metrics.settlements.prosperity).toEqual({ min: 0, max: 0, mean: 0, count: 0 });
    expect(Number.isNaN(metrics.settlements.prosperity.mean)).toBe(false);
    expect(metrics.settlements.stability.count).toBe(0);
    expect(metrics.factions.count).toBe(0);
    expect(metrics.activities.count).toBe(0);
    expect(metrics.dynastyRenown).toBe(state.lineage.renown);
  });

  it("сводки совпадают с фактическими данными мира", () => {
    const state = start({ seed: "s11-metrics-data", universeId: "dark-fantasy" });
    const metrics = worldMetrics(state);
    const prosperity = state.world!.settlements.map((settlement) => settlement.prosperity);
    const stability = state.world!.settlements.map((settlement) => settlement.stability);
    expect(metrics.hasWorld).toBe(true);
    expect(metrics.settlements.count).toBe(prosperity.length);
    expect(metrics.settlements.prosperity.min).toBe(Math.min(...prosperity));
    expect(metrics.settlements.prosperity.max).toBe(Math.max(...prosperity));
    expect(metrics.settlements.prosperity.mean).toBeCloseTo(
      prosperity.reduce((sum, value) => sum + value, 0) / prosperity.length,
      10
    );
    expect(metrics.settlements.stability.min).toBe(Math.min(...stability));
    expect(metrics.settlements.stability.max).toBe(Math.max(...stability));
    expect(metrics.factions.count).toBe(getUniverse("dark-fantasy").factions.length);
    expect(metrics.factions.relation.count).toBe(getUniverse("dark-fantasy").factions.length);
  });

  it("считает поселения на верхней и нижней границах", () => {
    const state = start({ seed: "s11-metrics-cap", universeId: "dark-fantasy" });
    const settlements = state.world!.settlements;
    settlements[0]!.prosperity = 100;
    settlements[1]!.prosperity = 0;
    settlements[settlements.length - 1]!.stability = 100;
    const metrics = worldMetrics(state);
    expect(metrics.settlements.atProsperityMax).toBeGreaterThanOrEqual(1);
    expect(metrics.settlements.atProsperityMin).toBeGreaterThanOrEqual(1);
    expect(metrics.settlements.atStabilityMax).toBeGreaterThanOrEqual(1);
  });

  it("отношения рода конечны и остаются в пределах ±30 даже при высокой славе", () => {
    const state = start({ seed: "s11-metrics-rel", universeId: "dark-fantasy" });
    state.lineage.renown = 100;
    state.lineage.achievements.push({ id: "great-house", gen: 1, age: 40 });
    const metrics = worldMetrics(state);
    expect(metrics.factions.relation.min).toBeGreaterThanOrEqual(-30);
    expect(metrics.factions.relation.max).toBeLessThanOrEqual(30);
    for (const value of [metrics.factions.relation.min, metrics.factions.relation.max, metrics.factions.relation.mean]) {
      expect(Number.isFinite(value)).toBe(true);
    }
  });

  it("не мутирует исходное состояние", () => {
    const state = start({ seed: "s11-metrics-pure", universeId: "murim" });
    state.lineage.renown = 60;
    const before = JSON.stringify(state);
    worldMetrics(state);
    expect(JSON.stringify(state)).toBe(before);
  });

  it("byKind суммируется в activities.count", () => {
    const state = start({ seed: "s11-metrics-kind", universeId: "hunter" });
    const metrics = worldMetrics(state);
    const total = Object.values(metrics.activities.byKind).reduce((sum, value) => sum + value, 0);
    expect(total).toBe(metrics.activities.count);
  });

  it("детерминизм: повторный вызов даёт тот же результат", () => {
    const state = start({ seed: "s11-metrics-det", universeId: "xianxia" });
    expect(worldMetrics(state)).toEqual(worldMetrics(state));
  });

  it("пороговые константы едины и применяются ровно на границах", () => {
    expect(DYNASTY_RENOWN_RECOGNIZED).toBe(50);
    expect(DYNASTY_RENOWN_DISGRACED).toBe(-50);
    const state = start({ seed: "s11-threshold", universeId: "dark-fantasy" });
    state.lineage.renown = DYNASTY_RENOWN_RECOGNIZED;
    expect(presentLineage(state).dynasty.identity.label.ru).toContain("Влиятельный");
    state.lineage.renown = DYNASTY_RENOWN_RECOGNIZED - 1;
    expect(presentLineage(state).dynasty.identity.label.ru).toContain("Новый");
    state.lineage.renown = DYNASTY_RENOWN_DISGRACED;
    expect(presentLineage(state).dynasty.identity.label.ru).toContain("Позорный");
    state.lineage.renown = DYNASTY_RENOWN_DISGRACED + 1;
    expect(presentLineage(state).dynasty.identity.label.ru).toContain("Новый");
  });
});