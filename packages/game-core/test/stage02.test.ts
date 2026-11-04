// Stage 02: персонажи с биографией, различия миров, таланты, NPC и отношения, цепочки, отложенные последствия, совместимость
import { describe, expect, it } from "vitest";
import {
  allTalents,
  applyAction,
  checkChance,
  COMMON_EVENTS,
  deepClone,
  eventIndex,
  generateCharacter,
  getUniverse,
  isEligible,
  listUniverses,
  newGame,
  parseSave,
  presentEvent,
  presentProfile,
  Rng,
  SAVE_SCHEMA_VERSION,
  STAT_KEYS,
  UNIVERSE_IDS,
  type Condition,
  type Effect,
  type GameState
} from "../src/index.js";
import { SAVES_V1 } from "./fixtures/saves-v1.js";
import { choiceIds, playLife, start } from "./helpers.js";

const FIXTURES = SAVES_V1;

function withPending(state: GameState, eventId: string): GameState {
  return { ...deepClone(state), pending: { eventId, age: state.life.age } };
}

function at(state: GameState, age: number): GameState {
  const copy = deepClone(state);
  copy.life = { ...copy.life, age, stage: age < 13 ? "child" : age < 18 ? "teen" : "adult" };
  return copy;
}

function strong(state: GameState): GameState {
  const copy = deepClone(state);
  copy.character.stats = Object.fromEntries(STAT_KEYS.map((k) => [k, 100])) as typeof copy.character.stats;
  return copy;
}

/** Повторяет выбор с разным состоянием генератора, пока проверка не пройдёт */
function chooseUntilSuccess(state: GameState, choiceId: string): GameState {
  for (let i = 1; i < 60; i++) {
    const result = applyAction({ ...state, rngState: i * 7919 }, { type: "choose", choiceId });
    const entry = result.entries.find((e) => e.kind === "event");
    if (!entry?.check || entry.check.success) return result.state;
  }
  throw new Error("проверка не прошла ни разу");
}

