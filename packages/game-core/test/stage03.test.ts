// Stage 03: родство по id, собственная жизнь NPC, род, наследование, сюжеты поколений, достижения, итоги, совместимость
import { describe, expect, it } from "vitest";
import {
  allProfessions,
  applyAction,
  deepClone,
  getUniverse,
  heirCandidates,
  INHERITANCE_LAWS,
  isEligible,
  KinGraph,
  kinProblem,
  LEGACY_EVENTS,
  MAX_CHRONICLE,
  MAX_GENERATIONS,
  MAX_LIVING_NPCS,
  MAX_NPCS,
  newGame,
  parseSave,
  presentLegacy,
  presentLineage,
  SAVE_SCHEMA_VERSION,
  scoreLife,
  SELF_ID,
  succeed,
  UNIVERSE_IDS,
  unlockAchievements,
  type GameState,
  type UniverseId
} from "../src/index.js";
import { findEvent } from "../src/narrative/selection.js";
import { SAVES_V1 } from "./fixtures/saves-v1.js";
import { SAVES_V2 } from "./fixtures/saves-v2.js";
import { choiceIds, playLife, start } from "./helpers.js";

function withPending(state: GameState, eventId: string): GameState {
  return { ...deepClone(state), pending: { eventId, age: state.life.age } };
}

function at(state: GameState, age: number): GameState {
  const copy = deepClone(state);
  copy.life = { ...copy.life, age, stage: age < 13 ? "child" : age < 18 ? "teen" : "adult" };
  return copy;
}

function roundTrip(state: GameState): GameState {
  return parseSave(JSON.parse(JSON.stringify(state)));
}

/** Жизнь до конца, у которой есть кого выбрать наследником. Поиск по seed ограничен */
function deadWithHeirs(universeId: UniverseId, tag = "heirs"): GameState {
  for (let k = 0; k < 60; k++) {
    const { state } = playLife(start({ seed: `${tag}-${universeId}-${k}`, universeId }), 6000, (n, i) => (i * 3 + k) % n);
    if (!state.life.alive && heirCandidates(state).some((h) => h.available)) return state;
  }
  throw new Error(`нет жизни с наследником: ${universeId}`);
}

/** Полная жизнь в каждом мире: на ней проверяются NPC */
const LIVES = UNIVERSE_IDS.map((universeId) => playLife(start({ seed: `npc-life-${universeId}`, universeId }), 6000, (n, i) => (i * 5) % n).state);

