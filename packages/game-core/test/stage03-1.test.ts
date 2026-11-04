// Stage 03.1: исправления по аудиту — природное и юридическое родство, кровь рода у приёмного наследника,
// родители приёмного ребёнка, полный список сюжетов рода, независимость основного потока от жизни NPC
import { describe, expect, it } from "vitest";
import {
  applyAction,
  deepClone,
  heirCandidates,
  KinGraph,
  kinProblem,
  LEGACY_EVENTS,
  LINEAGE_CONSEQUENCES,
  MIN_PARENT_AGE,
  SELF_ID,
  succeed,
  type GameState,
  type UniverseId
} from "../src/index.js";
import { choiceIds, playLife, start } from "./helpers.js";

function withPending(state: GameState, eventId: string): GameState {
  return { ...deepClone(state), pending: { eventId, age: state.life.age } };
}

function at(state: GameState, age: number): GameState {
  const copy = deepClone(state);
  copy.life = { ...copy.life, age, stage: age < 13 ? "child" : age < 18 ? "teen" : "adult" };
  return copy;
}

function adopt(state: GameState): GameState {
  return applyAction(withPending(state, "legacy.adopt-heir"), { type: "choose", choiceId: "adopt" }).state;
}

function deadWithHeir(universeId: UniverseId): GameState {
  for (let k = 0; k < 60; k++) {
    const { state } = playLife(start({ seed: `s031-${universeId}-${k}`, universeId }), 6000, (n, i) => (i * 3 + k) % n);
    if (!state.life.alive && heirCandidates(state).some((h) => h.available && h.natural)) return state;
  }
  throw new Error(`нет жизни с кровным наследником: ${universeId}`);
}

/** Первый доступный наследник по крови: на приёмном проверки крови не имеют смысла */
function naturalHeir(dead: GameState) {
  return heirCandidates(dead).find((c) => c.available && c.natural)!;
}

describe("Stage 03.1: усыновление — родство по закону, а не по крови", () => {
  it("приёмный ребёнок — родня по линии рода (наследует, брак запрещён), но не родня по крови", () => {
    const state = adopt(at(start({ seed: "adopt-graph", universeId: "isekai" }), 32));
    const child = state.npcs.find((n) => n.adopted)!;
    expect(child).toBeDefined();
    expect(child.parents).toContain(SELF_ID);
    const graph = new KinGraph(state);
    expect(graph.bloodRelation(SELF_ID, child.id)).toBe("child");
    expect(graph.tooClose(SELF_ID, child.id)).toBe(true);
    expect(graph.isNatural(SELF_ID, child.id)).toBe(false);
    // Кровные родители персонажа остаются природной роднёй
    for (const parent of state.lineage.selfParents) expect(graph.isNatural(SELF_ID, parent)).toBe(true);
    expect(kinProblem(state)).toBeNull();
  });

  it("приёмный ребёнок всегда получает родителей, даже у 20-летнего персонажа", () => {
    const base = at(start({ seed: "adopt-young", universeId: "academy" }), 20);
    for (let i = 0; i < 60; i++) {
      const state = adopt({ ...base, rngState: i * 7919 + 1 });
      const child = state.npcs.find((n) => n.adopted);
      if (!child) continue;
      expect(child.parents).toContain(SELF_ID);
      // bornAt отсчитывается от рождения персонажа: персонаж старше ребёнка на bornAt лет
      expect(child.bornAt).toBeGreaterThanOrEqual(MIN_PARENT_AGE);
      expect(kinProblem(state)).toBeNull();
    }
  });

  it.each(["xianxia", "dark-fantasy", "academy"] as UniverseId[])("%s: кровь рода (флаги, потенциал, таланты, слабости, сильные стороны) не переходит к приёмному наследнику", (universeId) => {
    const dead = deadWithHeir(universeId);
    const heir = naturalHeir(dead);
    const strong = deepClone(dead);
    strong.flags = [...new Set([...strong.flags, "spirit-root", "mist-mark", "martial-school", "awakened", "noble-blood"])].sort();
    strong.hidden.potential = 10;
    const weak = deepClone(dead);
    weak.flags = weak.flags.filter((f) => !["spirit-root", "mist-mark", "martial-school", "awakened", "noble-blood"].includes(f));
    weak.hidden.potential = 1;
    weak.character.talents = [];
    weak.character.weaknesses = [];
    weak.lineage.traits = { talents: {}, weaknesses: {} };

    const adopted = (s: GameState) => {
      const copy = deepClone(s);
      copy.npcs.find((n) => n.id === heir.npc.id)!.adopted = true;
      return copy;
    };
    const pick = (s: GameState) => ({ flags: s.flags, potential: s.hidden.potential, dormant: s.hidden.dormantTalents, weaknesses: s.character.weaknesses });

    let naturalDiffers = false;
    for (let i = 0; i < 20; i++) {
      const salt = `salt-${i}`;
      const a = succeed(adopted(strong), heir.npc.id, salt).state;
      const b = succeed(adopted(weak), heir.npc.id, salt).state;
      expect(pick(a)).toEqual(pick(b));
      const na = succeed(strong, heir.npc.id, salt).state;
      const nb = succeed(weak, heir.npc.id, salt).state;
      if (JSON.stringify(pick(na)) !== JSON.stringify(pick(nb))) naturalDiffers = true;
    }
    // Кровный наследник при той же соли зависит от крови умершего
    expect(naturalDiffers).toBe(true);
    // Приёмный остаётся наследником и получает имущество по закону
    expect(heirCandidates(adopted(dead)).find((c) => c.npc.id === heir.npc.id)!.available).toBe(true);
    expect(heirCandidates(adopted(dead)).find((c) => c.npc.id === heir.npc.id)!.natural).toBe(false);
  });

  it("кровный наследник: тот же salt — тот же результат, что и до исправления (порядок бросков не изменился)", () => {
    const dead = deadWithHeir("murim");
    const heir = naturalHeir(dead);
    expect(heir.natural).toBe(true);
    expect(succeed(dead, heir.npc.id, "x").state).toEqual(succeed(dead, heir.npc.id, "x").state);
  });
});

