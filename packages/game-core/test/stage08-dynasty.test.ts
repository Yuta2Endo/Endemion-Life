// Stage 08: хроника рода и действие-зависимые отношения с фракциями
import { describe, expect, it } from "vitest";
import {
  getUniverse,
  heirCandidates,
  kinProblem,
  newGame,
  parseSave,
  presentLineage,
  renderChronicle,
  succeed,
  SELF_ID,
  UNIVERSE_IDS,
  worldTick,
  type ChronicleEntry,
  type GameState,
  type UniverseId,
} from "../src/index.js";
import { checkAchievements } from "../src/legacy/lineage.js";
import { MAX_CHRONICLE } from "../src/legacy/chronicle.js";
import type { EngineContext } from "../src/engine/context.js";
import { Rng } from "../src/rng.js";
import { playLife, start } from "./helpers.js";

function roundTrip(state: GameState): GameState {
  return parseSave(JSON.parse(JSON.stringify(state)));
}

function makeCtx(state: GameState, seed = "s8-ctx"): EngineContext {
  return {
    state,
    rng: Rng.fromSeed(seed, "world"),
    universe: getUniverse(state.character.universeId),
    changes: [],
  };
}

/** Мёртвая жизнь с живыми наследниками (поиск по seed ограничен) */
function deadWithHeirs(universeId: UniverseId, tag = "s8"): GameState {
  for (let k = 0; k < 40; k++) {
    const { state } = playLife(start({ seed: `${tag}-${universeId}-${k}`, universeId }), 400, (n, i) => (i * 3 + k) % n);
    if (!state.life.alive && heirCandidates(state).some((h) => h.available)) return state;
  }
  throw new Error(`нет жизни с наследником: ${universeId}`);
}

describe("Dynasty chronicle", () => {
  it("веха рода добавляет запись в хронику при разблокировке достижения", () => {
    const state = start({ seed: "s8-chronicle", universeId: "dark-fantasy" });
    state.lineage.renown = 60;
    const ctx = makeCtx(state);
    checkAchievements(ctx, () => {});
    const milestones = state.lineage.chronicle.filter((e) => e.kind === "milestone");
    expect(milestones.length).toBeGreaterThan(0);
    expect(milestones.some((e) => e.v.achievement === "great-house")).toBe(true);
    const entry = milestones.find((e) => e.v.achievement === "great-house")!;
    expect(entry.src).toBe("great-house");
    expect(entry.gen).toBe(state.lineage.generation);
  });

  it("обычные годовые тики не добавляют записи в хронику рода", () => {
    const state = start({ seed: "s8-ticks", universeId: "academy" });
    const ctx = makeCtx(state);
    const before = state.lineage.chronicle.length;
    for (let i = 0; i < 30; i++) {
      worldTick(ctx);
    }
    const after = ctx.state.lineage.chronicle.length;
    expect(after).toBe(before);
  });

  it("повторная обработка того же достижения не дублирует запись", () => {
    const state = start({ seed: "s8-dup", universeId: "dark-fantasy" });
    state.lineage.renown = 60;
    const ctx = makeCtx(state);
    checkAchievements(ctx, () => {});
    const first = state.lineage.chronicle.filter((e) => e.kind === "milestone").length;
    checkAchievements(ctx, () => {});
    const second = state.lineage.chronicle.filter((e) => e.kind === "milestone").length;
    expect(second).toBe(first);
  });

  it("порядок записей хроники стабилен (по убыванию года)", () => {
    const state = start({ seed: "s8-order", universeId: "murim" });
    state.lineage.renown = 60;
    state.lineage.achievements.push({ id: "great-house", gen: 1, age: 40 });
    const view = presentLineage(state);
    const years = view.chronicle.map((e) => e.year);
    for (let i = 1; i < years.length; i++) {
      expect(years[i - 1]!).toBeGreaterThanOrEqual(years[i]!);
    }
  });

  it("хроника остаётся в рамках лимита MAX_CHRONICLE", () => {
    expect(MAX_CHRONICLE).toBe(400);
    const state = start({ seed: "s8-limit", universeId: "xianxia" });
    const view = presentLineage(state);
    expect(view.chronicle.length).toBeLessThanOrEqual(MAX_CHRONICLE);
  });

  it("история хроники сохраняется при переходе к наследнику", () => {
    const dead = deadWithHeirs("murim", "s8-succ");
    const heir = heirCandidates(dead).find((c) => c.available)!;
    dead.lineage.renown = 60;
    const ctx = makeCtx(dead);
    checkAchievements(ctx, () => {});
    const beforeMilestone = dead.lineage.chronicle.find((e) => e.kind === "milestone" && e.v.achievement === "great-house");
    expect(beforeMilestone).toBeDefined();

    const { state } = succeed(dead, heir.npc.id, "s8-succ-salt");
    expect(state.lineage.generation).toBe(dead.lineage.generation + 1);
    expect(state.lineage.chronicle.some((e) => e.kind === "milestone" && e.v.achievement === "great-house")).toBe(true);
    // исходная жизнь не меняется
    expect(dead.lineage.continuedBy).toBeNull();
  });
});

