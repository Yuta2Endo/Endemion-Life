// R5.1: Атлас мира — чистый снимок шести миров, прогресс и открытые дороги.
import { describe, expect, it } from "vitest";
import {
  adventuresOf,
  getUniverse,
  placesOf,
  presentAdventure,
  presentAtlas,
  presentProfile,
  UNIVERSE_IDS,
  type AtlasSnapshot,
  type GameState,
  type UniverseId
} from "../src/index.js";
import { start } from "./helpers.js";

function grown(universeId: UniverseId, age = 30): GameState {
  const state = start({ universeId });
  state.life = { ...state.life, age, stage: "adult" };
  state.pending = null;
  return state;
}

function snapshot(state: GameState): AtlasSnapshot {
  return {
    universeId: state.character.universeId,
    age: state.life.age,
    track: state.character.track,
    factions: state.character.factions,
    socialClassId: state.character.socialClassId,
    meters: presentProfile(state).meters,
    adventure: presentAdventure(state)
  };
}

describe("R5.1: Атлас мира", () => {
  it("собирает атлас каждого из шести миров из одного и того же снимка", () => {
    for (const universeId of UNIVERSE_IDS) {
      const state = grown(universeId);
      const universe = getUniverse(universeId);
      const view = presentAtlas(snapshot(state));

      expect(view.universeId, universeId).toBe(universeId);
      expect(view.name.ru.length, universeId).toBeGreaterThan(0);
      expect(view.name.en.length, universeId).toBeGreaterThan(0);
      expect(view.tagline.ru.length, universeId).toBeGreaterThan(0);
      expect(view.description.en.length, universeId).toBeGreaterThan(0);
      expect(view.rules.length, universeId).toBeGreaterThan(0);
      expect(view.mechanics.length, universeId).toBeGreaterThan(0);
      expect(view.socialClasses.length, universeId).toBe(universe.socialClasses.length);
      expect(view.factions.length, universeId).toBe(universe.factions.length);
      expect(view.meters.length, universeId).toBe(universe.meters.length);
      expect(view.places.length, universeId).toBe(placesOf(universeId).length);
      expect(view.progress.placesTotal, universeId).toBe(view.places.length);
      expect(view.progress.adventuresTotal, universeId).toBe(view.places.reduce((sum, place) => sum + place.adventures.length, 0));
      expect(view.progress.mechanicCount, universeId).toBe(universe.mechanics.length);
      expect(view.progress.socialClassCount, universeId).toBe(universe.socialClasses.length);
      expect(view.socialClasses.some((socialClass) => socialClass.current), universeId).toBe(true);
      expect(view.track.rankName.ru.length, universeId).toBeGreaterThan(0);
      expect(view.track.pointsName.en.length, universeId).toBeGreaterThan(0);
      expect(view.progress.placesFound, universeId).toBe(0);
      expect(view.progress.adventuresDone, universeId).toBe(0);
      for (const place of view.places) {
        expect(place.discovered, universeId).toBe(false);
        expect(place.name, universeId).toBeNull();
        expect(place.text, universeId).toBeNull();
        for (const adventure of place.adventures) {
          expect(adventure.status, universeId).toBe("locked");
          expect(adventure.name.en.length, universeId).toBeGreaterThan(0);
        }
      }
    }
  });

  it("детерминирован: один снимок даёт одинаковый атлас", () => {
    const state = grown("xianxia");
    expect(presentAtlas(snapshot(state))).toEqual(presentAtlas(snapshot(state)));
  });

  it("показывает открытое место, пройденное и доступное приключение", () => {
    const state = grown("hunter");
    state.adventure.discovered = presentAdventure(state).places.map((place) => place.id);
    const first = presentAdventure(state).adventures[0];
    expect(first).toBeDefined();
    state.adventure.done = [first!.id];

    const view = presentAtlas(snapshot(state));
    const places = view.places.filter((place) => place.discovered);
    expect(places.length).toBe(view.progress.placesTotal);
    expect(places.every((place) => place.name !== null && place.text !== null)).toBe(true);
    const cards = view.places.flatMap((place) => place.adventures);
    expect(cards.find((card) => card.id === first!.id)?.status).toBe("completed");
    expect(cards.some((card) => card.status === "available")).toBe(true);
    expect(view.progress.placesFound).toBe(view.progress.placesTotal);
    expect(view.progress.adventuresDone).toBe(1);
  });

  it("показывает проваленное и активное приключение", () => {
    const state = grown("murim");
    state.adventure.discovered = presentAdventure(state).places.map((place) => place.id);
    const [first, second] = presentAdventure(state).adventures;
    expect(first).toBeDefined();
    expect(second).toBeDefined();
    state.adventure.failed = [first!.id];
    const failedView = presentAtlas(snapshot(state));
    expect(failedView.places.flatMap((place) => place.adventures).find((card) => card.id === first!.id)?.status).toBe("failed");

    state.adventure.active = { id: second!.id, step: adventuresOf("murim").find((adventure) => adventure.id === second!.id)!.steps[0]!.id, since: state.life.age };
    const activeView = presentAtlas(snapshot(state));
    expect(activeView.places.flatMap((place) => place.adventures).find((card) => card.id === second!.id)?.status).toBe("active");
  });

  it("показывает возрастные преграды, фракции и ранг пути", () => {
    const universe = getUniverse("academy");
    const state = grown("academy", 10);
    const place = placesOf("academy")[0];
    expect(place).toBeDefined();
    state.life.age = Math.max(0, place!.minAge - 1);
    const youngView = presentAtlas(snapshot(state));
    expect(youngView.places.find((item) => item.id === place!.id)?.ageLocked).toBe(true);

    const targetRank = Math.min(2, universe.track.ranks.length - 1);
    const target = universe.track.ranks[targetRank];
    expect(target).toBeDefined();
    state.character.track = { points: target!.threshold, rank: targetRank };
    const faction = universe.factions[0];
    expect(faction).toBeDefined();
    state.character.factions = { [faction!.id]: 17 };
    const view = presentAtlas(snapshot(state));
    expect(view.track.rank).toBe(targetRank);
    expect(view.track.rankName).toEqual(target!.name);
    expect(view.track.progress).toBe(targetRank === universe.track.ranks.length - 1 ? 1 : 0);
    expect(view.factions.find((item) => item.id === faction!.id)).toMatchObject({ known: true, standing: 17 });
    expect(view.progress.factionsKnown).toBe(1);
  });
});