describe("Character Engine: рождение", () => {
  it.each(UNIVERSE_IDS)("%s: биография, место, знамение, семья, сословие", (universeId) => {
    for (let i = 0; i < 25; i++) {
      const { state, entries } = newGame({ seed: `birth-${universeId}-${i}`, universeId });
      const universe = getUniverse(universeId);
      expect(state.schemaVersion).toBe(SAVE_SCHEMA_VERSION);
      expect(state.background.biography.length).toBeGreaterThanOrEqual(2);
      expect(state.background.birthplace.ru.length).toBeGreaterThan(0);
      expect(state.background.omen.en.length).toBeGreaterThan(0);
      expect(universe.socialClasses.map((c) => c.id)).toContain(state.character.socialClassId);
      expect(state.character.socialClassId).toBe(universe.originProfiles[state.character.originId]!.socialClassId);
      expect(state.hidden.potential).toBeGreaterThanOrEqual(1);
      expect(state.hidden.potential).toBeLessThanOrEqual(10);
      expect(state.character.talents.length + state.hidden.dormantTalents.length).toBeGreaterThanOrEqual(1);
      for (const id of [...state.character.talents, ...state.hidden.dormantTalents]) expect(allTalents(universe).map((t) => t.id)).toContain(id);
      expect(entries[0]?.kind).toBe("birth");
      expect(entries[0]?.outcome?.ru.length).toBeGreaterThan(20);
      expect(Object.keys(state.meters).sort()).toEqual(universe.meters.map((m) => m.id).sort());
      // Новый персонаж проходит строгую проверку сохранения
      expect(parseSave(JSON.parse(JSON.stringify(state)))).toEqual(state);
    }
  });

  it("семья зависит от происхождения: сироты, подкидыши, одна мать, незаконнорождённые", () => {
    const parents = (state: GameState) => state.npcs.filter((n) => n.role === "father" || n.role === "mother");
    const foundling = newGame({ seed: "f", universeId: "murim", originId: "sect-disciple" }).state;
    expect(parents(foundling)).toHaveLength(0);
    const orphan = newGame({ seed: "o", universeId: "hunter", originId: "gate-orphan" }).state;
    expect(parents(orphan).length).toBe(2);
    expect(parents(orphan).every((n) => !n.alive)).toBe(true);
    const single = newGame({ seed: "s", universeId: "murim", originId: "street-rat" }).state;
    expect(parents(single).map((n) => n.role)).toEqual(["mother"]);
    const bastard = newGame({ seed: "b", universeId: "academy", originId: "bastard" }).state;
    expect(bastard.npcs.find((n) => n.role === "father")!.affinity).toBeLessThan(0);
    const full = newGame({ seed: "full", universeId: "academy", originId: "duke-heir" }).state;
    expect(parents(full).map((n) => n.role).sort()).toEqual(["father", "mother"]);
    expect(parents(full).every((n) => n.alive && n.bornAt < -15)).toBe(true);
  });

  it("родители и братья носят фамилию семьи", () => {
    const state = newGame({ seed: "surname", universeId: "academy", originId: "duke-heir" }).state;
    const family = state.background.familyName;
    expect(family.length).toBeGreaterThan(0);
    for (const npc of state.npcs.filter((n) => ["mother", "sibling", "grandparent"].includes(n.role))) expect(npc.name.endsWith(family)).toBe(true);
  });

  it("один seed — одна и та же семья и биография; характеристики Stage 01 не сдвинулись", () => {
    const a = newGame({ seed: "same-birth", universeId: "xianxia" });
    const b = newGame({ seed: "same-birth", universeId: "xianxia" });
    expect(a).toEqual(b);
    // Броски рождения идут из своего потока: пол, раса, происхождение, имя и характеристики — те же, что в Stage 01
    for (const universeId of UNIVERSE_IDS) {
      const seed = `stable-${universeId}`;
      const stage01 = generateCharacter({ universeId }, Rng.fromSeed(seed, "life")).character;
      const stage02 = newGame({ seed, universeId }).state.character;
      for (const key of ["name", "gender", "raceId", "originId", "temperamentId", "stats", "wealth"] as const) expect(stage02[key], `${universeId}.${key}`).toEqual(stage01[key]);
    }
  });

  it("распределение характеристик: среднее около 7 до модификаторов, разброс ограничен", () => {
    const totals: number[] = [];
    for (let i = 0; i < 400; i++) {
      const { state } = newGame({ seed: `dist-${i}`, universeId: "hunter" });
      totals.push(...STAT_KEYS.map((key) => state.character.stats[key]));
    }
    const mean = totals.reduce((a, b) => a + b, 0) / totals.length;
    expect(mean).toBeGreaterThan(6.5);
    expect(mean).toBeLessThan(9.5);
    expect(Math.min(...totals)).toBeGreaterThanOrEqual(1);
    expect(Math.max(...totals)).toBeLessThanOrEqual(30);
    // Средние значения встречаются чаще крайних (сумма двух костей)
    const count = (v: number) => totals.filter((x) => x === v).length;
    expect(count(7) + count(8)).toBeGreaterThan(count(4) + count(11));
  });

  it("потенциал и судьба чаще средние", () => {
    const values = Array.from({ length: 400 }, (_, i) => newGame({ seed: `pot-${i}`, universeId: "isekai" }).state.hidden.potential);
    const mid = values.filter((v) => v >= 4 && v <= 7).length;
    const edge = values.filter((v) => v <= 2 || v >= 9).length;
    expect(mid).toBeGreaterThan(edge * 2);
  });
});

