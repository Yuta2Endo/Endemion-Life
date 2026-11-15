// R5.4: четвёртая дорога — эпилог после третьей. Реликвия третьей открывает особый финал.
import { describe, expect, it } from "vitest";
import {
  adventuresOf,
  applyAction,
  contentProblems,
  deepClone,
  GameRuleError,
  placesOf,
  presentAdventure,
  UNIVERSE_IDS,
  type GameState,
  type UniverseId
} from "../src/index.js";
import { start } from "./helpers.js";

interface EchoRoad {
  placeId: string;
  adventureId: string;
  relicId: string;
  finalStep: string;
  relicChoice: string;
}

const ECHOES: Readonly<Record<UniverseId, EchoRoad>> = {
  "dark-fantasy": { placeId: "df.last-light", adventureId: "df.last-vigil", relicId: "drowned-bell", finalStep: "choice", relicChoice: "road" },
  isekai: { placeId: "is.old-signpost", adventureId: "is.road-home", relicId: "caravan-ledger", finalStep: "choice", relicChoice: "home" },
  murim: { placeId: "mu.sword-grave", adventureId: "mu.nameless-blade", relicId: "iron-shrine-tablet", finalStep: "choice", relicChoice: "nameless" },
  xianxia: { placeId: "xi.mirror-terrace", adventureId: "xi.sky-beneath", relicId: "star-well-cup", finalStep: "choice", relicChoice: "cup" },
  hunter: { placeId: "hu.gate-zero", adventureId: "hu.gate-remembers", relicId: "red-gate-core", finalStep: "choice", relicChoice: "remember" },
  academy: { placeId: "ac.rooftop", adventureId: "ac.unwritten-constellation", relicId: "star-chart", finalStep: "choice", relicChoice: "unwritten" }
};

function grown(universeId: UniverseId, seed = `echoes-${universeId}`): GameState {
  const state = start({ seed, universeId });
  state.life = { ...state.life, age: 30, stage: "adult" };
  state.pending = null;
  for (const key of Object.keys(state.character.stats) as (keyof typeof state.character.stats)[]) state.character.stats[key] = 100;
  return state;
}

function revealAll(state: GameState): GameState {
  const copy = deepClone(state);
  for (const place of placesOf(copy.character.universeId)) copy.adventure.discovered.push(place.id);
  return copy;
}

function finishedThird(state: GameState): GameState {
  const list = adventuresOf(state.character.universeId);
  state.adventure.done.push(list[0]!.id, list[1]!.id, list[2]!.id);
  return state;
}

function atFinal(state: GameState, item: EchoRoad): GameState {
  state.adventure.active = { id: item.adventureId, step: item.finalStep, since: state.life.age };
  return state;
}

function withRelic(state: GameState, relicId: string): GameState {
  state.lineage.relics.push({
    id: relicId,
    name: { ru: relicId, en: relicId },
    description: { ru: relicId, en: relicId },
    acquiredGen: state.lineage.generation,
    acquiredAge: state.life.age,
    source: "test"
  });
  return state;
}

