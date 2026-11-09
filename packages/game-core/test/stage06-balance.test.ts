// Stage 06: баланс живого мира, целостность симуляции и преемственность рода
import { describe, expect, it } from "vitest";
import {
  applyAction,
  deepClone,
  getUniverse,
  heirCandidates,
  kinProblem,
  newGame,
  parseSave,
  succeed,
  UNIVERSE_IDS,
  type GameState,
  type UniverseId,
} from "../src/index.js";
import type { EngineContext } from "../src/engine/context.js";
import { Rng } from "../src/rng.js";
import { worldTick, DYNASTY_PROSPERITY_RENOWN } from "../src/world/state.js";
import { playLife, start } from "./helpers.js";

function roundTrip(state: GameState): GameState {
  return parseSave(JSON.parse(JSON.stringify(state)));
}

function tickWorld(state: GameState, seed = "balance-tick"): GameState {
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
function deadWithHeirs(universeId: UniverseId, tag = "s6"): GameState {
  for (let k = 0; k < 40; k++) {
    const { state } = playLife(start({ seed: `${tag}-${universeId}-${k}`, universeId }), 400, (n, i) => (i * 3 + k) % n);
    if (!state.life.alive && heirCandidates(state).some((h) => h.available)) return state;
  }
  throw new Error(`нет жизни с наследником: ${universeId}`);
}

describe("World simulation: долгосрочный баланс и границы", () => {
  it("повторные годовые тики остаются в допустимых пределах для всех миров", () => {
    for (const universeId of UNIVERSE_IDS) {
      const base = start({ seed: `balance-${universeId}`, universeId });
      base.lineage.renown = DYNASTY_PROSPERITY_RENOWN + 20; // высокая слава рода
      let state = base;
      for (let i = 0; i < 200; i++) {
        state = tickWorld(state, `balance-${universeId}-${i}`);
      }
      for (const s of state.world!.settlements) {
        expect(s.prosperity).toBeGreaterThanOrEqual(0);
        expect(s.prosperity).toBeLessThanOrEqual(100);
        expect(s.stability).toBeGreaterThanOrEqual(0);
        expect(s.stability).toBeLessThanOrEqual(100);
        expect(s.population).toBeGreaterThanOrEqual(100);
        expect(s.population).toBeLessThanOrEqual(1_000_000);
      }
      for (const f of state.world!.factions) {
        expect(f.power).toBeGreaterThanOrEqual(0);
        expect(f.power).toBeLessThanOrEqual(100);
        expect(f.influence).toBeGreaterThanOrEqual(-100);
        expect(f.influence).toBeLessThanOrEqual(100);
        expect(f.standing).toBeGreaterThanOrEqual(-100);
        expect(f.standing).toBeLessThanOrEqual(100);
      }
    expect(state.world!.activities.length).toBeLessThanOrEqual(24);
    }
  });

  it("одинаковый seed и условия дают одинаковый мир (детерминизм)", () => {
    const base = start({ seed: "det-balance", universeId: "xianxia" });
    base.lineage.renown = 60;
    const a = tickWorld(deepClone(base), "det-seed");
    const b = tickWorld(deepClone(base), "det-seed");
    expect(a.world).toEqual(b.world);

    // Продолжение детерминизма через несколько тиков
    let x = tickWorld(deepClone(base), "det-seq");
    let y = tickWorld(deepClone(base), "det-seq");
    for (let i = 1; i < 20; i++) {
      x = tickWorld(x, `det-seq-${i}`);
      y = tickWorld(y, `det-seq-${i}`);
    }
    expect(x.world).toEqual(y.world);
  });

  it("влияние рода не вызывает неконтролируемого роста процветания (потолок 100)", () => {
    const base = start({ seed: "dyn-cap", universeId: "academy" });
    base.lineage.renown = DYNASTY_PROSPERITY_RENOWN + 50;
    let state = base;
    for (let i = 0; i < 300; i++) {
      state = tickWorld(state, `dyn-cap-${i}`);
    }
    for (const s of state.world!.settlements) {
      expect(s.prosperity).toBeLessThanOrEqual(100);
      expect(s.prosperity).toBeGreaterThanOrEqual(0);
    }
    // Лента остаётся ограниченной
    expect(state.world!.activities.length).toBeLessThanOrEqual(24);
  });

  it("влияние рода не применяется ниже порога славы", () => {
    const base = start({ seed: "dyn-none", universeId: "dark-fantasy" });
    base.lineage.renown = DYNASTY_PROSPERITY_RENOWN - 1; // на единицу ниже порога
    const before = base.world!.settlements.map((s) => s.prosperity);
    const advanced = tickWorld(deepClone(base), "dyn-none-tick");
    for (let i = 0; i < before.length; i++) {
      expect(advanced.world!.settlements[i]!.prosperity).toBeGreaterThanOrEqual(before[i]! - 1); // только случайное изменение
      expect(advanced.world!.settlements[i]!.prosperity).toBeLessThanOrEqual(before[i]! + 2);
    }
    // Нет записей dynasty-prosperity в ленте
    expect(advanced.world!.activities.some((a) => a.id.startsWith("dynasty-prosperity."))).toBe(false);
  });

  it("идентификаторы событий ленты не дублируются внутри одного тика", () => {
    const base = start({ seed: "dup-id", universeId: "hunter" });
    base.lineage.renown = 40;
    const advanced = tickWorld(deepClone(base), "dup-id-tick");
    const ids = advanced.world!.activities.map((a) => a.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe("World simulation: все шесть миров", () => {
  it.each(UNIVERSE_IDS)("%s: длительная симуляция сохраняет корректность и уникальность мира", (universeId: UniverseId) => {
    const universe = getUniverse(universeId);
    void universe;
    const state = start({ seed: `six-${universeId}`, universeId });
    state.lineage.renown = 40;
    let current = state;
    for (let i = 0; i < 100; i++) {
      current = tickWorld(current, `six-${universeId}-${i}`);
    }
    // Поселения остаются валидными
    for (const s of current.world!.settlements) {
      expect(s.prosperity).toBeGreaterThanOrEqual(0);
      expect(s.prosperity).toBeLessThanOrEqual(100);
      expect(s.stability).toBeGreaterThanOrEqual(0);
      expect(s.stability).toBeLessThanOrEqual(100);
    }
    // Каждый мир сохраняет свои поселения (три на вселенную)
    expect(current.world!.settlements.length).toBe(3);
    // Уникальные названия поселений мира
    const names = current.world!.settlements.map((s) => s.id);
    expect(new Set(names).size).toBe(3);
  });
});

describe("Generational continuity: несколько переходов к наследникам", () => {
  it("три поколения подряд: мир сохраняется, нет дублей наследования и активностей", () => {
    const gen1 = deadWithHeirs("murim", "gen1");
    const heir1 = heirCandidates(gen1).find((c) => c.available)!;
    const r1 = succeed(gen1, heir1.npc.id, "gen1-salt");
    expect(r1.state.lineage.generation).toBe(2);
    expect(r1.previous.lineage.continuedBy).toBe(heir1.npc.id);
    // Мир переходит к наследнику: тик не сброшен
    expect(r1.state.world!.tick).toBe(gen1.world!.tick);
    // Запись о преемственности в ленте мира
    expect(r1.state.world!.activities.some((a) => a.id.startsWith("succession."))).toBe(true);
    // Исходное состояние не меняется
    expect(gen1.lineage.continuedBy).toBeNull();

    // Поколение 2 → делаем его мёртвым с наследником
    const gen2Dead = deepClone(r1.state);
    gen2Dead.life.alive = false;
    gen2Dead.lineage.renown = 45;
    const heir2 = heirCandidates(gen2Dead).find((c) => c.available)!;
    expect(heir2).toBeDefined();
    const r2 = succeed(gen2Dead, heir2.npc.id, "gen2-salt");
    expect(r2.state.lineage.generation).toBe(3);
    expect(r1.previous.lineage.lives.find((l) => l.gen === 1)?.heirName).toBe(heir1.npc.name);
    // Мир продолжается из поколения 2
    expect(r2.state.world!.tick).toBe(gen2Dead.world!.tick);
    // Вторая запись преемственности не дублирует первую
    const successionIds = r2.state.world!.activities.filter((a) => a.id.startsWith("succession.")).map((a) => a.id);
    expect(new Set(successionIds).size).toBe(successionIds.length);
    expect(successionIds.some((id) => id.includes(heir1.npc.id))).toBe(true);
    expect(successionIds.some((id) => id.includes(heir2.npc.id))).toBe(true);
  });

  it("личное состояние предшественника не копируется в мир наследника", () => {
    const gen1 = deadWithHeirs("xianxia", "personal");
    const heir1 = heirCandidates(gen1).find((c) => c.available)!;
    const { state: gen2 } = succeed(gen1, heir1.npc.id, "personal-salt");
    // Миры разные: настройки мира переходят, но персонаж — новый
    expect(gen2.character.name).toBe(heir1.npc.name);
    expect(gen2.lineage.generation).toBe(2);
    expect(gen2.world!.tick).toBeGreaterThanOrEqual(gen1.world!.tick);
  });
});

describe("Save/load integrity", () => {
  it("сохранение с миром и родом проходит round trip без потерь", () => {
    const gen1 = deadWithHeirs("dark-fantasy", "save1");
    gen1.lineage.renown = 40;
    const ticked = tickWorld(gen1, "save1-tick");
    const heir = heirCandidates(ticked).find((c) => c.available)!;
    const { state } = succeed(ticked, heir.npc.id, "save1-succ");

    const round = roundTrip(state);
    expect(round.schemaVersion).toBe(8);
    expect(round.world!.tick).toBe(state.world!.tick);
    expect(round.world!.settlements.length).toBe(state.world!.settlements.length);
    expect(round.world!.activities.some((a) => a.id.startsWith("succession."))).toBe(true);
    expect(round.lineage.generation).toBe(state.lineage.generation);
    expect(round.lineage.continuedBy).toBeNull();
    expect(round.character.name).toBe(state.character.name);
    expect(kinProblem(round)).toBeNull();
  });

  it("сохранение без поля world остаётся читаемым и получает мир при действии", () => {
    const current = start({ seed: "legacy-save", universeId: "academy" });
    const legacy = deepClone(current) as GameState & { world?: unknown };
    delete legacy.world;
    const parsed = parseSave(JSON.parse(JSON.stringify(legacy)));
    expect(parsed.world).toBeUndefined();
    const continued = applyAction(parsed, { type: "advance", years: 1 }).state;
    expect(continued.world!.tick).toBe(1);
  });

  it("старая версия схемы 6 нормализуется до 8", () => {
    const fresh = newGame({ seed: "schema-v6", universeId: "murim" }).state;
    const old = deepClone(fresh) as unknown as Record<string, unknown>;
    old.schemaVersion = 6;
    const restored = parseSave(old);
    expect(restored.schemaVersion).toBe(8);
    expect(restored.character.name).toBe(fresh.character.name);
    expect(restored.rngState).toBe(fresh.rngState);
  });
});




