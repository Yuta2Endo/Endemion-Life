// Stage 07: идентичность рода, узнаваемость и преемственность династии
import { describe, expect, it } from "vitest";
import {
  deepClone,
  getUniverse,
  heirCandidates,
  kinProblem,
  newGame,
  parseSave,
  presentLineage,
  succeed,
  UNIVERSE_IDS,
  type GameState,
  type HistoryKind,
  type LocalizedText,
  type UniverseId,
} from "../src/index.js";
import { checkAchievements } from "../src/legacy/lineage.js";
import type { EngineContext } from "../src/engine/context.js";
import { Rng } from "../src/rng.js";
import { playLife, start } from "./helpers.js";

function roundTrip(state: GameState): GameState {
  return parseSave(JSON.parse(JSON.stringify(state)));
}

function makeCtx(state: GameState, seed = "s7-ctx"): EngineContext {
  return {
    state,
    rng: Rng.fromSeed(seed, "world"),
    universe: getUniverse(state.character.universeId),
    changes: [],
  };
}

/** Мёртвая жизнь с живыми наследниками (поиск по seed ограничен) */
function deadWithHeirs(universeId: UniverseId, tag = "s7"): GameState {
  for (let k = 0; k < 40; k++) {
    const { state } = playLife(start({ seed: `${tag}-${universeId}-${k}`, universeId }), 400, (n, i) => (i * 3 + k) % n);
    if (!state.life.alive && heirCandidates(state).some((h) => h.available)) return state;
  }
  throw new Error(`нет жизни с наследником: ${universeId}`);
}

describe("Dynasty identity", () => {
  it("новая семья имеет идентичность «новый дом» без достижений", () => {
    const state = start({ seed: "s7-new", universeId: "academy" });
    state.lineage.renown = 0;
    const view = presentLineage(state);
    expect(view.dynasty.identity.label.ru).toBeTruthy();
    expect(view.dynasty.identity.label.en).toBeTruthy();
    expect(view.dynasty.identity.description.ru).toBeTruthy();
    expect(Array.isArray(view.dynasty.identity.basis)).toBe(true);
  });

  it("высокая слава даёт идентичность влиятельного дома, низкая — позорного", () => {
    const high = start({ seed: "s7-high", universeId: "dark-fantasy" });
    high.lineage.renown = 60;
    expect(presentLineage(high).dynasty.identity.label.ru).toContain("Влиятельный");

    const low = start({ seed: "s7-low", universeId: "murim" });
    low.lineage.renown = -60;
    expect(presentLineage(low).dynasty.identity.label.ru).toContain("Позорный");
  });

  it("идентичность выводится из реальных достижений и черт рода, а не броска", () => {
    const state = start({ seed: "s7-basis", universeId: "xianxia" });
    state.lineage.renown = 30;
    state.lineage.achievements.push({ id: "keepers", gen: 1, age: 40 });
    state.lineage.traits.talents["some-talent"] = 2;
    const view = presentLineage(state);
    expect(view.dynasty.identity.basis.length).toBeGreaterThan(0);
    // Детерминизм: одинаковое состояние даёт одинаковую идентичность
    expect(presentLineage(deepClone(state)).dynasty.identity.label.ru).toBe(view.dynasty.identity.label.ru);
  });

  it("идентичность ограничена и не растёт бесконечно", () => {
    const state = start({ seed: "s7-bound", universeId: "hunter" });
    state.lineage.renown = 100;
    const view = presentLineage(state);
    expect(view.dynasty.identity.label.ru.length).toBeGreaterThan(0);
    expect(view.dynasty.identity.label.ru.length).toBeLessThan(200);
  });
});

describe("Faction recognition", () => {
  it("узнаваемость у фракций ограничена и детерминирована", () => {
    for (const universeId of UNIVERSE_IDS) {
      const state = start({ seed: `s7-faction-${universeId}`, universeId });
      state.lineage.renown = 70;
      const view = presentLineage(state);
      const recs = view.dynasty.factionRecognition;
      expect(recs.length).toBeGreaterThan(0);
      for (const rec of recs) {
        expect(rec.standing).toBeGreaterThanOrEqual(-30);
        expect(rec.standing).toBeLessThanOrEqual(30);
        expect(rec.name.ru).toBeTruthy();
        expect(rec.name.en).toBeTruthy();
      }
      // Детерминизм
      expect(presentLineage(deepClone(state)).dynasty.factionRecognition).toEqual(recs);
    }
  });

  it("разные фракции могут иметь разную узнаваемость", () => {
    const state = start({ seed: "s7-var", universeId: "academy" });
    state.lineage.renown = 60;
    const recs = presentLineage(state).dynasty.factionRecognition;
    const standings = recs.map((r) => r.standing);
    expect(new Set(standings).size).toBeGreaterThan(1);
  });

  it("при нулевой славе узнаваемость близка к нулю", () => {
    const state = start({ seed: "s7-zero", universeId: "isekai" });
    state.lineage.renown = 0;
    const recs = presentLineage(state).dynasty.factionRecognition;
    for (const rec of recs) {
      expect(Math.abs(rec.standing)).toBeLessThanOrEqual(5);
    }
  });
});