describe("World Engine: шесть разных миров", () => {
  it("у каждого мира свои механики, шкалы, сословия, таланты, ремёсла и образование", () => {
    const universes = listUniverses();
    const meterSets = universes.map((u) => u.meters.map((m) => m.id).join(","));
    expect(new Set(meterSets).size).toBe(6);
    for (const u of universes) {
      expect(u.mechanics.length, u.id).toBeGreaterThanOrEqual(2);
      expect(u.socialClasses.length, u.id).toBeGreaterThanOrEqual(4);
      expect(u.meters.length, u.id).toBeGreaterThanOrEqual(1);
      expect(u.factions.length, u.id).toBeGreaterThanOrEqual(3);
      expect(u.skills.length, u.id).toBeGreaterThanOrEqual(3);
      expect(u.talents.length, u.id).toBeGreaterThanOrEqual(3);
      expect(u.weaknesses.length, u.id).toBeGreaterThanOrEqual(2);
      expect(u.professions.length, u.id).toBeGreaterThanOrEqual(3);
      expect(u.education.map((e) => e.tier).sort(), u.id).toEqual([1, 2, 3]);
      expect(u.specializations.length, u.id).toBeGreaterThanOrEqual(3);
      expect(u.familySecrets.length, u.id).toBeGreaterThanOrEqual(3);
      expect(u.consequences.length, u.id).toBeGreaterThanOrEqual(4);
      for (const origin of u.origins) expect(u.originProfiles[origin.id], `${u.id}/${origin.id}`).toBeDefined();
    }
    // Ни один мир не повторяет навыки и таланты другого
    const own = universes.flatMap((u) => [...u.skills, ...u.talents].map((x) => x.id));
    expect(new Set(own).size).toBe(own.length);
  });

  it("задания Системы есть только в Арденвейле", () => {
    for (const u of listUniverses()) expect((u.quests?.length ?? 0) > 0, u.id).toBe(u.id === "isekai");
  });

  it("Пепельные Королевства: клятва Мгле копит скверну", () => {
    const base = at(start({ seed: "mist", universeId: "dark-fantasy" }), 20);
    base.flags.push("oath-sworn", "mist-oath");
    let state = base;
    for (let i = 0; i < 5 && state.life.alive; i++) state = state.pending ? applyAction(state, { type: "choose", choiceId: choiceIds(state)[0]! }).state : applyAction(state, { type: "advance" }).state;
    expect(state.meters.corruption).toBeGreaterThan(base.meters.corruption ?? 0);
  });

  it("Девять Рек: тёмный путь искажает ци, праведная школа очищает", () => {
    const dark = at(start({ seed: "dev", universeId: "murim", originId: "street-rat" }), 20);
    dark.flags.push("martial-school", "demonic-path");
    const next = applyAction(dark, { type: "advance" }).state;
    expect(next.meters["qi-deviation"]).toBeGreaterThan(0);
    const righteous = at(start({ seed: "dev", universeId: "murim", originId: "street-rat" }), 20);
    righteous.flags.push("martial-school");
    righteous.meters["qi-deviation"] = 30;
    expect(applyAction(righteous, { type: "advance" }).state.meters["qi-deviation"]).toBeLessThan(30);
  });

  it("Нео-Сеул: угроза Врат растёт и прорывается событием района", () => {
    const state = at(start({ seed: "gate", universeId: "hunter" }), 20);
    state.meters["gate-threat"] = 95;
    const next = applyAction(state, { type: "advance" }).state;
    expect(next.pending?.eventId).toBe("hu.district-break");
    const after = applyAction(next, { type: "choose", choiceId: "flee" }).state;
    expect(after.meters["gate-threat"]).toBeLessThan(next.meters["gate-threat"]!);
  });

  it("Империя Лиреваль: знатность и обаяние растят милость двора", () => {
    const base = at(start({ seed: "court", universeId: "academy", originId: "duke-heir" }), 20);
    base.character.stats.charisma = 30;
    let state = base;
    for (let i = 0; i < 8 && state.life.alive; i++) state = state.pending ? applyAction(state, { type: "choose", choiceId: choiceIds(state)[0]! }).state : applyAction(state, { type: "advance" }).state;
    expect(state.meters["court-favor"]).toBeGreaterThan(base.meters["court-favor"]!);
  });

  it("Небесный Предел: кармический долг растёт у злых культиваторов", () => {
    const state = at(start({ seed: "debt", universeId: "xianxia", originId: "cultivator-clan" }), 20);
    state.character.karma = -60;
    expect(applyAction(state, { type: "advance" }).state.meters["karmic-debt"]).toBeGreaterThan(0);
  });

  it("Арденвейл: Система выдаёт задание и проверяет его", () => {
    let state = at(start({ seed: "quest", universeId: "isekai" }), 12);
    for (let i = 0; i < 30 && !state.quest && state.life.alive; i++) {
      state = state.pending ? applyAction(state, { type: "choose", choiceId: choiceIds(state)[0]! }).state : applyAction(state, { type: "advance" }).state;
    }
    expect(state.quest).not.toBeNull();
    const quest = getUniverse("isekai").quests!.find((q) => q.id === state.quest!.id)!;
    expect(quest.years).toBeGreaterThan(0);
    expect(presentProfile(state).quest?.deadline).toBe(state.quest!.since + quest.years);
  });
});