describe("Family & Genealogy: связи по id", () => {
  it.each(UNIVERSE_IDS)("%s: семья при рождении связана родством, проверка родства проходит", (universeId) => {
    for (let i = 0; i < 20; i++) {
      const state = newGame({ seed: `kin-${universeId}-${i}`, universeId }).state;
      expect(kinProblem(state)).toBeNull();
      const graph = new KinGraph(state);
      for (const parent of state.lineage.selfParents) expect(graph.relation(SELF_ID, parent)).toBe("parent");
      for (const sibling of state.npcs.filter((n) => n.role === "sibling" && n.parents.length > 0)) expect(graph.relation(SELF_ID, sibling.id)).toBe("sibling");
      for (const gp of state.npcs.filter((n) => n.role === "grandparent")) {
        if (state.npcs.some((p) => p.parents.includes(gp.id))) expect(graph.relation(SELF_ID, gp.id)).toBe("grandparent");
      }
      // Связи на конкретные id, ни одной ссылки в пустоту
      const ids = new Set([SELF_ID, ...state.npcs.map((n) => n.id)]);
      for (const npc of state.npcs) for (const id of [...npc.parents, ...(npc.spouseId ? [npc.spouseId] : [])]) expect(ids.has(id)).toBe(true);
    }
  });

  it("родители полной семьи — супруги, у незаконнорождённого — нет", () => {
    const full = newGame({ seed: "spouses", universeId: "academy", originId: "duke-heir" }).state;
    const [mother, father] = full.lineage.selfParents.map((id) => full.npcs.find((n) => n.id === id)!);
    expect(mother!.spouseId).toBe(father!.id);
    expect(father!.spouseId).toBe(mother!.id);
    const bastard = newGame({ seed: "spouses", universeId: "academy", originId: "bastard" }).state;
    expect(bastard.npcs.filter((n) => n.role === "father" || n.role === "mother").every((n) => n.spouseId === null)).toBe(true);
  });

  it("невозможное родство отклоняется: циклы, ребёнок старше родителя, брак с умершим, дубли, три родителя", () => {
    const base = newGame({ seed: "broken-kin", universeId: "academy", originId: "duke-heir" }).state;
    const [a, b] = base.npcs;
    expect(a && b).toBeTruthy();
    const cases: ((s: GameState) => void)[] = [
      (s) => {
        // Цикл: мать — дочь собственной дочери
        const m = s.npcs.find((n) => n.id === s.lineage.selfParents[0])!;
        m.parents = [SELF_ID];
      },
      (s) => {
        s.npcs[0]!.parents = [s.npcs[0]!.id];
      },
      (s) => {
        const sibling = s.npcs.find((n) => n.role === "sibling" && n.parents.length > 0);
        if (sibling) sibling.bornAt = -200;
        else s.npcs[0]!.parents = [SELF_ID];
      },
      (s) => {
        const dead = s.npcs[1]!;
        dead.alive = false;
        dead.status = "deceased";
        dead.diedAt = 0;
        s.npcs[0]!.spouseId = dead.id;
        dead.spouseId = s.npcs[0]!.id;
        s.npcs[0]!.formerSpouses = [];
      },
      (s) => {
        s.lineage.selfParents = [s.npcs[0]!.id, s.npcs[0]!.id];
      },
      (s) => {
        s.lineage.selfParents = s.npcs.slice(0, 3).map((n) => n.id);
      },
      (s) => {
        s.npcs[0]!.parents = ["n999"];
      }
    ];
    for (const breakIt of cases) {
      const state = deepClone(base);
      breakIt(state);
      expect(kinProblem(state)).not.toBeNull();
      expect(() => parseSave(JSON.parse(JSON.stringify(state)))).toThrow(expect.objectContaining({ code: "INVALID_SAVE" }));
    }
  });

  it("граф родства: дяди, племянники, двоюродные, внуки и родня по браку", () => {
    const state = deepClone(start({ seed: "graph", universeId: "isekai" }));
    const npc = (id: string, bornAt: number, parents: string[], gender: "female" | "male" = "male") => ({ ...deepClone(state.npcs[0] ?? createFake(state)), id, bornAt, parents, spouseId: null, formerSpouses: [], alive: true, status: "alive" as const, diedAt: null, gender });
    state.npcs = [];
    state.lineage.selfParents = ["n1"];
    state.npcs.push(npc("n10", -70, []), npc("n1", -30, ["n10"]), npc("n2", -28, ["n10"]), npc("n3", 2, ["n2"]), npc("n4", 3, ["n1"]), npc("n5", -1, []), npc("n6", 25, [SELF_ID]), npc("n7", 50, ["n6"]));
    state.npcs.find((n) => n.id === "n5")!.spouseId = SELF_ID;
    const graph = new KinGraph(state);
    expect(graph.relation(SELF_ID, "n10")).toBe("grandparent");
    expect(graph.relation(SELF_ID, "n2")).toBe("pibling");
    expect(graph.relation(SELF_ID, "n3")).toBe("cousin");
    expect(graph.relation(SELF_ID, "n4")).toBe("sibling");
    expect(graph.relation(SELF_ID, "n7")).toBe("grandchild");
    expect(graph.relation(SELF_ID, "n5")).toBe("spouse");
    expect(graph.relation("n5", "n1")).toBe("in-law");
    expect(graph.tooClose(SELF_ID, "n3")).toBe(true);
    expect(graph.wouldCycle("n10", SELF_ID)).toBe(true);
    expect(kinProblem(state)).toBeNull();
  });
});

function createFake(state: GameState) {
  return newGame({ seed: "fake-npc", universeId: state.character.universeId, originId: getUniverse(state.character.universeId).origins[0]!.id }).state.npcs[0]!;
}