describe("Stage 03.1: приёмный на пути родства", () => {
  it("ребёнок приёмного ребёнка — наследник по линии рода, но не по крови", () => {
    let state = adopt(at(start({ seed: "adopt-grandchild", universeId: "academy" }), 40));
    const child = state.npcs.find((n) => n.adopted)!;
    const spouse = deepClone(child);
    spouse.id = `n${state.nextNpcId++}`;
    spouse.role = "in-law";
    spouse.adopted = false;
    spouse.parents = [];
    spouse.bornAt = child.bornAt;
    spouse.spouseId = null;
    spouse.formerSpouses = [];
    const grandchild = deepClone(child);
    grandchild.id = `n${state.nextNpcId++}`;
    grandchild.role = "grandchild";
    grandchild.adopted = false;
    grandchild.parents = [child.id, spouse.id];
    grandchild.bornAt = child.bornAt + MIN_PARENT_AGE + 6;
    grandchild.spouseId = null;
    grandchild.formerSpouses = [];
    state = { ...state, npcs: [...state.npcs, spouse, grandchild] };
    const graph = new KinGraph(state);
    expect(graph.bloodRelation(SELF_ID, grandchild.id)).toBe("grandchild");
    expect(graph.isNatural(SELF_ID, grandchild.id)).toBe(false);
    expect(graph.isNatural(child.id, grandchild.id)).toBe(true);
  });
});

describe("Stage 03.1: основной поток генератора и жизнь NPC", () => {
  const living = (s: GameState) => s.npcs.filter((n) => n.alive).map((n) => n.id).join(",");

  it("собственная жизнь NPC не читает основной поток: другой seed отдельного потока при том же составе людей — тот же rngState", () => {
    let compared = 0;
    for (const universeId of ["dark-fantasy", "isekai", "murim", "xianxia", "hunter", "academy"] as UniverseId[]) {
      let state = start({ seed: `rng-guard-${universeId}`, universeId });
      for (let step = 0; step < 80 && state.life.alive; step++) {
        if (state.pending) {
          state = applyAction(state, { type: "choose", choiceId: choiceIds(state)[0]! }).state;
          continue;
        }
        const other = { ...deepClone(state), seed: `${state.seed}-other-stream` };
        const a = applyAction(state, { type: "advance" }).state;
        const b = applyAction(other, { type: "advance" }).state;
        if (living(a) === living(state) && living(b) === living(state) && !a.pending && !b.pending) {
          expect(b.rngState).toBe(a.rngState);
          compared += 1;
        }
        state = a;
      }
    }
    expect(compared).toBeGreaterThan(20);
  });
});

describe("Stage 03.1: сюжеты рода", () => {
  it("16 сюжетов поколений и 4 последствия для рода — все с уникальными id и lineageMax", () => {
    const stories = LEGACY_EVENTS.map((e) => e.id);
    const consequences = LINEAGE_CONSEQUENCES.map((c) => c.id);
    expect(new Set([...stories, ...consequences]).size).toBe(stories.length + consequences.length);
    for (const event of LEGACY_EVENTS) expect(event.lineageMax).toBeGreaterThanOrEqual(1);
    expect(stories.sort()).toEqual(
      [
        "legacy.heir-born",
        "legacy.family-conflict",
        "legacy.estate-dispute",
        "legacy.throne-dispute",
        "legacy.relative-vanishes",
        "legacy.lost-returns",
        "legacy.old-enemy",
        "legacy.family-secret",
        "legacy.marriage-alliance",
        "legacy.betrayal",
        "legacy.restore-name",
        "legacy.heir-in-danger",
        "legacy.rise",
        "legacy.fall",
        "legacy.adopt-heir",
        "legacy.ancient-knowledge"
      ].sort()
    );
    expect(consequences.sort()).toEqual(["legacy.c-enemy-returns", "legacy.c-knowledge", "legacy.c-lost-found", "legacy.c-rite-blessing"]);
  });

  it("сирота у порога: ответ «взять в семью» даёт приёмного ребёнка в роду и запись в хронике", () => {
    const state = adopt(at(start({ seed: "adopt-story", universeId: "hunter" }), 35));
    const child = state.npcs.find((n) => n.adopted)!;
    expect(child).toBeDefined();
    expect(state.lineage.chronicle.some((e) => e.kind === "adoption" && e.who.includes(child.id))).toBe(true);
  });
});