describe("RPG Engine: навыки, таланты, образование", () => {
  it("навык повышает шанс проверки", () => {
    const state = start({ seed: "skill", universeId: "murim" });
    const plain = checkChance(state.character, { stats: ["agility"], difficulty: 12, skill: "martial-arts" }, state);
    const trained = deepClone(state);
    trained.character.skills["martial-arts"] = 80;
    expect(checkChance(trained.character, { stats: ["agility"], difficulty: 12, skill: "martial-arts" }, trained)).toBeGreaterThan(plain);
  });

  it("талант повышает, а слабость понижает шанс проверки по своей характеристике", () => {
    const state = start({ seed: "talent-check", universeId: "isekai" });
    const blank = deepClone(state);
    blank.character.talents = [];
    blank.character.weaknesses = [];
    const check = { stats: ["intelligence" as const], difficulty: 12 };
    const base = checkChance(blank.character, check, blank);
    const gifted = deepClone(blank);
    gifted.character.talents = ["quick-learner"];
    const weak = deepClone(blank);
    weak.character.weaknesses = ["reckless"];
    expect(checkChance(gifted.character, check, gifted)).toBeGreaterThan(base);
    expect(checkChance(weak.character, { stats: ["wisdom"], difficulty: 12 }, weak)).toBeLessThan(checkChance(blank.character, { stats: ["wisdom"], difficulty: 12 }, blank));
  });

  it("таланты растят свои навыки год за годом", () => {
    const base = at(start({ seed: "grow-skill", universeId: "academy" }), 10);
    base.character.talents = ["courtly-grace"];
    base.character.skills = {};
    let state = base;
    for (let i = 0; i < 12 && state.life.alive; i++) state = state.pending ? applyAction(state, { type: "choose", choiceId: choiceIds(state)[0]! }).state : applyAction(state, { type: "advance" }).state;
    expect(state.character.skills.etiquette ?? 0).toBeGreaterThan(0);
  });

  it("спящий талант проявляется событием", () => {
    const base = at(start({ seed: "awaken", universeId: "hunter" }), 15);
    base.character.talents = [];
    base.hidden.dormantTalents = ["gate-born"];
    const state = applyAction(withPending(base, "common.talent-awakens"), { type: "choose", choiceId: "embrace" }).state;
    expect(state.character.talents).toContain("gate-born");
    expect(state.hidden.dormantTalents).toEqual([]);
  });

  it("образование засчитывается только по возрастанию ступени и даёт навыки", () => {
    const base = at(start({ seed: "edu", universeId: "dark-fantasy" }), 8);
    const state = applyAction(withPending(base, "df.chapel-school"), { type: "choose", choiceId: "learn" }).state;
    expect(state.character.educationId).toBe("df-letters");
    expect(state.character.skills.lore ?? 0).toBeGreaterThanOrEqual(10);
    expect(state.npcs.some((n) => n.role === "teacher")).toBe(true);
  });

  it("ремесло из события «Дело всей жизни» становится профессией с доходом", () => {
    const base = at(start({ seed: "job", universeId: "xianxia" }), 18);
    const state = applyAction(withPending(base, "common.calling"), { type: "choose", choiceId: "merchant" }).state;
    expect(state.character.professionId).toBe("merchant");
    const next = applyAction(state, { type: "advance" });
    expect(next.state.character.wealth).toBeGreaterThan(state.character.wealth);
  });
});