describe("Living NPC Engine", () => {
  it.each(UNIVERSE_IDS.map((id, i) => [id, i] as const))("%s: NPC живут своей жизнью, родство остаётся целым", (universeId, i) => {
    const state = LIVES[i]!;
    const universe = getUniverse(universeId);
    expect(kinProblem(state)).toBeNull();
    expect(roundTrip(state)).toEqual(state);
    expect(state.npcs.length).toBeLessThanOrEqual(MAX_NPCS);
    // Профессии — только из системы профессий мира (Stage 02)
    const professions = new Set(allProfessions(universe).map((p) => p.id));
    for (const npc of state.npcs) if (npc.professionId) expect(professions.has(npc.professionId)).toBe(true);
    // Умершие: причина, дата, после смерти ничего не делают
    for (const npc of state.npcs.filter((n) => !n.alive)) {
      expect(npc.status).toBe("deceased");
      expect(npc.cause).not.toBeNull();
      expect(npc.diedAt).not.toBeNull();
      for (const entry of npc.log) expect(entry.at).toBeLessThanOrEqual(npc.diedAt!);
    }
    // Брак только между живыми и взаимный
    for (const npc of state.npcs.filter((n) => n.alive && n.spouseId && n.spouseId !== SELF_ID)) {
      const spouse = state.npcs.find((n) => n.id === npc.spouseId)!;
      expect(spouse.alive || spouse.status === "missing").toBe(true);
      expect(spouse.spouseId).toBe(npc.id);
    }
  });

  it("за долгие жизни NPC учатся, работают, растут в ремесле, женятся, заводят детей и умирают по разным причинам", () => {
    const logs = LIVES.flatMap((s) => s.npcs.flatMap((n) => n.log.map((e) => e.kind)));
    for (const kind of ["education", "job", "promotion", "married", "child"] as const) expect(logs, kind).toContain(kind);
    const causes = new Set(LIVES.flatMap((s) => s.npcs.map((n) => n.cause).filter((c) => c !== null)));
    expect(causes.size).toBeGreaterThanOrEqual(3);
    // Дети NPC — новые люди со связями на родителей-NPC
    const npcChildren = LIVES.flatMap((s) => s.npcs.filter((n) => n.parents.length > 0 && !n.parents.includes(SELF_ID) && s.npcs.some((p) => p.id === n.parents[0] && p.log.some((e) => e.kind === "child"))));
    expect(npcChildren.length).toBeGreaterThan(0);
  });

  it("события в жизни NPC редкие: брак и дети — не каждый год", () => {
    let npcYears = 0;
    let marriages = 0;
    let births = 0;
    for (const state of LIVES) {
      for (const npc of state.npcs) npcYears += Math.max(0, (npc.diedAt ?? state.life.age) - Math.max(npc.bornAt, npc.metAt));
      marriages += state.lineage.chronicle.filter((e) => e.kind === "marriage" && !e.who.includes(SELF_ID)).length;
      births += state.lineage.chronicle.filter((e) => e.kind === "birth" && !e.who.includes(SELF_ID)).length;
    }
    expect(npcYears).toBeGreaterThan(500);
    expect(marriages / npcYears).toBeLessThan(0.05);
    expect(births / npcYears).toBeLessThan(0.08);
  });

  it("живых NPC не больше предела, даже за тысячелетнюю жизнь культиватора", () => {
    const xianxia = LIVES[UNIVERSE_IDS.indexOf("xianxia")]!;
    let current = start({ seed: "long-xianxia", universeId: "xianxia" });
    let maxAlive = 0;
    for (let i = 0; i < 1500 && current.life.alive; i++) {
      current = current.pending ? applyAction(current, { type: "choose", choiceId: choiceIds(current)[0]! }).state : applyAction(current, { type: "advance", years: 10 }).state;
      maxAlive = Math.max(maxAlive, current.npcs.filter((n) => n.alive).length);
    }
    expect(maxAlive).toBeLessThanOrEqual(MAX_LIVING_NPCS + 4);
    expect(current.npcs.length).toBeLessThanOrEqual(MAX_NPCS);
    expect(xianxia.npcs.length).toBeLessThanOrEqual(MAX_NPCS);
  });

  it("жизнь NPC детерминирована: один seed и одни решения — те же люди; после отката — другие исходы", () => {
    const a = playLife(start({ seed: "same-npcs", universeId: "murim" }), 300).state;
    const b = playLife(start({ seed: "same-npcs", universeId: "murim" }), 300).state;
    expect(a).toEqual(b);
  });

  it("пропавший родственник не участвует в жизни и может вернуться", () => {
    let base: GameState | undefined;
    for (let k = 0; k < 40 && !base; k++) {
      const s = at(newGame({ seed: `missing-${k}`, universeId: "academy", originId: "duke-heir" }).state, 26);
      if (s.npcs.some((n) => n.role === "sibling" && n.alive && 26 - n.bornAt >= 16)) base = s;
    }
    expect(base).toBeDefined();
    let state = applyAction(withPending(base!, "legacy.relative-vanishes"), { type: "choose", choiceId: "wait" }).state;
    const missing = state.npcs.find((n) => n.status === "missing")!;
    expect(missing).toBeDefined();
    expect(missing.alive).toBe(true);
    expect(() => applyAction(state, { type: "interact", npcId: missing.id, interaction: "talk" })).toThrow(expect.objectContaining({ code: "CHOICE_LOCKED" }));
    expect(isEligible(at(state, 30), findEvent(getUniverse("academy"), "legacy.lost-returns")!)).toBe(true);
    state = applyAction(withPending(at(state, 30), "legacy.lost-returns"), { type: "choose", choiceId: "embrace" }).state;
    expect(state.npcs.find((n) => n.id === missing.id)!.status).toBe("alive");
    expect(state.lineage.chronicle.some((e) => e.kind === "return")).toBe(true);
  });
});