describe("Action-based faction relations", () => {
  it("отношения меняются от реальных достижений рода, разные фракции — по-разному", () => {
    const state = start({ seed: "s8-faction", universeId: "dark-fantasy" });
    state.lineage.renown = 60;
    state.lineage.achievements.push({ id: "great-house", gen: 1, age: 40 });
    const view = presentLineage(state);
    const rel = (id: string) => view.dynasty.factionRelations.find((f) => f.factionId === id);
    expect(rel("order-of-ash")?.standing).toBe(29); // round(60*0.4)=24 + 5
    expect(rel("crown")?.standing).toBe(27); // 24 + 3
    expect(rel("mist-cult")?.standing).toBe(24); // 24 + 0
  });

  it("неподдерживаемое действие не меняет отношения", () => {
    const state = start({ seed: "s8-unrelated", universeId: "dark-fantasy" });
    state.lineage.renown = 60;
    state.lineage.achievements.push({ id: "long-life", gen: 1, age: 90 }); // не в карте фракций
    const view = presentLineage(state);
    for (const f of view.dynasty.factionRelations) {
      expect(f.standing).toBe(24); // только база от славы
    }
  });

  it("повторная обработка не дублирует эффект отношения", () => {
    const state = start({ seed: "s8-repeat", universeId: "hunter" });
    state.lineage.renown = 60;
    state.lineage.achievements.push({ id: "dynasty", gen: 4, age: 50 });
    const first = presentLineage(state).dynasty.factionRelations;
    const second = presentLineage(state).dynasty.factionRelations;
    expect(second).toEqual(first);
  });

  it("отношения остаются в пределах [-30, 30]", () => {
    const high = start({ seed: "s8-high", universeId: "hunter" });
    high.lineage.renown = 100;
    high.lineage.achievements.push({ id: "great-house", gen: 1, age: 40 });
    for (const f of presentLineage(high).dynasty.factionRelations) {
      expect(f.standing).toBeLessThanOrEqual(30);
      expect(f.standing).toBeGreaterThanOrEqual(-30);
    }
    const low = start({ seed: "s8-low", universeId: "murim" });
    low.lineage.renown = -100;
    for (const f of presentLineage(low).dynasty.factionRelations) {
      expect(f.standing).toBeGreaterThanOrEqual(-30);
      expect(f.standing).toBeLessThanOrEqual(30);
    }
  });

  it("базовое узнаваемость рода (Stage 07) остаётся функциональной", () => {
    const state = start({ seed: "s8-base", universeId: "academy" });
    state.lineage.renown = 60;
    const view = presentLineage(state);
    for (const f of view.dynasty.factionRecognition) {
      expect(f.standing).toBeGreaterThanOrEqual(21);
      expect(f.standing).toBeLessThanOrEqual(27);
    }
  });

  it("личная репутация персонажа не смешивается с отношением рода", () => {
    const state = start({ seed: "s8-personal", universeId: "hunter" });
    state.character.reputation = 100;
    state.character.karma = -100;
    state.lineage.renown = 0;
    const view = presentLineage(state);
    expect(state.character.reputation).toBe(100);
    for (const f of view.dynasty.factionRecognition) {
      expect(Math.abs(f.standing)).toBeLessThanOrEqual(3);
    }
  });

  it("сохранение и загрузка сохраняют отношения рода", () => {
    const dead = deadWithHeirs("dark-fantasy", "s8-save");
    dead.lineage.renown = 55;
    dead.lineage.achievements.push({ id: "dynasty", gen: 2, age: 50 });
    const { state } = succeed(dead, heirCandidates(dead).find((c) => c.available)!.npc.id, "s8-save-succ");
    const round = roundTrip(state);
    expect(round.schemaVersion).toBe(9);
    expect(round.lineage.renown).toBe(state.lineage.renown);
    const view = presentLineage(round);
    expect(view.dynasty.factionRelations.length).toBeGreaterThan(0);
    expect(kinProblem(round)).toBeNull();
  });

  it("новое сохранение без достижений rodu безопасно для отображения", () => {
    const current = newGame({ seed: "s8-legacy", universeId: "academy" }).state;
    current.lineage.renown = 0;
    const parsed = parseSave(JSON.parse(JSON.stringify(current)));
    expect(parsed.schemaVersion).toBe(9);
    const view = presentLineage(parsed);
    expect(view.dynasty.factionRelations.length).toBeGreaterThan(0);
    for (const f of view.dynasty.factionRelations) {
      expect(Math.abs(f.standing)).toBeLessThanOrEqual(3);
    }
  });

  it("все шесть миров стабильны при высокой славе рода", () => {
    for (const universeId of UNIVERSE_IDS) {
      const state = start({ seed: `s8-six-${universeId}`, universeId });
      state.lineage.renown = 60;
      const view = presentLineage(state);
      for (const f of view.dynasty.factionRelations) {
        expect(f.standing).toBeGreaterThanOrEqual(-30);
        expect(f.standing).toBeLessThanOrEqual(30);
      }
      expect(view.dynasty.identity.label.ru).toBeTruthy();
      expect(view.dynasty.identity.label.en).toBeTruthy();
    }
  });

  it("русские и английские строки хроники рождаются для новых записей", () => {
    const state = start({ seed: "s8-loc", universeId: "dark-fantasy" });
    const factionEntry: ChronicleEntry = {
      id: 1,
      year: 10,
      gen: 1,
      kind: "faction",
      who: [SELF_ID],
      v: { faction: "old-enemy" },
      src: "old-enemy",
      link: null,
    };
    const factionView = renderChronicle(state, factionEntry);
    expect(factionView.text.ru).toBeTruthy();
    expect(factionView.text.en).toBeTruthy();
    const milestoneEntry: ChronicleEntry = {
      id: 2,
      year: 11,
      gen: 1,
      kind: "milestone",
      who: [SELF_ID],
      v: { achievement: "great-house" },
      src: "great-house",
      link: null,
    };
    const milestoneView = renderChronicle(state, milestoneEntry);
    expect(milestoneView.text.ru).toBeTruthy();
    expect(milestoneView.text.en).toBeTruthy();
  });
});