describe("NPC и отношения", () => {
  it("у NPC есть имя, возраст, черта, занятие и история", () => {
    const state = newGame({ seed: "npc", universeId: "murim", originId: "clan-heir" }).state;
    expect(state.npcs.length).toBeGreaterThanOrEqual(2);
    for (const npc of state.npcs) {
      expect(npc.name.length).toBeGreaterThan(1);
      expect(npc.bio.ru.length).toBeGreaterThan(10);
      expect(npc.occupation.en.length).toBeGreaterThan(0);
      expect(npc.affinity).toBeGreaterThanOrEqual(-100);
      expect(npc.affinity).toBeLessThanOrEqual(100);
    }
    expect(new Set(state.npcs.map((n) => n.id)).size).toBe(state.npcs.length);
  });

  it("событие знакомит с новым человеком", () => {
    const base = at(start({ seed: "friend", universeId: "isekai" }), 6);
    const before = base.npcs.filter((n) => n.role === "friend").length;
    const state = applyAction(withPending(base, "common.first-friend"), { type: "choose", choiceId: "befriend" }).state;
    expect(state.npcs.filter((n) => n.role === "friend").length).toBe(before + 1);
  });

  it("возлюбленный становится супругом в цепочке любви, затем рождается ребёнок", () => {
    let state = strong(at(start({ seed: "love", universeId: "academy" }), 18));
    state = chooseUntilSuccess(withPending(state, "common.first-love"), "approach");
    expect(state.npcs.some((n) => n.role === "partner")).toBe(true);
    state = applyAction(withPending(state, "common.love-test"), { type: "choose", choiceId: "go" }).state;
    expect(state.npcs.some((n) => n.role === "spouse" && n.alive)).toBe(true);
    expect(state.npcs.some((n) => n.role === "partner")).toBe(false);
    state = applyAction(withPending(at(state, 25), "common.heir"), { type: "choose", choiceId: "home" }).state;
    const child = state.npcs.find((n) => n.role === "child");
    expect(child).toBeDefined();
    expect(child!.bornAt).toBe(25);
  });

  it("личное общение меняет отношение и доступно раз в год", () => {
    const base = at(start({ seed: "talk", universeId: "hunter", originId: "hunter-family" }), 15);
    const mother = base.npcs.find((n) => n.role === "mother" && n.alive)!;
    let state = base;
    let changed = false;
    for (let i = 1; i < 20 && !changed; i++) {
      const result = applyAction({ ...base, rngState: i * 104729 }, { type: "interact", npcId: mother.id, interaction: "talk" });
      const after = result.state.npcs.find((n) => n.id === mother.id)!;
      if (after.affinity !== mother.affinity) {
        changed = true;
        state = result.state;
        expect(result.entries[0]?.kind).toBe("people");
        expect(result.entries[0]?.check).toBeDefined();
      }
    }
    expect(changed).toBe(true);
    expect(state.life.age).toBe(base.life.age);
    expect(() => applyAction(state, { type: "interact", npcId: mother.id, interaction: "talk" })).toThrow(expect.objectContaining({ code: "CHOICE_LOCKED" }));
    // Через год — снова можно
    const year = applyAction(state, { type: "advance" }).state;
    if (!year.pending && year.life.alive && year.npcs.find((n) => n.id === mother.id)!.alive) {
      expect(() => applyAction(year, { type: "interact", npcId: mother.id, interaction: "talk" })).not.toThrow();
    }
  });

  it("с умершими и несуществующими NPC общаться нельзя, во время события — тоже", () => {
    const state = at(start({ seed: "dead", universeId: "hunter", originId: "gate-orphan" }), 15);
    const parent = state.npcs.find((n) => !n.alive)!;
    expect(() => applyAction(state, { type: "interact", npcId: parent.id, interaction: "talk" })).toThrow(expect.objectContaining({ code: "CHOICE_LOCKED" }));
    expect(() => applyAction(state, { type: "interact", npcId: "n999", interaction: "talk" })).toThrow(expect.objectContaining({ code: "INVALID_INPUT" }));
    const living = state.npcs.find((n) => n.alive);
    if (living) expect(() => applyAction(withPending(state, "common.fever"), { type: "interact", npcId: living.id, interaction: "talk" })).toThrow(expect.objectContaining({ code: "EVENT_PENDING" }));
  });

  it("отказ другу превращает его в соперника", () => {
    let state = at(start({ seed: "betray", universeId: "murim" }), 15);
    state = applyAction(withPending(state, "common.first-friend"), { type: "choose", choiceId: "befriend" }).state;
    const friends = state.npcs.filter((n) => n.role === "friend").length;
    state = applyAction(withPending(at(state, 18), "common.friend-needs-help"), { type: "choose", choiceId: "refuse" }).state;
    expect(state.npcs.filter((n) => n.role === "friend").length).toBe(friends - 1);
    expect(state.npcs.some((n) => n.role === "rival")).toBe(true);
  });

  it("NPC стареют и умирают; родители не живут вечно", () => {
    const { state } = playLife(start({ seed: "aging-npc", universeId: "murim", originId: "clan-heir" }), 3000);
    const parents = state.npcs.filter((n) => n.role === "father" || n.role === "mother");
    expect(parents.length).toBeGreaterThan(0);
    if (state.life.age > 60) expect(parents.every((n) => !n.alive)).toBe(true);
  });

  it("сильный соперник повышает сложность поединка", () => {
    const state = at(start({ seed: "versus", universeId: "dark-fantasy" }), 20);
    state.npcs.push({ ...deepClone(state.npcs[0]!), id: "n900", role: "rival", alive: true, power: 20 });
    const weak = checkChance(state.character, { stats: ["strength"], difficulty: 11, versus: "rival" }, state);
    state.npcs.find((n) => n.id === "n900")!.power = 95;
    const tough = checkChance(state.character, { stats: ["strength"], difficulty: 11, versus: "rival" }, state);
    expect(tough).toBeLessThan(weak);
  });
});

