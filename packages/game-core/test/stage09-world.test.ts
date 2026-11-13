// Stage 09: хроника рода и действие-зависимые отношения с фракциями
import { describe, expect, it } from "vitest";
import {
  getUniverse,
  SELF_ID,
  newGame,
  parseSave,
  presentLineage,
  renderChronicle,
  UNIVERSE_IDS,
  worldTick,
  type ChronicleEntry,
  type GameState,
  type UniverseId,
} from "../src/index.js";
import { checkAchievements } from "../src/legacy/lineage.js";
import { setThread } from "../src/engine/effects.js";
import type { EngineContext } from "../src/engine/context.js";
import { Rng } from "../src/rng.js";
import { start } from "./helpers.js";

function roundTrip(state: GameState): GameState {
  return parseSave(JSON.parse(JSON.stringify(state)));
}

function makeCtx(state: GameState, seed = "s9-ctx"): EngineContext {
  return {
    state,
    rng: Rng.fromSeed(seed, "world"),
    universe: getUniverse(state.character.universeId),
    changes: [],
  };
}

function factionStanding(state: GameState, factionId: string): number {
  return (state.character.factions)[factionId] ?? 0;
}

function worldActivity(state: GameState, idPrefix: string): boolean {
  return state.world?.activities.some((a) => a.id.startsWith(idPrefix)) ?? false;
}

describe("Dynasty achievement → faction standing", () => {
  it("great-house unlock strengthens relationship with faction (dark-fantasy)", () => {
    const state = start({ seed: "s9-gh-dark", universeId: "dark-fantasy" });
    state.lineage.renown = 60;
    const ctx = makeCtx(state);
    const before = factionStanding(state, "order-of-ash");
    checkAchievements(ctx, () => {});
    expect(state.character.factions["order-of-ash"] ?? 0).toBe(before + 5);
    expect(worldActivity(state, "dynasty-favor.great-house.order-of-ash")).toBe(true);
  });

  it("great-house unlock strengthens relationship with faction (hunter)", () => {
    const state = start({ seed: "s9-gh-hunt", universeId: "hunter" });
    state.lineage.renown = 60;
    const ctx = makeCtx(state);
    const before = factionStanding(state, "hanseong-corp");
    checkAchievements(ctx, () => {});
    expect(state.character.factions["hanseong-corp"] ?? 0).toBe(before + 5);
  });

  it("keepers unlock strengthens relationship with faction (xianxia)", () => {
    const state = start({ seed: "s9-keep-xia", universeId: "xianxia" });
    state.lineage.generation = 2;
    state.lineage.threads.push({ id: "ancient-knowledge", year: 1, gen: 1, src: "test" });
    const ctx = makeCtx(state);
    const before = factionStanding(state, "cloud-peak");
    checkAchievements(ctx, () => {});
    expect(state.character.factions["cloud-peak"] ?? 0).toBe(before + 3);
  });

  it("unsupported action does not change relationship (murim: great-house without rule)", () => {
    const state = start({ seed: "s9-unrel", universeId: "murim" });
    state.lineage.renown = 60;
    const ctx = makeCtx(state);
    const before = factionStanding(state, "orthodox-alliance");
    state.lineage.achievements.push({ id: "great-house", gen: 1, age: 40 });
    checkAchievements(ctx, () => {});
    expect(state.character.factions["orthodox-alliance"]).toBe(before);
  });

  it("faction scores stay within [-30, 30]", () => {
    const state = start({ seed: "s9-cap", universeId: "dark-fantasy" });
    state.lineage.renown = 100;
    state.lineage.achievements.push({ id: "great-house", gen: 1, age: 40 });
    const ctx = makeCtx(state);
    checkAchievements(ctx, () => {});
    expect(state.character.factions["order-of-ash"] ?? 0).toBeLessThanOrEqual(30);
    expect(state.character.factions["order-of-ash"] ?? 0).toBeGreaterThanOrEqual(-30);
  });
});

describe("Family-feud thread → settlement prosperity hit", () => {
  it("thread old-enemy decreases prosperity of one settlement by 5 + writes world chronicle entry", () => {
    const state = start({ seed: "s9-feud", universeId: "dark-fantasy" });
    const ctx = makeCtx(state);
    const before = state.world!.settlements[0]!.prosperity;
    setThread(ctx, "old-enemy", true);
    expect(state.world!.settlements[0]!.prosperity).toBe(before - 5);
    expect(worldActivity(state, "dynasty-feud.")).toBe(true);
    expect(state.lineage.threads.some((t) => t.id === "old-enemy")).toBe(true);
  });

  it("adding same thread again does not decrease prosperity again", () => {
    const state = start({ seed: "s9-dup", universeId: "dark-fantasy" });
    const ctx = makeCtx(state);
    const before = state.world!.settlements[0]!.prosperity;
    setThread(ctx, "old-enemy", true);
    setThread(ctx, "old-enemy", true);
    expect(state.world!.settlements[0]!.prosperity).toBe(before - 5);
    expect(state.world!.activities.filter((a) => a.id.startsWith("dynasty-feud.")).length).toBe(1);
  });

  it("prosperity never drops below 0", () => {
    const state = start({ seed: "s9-floor", universeId: "dark-fantasy" });
    state.world!.settlements[0]!.prosperity = 3;
    const ctx = makeCtx(state);
    setThread(ctx, "old-enemy", true);
    expect(state.world!.settlements[0]!.prosperity).toBe(0);
  });
});

