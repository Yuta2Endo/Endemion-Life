// Stage 17: конец второй дороги — выбор, не единственная печать. Третьей дороги нет: цель «все дела» не сдвигается.
import { describe, expect, it } from "vitest";
import { adventuresOf, applyAction, contentProblems, eventProblems, presentAdventure, UNIVERSE_IDS, type GameState, type UniverseId } from "../src/index.js";
import { start } from "./helpers.js";

const FORK: Readonly<Record<UniverseId, string>> = {
  "dark-fantasy": "bury",
  isekai: "keep",
  murim: "share",
  xianxia: "silence",
  hunter: "quiet",
  academy: "rose"
};

function grown(universeId: UniverseId): GameState {
  const state = start({ seed: `pack-${universeId}`, universeId });
  state.life = { ...state.life, age: 30, stage: "adult" };
  state.pending = null;
  for (const key of Object.keys(state.character.stats) as (keyof typeof state.character.stats)[]) state.character.stats[key] = 40;
  return state;
}

function walk(state: GameState, prefer: string): GameState {
  let current = state;
  for (let guard = 0; guard < 8 && current.adventure.active; guard += 1) {
    const choices = presentAdventure(current).current?.step.choices.filter((item) => item.available) ?? [];
    const pick = choices.find((item) => item.id === prefer) ?? choices[0];
    if (!pick) break;
    current = applyAction(current, { type: "venture", choiceId: pick.id }).state;
  }
  return current;
}

describe("Stage 17: развилка второй дороги", () => {
  it("контент цел, дорог по-прежнему две, у финала два конца", () => {
    expect(contentProblems()).toEqual([]);
    expect(eventProblems()).toEqual([]);
    for (const universeId of UNIVERSE_IDS) {
      const list = adventuresOf(universeId);
      expect(list, universeId).toHaveLength(2);
      const last = list[1]!.steps.at(-1)!;
      const ids = last.choices.map((choice) => choice.id);
      expect(ids, list[1]!.id).toContain(FORK[universeId]);
      expect(last.choices.every((choice) => choice.success.complete === true)).toBe(true);
      expect(last.choices.every((choice) => choice.check === undefined)).toBe(true);
    }
  });

  it("тихий конец закрывает дело и не повторяет награду", () => {
    for (const universeId of UNIVERSE_IDS) {
      const list = adventuresOf(universeId);
      const state = grown(universeId);
      state.adventure.discovered.push(list[0]!.placeId, list[1]!.placeId);
      state.adventure.done.push(list[0]!.id);
      let current = applyAction(state, { type: "venture", adventureId: list[1]!.id }).state;
      current = walk(current, FORK[universeId]);
      expect(current.adventure.done, universeId).toContain(list[1]!.id);
      expect(current.adventure.active).toBeNull();
      const wealth = current.character.wealth;
      expect(() => applyAction(current, { type: "venture", adventureId: list[1]!.id })).toThrow();
      expect(current.character.wealth).toBe(wealth);
    }
  });
});