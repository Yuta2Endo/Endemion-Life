// Stage 11: описания приключений сходятся, вторая дорога закрыта, пока не пройдена первая
import { describe, expect, it } from "vitest";
import {
  adventuresOf,
  applyAction,
  contentProblems,
  deepClone,
  eventIndex,
  eventProblems,
  GameRuleError,
  getUniverse,
  placesOf,
  presentAdventure,
  UNIVERSE_IDS,
  type AdventureDefinition,
  type GameState,
  type UniverseId
} from "../src/index.js";
import { start } from "./helpers.js";

function grown(universeId: UniverseId): GameState {
  const state = start({ seed: `content-${universeId}`, universeId });
  state.life = { ...state.life, age: 30, stage: "adult" };
  state.pending = null;
  for (const key of Object.keys(state.character.stats) as (keyof typeof state.character.stats)[]) state.character.stats[key] = 40;
  for (const place of placesOf(universeId)) state.adventure.discovered.push(place.id);
  return state;
}

function firstAvailable(state: GameState): string {
  const choice = presentAdventure(state).current?.step.choices.find((item) => item.available);
  if (!choice) throw new Error("нет доступного варианта");
  return choice.id;
}

function withOne(adventure: AdventureDefinition): Readonly<Record<UniverseId, readonly AdventureDefinition[]>> {
  const source = {} as Record<UniverseId, readonly AdventureDefinition[]>;
  for (const universeId of UNIVERSE_IDS) source[universeId] = universeId === "dark-fantasy" ? [adventure] : [];
  return source;
}

describe("Stage 11: контент", () => {
  it("живой контент не содержит битых ссылок и повторов; у каждого мира две дороги", () => {
    expect(contentProblems()).toEqual([]);
    for (const universeId of UNIVERSE_IDS) {
      const list = adventuresOf(universeId);
      expect(list.length, universeId).toBe(2);
      expect(list[1]!.requires, list[1]!.id).toEqual([list[0]!.id]);
      expect(placesOf(universeId).some((place) => place.id === list[1]!.placeId), list[1]!.id).toBe(true);
    }
  });

  it("вторая дорога не начинается раньше первой и не начинается второй раз", () => {
    const state = grown("dark-fantasy");
    expect(() => applyAction(state, { type: "venture", adventureId: "df.ash-relic" })).toThrow(GameRuleError);
    state.adventure.done.push("df.night-watch");
    let current = applyAction(state, { type: "venture", adventureId: "df.ash-relic" }).state;
    expect(current.adventure.active?.id).toBe("df.ash-relic");
    let guard = 0;
    while (current.adventure.active && guard < 6) {
      guard += 1;
      current = applyAction(current, { type: "venture", choiceId: firstAvailable(current) }).state;
    }
    expect(current.adventure.done).toContain("df.ash-relic");
    expect(() => applyAction(current, { type: "venture", adventureId: "df.ash-relic" })).toThrow(GameRuleError);
  });

  it("проверка ловит шаг в никуда, повтор варианта и чужую способность", () => {
    const adventure = deepClone(adventuresOf("dark-fantasy")[0]!);
    adventure.steps[0]!.choices[0]!.success.next = "nowhere";
    expect(contentProblems(withOne(adventure)).some((line) => line.includes("nowhere"))).toBe(true);

    const doubled = deepClone(adventuresOf("dark-fantasy")[0]!);
    doubled.steps[0]!.choices.push(doubled.steps[0]!.choices[0]!);
    expect(contentProblems(withOne(doubled)).some((line) => line.includes("повторяется"))).toBe(true);

    const foreign = deepClone(adventuresOf("dark-fantasy")[0]!);
    foreign.steps[0]!.choices[0]!.success.effects = [{ type: "ability", id: "chain-lightning" }];
    expect(contentProblems(withOne(foreign)).some((line) => line.includes("chain-lightning"))).toBe(true);
  });

  it("события года не ссылаются в никуда, а продолжение на чужое событие ловится", () => {
    expect(eventProblems()).toEqual([]);
    const universe = getUniverse("dark-fantasy");
    const index = eventIndex(universe);
    const id = [...index.keys()][0]!;
    const saved = index.get(id)!;
    const broken = deepClone(saved);
    broken.choices[0]!.success.effects = [{ type: "schedule", eventId: "no-such-event", inYears: 1 }];
    index.set(id, broken);
    expect(eventProblems("dark-fantasy").some((line) => line.includes("no-such-event"))).toBe(true);
    index.set(id, saved);
    expect(eventProblems("dark-fantasy")).toEqual([]);
  });

  it("край двигается от второй дороги один раз и слабее, чем от первой", () => {
    const state = grown("isekai");
    state.adventure.done = ["is.first-contract", "is.second-contract"];
    const once = applyAction(state, { type: "advance" }).state;
    const strain = once.region.strain;
    expect(once.region.seen).toContain("is.second-contract");
    expect(once.region.prosperity).toBeGreaterThan(0);
    const twice = applyAction(once, { type: "advance" }).state;
    expect(twice.region.seen.filter((id) => id === "is.second-contract")).toHaveLength(1);
    expect(twice.region.strain).toBeLessThanOrEqual(strain);
  });
});