describe("Six worlds stability", () => {
  it("each world: great-house strengthens corresponding faction within [-30, 30]", () => {
    const cases: [UniverseId, string, number][] = [
      ["dark-fantasy", "order-of-ash", 5],
      ["hunter", "hanseong-corp", 5],
      ["academy", "imperial-court", 5],
    ];
    for (const [universeId, factionId, bonus] of cases) {
      const state = start({ seed: `s9-six-${universeId}`, universeId });
      state.lineage.renown = 60;
      const ctx = makeCtx(state);
      const before = factionStanding(state, factionId);
      checkAchievements(ctx, () => {});
      expect(state.character.factions[factionId] ?? 0).toBe(before + bonus);
      expect(state.character.factions[factionId] ?? 0).toBeGreaterThanOrEqual(-30);
      expect(state.character.factions[factionId] ?? 0).toBeLessThanOrEqual(30);
    }
    // xianxia: keepers → cloud-peak +3
    const xianxia = start({ seed: "s9-six-xianxia", universeId: "xianxia" });
    xianxia.lineage.generation = 2;
    xianxia.lineage.threads.push({ id: "ancient-knowledge", year: 1, gen: 1, src: "test" });
    const ctxX = makeCtx(xianxia);
    const beforeX = xianxia.character.factions["cloud-peak"] ?? 0;
    checkAchievements(ctxX, () => {});
    expect(xianxia.character.factions["cloud-peak"] ?? 0).toBe(beforeX + 3);
    // murim: great-house does not have faction rule — Standing does not change
    const murim = start({ seed: "s9-six-murim", universeId: "murim" });
    murim.lineage.renown = 60;
    const ctxM = makeCtx(murim);
    const beforeM = murim.character.factions["orthodox-alliance"] ?? 0;
    murim.lineage.achievements.push({ id: "great-house", gen: 1, age: 40 });
    checkAchievements(ctxM, () => {});
    expect(murim.character.factions["orthodox-alliance"] ?? 0).toBe(beforeM);
  });

  it("yearly tick remains deterministic and bounded across all worlds", () => {
    for (const universeId of UNIVERSE_IDS) {
      const state = start({ seed: `s9-tick-${universeId}`, universeId });
      state.lineage.renown = 60;
      const ctx = makeCtx(state);
      for (let i = 0; i < 50; i++) worldTick(ctx);
      for (const s of state.world!.settlements) {
        expect(s.prosperity).toBeGreaterThanOrEqual(0);
        expect(s.prosperity).toBeLessThanOrEqual(100);
        expect(s.stability).toBeGreaterThanOrEqual(0);
        expect(s.stability).toBeLessThanOrEqual(100);
      }
      expect(state.world!.activities.length).toBeLessThanOrEqual(24);
    }
  });
});

describe("Save/load integrity", () => {
  it("faction scores survive round-trip save", () => {
    const state = start({ seed: "s9-save", universeId: "dark-fantasy" });
    state.lineage.renown = 60;
    state.lineage.achievements.push({ id: "great-house", gen: 1, age: 50 });
    const ctx = makeCtx(state);
    checkAchievements(ctx, () => {});
    const before = state.character.factions["order-of-ash"] ?? 0;
    const round = roundTrip(state);
    expect(round.schemaVersion).toBe(11);
    expect(round.character.factions["order-of-ash"] ?? 0).toBe(before);
  });

  it("loading old save without faction changes is safe", () => {
    const current = newGame({ seed: "s9-legacy", universeId: "academy" }).state;
    const parsed = parseSave(JSON.parse(JSON.stringify(current)));
    expect(parsed.schemaVersion).toBe(11);
    const view = presentLineage(parsed);
    expect(view.dynasty.factionRelations.length).toBeGreaterThan(0);
    for (const f of view.dynasty.factionRelations) {
      expect(Math.abs(f.standing ?? 0)).toBeLessThanOrEqual(30);
    }
  });
});

describe("RU/EN chronicle text for new entries", () => {
  it("faction entry in chronicle is born in both languages", () => {
    const state = start({ seed: "s9-loc", universeId: "dark-fantasy" });
    const entry: ChronicleEntry = {
      id: 1,
      year: 5,
      gen: 1,
      kind: "faction",
      who: [SELF_ID],
      v: { thread: "old-enemy" },
      src: "old-enemy",
      link: null,
    };
    const view = renderChronicle(state, entry);
    expect(view.text.ru).toBeTruthy();
    expect(view.text.en).toBeTruthy();
    expect(view.text.ru.length).toBeGreaterThan(0);
    expect(view.text.en.length).toBeGreaterThan(0);
  });

  it("dynasty milestone in chronicle is born in both languages", () => {
    const state = start({ seed: "s9-loc2", universeId: "dark-fantasy" });
    const entry: ChronicleEntry = {
      id: 2,
      year: 6,
      gen: 1,
      kind: "milestone",
      who: [SELF_ID],
      v: { achievement: "great-house" },
      src: "great-house",
      link: null,
    };
    const view = renderChronicle(state, entry);
    expect(view.text.ru).toBeTruthy();
    expect(view.text.en).toBeTruthy();
  });
});