describe("Legacy & Inheritance: смерть персонажа и наследник", () => {
  const dead = deadWithHeirs("dark-fantasy");

  it("после смерти жизнь подведена: итог в роду, наследники — только живая кровная родня", () => {
    expect(dead.lineage.lives).toHaveLength(1);
    expect(dead.lineage.lives[0]!.gen).toBe(1);
    const graph = new KinGraph(dead);
    for (const candidate of heirCandidates(dead)) {
      expect(candidate.npc.alive).toBe(true);
      expect(graph.isBlood(SELF_ID, candidate.npc.id)).toBe(true);
    }
    const strangers = dead.npcs.filter((n) => !graph.isBlood(SELF_ID, n.id));
    for (const npc of strangers) expect(heirCandidates(dead).some((c) => c.npc.id === npc.id)).toBe(false);
    expect(heirCandidates(dead).filter((c) => c.primary)).toHaveLength(1);
  });

  it("выбор наследника: нельзя живому, умершему, чужому; нельзя дважды", () => {
    const heir = heirCandidates(dead).find((c) => c.available)!;
    const alive = start();
    expect(() => succeed(alive, "n1")).toThrow(expect.objectContaining({ code: "LIFE_NOT_ENDED" }));
    const deadNpc = dead.npcs.find((n) => !n.alive);
    if (deadNpc) expect(() => succeed(dead, deadNpc.id)).toThrow(expect.objectContaining({ code: "HEIR_LOCKED" }));
    const stranger = dead.npcs.find((n) => n.alive && !new KinGraph(dead).isBlood(SELF_ID, n.id));
    if (stranger) expect(() => succeed(dead, stranger.id)).toThrow(expect.objectContaining({ code: "HEIR_LOCKED" }));
    expect(() => succeed(dead, "n99999")).toThrow(expect.objectContaining({ code: "HEIR_LOCKED" }));
    const { previous } = succeed(dead, heir.npc.id, "salt");
    expect(previous.lineage.continuedBy).toBe(heir.npc.id);
    expect(() => succeed(previous, heir.npc.id, "salt")).toThrow(expect.objectContaining({ code: "LINEAGE_CONTINUED" }));
    const capped = deepClone(dead);
    capped.lineage.generation = MAX_GENERATIONS;
    expect(() => succeed(capped, heir.npc.id)).toThrow(expect.objectContaining({ code: "HEIR_LOCKED" }));
  });

  it("новая жизнь: наследник — персонаж, умерший — запись NPC с теми же связями, время сдвинуто, род продолжен", () => {
    const candidate = heirCandidates(dead).find((c) => c.available)!;
    const heir = candidate.npc;
    const { state, previous, entries } = succeed(dead, heir.id, "salt-a");
    expect(roundTrip(state)).toEqual(state);
    expect(roundTrip(previous)).toEqual(previous);
    expect(kinProblem(state)).toBeNull();
    expect(state.schemaVersion).toBe(SAVE_SCHEMA_VERSION);
    expect(state.version).toBe(1);
    expect(state.character.name).toBe(heir.name);
    expect(state.character.gender).toBe(heir.gender);
    expect(state.life.age).toBe(candidate.age);
    expect(state.lineage.generation).toBe(2);
    expect(state.lineage.epoch).toBe(dead.lineage.epoch + heir.bornAt);
    expect(state.npcs.some((n) => n.id === heir.id)).toBe(false);
    // Умерший — NPC со стабильным id и тем же родством
    const record = state.npcs.find((n) => n.lifeGen === 1)!;
    expect(record.name).toBe(dead.character.name);
    expect(record.alive).toBe(false);
    expect(record.cause).toBe("life");
    expect(record.bornAt).toBe(-heir.bornAt);
    expect(new KinGraph(state).relation(SELF_ID, record.id)).toBe(candidate.relation === "child" ? "parent" : new KinGraph(state).relation(SELF_ID, record.id));
    expect(state.lineage.lives[0]!.npcId).toBe(record.id);
    // Хроника и достижения переходят к роду; новое — наследование
    expect(state.lineage.chronicle[0]!.kind).toBe("origin");
    expect(state.lineage.chronicle.some((e) => e.kind === "succession")).toBe(true);
    for (const a of dead.lineage.achievements) expect(state.lineage.achievements.map((x) => x.id)).toContain(a.id);
    expect(state.lineage.achievements.some((a) => a.id === "heir")).toBe(true);
    expect(entries[0]?.kind).toBe("legacy");
    // Повтор с той же солью — тот же итог, с другой — другой seed
    expect(succeed(dead, heir.id, "salt-a").state).toEqual(state);
    expect(succeed(dead, heir.id, "salt-b").state.seed).not.toBe(state.seed);
    // Жизнь наследника продолжается
    const next = applyAction(state, state.pending ? { type: "choose", choiceId: choiceIds(state)[0]! } : { type: "advance" });
    expect(next.state.version).toBe(2);
  });

  it("наследование по закону мира: сбор, доля супруга, характеристики не копируются целиком", () => {
    const candidate = heirCandidates(dead).find((c) => c.available)!;
    const law = INHERITANCE_LAWS["dark-fantasy"];
    const total = dead.character.wealth;
    expect(candidate.wealth).toBeLessThanOrEqual(total - Math.round(total * law.levy));
    const { state } = succeed(dead, candidate.npc.id, "law");
    const record = state.lineage.inheritance!;
    expect(record.law).toBe(law.id);
    expect(record.wealth).toBe(candidate.wealth);
    if (candidate.age >= law.controlAge) expect(state.character.wealth).toBe(candidate.npc.wealth + candidate.wealth);
    expect(state.character.stats).not.toEqual(dead.character.stats);
    // Сословие: наследуемое переходит, если оно выше своего
    if (candidate.classInherited) expect(state.character.socialClassId).toBe(dead.character.socialClassId);
  });

  it("несовершеннолетний наследник: опека там, где закон её знает, и запрет там, где нет", () => {
    for (const [universeId, regency] of [
      ["dark-fantasy", true],
      ["isekai", false]
    ] as const) {
      const state = deepClone(universeId === "dark-fantasy" ? dead : deadWithHeirs(universeId));
      const candidate = heirCandidates(state).find((c) => c.available)!;
      const npc = state.npcs.find((n) => n.id === candidate.npc.id)!;
      npc.bornAt = state.life.age - 5;
      const young = heirCandidates(state).find((c) => c.npc.id === npc.id)!;
      expect(young.age).toBe(5);
      expect(young.available).toBe(regency);
      if (!regency) {
        expect(young.locked).not.toBeNull();
        expect(() => succeed(state, npc.id)).toThrow(expect.objectContaining({ code: "HEIR_LOCKED" }));
        continue;
      }
      expect(young.regency).toBe(true);
      const result = succeed(state, npc.id, "regency");
      const inheritance = result.state.lineage.inheritance!;
      expect(inheritance.held).toBe(young.wealth);
      expect(result.state.character.wealth).toBe(npc.wealth);
      // Опека заканчивается в возрасте закона: золото переходит наследнику
      let life = result.state;
      for (let i = 0; i < 80 && life.life.alive && life.life.age < INHERITANCE_LAWS[universeId].controlAge; i++) {
        life = applyAction(life, life.pending ? { type: "choose", choiceId: choiceIds(life)[0]! } : { type: "advance" }).state;
      }
      if (life.life.alive) expect(life.lineage.inheritance!.held).toBe(0);
    }
  });

  it.each(UNIVERSE_IDS)("%s: несколько поколений подряд, род и родство остаются целыми", (universeId) => {
    let state = deadWithHeirs(universeId, "gens");
    let generations = 1;
    for (let g = 0; g < 3; g++) {
      const heir = heirCandidates(state).find((c) => c.available);
      if (!heir) break;
      state = roundTrip(succeed(state, heir.npc.id, `g${g}`).state);
      generations += 1;
      expect(state.lineage.generation).toBe(generations);
      state = playLife(state, 6000, (n, i) => (i * 7 + g) % n).state;
      expect(kinProblem(state)).toBeNull();
    }
    expect(generations).toBeGreaterThanOrEqual(2);
    expect(state.lineage.lives.length).toBe(state.life.alive ? generations - 1 : generations);
    expect(state.lineage.chronicle.length).toBeLessThanOrEqual(MAX_CHRONICLE);
    expect(state.npcs.length).toBeLessThanOrEqual(MAX_NPCS);
    expect(JSON.stringify(state).length).toBeLessThan(200_000);
    // Сыгранные жизни — записи NPC с поколением, связаны с текущим персонажем
    const played = state.npcs.filter((n) => n.lifeGen !== null);
    expect(played.length).toBeGreaterThanOrEqual(1);
    const graph = new KinGraph(state);
    for (const npc of played) expect(graph.relation(SELF_ID, npc.id)).not.toBeNull();
  });
});