describe("R5.4: четвёртая дорога", () => {
  it("у каждого мира четыре места и четыре дороги; четвёртая требует третью и имеет четыре шага", () => {
    expect(contentProblems()).toEqual([]);
    for (const universeId of UNIVERSE_IDS) {
      const places = placesOf(universeId);
      const list = adventuresOf(universeId);
      expect(places, universeId).toHaveLength(4);
      expect(list, universeId).toHaveLength(4);
      expect(list[3]!.requires, list[3]!.id).toEqual([list[2]!.id]);
      expect(list[3]!.steps.map((step) => step.id), list[3]!.id).toEqual(["arrival", "talk", "test", "choice"]);
      expect(places.some((place) => place.id === list[3]!.placeId), list[3]!.id).toBe(true);

      const item = ECHOES[universeId];
      expect(list[3]!.id, universeId).toBe(item.adventureId);
      expect(list[3]!.placeId, universeId).toBe(item.placeId);
      expect(places.some((place) => place.id === item.placeId), universeId).toBe(true);
    }
  });

  it("четвёртая дорога закрыта, пока не открыто место и не пройдена третья", () => {
    for (const universeId of UNIVERSE_IDS) {
      const list = adventuresOf(universeId);
      const fourth = list[3]!;
      const item = ECHOES[universeId];

      const noPlace = finishedThird(grown(universeId));
      expect(presentAdventure(noPlace).adventures.find((card) => card.id === fourth.id)?.blocked, universeId).toBe("place");
      expect(() => applyAction(noPlace, { type: "venture", adventureId: fourth.id })).toThrow(GameRuleError);

      const noThird = grown(universeId);
      noThird.adventure.discovered.push(item.placeId);
      noThird.adventure.done.push(list[0]!.id, list[1]!.id);
      expect(presentAdventure(noThird).adventures.find((card) => card.id === fourth.id)?.blocked, universeId).toBe("requires");
      expect(() => applyAction(noThird, { type: "venture", adventureId: fourth.id })).toThrow(GameRuleError);

      const ready = revealAll(grown(universeId));
      finishedThird(ready);
      expect(presentAdventure(ready).adventures.find((card) => card.id === fourth.id)?.blocked, universeId).toBeNull();
      const started = applyAction(ready, { type: "venture", adventureId: fourth.id }).state;
      expect(started.adventure.active?.id, universeId).toBe(fourth.id);
    }
  });

  it("реликвия третьей дороги открывает особый финал, без неё вариант закрыт", () => {
    for (const universeId of UNIVERSE_IDS) {
      const item = ECHOES[universeId];
      const adventure = adventuresOf(universeId).find((entry) => entry.id === item.adventureId)!;
      const final = adventure.steps.find((step) => step.id === item.finalStep)!;
      const gated = final.choices.find((choice) => choice.id === item.relicChoice)!;
      expect(gated.requires?.some((condition) => condition.type === "relic" && condition.id === item.relicId), item.relicChoice).toBe(true);

      const without = atFinal(revealAll(grown(universeId)), item);
      const closed = presentAdventure(without).current!.step.choices.find((choice) => choice.id === item.relicChoice)!;
      expect(closed.available, universeId).toBe(false);
      expect(() => applyAction(without, { type: "venture", choiceId: item.relicChoice })).toThrow(GameRuleError);

      const withIt = withRelic(atFinal(revealAll(grown(universeId)), item), item.relicId);
      const open = presentAdventure(withIt).current!.step.choices.find((choice) => choice.id === item.relicChoice)!;
      expect(open.available, universeId).toBe(true);
      const chosen = applyAction(withIt, { type: "venture", choiceId: item.relicChoice }).state;
      expect(chosen.adventure.done, universeId).toContain(item.adventureId);
      expect(chosen.adventure.active, universeId).toBeNull();
    }
  });

  it("полный проход четвёртой дороги завершает её и выдаёт награду", () => {
    const item = ECHOES["dark-fantasy"];
    let state = finishedThird(revealAll(grown("dark-fantasy", "echoes-playthrough")));
    state = applyAction(state, { type: "venture", adventureId: item.adventureId }).state;
    for (const choiceId of ["greet", "listen", "carry"]) {
      state = applyAction(state, { type: "venture", choiceId }).state;
      expect(state.adventure.active?.id, choiceId).toBe(item.adventureId);
    }
    const before = state;
    const after = applyAction(state, { type: "venture", choiceId: "wall" }).state;
    expect(after.adventure.active).toBeNull();
    expect(after.adventure.done).toContain(item.adventureId);
    expect(after.character.wealth).toBe(before.character.wealth + 15);
    expect(after.character.factions["order-of-ash"]).toBe((before.character.factions["order-of-ash"] ?? 0) + 7);
    expect(after.character.reputation).toBe(before.character.reputation + 4);
  });
});