describe("Narrative Engine: цепочки, последствия, повторы", () => {
  it("решение назначает отложенное последствие, которое наступает через годы", () => {
    let state = at(start({ seed: "later", universeId: "murim" }), 20);
    state = strong(state);
    state = chooseUntilSuccess(withPending(state, "mu.bandits"), "save");
    const due = state.consequences.find((c) => c.id === "mu.c-saved-merchant");
    expect(due).toBeDefined();
    expect(due!.age).toBe(24);
    expect(due!.source).toBe("mu.bandits");
    let entries: { kind: string; title: { ru: string } }[] = [];
    for (let i = 0; i < 8 && state.life.alive && state.consequences.some((c) => c.id === "mu.c-saved-merchant"); i++) {
      const result = state.pending ? applyAction(state, { type: "choose", choiceId: choiceIds(state)[0]! }) : applyAction(state, { type: "advance" });
      entries = [...entries, ...result.entries];
      state = result.state;
    }
    expect(entries.some((e) => e.kind === "consequence" && e.title.ru.includes("Долг"))).toBe(true);
    expect(state.npcs.some((n) => n.role === "friend")).toBe(true);
  });

  it("последствие не наступает раньше срока и отменяется, если условия не выполнены", () => {
    let state = at(start({ seed: "cond", universeId: "dark-fantasy" }), 20);
    state.consequences.push({ id: "df.c-oath-price", age: 21, source: "test" });
    const next = applyAction(state, { type: "advance" });
    // Клятвы Мгле нет — последствие тихо отменилось
    expect(next.state.consequences).toEqual([]);
    expect(next.entries.some((e) => e.kind === "consequence")).toBe(false);
    state = at(start({ seed: "cond2", universeId: "dark-fantasy" }), 20);
    state.consequences.push({ id: "df.c-mill-years", age: 30, source: "test" });
    expect(applyAction(state, { type: "advance" }).state.consequences).toHaveLength(1);
  });

  it("одно последствие не назначается дважды, а их число ограничено", () => {
    let state = at(start({ seed: "dup", universeId: "murim" }), 20);
    state = strong(state);
    state = chooseUntilSuccess(withPending(state, "mu.bandits"), "save");
    state = chooseUntilSuccess(withPending(state, "mu.bandits"), "save");
    expect(state.consequences.filter((c) => c.id === "mu.c-saved-merchant")).toHaveLength(1);
  });

  it("цепочка мира: клятва Мгле → цена клятвы через шесть лет", () => {
    let state = at(start({ seed: "oath-chain", universeId: "dark-fantasy" }), 18);
    state = strong(state);
    state = chooseUntilSuccess(withPending(state, "df.oath"), "mist");
    expect(state.flags).toContain("mist-oath");
    expect(state.consequences.some((c) => c.id === "df.c-oath-price" && c.age === 24)).toBe(true);
  });

  it("события не повторяются подряд: недавние исключены, cooldown по умолчанию", () => {
    const base = at(start({ seed: "repeat", universeId: "isekai" }), 30);
    const event = eventIndex(getUniverse("isekai")).get("common.reunion")!;
    expect(isEligible(base, event) || base.npcs.some((n) => n.role === "friend" && n.alive)).toBe(true);
    // Событие без cooldown и maxOccurrences: не чаще раза в DEFAULT_COOLDOWN лет
    const noLimit = eventIndex(getUniverse("hunter")).get("hu.dungeon")!;
    expect(noLimit.cooldown).toBeDefined();
    const state = deepClone(base);
    state.lastSeen["common.trade-offer"] = 29;
    expect(isEligible(state, eventIndex(getUniverse("isekai")).get("common.trade-offer")!)).toBe(false);
  });

  it("за длинную жизнь ни одно событие не идёт дважды подряд и ни одно не занимает больше 20% событий", () => {
    for (const universeId of UNIVERSE_IDS) {
      const { entries } = playLife(start({ seed: `variety-${universeId}`, universeId }), 4000, (n, step) => step % n);
      const events = entries.filter((e) => e.kind === "event").map((e) => e.eventId!);
      expect(events.length, universeId).toBeGreaterThan(5);
      for (let i = 1; i < events.length; i++) expect(events[i], `${universeId}: ${events[i]}`).not.toBe(events[i - 1]);
      const counts = new Map<string, number>();
      for (const id of events) counts.set(id, (counts.get(id) ?? 0) + 1);
      const top = Math.max(...counts.values());
      expect(top / events.length, universeId).toBeLessThanOrEqual(0.2);
    }
  });

  it("все ссылки Stage 02 указывают на существующее: последствия, навыки, таланты, шкалы, образование", () => {
    for (const universe of listUniverses()) {
      const index = eventIndex(universe);
      const consequenceIds = new Set(universe.consequences.map((c) => c.id));
      const skillIds = new Set([...universe.skills, ...COMMON_SKILLS_IDS].map((s) => (typeof s === "string" ? s : s.id)));
      const talentIds = new Set(allTalents(universe).map((t) => t.id));
      const meterIds = new Set(universe.meters.map((m) => m.id));
      const factionIds = new Set(universe.factions.map((f) => f.id));
      const classIds = new Set(universe.socialClasses.map((c) => c.id));
      const educationIds = new Set(universe.education.map((e) => e.id));
      const specIds = new Set(universe.specializations.map((s) => s.id));
      const allEffects: Effect[] = [
        ...[...index.values()].flatMap((e) => e.choices.flatMap((c) => [...c.success.effects, ...(c.failure?.effects ?? [])])),
        ...universe.consequences.flatMap((c) => c.effects),
        ...universe.familySecrets.flatMap((s) => s.effects),
        ...(universe.quests ?? []).flatMap((q) => [...q.reward, ...q.penalty])
      ];
      const universeEvents = new Set(universe.events.map((e) => e.id));
      const commonOnly = (effect: Effect) => [...index.values()].some((e) => !universeEvents.has(e.id) && e.choices.some((c) => [...c.success.effects, ...(c.failure?.effects ?? [])].includes(effect)));
      for (const effect of allEffects) {
        if (effect.type === "later") expect(consequenceIds, `${universe.id}: ${effect.id}`).toContain(effect.id);
        if (effect.type === "meter") expect(meterIds, `${universe.id}: ${effect.id}`).toContain(effect.id);
        if (effect.type === "faction") expect(factionIds, `${universe.id}: ${effect.id}`).toContain(effect.id);
        if (effect.type === "socialClass") expect(classIds, `${universe.id}: ${effect.id}`).toContain(effect.id);
        if (effect.type === "education") expect(educationIds, `${universe.id}: ${effect.id}`).toContain(effect.id);
        if (effect.type === "specialization") expect(specIds, `${universe.id}: ${effect.id}`).toContain(effect.id);
        if (effect.type === "talent") expect(talentIds, `${universe.id}: ${effect.id}`).toContain(effect.id);
        if (effect.type === "skill" && !commonOnly(effect)) expect(skillIds, `${universe.id}: ${effect.id}`).toContain(effect.id);
        if (effect.type === "ability" && !commonOnly(effect)) expect(universe.abilities.map((a) => a.id), `${universe.id}: ${effect.id}`).toContain(effect.id);
      }
      const conditions: Condition[] = [...index.values()].flatMap((e) => [...(e.conditions ?? []), ...e.choices.flatMap((c) => c.requires ?? [])]);
      for (const condition of conditions) {
        if (condition.type === "meter") expect(meterIds, `${universe.id}: ${condition.id}`).toContain(condition.id);
        if (condition.type === "socialClass") for (const id of condition.ids) expect(classIds, `${universe.id}: ${id}`).toContain(id);
      }
      for (const event of universe.events) for (const choice of event.choices) for (const fx of [...choice.success.effects, ...(choice.failure?.effects ?? [])]) if (fx.type === "skill") expect(skillIds, `${universe.id}/${event.id}: ${fx.id}`).toContain(fx.id);
    }
  });

  it("у всех текстов Stage 02 есть русский и английский вариант", () => {
    for (const u of listUniverses()) {
      const texts = [
        ...u.mechanics.flatMap((m) => [m.name, m.description]),
        ...u.socialClasses.flatMap((c) => [c.name, c.description, ...c.occupations]),
        ...u.meters.flatMap((m) => [m.name, m.description]),
        ...[...u.skills, ...u.talents, ...u.weaknesses, ...u.professions, ...u.education, ...u.specializations, ...u.factions].flatMap((x) => [x.name, x.description]),
        ...u.familySecrets.flatMap((s) => [s.name, s.hint, s.reveal]),
        ...u.birthplaces,
        ...u.omens.map((o) => o.text),
        ...Object.values(u.originProfiles).map((p) => p.history),
        ...u.consequences.flatMap((c) => [c.title, c.text]),
        ...(u.quests ?? []).flatMap((q) => [q.title, q.text])
      ];
      for (const text of texts) {
        expect(text.ru.trim().length, u.id).toBeGreaterThan(0);
        expect(text.en.trim().length, u.id).toBeGreaterThan(0);
      }
    }
    for (const event of COMMON_EVENTS) expect(event.title.en.length).toBeGreaterThan(0);
  });
});