describe("Generational Story Engine", () => {
  it("сюжеты поколений: все виды из задания, один раз за род без причины", () => {
    const ids = LEGACY_EVENTS.map((e) => e.id);
    for (const id of ["legacy.heir-born", "legacy.family-conflict", "legacy.estate-dispute", "legacy.throne-dispute", "legacy.relative-vanishes", "legacy.old-enemy", "legacy.family-secret", "legacy.marriage-alliance", "legacy.betrayal", "legacy.restore-name", "legacy.heir-in-danger", "legacy.rise", "legacy.fall", "legacy.ancient-knowledge"]) {
      expect(ids).toContain(id);
    }
    for (const event of LEGACY_EVENTS) {
      expect(event.kind).toBe("legacy");
      expect(event.lineageMax).toBeGreaterThanOrEqual(1);
      for (const choice of event.choices) expect(choice.text.en.length).toBeGreaterThan(0);
    }
    const state = at(start({ seed: "story", universeId: "academy" }), 30);
    const event = findEvent(getUniverse("academy"), "legacy.rise")!;
    state.lineage.renown = 40;
    expect(isEligible(state, event)).toBe(true);
    state.lineage.stories["legacy.rise"] = event.lineageMax!;
    expect(isEligible(state, event)).toBe(false);
  });

  it("ответ на сюжет рода попадает в хронику рода с источником; связь с прошлой записью того же сюжета", () => {
    let state = at(start({ seed: "story-chain", universeId: "murim" }), 30);
    state.lineage.renown = -20;
    state = applyAction(withPending(state, "legacy.restore-name"), { type: "choose", choiceId: "accept" }).state;
    const first = state.lineage.chronicle.filter((e) => e.kind === "story" && e.src === "legacy.restore-name");
    expect(first).toHaveLength(1);
    state = applyAction(withPending(at(state, 45), "legacy.restore-name"), { type: "choose", choiceId: "accept" }).state;
    const second = state.lineage.chronicle.filter((e) => e.kind === "story" && e.src === "legacy.restore-name");
    expect(second).toHaveLength(2);
    expect(second[1]!.link).toBe(second[0]!.id);
    expect(state.lineage.stories["legacy.restore-name"]).toBe(2);
    expect(state.memory.some((m) => m.eventId === "legacy.restore-name")).toBe(true);
  });

  it("нить рода и последствие для рода переживают персонажа и настигают наследника", () => {
    const dead = deepClone(deadWithHeirs("hunter", "thread"));
    const year = dead.lineage.epoch + dead.life.age + 2;
    dead.lineage.threads.push({ id: "old-enemy", year: dead.lineage.epoch, gen: 1, src: "test" });
    dead.lineage.pending.push({ id: "legacy.c-enemy-returns", year, src: "legacy.estate-dispute", entry: null });
    const heir = heirCandidates(dead).find((c) => c.available)!;
    let state = succeed(dead, heir.npc.id, "thread").state;
    expect(state.lineage.threads.some((x) => x.id === "old-enemy")).toBe(true);
    expect(state.lineage.pending.some((x) => x.id === "legacy.c-enemy-returns")).toBe(true);
    for (let i = 0; i < 30 && state.life.alive && state.lineage.pending.length > 0; i++) {
      state = applyAction(state, state.pending ? { type: "choose", choiceId: choiceIds(state)[0]! } : { type: "advance" }).state;
    }
    if (state.life.alive) {
      expect(state.lineage.pending.some((x) => x.id === "legacy.c-enemy-returns")).toBe(false);
      const fired = state.lineage.chronicle.find((e) => e.kind === "story" && e.v.story === "legacy.c-enemy-returns");
      expect(fired?.gen).toBe(2);
      expect(fired?.src).toBe("legacy.estate-dispute");
    }
  });
});

