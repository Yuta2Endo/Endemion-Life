// Stage 10: интеграция последствий живого мира (Stage 09) с родом, фракциями и сохранениями
import { describe, expect, it } from "vitest";
import {
  getUniverse,
  heirCandidates,
  normalizeWorldState,
  parseSave,
  presentLineage,
  succeed,
  UNIVERSE_IDS,
  worldTick,
  type GameState,
  type UniverseId,
} from "../src/index.js";
import { checkAchievements } from "../src/legacy/lineage.js";
import { FACTION_ACTIONS } from "../src/legacy/present.js";
import { setThread } from "../src/engine/effects.js";
import type { EngineContext } from "../src/engine/context.js";
import { Rng } from "../src/rng.js";
import { playLife, start } from "./helpers.js";

function roundTrip(state: GameState): GameState {
  return parseSave(JSON.parse(JSON.stringify(state)));
}

function makeCtx(state: GameState, seed = "s10-ctx"): EngineContext {
  return {
    state,
    rng: Rng.fromSeed(seed, "world"),
    universe: getUniverse(state.character.universeId),
    changes: [],
  };
}

function factionStanding(state: GameState, factionId: string): number {
  return state.character.factions[factionId] ?? 0;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function relationOf(state: GameState, factionId: string) {
  return presentLineage(state).dynasty.factionRelations.find((f) => f.factionId === factionId);
}

/** Мёртвая жизнь с живыми наследниками (поиск по seed ограничен) */
function deadWithHeirs(universeId: UniverseId, tag = "s10"): GameState {
  for (let k = 0; k < 40; k++) {
    const { state } = playLife(start({ seed: `${tag}-${universeId}-${k}`, universeId }), 400, (n, i) => (i * 3 + k) % n);
    if (!state.life.alive && heirCandidates(state).some((h) => h.available)) return state;
  }
  throw new Error(`нет жизни с наследником: ${universeId}`);
}

describe("Stage 10: несколько последствий сосуществуют", () => {
  it("одно достижение даёт бонус нескольким фракциям и одну веху хроники (dark-fantasy)", () => {
    const state = start({ seed: "s10-coexist-dark", universeId: "dark-fantasy" });
    state.lineage.renown = 60;
    const ctx = makeCtx(state);
    const ashBefore = factionStanding(state, "order-of-ash");
    const crownBefore = factionStanding(state, "crown");
    checkAchievements(ctx, () => {});
    expect(factionStanding(state, "order-of-ash")).toBe(ashBefore + 5);
    expect(factionStanding(state, "crown")).toBe(crownBefore + 3);
    const milestones = state.lineage.chronicle.filter((e) => e.kind === "milestone" && e.v.achievement === "great-house");
    expect(milestones.length).toBe(1);
    const favors = state.world!.activities.filter((a) => a.id.startsWith("dynasty-favor.great-house."));
    expect(favors.length).toBe(2);
  });

  it("нить old-enemy одновременно ослабляет поселение и отношение с фракцией (murim)", () => {
    const state = start({ seed: "s10-coexist-murim", universeId: "murim" });
    const ctx = makeCtx(state);
    const beforeProsperity = state.world!.settlements[0]!.prosperity;
    setThread(ctx, "old-enemy", true);
    expect(state.world!.settlements[0]!.prosperity).toBe(beforeProsperity - 5);
    const relation = relationOf(state, "orthodox-alliance");
    expect(relation).toBeDefined();
    expect(relation!.basis).toContain("old-enemy");
    expect(relation!.standing).toBe(-8);
    expect(state.world!.activities.some((a) => a.id.startsWith("dynasty-feud."))).toBe(true);
  });
});

describe("Stage 10: безопасность и границы", () => {
  it("нормализация отбрасывает NaN/Infinity и держит значения в пределах", () => {
    const universe = getUniverse("dark-fantasy");
    const base = normalizeWorldState(undefined, universe);
    const settlementId = base.settlements[0]!.id;
    const factionId = base.factions[0]!.id;
    const clean = normalizeWorldState(
      {
        tick: NaN,
        settlements: [{ id: settlementId, prosperity: NaN, stability: Infinity, population: -Infinity }],
        factions: [{ id: factionId, power: NaN, influence: Infinity, standing: -Infinity }],
        activities: [{ id: 1 }, { nope: true }]
      },
      universe
    );
    expect(Number.isFinite(clean.tick)).toBe(true);
    expect(clean.tick).toBeGreaterThanOrEqual(0);
    const settlement = clean.settlements.find((s) => s.id === settlementId)!;
    expect(Number.isFinite(settlement.prosperity)).toBe(true);
    expect(settlement.prosperity).toBeGreaterThanOrEqual(0);
    expect(settlement.prosperity).toBeLessThanOrEqual(100);
    expect(Number.isFinite(settlement.stability)).toBe(true);
    expect(Number.isFinite(settlement.population)).toBe(true);
    expect(settlement.population).toBeGreaterThan(0);
    const faction = clean.factions.find((f) => f.id === factionId)!;
    expect(Number.isFinite(faction.power)).toBe(true);
    expect(Number.isFinite(faction.influence)).toBe(true);
    expect(Number.isFinite(faction.standing)).toBe(true);
    expect(clean.activities.length).toBe(0);
  });

  it("отсутствующий world безопасно создаётся при тике, представление рода не падает", () => {
    const state = start({ seed: "s10-noworld", universeId: "academy" });
    delete state.world;
    const ctx = makeCtx(state);
    expect(() => worldTick(ctx)).not.toThrow();
    expect(state.world).toBeDefined();
    expect(state.world!.settlements.length).toBeGreaterThan(0);
    const view = presentLineage(state);
    expect(view.dynasty.factionRelations.length).toBeGreaterThan(0);
    for (const f of view.dynasty.factionRelations) expect(Number.isFinite(f.standing)).toBe(true);
  });

  it("повторная обработка достижения не накапливает бонус (идемпотентность)", () => {
    const state = start({ seed: "s10-idem", universeId: "dark-fantasy" });
    state.lineage.renown = 60;
    const ctx = makeCtx(state);
    checkAchievements(ctx, () => {});
    const after = factionStanding(state, "order-of-ash");
    checkAchievements(ctx, () => {});
    expect(factionStanding(state, "order-of-ash")).toBe(after);
  });
});

describe("Stage 10: сохранение и наследование", () => {
  it("round trip сохраняет последствия фракций, процветание и записи ленты мира", () => {
    const state = start({ seed: "s10-save", universeId: "dark-fantasy" });
    state.lineage.renown = 60;
    const ctx = makeCtx(state);
    checkAchievements(ctx, () => {});
    setThread(ctx, "old-enemy", true);
    const standing = factionStanding(state, "order-of-ash");
    const prosperity = state.world!.settlements[0]!.prosperity;
    const round = roundTrip(state);
    expect(round.schemaVersion).toBe(13);
    expect(factionStanding(round, "order-of-ash")).toBe(standing);
    expect(round.world!.settlements[0]!.prosperity).toBe(prosperity);
    expect(round.world!.activities.some((a) => a.id.startsWith("dynasty-favor."))).toBe(true);
    expect(round.world!.activities.some((a) => a.id.startsWith("dynasty-feud."))).toBe(true);
  });

  it("переход к наследнику сохраняет мир и не применяет штраф вражды повторно (murim)", () => {
    const dead = deadWithHeirs("murim");
    const ctx = makeCtx(dead);
    setThread(ctx, "old-enemy", true);
    const prosperity = dead.world!.settlements[0]!.prosperity;
    const feudCount = dead.world!.activities.filter((a) => a.id.startsWith("dynasty-feud.")).length;
    const heir = heirCandidates(dead).find((c) => c.available)!;
    const { state: next } = succeed(dead, heir.npc.id, "s10-succ");
    expect(next.world!.settlements[0]!.prosperity).toBe(prosperity);
    expect(next.world!.activities.filter((a) => a.id.startsWith("dynasty-feud.")).length).toBe(feudCount);
    expect(next.lineage.threads.some((t) => t.id === "old-enemy")).toBe(true);
    const relation = relationOf(next, "orthodox-alliance");
    expect(relation!.basis).toContain("old-enemy");
    expect(relation!.standing).toBe(clamp(Math.round(next.lineage.renown * 0.4) - 8, -30, 30));
  });
});

describe("Stage 10: шесть миров, без утечки последствий", () => {
  it("все правила FACTION_ACTIONS ссылаются только на фракции своего мира", () => {
    for (const universeId of UNIVERSE_IDS) {
      const universe = getUniverse(universeId);
      const rules = FACTION_ACTIONS[universeId];
      for (const factionId of Object.keys(rules)) {
        expect(universe.factions.some((f) => f.id === factionId)).toBe(true);
      }
    }
  });

  it("достижение great-house меняет только фракции, привязанные к миру", () => {
    for (const universeId of UNIVERSE_IDS) {
      const state = start({ seed: `s10-leak-${universeId}`, universeId });
      state.lineage.renown = 60;
      const universe = getUniverse(universeId);
      const before = new Map(universe.factions.map((f) => [f.id, factionStanding(state, f.id)]));
      const ctx = makeCtx(state);
      checkAchievements(ctx, () => {});
      const rules = FACTION_ACTIONS[universeId];
      for (const faction of universe.factions) {
        const changed = factionStanding(state, faction.id) !== before.get(faction.id);
        if (changed) expect(Object.keys(rules)).toContain(faction.id);
      }
    }
  });
});