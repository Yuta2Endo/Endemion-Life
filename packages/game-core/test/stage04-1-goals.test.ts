import { describe, expect, it } from "vitest";
import {
  applyAction,
  getUniverse,
  presentEvent,
  UNIVERSE_IDS,
  type GameState,
} from "../src/index.js";
import { Rng } from "../src/rng.js";
import { TEMPERAMENTS } from "../src/character/temperaments.js";
import {
  evaluateGoal,
  goalForTemperament,
  PLAYER_GOALS,
} from "../src/character/goals.js";
import type { EngineContext } from "../src/engine/context.js";
import { start } from "./helpers.js";

function makeCtx(state: GameState): EngineContext {
  return {
    state,
    rng: Rng.fromSeed("g41-test", "goal"),
    universe: getUniverse(state.character.universeId),
    changes: [],
  };
}

function advanceYear(state: GameState): GameState {
  let current = state;
  for (let guard = 0; guard < 5 && current.pending && current.life.alive; guard++) {
    const view = presentEvent(current);
    if (!view) break;
    const choice = view.choices.find((c) => c.available);
    if (!choice) break;
    const result = applyAction(current, { type: "choose", choiceId: choice.id });
    current = result.state;
    if (!current.life.alive) return current;
  }
  if (!current.life.alive) return current;
  return applyAction(current, { type: "advance", years: 1 }).state;
}

function advanceToAdult(state: GameState): GameState {
  let current = state;
  for (let i = 0; i < 40 && current.life.alive && current.life.stage !== "adult"; i++) {
    current = advanceYear(current);
  }
  return current;
}

describe("Stage 04.1: personality and goals", () => {
  it("keeps the six original temperaments and adds disciplined and loyal", () => {
    const ids = TEMPERAMENTS.map((t) => t.id);
    expect(ids).toHaveLength(8);
    for (const id of ["brave", "cunning", "kind", "ambitious", "calm", "curious"]) {
      const t = TEMPERAMENTS.find((x) => x.id === id)!;
      expect(t.statMods).toBeDefined();
      expect(t.growth.length).toBeGreaterThan(0);
    }
    expect(TEMPERAMENTS.find((t) => t.id === "disciplined")!.statMods.willpower).toBe(2);
    expect(TEMPERAMENTS.find((t) => t.id === "loyal")!.statMods.charisma).toBe(2);
  });

  it("maps every temperament to a valid player goal", () => {
    const goalIds = new Set(PLAYER_GOALS.map((g) => g.id));
    for (const temperament of TEMPERAMENTS) {
      const goal = goalForTemperament(temperament.id);
      expect(goalIds.has(goal)).toBe(true);
    }
    expect(goalForTemperament("disciplined")).toBe("mastery");
    expect(goalForTemperament("loyal")).toBe("family");
  });

  it("evaluateGoal returns null when there is no active goal", () => {
    const state = start({ seed: "g41-no-goal", universeId: "dark-fantasy" });
    state.character.goal = null;
    const result = evaluateGoal(makeCtx(state));
    expect(result).toBeNull();
    expect(state.character.goal).toBeNull();
  });

  it("evaluateGoal reports progress without completing", () => {
    const state = start({ seed: "g41-progress", universeId: "dark-fantasy" });
    state.character.goal = "wealth";
    state.character.wealth = 100;
    state.character.goalProgress = 0;
    const result = evaluateGoal(makeCtx(state));
    expect(result).toBeNull();
    expect(state.character.goal).toBe("wealth");
    expect(state.character.goalProgress).toBe(50);
  });

  it("evaluateGoal completes a wealth goal and grants a reward", () => {
    const state = start({ seed: "g41-complete", universeId: "dark-fantasy" });
    state.character.goal = "wealth";
    state.character.wealth = 250;
    state.character.goalProgress = 0;
    const renownBefore = state.lineage.renown;
    const reputationBefore = state.character.reputation;
    const result = evaluateGoal(makeCtx(state));
    expect(result).toEqual({ goalId: "wealth", kind: "complete" });
    expect(state.character.goal).toBeNull();
    expect(state.character.goalProgress).toBe(0);
    expect(state.lineage.renown).toBe(renownBefore + 2);
    expect(state.character.reputation).toBe(reputationBefore + 3);
  });

  it("evaluateGoal expires a goal at max age", () => {
    const state = start({ seed: "g41-expire", universeId: "dark-fantasy" });
    state.character.goal = "wealth";
    state.character.wealth = 0;
    state.character.goalProgress = 0;
    state.life.age = 60;
    const karmaBefore = state.character.karma;
    const result = evaluateGoal(makeCtx(state));
    expect(result).toEqual({ goalId: "wealth", kind: "expire" });
    expect(state.character.goal).toBeNull();
    expect(state.character.goalProgress).toBe(0);
    expect(state.character.karma).toBe(karmaBefore - 1);
  });

  it("records a completed goal in the history of a life", () => {
    let state = start({ seed: "g41-history", universeId: "dark-fantasy" });
    state.character.goal = "wealth";
    state.character.wealth = 300;
    state.character.goalProgress = 0;
    const result = applyAction(state, { type: "advance", years: 1 });
    state = result.state;
    expect(state.character.goal).toBeNull();
    expect(result.entries.some((entry) => entry.eventId === "goal.wealth")).toBe(true);
  });

  it("assigns a deterministic adulthood goal by temperament in every world", () => {
    const goals = new Map<string, string>();
    for (let run = 0; run < 2; run++) {
      for (const universeId of UNIVERSE_IDS) {
        const state = start({ seed: "g41-adult-det", universeId });
        const adult = advanceToAdult(state);
        expect(adult.life.stage).toBe("adult");
        expect(adult.character.goal).not.toBeNull();
        expect(adult.character.goalProgress).toBeGreaterThanOrEqual(0);
        expect(adult.character.goalProgress).toBeLessThanOrEqual(100);
        expect([...PLAYER_GOALS.map((g) => g.id)]).toContain(adult.character.goal);
        goals.set(`${run}:${universeId}`, adult.character.goal!);
      }
    }
    for (const universeId of UNIVERSE_IDS) {
      expect(goals.get(`0:${universeId}`)).toBe(goals.get(`1:${universeId}`));
    }
  });

  it("goal definitions are bounded, unique and completable", () => {
    const ids = PLAYER_GOALS.map((g) => g.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const goal of PLAYER_GOALS) {
      expect(goal.minAge).toBeGreaterThanOrEqual(0);
      expect(goal.maxAge).toBeGreaterThan(goal.minAge);
      expect(goal.maxAge).toBeLessThanOrEqual(60);
      expect(typeof goal.id).toBe("string");
      expect(goal.id.length).toBeGreaterThan(0);
    }
  });
});