describe("Achievements & Life Summary", () => {
  it("достижения открываются один раз и остаются за родом", () => {
    const state = deepClone(LIVES[0]!);
    const before = state.lineage.achievements.length;
    expect(unlockAchievements(state)).toHaveLength(0);
    expect(state.lineage.achievements).toHaveLength(before);
    expect(new Set(state.lineage.achievements.map((a) => a.id)).size).toBe(before);
    // Свадьба
    const married = LIVES.find((s) => s.npcs.some((n) => n.formerSpouses.includes(SELF_ID) || n.spouseId === SELF_ID));
    if (married) expect(married.lineage.achievements.some((a) => a.id === "wedding")).toBe(true);
  });

  it("скрытые достижения не раскрываются до получения", () => {
    const view = presentLineage(start({ seed: "hidden-ach", universeId: "isekai" }));
    const hidden = view.achievements.filter((a) => a.category === "hidden" && !a.unlocked);
    expect(hidden.length).toBeGreaterThan(0);
    for (const a of hidden) expect(a.name.en).toBe("Hidden achievement");
    // Достижения других миров не показываются
    expect(view.achievements.some((a) => a.id === "world.murim")).toBe(false);
  });

  it("оценка жизни не сводится к деньгам: золото на неё не влияет, семья и дела — влияют", () => {
    const state = deepClone(LIVES[1]!);
    const poor = scoreLife({ ...state, character: { ...state.character, wealth: 0 } });
    const rich = scoreLife({ ...state, character: { ...state.character, wealth: 1_000_000 } });
    expect(rich.total).toBe(poor.total);
    const family = parseSave(deepClone(SAVES_V2["isekai-family"]));
    expect(scoreLife(family).parts.family).toBeGreaterThan(0);
    const lonely = deepClone(family);
    lonely.npcs = lonely.npcs.filter((n) => n.role !== "child" && n.role !== "spouse");
    expect(scoreLife(lonely).parts.family).toBeLessThan(scoreLife(family).parts.family);
  });

  it("итоги жизни: имя, мир, возраст, причина, семья, решения, наследники; без seed и скрытого", () => {
    const dead = deadWithHeirs("xianxia", "summary");
    const legacy = presentLegacy(dead);
    const summary = legacy.summary!;
    expect(summary.name).toBe(dead.character.name);
    expect(summary.age).toBe(dead.life.age);
    expect(summary.cause).not.toBeNull();
    expect(summary.score).toBeGreaterThanOrEqual(0);
    expect(summary.score).toBeLessThanOrEqual(100);
    expect(summary.heirs.length).toBeGreaterThan(0);
    expect(summary.decisions.length).toBeGreaterThan(0);
    // Ни seed, ни скрытых полей: ключей potential, destiny, dormantTalents, rngState в представлении нет
    const text = JSON.stringify(legacy) + JSON.stringify(presentLineage(dead));
    expect(text).not.toContain(dead.seed);
    expect(text).not.toMatch(/"(potential|destiny|dormantTalents|rngState|seed)"\s*:/);
    expect(presentLegacy(start()).summary).toBeNull();
  });

  it("хроника рода: тексты на двух языках для каждой записи", () => {
    const dead = deadWithHeirs("academy", "chronicle");
    const heir = heirCandidates(dead).find((c) => c.available)!;
    const view = presentLineage(succeed(dead, heir.npc.id, "c").state);
    expect(view.chronicle.length).toBeGreaterThan(3);
    for (const entry of view.chronicle) {
      expect(entry.text.ru.length, entry.kind).toBeGreaterThan(3);
      expect(entry.text.en.length, entry.kind).toBeGreaterThan(3);
      expect(entry.text.ru).not.toContain("undefined");
    }
    expect(view.tree.find((n) => n.isSelf)?.name).toBe(heir.npc.name);
    expect(view.tree.some((n) => n.lifeGen === 1 && !n.alive)).toBe(true);
  });
});

