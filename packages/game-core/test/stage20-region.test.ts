// Stage 20: край давит на уже существующие веса NPC. Золота не печатает. Повтор того же края даёт тот же множитель.
import { describe, expect, it } from "vitest";
import { applyAction, newGame, regionFactor } from "../src/index.js";

describe("Stage 20: край и NPC", () => {
  it("множитель ограничен и ниже порога равен единице", () => {
    expect(regionFactor("illness", 0, 0)).toBe(1);
    expect(regionFactor("job-loss", 39, 100)).toBe(1);
    expect(regionFactor("promotion", 100, 39)).toBe(1);
    expect(regionFactor("illness", 100, 0)).toBeLessThanOrEqual(1.5);
    expect(regionFactor("illness", 100, 0)).toBeGreaterThan(1);
    expect(regionFactor("promotion", 0, 100)).toBeLessThanOrEqual(1.25);
    expect(regionFactor("promotion", 0, 100)).toBeGreaterThan(1);
    expect(regionFactor("illness", 80, 10)).toBe(regionFactor("illness", 80, 10));
  });

  it("напряжённый край не печатает золото персонажа за год", () => {
    const calm = newGame({ seed: "region-year", universeId: "dark-fantasy" }).state;
    const tense = newGame({ seed: "region-year", universeId: "dark-fantasy" }).state;
    calm.region.strain = 0;
    tense.region.strain = 100;
    tense.region.prosperity = 0;
    const afterCalm = applyAction(calm, { type: "advance", years: 1 }).state;
    const afterTense = applyAction(tense, { type: "advance", years: 1 }).state;
    expect(afterTense.character.wealth).toBeLessThanOrEqual(afterCalm.character.wealth + 1);
    expect(afterTense.npcs.every((npc) => npc.wealth <= 100_000)).toBe(true);
  });
});