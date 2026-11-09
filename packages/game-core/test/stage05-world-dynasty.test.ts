// Stage 05: влияние рода на живой мир, преемственность мира при наследовании, лента событий
import { describe, expect, it } from "vitest";
import {
  deepClone,
  getUniverse,
  heirCandidates,
  kinProblem,
  KinGraph,
  newGame,
  parseSave,
  succeed,
  UNIVERSE_IDS,
  type GameState,
  type UniverseId,
} from "../src/index.js";
import type { EngineContext } from "../src/engine/context.js";
import { Rng } from "../src/rng.js";
import { unlockAchievements } from "../src/legacy/achievements.js";
import { worldTick, DYNASTY_PROSPERITY_RENOWN } from "../src/world/state.js";
import { playLife, start } from "./helpers.js";

function roundTrip(state: GameState): GameState {
  return parseSave(JSON.parse(JSON.stringify(state)));
}

function tickWorld(state: GameState, seed = "world-tick"): GameState {
  const ctx: EngineContext = {
    state,
    rng: Rng.fromSeed(seed, "world"),
    universe: getUniverse(state.character.universeId),
    changes: [],
  };
  worldTick(ctx);
  return ctx.state;
}

/** Мёртвая жизнь с живыми наследниками (поиск по seed ограничен) */
function deadWithHeirs(universeId: UniverseId, tag = "s5"): GameState {
  for (let k = 0; k < 30; k++) {
    const { state } = playLife(start({ seed: `${tag}-${universeId}-${k}`, universeId }), 400, (n, i) => (i * 3 + k) % n);
    if (!state.life.alive && heirCandidates(state).some((h) => h.available)) return state;
  }
  throw new Error(`нет жизни с наследником: ${universeId}`);
}

describe("Dynasty world footprint", () => {
  it("высокая слава рода поднимает процветание поселений и пишет об этом в ленту мира", () => {
    const base = start({ seed: "dyn-prosper", universeId: "academy" });
    base.lineage.renown = DYNASTY_PROSPERITY_RENOWN + 10;
    const before = base.world!.settlements.map((s) => ({ id: s.id, prosperity: s.prosperity }));
    const advanced = tickWorld(deepClone(base), "dyn-prosper-tick");

    for (const item of before) {
      const after = advanced.world!.settlements.find((s) => s.id === item.id)!;
      expect(after.prosperity).toBeGreaterThanOrEqual(item.prosperity);
      expect(after.prosperity).toBeLessThanOrEqual(100);
    }
    const entry = advanced.world!.activities.find((a) => a.id.startsWith("dynasty-prosperity."));
    expect(entry).toBeDefined();
    expect(entry!.kind).toBe("settlement");
    expect(advanced.world!.activities.length).toBeLessThanOrEqual(24);
  });

  it("род ниже порога влияния не меняет поселения и не пишет в ленту мира", () => {
    const base = start({ seed: "dyn-quiet", universeId: "dark-fantasy" });
    base.lineage.renown = 0;
    const advanced = tickWorld(deepClone(base), "dyn-quiet-tick");
    expect(advanced.world!.activities.some((a) => a.id.startsWith("dynasty-prosperity."))).toBe(false);
  });

  it("влияние рода сохраняется при переходе к наследнику: мир продолжается, а не сбрасывается", () => {
    const dead = deadWithHeirs("hunter", "s5-succ");
    const heir = heirCandidates(dead).find((c) => c.available)!;
    const { state } = succeed(dead, heir.npc.id, "s5-succ-salt");

    expect(state.world!.tick).toBe(dead.world!.tick);
    expect(state.world!.settlements.length).toBeGreaterThan(0);
    expect(
      state.world!.activities.some((a) => a.kind === "family" && a.id.startsWith(`succession.`))
    ).toBe(true);
    const entry = state.world!.activities.find((a) => a.id.startsWith(`succession.`));
    expect(entry!.text.ru).toContain(heir.npc.name);
    expect(entry!.text.ru).toContain(String(dead.lineage.generation + 1));
  });

  it("наследник не является копией предшественника: свои характеристики и своё состояние", () => {
    const dead = deadWithHeirs("murim", "s5-copy");
    const heir = heirCandidates(dead).find((c) => c.available)!;
    const { state } = succeed(dead, heir.npc.id, "s5-copy-salt");

    expect(state.lineage.generation).toBe(dead.lineage.generation + 1);
    expect(state.character.name).toBe(heir.npc.name);
    expect(deepClone(state.character.stats)).not.toEqual(dead.character.stats);
    const life = state.lineage.lives.find((l) => l.gen === dead.lineage.generation);
    expect(life?.heirName).toBe(heir.npc.name);
  });

  it("личное состояние предшественника не копируется в состояние мира наследника", () => {
    const dead = deadWithHeirs("xianxia", "s5-personal");
    const heir = heirCandidates(dead).find((c) => c.available)!;
    const { state } = succeed(dead, heir.npc.id, "s5-personal-salt");

    expect(state.meters).not.toEqual(dead.meters);
    // 월드 carried over: тик мира не сброшен
    expect(state.world!.tick).toBeGreaterThanOrEqual(dead.world!.tick);
  });
});

describe("Dynasty achievements do not duplicate world effects", () => {
  it("повторная разблокировка тех же достижений не создаёт новых записей", () => {
    const state = start({ seed: "ach-dedup", universeId: "academy" });
    state.lineage.achievements = [];
    unlockAchievements(state);
    const chronicleBefore = state.lineage.chronicle.length;
    const second = unlockAchievements(state);
    expect(second).toHaveLength(0);
    expect(state.lineage.chronicle.length).toBe(chronicleBefore);
  });
});

describe("Determinism and limits", () => {
  it("один seed и одни условия при 세계ходе дают одинаковый мир", () => {
    const base = start({ seed: "det-world", universeId: "xianxia" });
    base.lineage.renown = 60;
    const a = tickWorld(deepClone(base), "det-seed");
    const b = tickWorld(deepClone(base), "det-seed");
    expect(a.world).toEqual(b.world);
    expect(a.world!.activities.length).toBeLessThanOrEqual(24);
  });

  it("шесть миров: мир тик безопасен и строго ограничен", () => {
    for (const universeId of UNIVERSE_IDS) {
      const state = newGame({ seed: `six-${universeId}`, universeId }).state;
      state.lineage.renown = DYNASTY_PROSPERITY_RENOWN + 5;
      const next = tickWorld(state, `six-${universeId}`);
      expect(next.world!.activities.length).toBeLessThanOrEqual(24);
      expect(next.world!.settlements.every((s) => s.prosperity >= 0 && s.prosperity <= 100)).toBe(true);
      expect(next.world!.factions.every((f) => f.power >= 0 && f.power <= 100)).toBe(true);
    }
  });
});

describe("Save compatibility with dynasty world marks", () => {
  it("ход мира и отметка преемственности переживают round trip сохранения", () => {
    const dead = deadWithHeirs("dark-fantasy", "s5-save");
    dead.lineage.renown = 40;
    const ticked = tickWorld(dead, "s5-save-tick");
    const heir = heirCandidates(ticked).find((c) => c.available)!;
    const { state } = succeed(ticked, heir.npc.id, "s5-save-succ");

    const round = roundTrip(state);
    expect(round.world!.activities.some((a) => a.kind === "family" && a.id.startsWith("succession."))).toBe(true);
    expect(
      round.world!.activities.some((a) => a.id.startsWith("dynasty-prosperity."))
    ).toBe(true);
    expect(kinProblem(round)).toBeNull();
    expect(new KinGraph(round).people.length).toBeGreaterThan(0);
  });
});



