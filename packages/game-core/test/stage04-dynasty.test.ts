// Stage 04: династия, преемственность, хроника и_save-совместимость//
import { describe, expect, it } from "vitest";
import {
  deepClone,
  heirCandidates,
  kinProblem,
  KinGraph,
  parseSave,
  presentLineage,
  SAVE_SCHEMA_VERSION,
  succeed,
  type GameState,
  type UniverseId,
  SELF_ID
} from "../src/index.js";
import { playLife, start } from "./helpers.js";

function roundTrip(state: GameState): GameState {
  return parseSave(JSON.parse(JSON.stringify(state)));
}

/** Первая найденная мёртвая жизнь с живыми наследниками (поиск по seed ограничен) */
function deadWithHeirs(universeId: UniverseId, tag = "dyn"): GameState {
  for (let k = 0; k < 40; k++) {
    const { state } = playLife(start({ seed: `${tag}-${universeId}-${k}`, universeId }), 400, (n, i) => (i * 3 + k) % n);
    if (!state.life.alive && heirCandidates(state).some((h) => h.available)) return state;
  }
  throw new Error(`нет жизни с наследником: ${universeId}`);
}

describe("Dynasty: lightweight dynasty model", () => {
  it("основатель и глава рода — текущий персонаж в первом поколении", () => {
    const { state } = playLife(start({ seed: "dynasty-gen1-academy", universeId: "academy" }), 20);
    const lineage = presentLineage(state);
    expect(lineage.dynasty.founder?.name).toBe(state.character.name);
    expect(lineage.dynasty.founder?.gen).toBe(1);
    expect(lineage.dynasty.head?.alive).toBe(true);
    expect(lineage.dynasty.head?.name).toBe(state.character.name);
    expect(lineage.dynasty.generations).toBe(1);
    expect(lineage.dynasty.extinct).toBe(false);
    expect(lineage.dynasty.renown).toBe(lineage.renown);
  });

  it("после наследования глава рода — наследник, поколение растёт, хроника сохраняется", () => {
    const dead = deadWithHeirs("murim", "dyn-succ");
    const heir = heirCandidates(dead).find((c) => c.available)!;
    const { state, previous } = succeed(dead, heir.npc.id, "dyn-succ-salt");

    expect(state.lineage.generation).toBe(dead.lineage.generation + 1);
    expect(previous.lineage.continuedBy).toBe(heir.npc.id);
    expect(dead.lineage.continuedBy).toBeNull(); // исходное состояние не меняется

    const lineage = presentLineage(state);
    expect(lineage.dynasty.generations).toBe(2);
    expect(lineage.dynasty.head?.alive).toBe(true);
    expect(lineage.dynasty.head?.name).toBe(state.character.name);
    expect(lineage.dynasty.founder?.gen).toBe(1);
    expect(lineage.lives[0]!.heirName).toBe(heir.npc.name);
    expect(lineage.chronicle.some((entry) => entry.kind === "succession")).toBe(true);
  });

  it("род считается вымершим только без живых наследников и продолжения", () => {
    const dead = deadWithHeirs("dark-fantasy", "dyn-branches");
    const lineage = presentLineage(dead);
    expect(lineage.dynasty.branches).toBeGreaterThan(0);
    expect(lineage.dynasty.extinct).toBe(false);
    expect(lineage.dynasty.members).toBeGreaterThanOrEqual(1);
  });

  it("родовая хроника, древо и фамильные черты переходят к наследнику", () => {
    const dead = deadWithHeirs("hunter", "dyn-chron");
    const heir = heirCandidates(dead).find((c) => c.available)!;
    const { state } = succeed(dead, heir.npc.id, "dyn-chron-salt");

    const lineage = presentLineage(state);
    expect(lineage.chronicle.some((entry) => entry.kind === "succession")).toBe(true);
    // Мёртвый предшественник остаётся в древе как запись NPC
    expect(lineage.tree.some((node) => !node.alive && node.status === "deceased")).toBe(true);
    expect(lineage.tree.some((node) => node.lifeGen !== null)).toBe(true);
    // Save/load совместимость: род, родство и наследование читаются после round trip
    const round = roundTrip(state);
    expect(round.lineage.generation).toBe(state.lineage.generation);
    expect(round.lineage.continuedBy).toBeNull();
    expect(kinProblem(round)).toBeNull();
  });

  it("SAVE_SCHEMA_VERSION не менялся в Stage 04 (теперь 9 в Stage 02.1)", () => {
    expect(SAVE_SCHEMA_VERSION).toBe(9);
  });

  it("родовия карта связей всех миров валидна после полной жизни", () => {
    const universes: UniverseId[] = ["academy", "dark-fantasy", "hunter", "isekai", "murim", "xianxia"];
    for (const universeId of universes) {
      const { state } = playLife(start({ seed: `dyn-all-${universeId}`, universeId }), 400, (n, i) => (i * 7) % n);
      expect(kinProblem(state)).toBeNull();
      const graph = new KinGraph(state);
      for (const npc of state.npcs) {
        if (npc.parents.length > 0) {
          for (const parent of npc.parents) expect(graph.has(parent)).toBe(true);
        }
        if (npc.spouseId) expect(graph.has(npc.spouseId)).toBe(true);
      }
    }
  });
});

describe("Family graph: валидация родства", () => {
  it("отклоняет самому себе родителя, дубли родителей, циклы и несуществующих родителей", () => {
    const base = start({ seed: "kin-problem", universeId: "academy" });

    const selfParent = deepClone(base);
    selfParent.lineage.selfParents = [SELF_ID];
    expect(kinProblem(selfParent)).not.toBeNull();

    const dup = deepClone(base);
    const p0 = dup.npcs[0]!.parents[0]!;
    dup.npcs[0]!.parents = [p0, p0];
    expect(kinProblem(dup)).not.toBeNull();

    const missing = deepClone(base);
    missing.npcs[0]!.parents = ["n999999"];
    expect(kinProblem(missing)).not.toBeNull();

    const cycle = deepClone(base);
    cycle.npcs[0]!.parents = [cycle.npcs[1]!.id];
    cycle.npcs[1]!.parents = [cycle.npcs[0]!.id];
    expect(kinProblem(cycle)).not.toBeNull();

    const three = deepClone(base);
    three.npcs[0]!.parents = ["n1", "n2", "n3"];
    expect(kinProblem(three)).not.toBeNull();
  });

  it("валидное состояние проходит проверку родства", () => {
    const { state } = playLife(start({ seed: "kin-valid", universeId: "xianxia" }), 60);
    expect(kinProblem(state)).toBeNull();
    expect(new KinGraph(state).people.length).toBeGreaterThan(0);
  });
});