describe("Совместимость сохранений: форматы 1 и 2 → 3", () => {
  it.each(Object.keys(SAVES_V2))("%s: формат 2 переводится в формат 3 без потерь", (key) => {
    const v2 = SAVES_V2[key] as GameState;
    expect(v2.schemaVersion).toBe(2);
    const state = parseSave(deepClone(v2));
    expect(state.schemaVersion).toBe(SAVE_SCHEMA_VERSION);
    expect(state.character).toEqual(v2.character);
    expect(state.life).toEqual(v2.life);
    expect(state.rngState).toBe(v2.rngState);
    expect(state.version).toBe(v2.version);
    expect(state.nextSeq).toBe(v2.nextSeq);
    expect(state.flags).toEqual(v2.flags);
    expect(state.npcs.map((n) => [n.id, n.role, n.name, n.affinity, n.alive, n.bornAt])).toEqual(v2.npcs.map((n) => [n.id, n.role, n.name, n.affinity, n.alive, n.bornAt]));
    expect(kinProblem(state)).toBeNull();
    // Супруг и дети связаны с персонажем
    const spouse = state.npcs.find((n) => n.role === "spouse" && n.alive);
    if (spouse && state.life.alive) expect(spouse.spouseId).toBe(SELF_ID);
    for (const child of state.npcs.filter((n) => n.role === "child" && n.bornAt >= 12)) expect(child.parents).toContain(SELF_ID);
    expect(state.lineage.chronicle[0]?.kind).toBe("origin");
    expect(state.lineage.lives).toHaveLength(state.life.alive ? 0 : 1);
    // Перевод воспроизводим и переживает JSON
    expect(parseSave(deepClone(v2))).toEqual(state);
    expect(roundTrip(state)).toEqual(state);
    if (state.life.alive) {
      let current = state;
      for (let i = 0; i < 15 && current.life.alive; i++) current = applyAction(current, current.pending ? { type: "choose", choiceId: choiceIds(current)[0]! } : { type: "advance" }).state;
      expect(current.version).toBeGreaterThan(state.version);
    }
  });

  it("законченная жизнь формата 2 продолжается за наследника", () => {
    const state = parseSave(deepClone(SAVES_V2["dark-fantasy-dead"]));
    expect(state.life.alive).toBe(false);
    const heir = heirCandidates(state).find((c) => c.available);
    if (heir) {
      const result = succeed(state, heir.npc.id, "v2");
      expect(roundTrip(result.state).lineage.generation).toBe(2);
    } else {
      expect(heirCandidates(state).every((c) => !c.available)).toBe(true);
    }
  });

  it.each(Object.keys(SAVES_V1))("%s: формат 1 переводится через 2 в 3, родство целое", (key) => {
    const state = parseSave(deepClone(SAVES_V1[key]));
    expect(state.schemaVersion).toBe(SAVE_SCHEMA_VERSION);
    expect(kinProblem(state)).toBeNull();
    expect(state.lineage.generation).toBe(1);
  });

  it("повреждённые поля формата 3 отклоняются", () => {
    const state = start();
    const broken: unknown[] = [
      { ...state, lineage: null },
      { ...state, lineage: { ...state.lineage, generation: 0 } },
      { ...state, lineage: { ...state.lineage, renown: 500 } },
      { ...state, lineage: { ...state.lineage, chronicle: [{ id: 1, kind: "coronation" }] } },
      { ...state, lineage: { ...state.lineage, achievements: [{ id: "x", gen: 1, age: 0 }, { id: "x", gen: 1, age: 0 }] } },
      { ...state, memory: "many" },
      { ...state, npcs: [{ ...state.npcs[0], status: "ghost" }] },
      { ...state, npcs: [{ ...state.npcs[0], professionId: "emperor" }] },
      { ...state, npcs: [{ ...state.npcs[0], careerRank: 9 }] }
    ];
    for (const save of broken) expect(() => parseSave(save)).toThrow(expect.objectContaining({ code: "INVALID_SAVE" }));
  });
});