describe("World recognition", () => {
  it("высокая слава добавляет запись признания в ленту мира один раз", () => {
    const state = start({ seed: "s7-rec", universeId: "academy" });
    state.lineage.renown = 60;
    const pushes: { kind: string; title: unknown; text: unknown }[] = [];
    const ctx = makeCtx(state);
    checkAchievements(ctx, (kind, title, text) => pushes.push({ kind, title, text }));
    const recognized = state.world!.activities.filter((a) => a.id.startsWith("dynasty-recognized."));
    expect(recognized.length).toBe(1);
    // Повтор не дублирует
    checkAchievements(ctx, (kind: HistoryKind, title: LocalizedText, text: LocalizedText) => pushes.push({ kind, title, text }));
    expect(state.world!.activities.filter((a) => a.id.startsWith("dynasty-recognized."))).toHaveLength(1);
  });

  it("очень низкая слава добавляет запись позора один раз", () => {
    const state = start({ seed: "s7-disgrace", universeId: "murim" });
    state.lineage.renown = -60;
    const ctx = makeCtx(state);
    checkAchievements(ctx, () => {});
    expect(state.world!.activities.filter((a) => a.id.startsWith("dynasty-disgraced."))).toHaveLength(1);
  });
});

describe("Generational continuity", () => {
  it("идентичность и наследие рода сохраняются при переходе к наследнику", () => {
    const dead = deadWithHeirs("murim", "s7-succ");
    const heir = heirCandidates(dead).find((c) => c.available)!;
    dead.lineage.renown = 60;
    dead.lineage.achievements.push({ id: "great-house", gen: dead.lineage.generation, age: dead.life.age });
    const before = presentLineage(dead).dynasty;

    const { state, previous } = succeed(dead, heir.npc.id, "s7-succ-salt");

    expect(state.lineage.generation).toBe(dead.lineage.generation + 1);
    expect(state.lineage.renown).toBe(dead.lineage.renown);
    expect(state.lineage.achievements.map((a) => a.id)).toContain("great-house");
    const after = presentLineage(state).dynasty;
    expect(after.identity.label.ru).toBe(before.identity.label.ru);
    expect(after.factionRecognition.length).toBe(before.factionRecognition.length);
    // Предыдущая жизнь помечена продолжённой, нельзя продолжить дважды
    expect(previous.lineage.continuedBy).toBe(heir.npc.id);
    expect(() => succeed(previous, heir.npc.id, "s7-succ-salt")).toThrow();
  });

  it("личная репутация наследника не копируется слепо от предшественника", () => {
    const dead = deadWithHeirs("xianxia", "s7-rep");
    const heir = heirCandidates(dead).find((c) => c.available)!;
    dead.character.reputation = 80;
    dead.character.karma = -60;
    const { state } = succeed(dead, heir.npc.id, "s7-rep-salt");
    // Наследник генерируется заново: его личная репутация не равна репутации предка
    expect(state.character.reputation).not.toBe(dead.character.reputation);
    expect(state.character.reputation).toBeGreaterThanOrEqual(-100);
    expect(state.character.reputation).toBeLessThanOrEqual(100);
  });

  it("мир сохраняется при переходе: тик не сбрасывается, запись преемственности в ленте", () => {
    const dead = deadWithHeirs("hunter", "s7-world");
    const heir = heirCandidates(dead).find((c) => c.available)!;
    const { state } = succeed(dead, heir.npc.id, "s7-world-salt");
    expect(state.world!.tick).toBe(dead.world!.tick);
    expect(state.world!.activities.some((a) => a.id.startsWith("succession."))).toBe(true);
  });
});

describe("Save/load integrity", () => {
  it("сохранение с идентичностью рода проходит round trip", () => {
    const dead = deadWithHeirs("dark-fantasy", "s7-save");
    dead.lineage.renown = 55;
    dead.lineage.achievements.push({ id: "dynasty", gen: 2, age: 50 });
    const { state } = succeed(dead, heirCandidates(dead).find((c) => c.available)!.npc.id, "s7-save-succ");

    const round = roundTrip(state);
    expect(round.schemaVersion).toBe(12);
    expect(round.lineage.renown).toBe(state.lineage.renown);
    expect(round.lineage.achievements.map((a) => a.id)).toEqual(state.lineage.achievements.map((a) => a.id));
    expect(kinProblem(round)).toBeNull();
    // Производные данные восстанавливаются при презентации
    expect(presentLineage(round).dynasty.identity.label.ru).toBeTruthy();
    expect(presentLineage(round).dynasty.factionRecognition.length).toBeGreaterThan(0);
  });

  it("сохранение без опционального поля мира остаётся читаемым: производные данные рода восстанавливаются", () => {
    const current = newGame({ seed: "s7-legacy", universeId: "academy" }).state;
    current.lineage.renown = 40;
    const legacy = deepClone(current) as GameState & { world?: unknown };
    delete legacy.world;
    const parsed = parseSave(JSON.parse(JSON.stringify(legacy)));
    expect(parsed.schemaVersion).toBe(12);
    expect(parsed.character.name).toBe(current.character.name);
    // Stage 07 не добавляет обязательных полей: производные данные восстанавливаются при презентации
    expect(presentLineage(parsed).dynasty.identity.label.ru).toBeTruthy();
    expect(presentLineage(parsed).dynasty.factionRecognition.length).toBeGreaterThan(0);
  });

  it("все шесть worlds стабильны при высокой славе рода", () => {
    for (const universeId of UNIVERSE_IDS) {
      const state = start({ seed: `s7-six-${universeId}`, universeId });
      state.lineage.renown = 60;
      const view = presentLineage(state);
      for (const rec of view.dynasty.factionRecognition) {
        expect(rec.standing).toBeGreaterThanOrEqual(-30);
        expect(rec.standing).toBeLessThanOrEqual(30);
      }
      expect(view.dynasty.identity.label.ru).toBeTruthy();
      expect(view.dynasty.identity.label.en).toBeTruthy();
    }
  });
});
