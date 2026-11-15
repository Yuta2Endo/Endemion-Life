// R5.2: третья дорога — новое место и приключение каждого мира после второй дороги.
import { describe, expect, it } from "vitest";
import {
  adventuresOf,
  applyAction,
  contentProblems,
  deepClone,
  placesOf,
  presentAdventure,
  UNIVERSE_IDS,
  type GameState,
  type UniverseId
} from "../src/index.js";
import { start } from "./helpers.js";

function grown(universeId: UniverseId, seed = `third-road-${universeId}`): GameState {
  const state = start({ seed, universeId });
  state.life = { ...state.life, age: 30, stage: "adult" };
  state.pending = null;
  for (const key of Object.keys(state.character.stats) as (keyof typeof state.character.stats)[]) state.character.stats[key] = 40;
  return state;
}

function revealAll(state: GameState): GameState {
  const copy = deepClone(state);
  for (const place of placesOf(copy.character.universeId)) copy.adventure.discovered.push(place.id);
  return copy;
}

function firstAvailable(state: GameState): string {
  const choice = presentAdventure(state).current?.step.choices.find((item) => item.available);
  if (!choice) throw new Error("нет доступного варианта");
  return choice.id;
}

function walk(state: GameState): GameState {
  let current = state;
  for (let guard = 0; guard < 8 && current.adventure.active; guard += 1) {
    current = applyAction(current, { type: "venture", choiceId: firstAvailable(current) }).state;
  }
  return current;
}

describe("R5.2: третья дорога", () => {
  it("у каждого мира три места и три дороги; третья требует вторую", () => {
    expect(contentProblems()).toEqual([]);
    for (const universeId of UNIVERSE_IDS) {
      const places = placesOf(universeId);
      const list = adventuresOf(universeId);
      expect(places, universeId).toHaveLength(3);
      expect(list, universeId).toHaveLength(3);
      expect(list[0]!.requires, list[0]!.id).toBeUndefined();
      expect(list[1]!.requires, list[1]!.id).toEqual([list[0]!.id]);
      expect(list[2]!.requires, list[2]!.id).toEqual([list[1]!.id]);
      expect(places.some((place) => place.id === list[2]!.placeId), list[2]!.id).toBe(true);
    }
  });

  it("третья дорога закрыта, пока не открыто место и не пройдена вторая", () => {
    for (const universeId of UNIVERSE_IDS) {
      const list = adventuresOf(universeId);
      const third = list[2]!;
      const noPlace = grown(universeId);
      noPlace.adventure.done.push(list[0]!.id, list[1]!.id);
      expect(presentAdventure(noPlace).adventures.find((card) => card.id === third.id)?.blocked, universeId).toBe("place");

      const noSecond = grown(universeId);
      noSecond.adventure.discovered.push(third.placeId);
      expect(presentAdventure(noSecond).adventures.find((card) => card.id === third.id)?.blocked, universeId).toBe("requires");

      const ready = grown(universeId);
      ready.adventure.discovered.push(third.placeId);
      ready.adventure.done.push(list[0]!.id, list[1]!.id);
      expect(presentAdventure(ready).adventures.find((card) => card.id === third.id)?.blocked, universeId).toBeNull();
      const started = applyAction(ready, { type: "venture", adventureId: third.id }).state;
      expect(started.adventure.active?.id, universeId).toBe(third.id);
    }
  });

  it("каждая третья дорога проходится до конца", () => {
    for (const universeId of UNIVERSE_IDS) {
      const list = adventuresOf(universeId);
      const third = list[2]!;
      let state = revealAll(grown(universeId));
      state.adventure.done.push(list[0]!.id, list[1]!.id);
      state = applyAction(state, { type: "venture", adventureId: third.id }).state;
      state = walk(state);
      expect(state.adventure.active, universeId).toBeNull();
      expect(state.adventure.done, universeId).toContain(third.id);
    }
  });
});

interface RoadRelicFinal {
  universeId: UniverseId;
  adventureId: string;
  step: string;
  relicBranch: string;
  otherBranch: string;
  relicId: string;
}

/** R5.3: финальные ветви третьей дороги и их реликвии */
const ROAD_RELIC_FINALS: readonly RoadRelicFinal[] = [
  { universeId: "dark-fantasy", adventureId: "df.bell-toll", step: "toll", relicBranch: "deep", otherBranch: "chapel", relicId: "drowned-bell" },
  { universeId: "isekai", adventureId: "is.lost-caravan", step: "ledger", relicBranch: "league", otherBranch: "guild", relicId: "caravan-ledger" },
  { universeId: "murim", adventureId: "mu.shrine-debt", step: "choice", relicBranch: "burn", otherBranch: "alliance", relicId: "iron-shrine-tablet" },
  { universeId: "xianxia", adventureId: "xi.star-trial", step: "choice", relicBranch: "keep", otherBranch: "tell", relicId: "star-well-cup" },
  { universeId: "hunter", adventureId: "hu.red-gate-raid", step: "core", relicBranch: "report", otherBranch: "corp", relicId: "red-gate-core" },
  { universeId: "academy", adventureId: "ac.star-chart", step: "dome", relicBranch: "tower", otherBranch: "court", relicId: "star-chart" },
];

function atFinalStep(universeId: UniverseId, adventureId: string, step: string): GameState {
  const state = revealAll(grown(universeId));
  state.adventure.active = { id: adventureId, step, since: state.life.age };
  return state;
}

function takeFinalBranch(item: RoadRelicFinal, branch: string): GameState {
  const state = atFinalStep(item.universeId, item.adventureId, item.step);
  return applyAction(state, { type: "venture", choiceId: branch }).state;
}

describe("R5.3: реликвии третьей дороги", () => {
  it("каждая реликвия выдаётся только выбранной финальной ветвью", () => {
    for (const item of ROAD_RELIC_FINALS) {
      const chosen = takeFinalBranch(item, item.relicBranch);
      expect(chosen.adventure.done, item.adventureId).toContain(item.adventureId);
      expect(chosen.adventure.active, item.adventureId).toBeNull();
      expect(chosen.lineage.relics.map((relic) => relic.id), item.relicId).toEqual([item.relicId]);

      const other = takeFinalBranch(item, item.otherBranch);
      expect(other.adventure.done, item.adventureId).toContain(item.adventureId);
      expect(other.lineage.relics.map((relic) => relic.id), `${item.adventureId} ${item.otherBranch}`).toEqual([]);
    }
  });

  it("реликвия выдаётся один раз, даже если финальный шаг повторить нельзя", () => {
    const item = ROAD_RELIC_FINALS[0]!;
    const state = takeFinalBranch(item, item.relicBranch);
    expect(state.lineage.relics.map((relic) => relic.id)).toEqual([item.relicId]);
    expect(() => applyAction(state, { type: "venture", choiceId: item.relicBranch })).toThrow();
    expect(state.lineage.relics).toHaveLength(1);
  });
});