describe("Совместимость сохранений Stage 01", () => {
  it.each(Object.keys(FIXTURES))("%s: формат 1 переводится в формат 2 и жизнь продолжается", (key) => {
    const v1 = FIXTURES[key] as { schemaVersion: number; character: Record<string, unknown>; life: { age: number }; flags: string[]; rngState: number; nextSeq: number; version: number };
    expect(v1.schemaVersion).toBe(1);
    const state = parseSave(deepClone(v1));
    expect(state.schemaVersion).toBe(SAVE_SCHEMA_VERSION);
    // Ничего из Stage 01 не потеряно
    for (const field of ["name", "gender", "raceId", "originId", "temperamentId", "stats", "level", "xp", "wealth", "karma", "reputation", "abilities", "track"]) {
      expect((state.character as unknown as Record<string, unknown>)[field], field).toEqual(v1.character[field]);
    }
    expect(state.life.age).toBe(v1.life.age);
    expect(state.flags).toEqual(v1.flags);
    expect(state.rngState).toBe(v1.rngState);
    expect(state.nextSeq).toBe(v1.nextSeq);
    expect(state.version).toBe(v1.version);
    // Появилось новое
    expect(state.background.biography.length).toBeGreaterThan(0);
    expect(getUniverse(state.character.universeId).socialClasses.map((c) => c.id)).toContain(state.character.socialClassId);
    for (const npc of state.npcs) expect(npc.metAt).toBeLessThanOrEqual(state.life.age);
    if (v1.flags.includes("married")) expect(state.npcs.some((n) => n.role === "spouse")).toBe(true);
    if (v1.flags.includes("childhood-friend")) expect(state.npcs.some((n) => n.role === "friend")).toBe(true);
    if (v1.flags.includes("job-guard")) expect(state.character.professionId).toBe("guard");
    // Перевод воспроизводим и переживает JSON
    expect(parseSave(deepClone(v1))).toEqual(state);
    expect(parseSave(JSON.parse(JSON.stringify(state)))).toEqual(state);
    // Жизнь продолжается: ожидающее событие отвечается, время идёт
    let current = state;
    for (let i = 0; i < 20 && current.life.alive; i++) {
      current = current.pending ? applyAction(current, { type: "choose", choiceId: choiceIds(current)[0]! }).state : applyAction(current, { type: "advance" }).state;
    }
    expect(current.version).toBeGreaterThan(state.version);
  });

  it("ожидающее событие Stage 01 после перевода по-прежнему показывается с теми же вариантами", () => {
    const v1 = FIXTURES["dark-fantasy-adult"] as { pending: { eventId: string } | null };
    expect(v1.pending).not.toBeNull();
    const view = presentEvent(parseSave(deepClone(v1)));
    expect(view?.eventId).toBe(v1.pending!.eventId);
    expect(view!.choices.some((c) => c.available)).toBe(true);
  });

  it("сохранение новее игры и повреждённые поля Stage 02 отклоняются", () => {
    const state = start();
    const broken: unknown[] = [
      { ...state, schemaVersion: SAVE_SCHEMA_VERSION + 1 },
      { ...state, npcs: [{ ...state.npcs[0], affinity: 500 }] },
      { ...state, npcs: [{ ...state.npcs[0], role: "emperor" }] },
      { ...state, hidden: { ...state.hidden, potential: 99 } },
      { ...state, character: { ...state.character, socialClassId: "god-king" } },
      { ...state, character: { ...state.character, skills: { melee: 1000 } } },
      { ...state, consequences: [{ id: 5 }] },
      { ...state, background: null }
    ];
    for (const save of broken) expect(() => parseSave(save)).toThrow(expect.objectContaining({ code: "INVALID_SAVE" }));
  });

  it("представление жизни не выдаёт скрытое до раскрытия", () => {
    const state = start({ seed: "secret", universeId: "academy" });
    const profile = presentProfile(state);
    expect(profile.potential).toBeNull();
    expect(profile.destiny).toBeNull();
    expect(profile.secret).toBeNull();
    expect(JSON.stringify(profile)).not.toContain(state.hidden.dormantTalents[0] ?? "@@none@@");
    const revealed = deepClone(state);
    revealed.hidden.revealed.push("potential");
    expect(presentProfile(revealed).potential).toBe(state.hidden.potential);
  });
});

const COMMON_SKILLS_IDS = ["melee", "athletics", "lore", "persuasion", "survival", "craft", "medicine", "stealth", "trade"];
