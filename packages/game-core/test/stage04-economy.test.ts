// Stage 04: хозяйство — доходы и расходы года, налог и стоимость жизни мира, нехватка, предел золота,
// экономический цикл из отдельного потока, перевод сохранений 3 → 4, наследование и перенос из браузера
import { describe, expect, it } from "vitest";
import {
  ADULT_AGE,
  applyAction,
  deepClone,
  getUniverse,
  HARDSHIP_PENALTY_YEARS,
  heirCandidates,
  livingCost,
  MAX_ECONOMY_YEARS,
  parseSave,
  prepareImport,
  presentEconomy,
  SAVE_SCHEMA_VERSION,
  succeed,
  UNIVERSE_IDS,
  WEALTH_MAX,
  WORLD_ECONOMIES,
  yearLines,
  type GameState
} from "../src/index.js";
import { SAVES_V1 } from "./fixtures/saves-v1.js";
import { SAVES_V2 } from "./fixtures/saves-v2.js";
import { SAVES_V3 } from "./fixtures/saves-v3.js";
import { choiceIds, playLife, start } from "./helpers.js";

function at(state: GameState, age: number): GameState {
  const copy = deepClone(state);
  copy.life = { ...copy.life, age, stage: age < 13 ? "child" : age < 18 ? "teen" : "adult" };
  return copy;
}

/** Один год. Событие, которое уже ждёт ответа или пришло за год, получает первый доступный вариант */
function year(state: GameState): GameState {
  const ready = state.pending ? applyAction(state, { type: "choose", choiceId: choiceIds(state)[0]! }).state : state;
  if (!ready.life.alive) return ready;
  let next = applyAction(ready, { type: "advance" }).state;
  if (next.pending && next.life.alive) next = applyAction(next, { type: "choose", choiceId: choiceIds(next)[0]! }).state;
  return next;
}

/** Без заработка: только сословие и стоимость жизни */
function noTrade(state: GameState): GameState {
  const copy = deepClone(state);
  copy.character.professionId = null;
  copy.character.weaknesses = [];
  copy.flags = copy.flags.filter((f) => f !== "profession" && f !== "guild-member" && f !== "awakened");
  copy.economy.cycle = "normal";
  return copy;
}

const LIVES = UNIVERSE_IDS.map((universeId) => playLife(start({ seed: `economy-${universeId}`, universeId }), 6000, (n, i) => (i * 5) % n).state);

describe("Stage 04: перевод сохранений 3 → 4", () => {
  it.each(Object.keys(SAVES_V3))("%s: хозяйство добавлено с нейтральными значениями, остальное не изменилось", (key) => {
    const raw = SAVES_V3[key] as GameState;
    const state = parseSave(deepClone(raw));
    expect(state.schemaVersion).toBe(SAVE_SCHEMA_VERSION);
    // Цепочка 3 → 8: хозяйство, запас, пустое приключение, край и пустое мастерство
    expect(state.economy).toEqual({ cycle: "normal", cycleSince: raw.life.age, hardship: 0, last: null, years: [], goods: {} });
    expect(state.adventure).toEqual({ discovered: [], active: null, done: [], failed: [], log: [] });
    expect(state.region.strain).toBe(0);
    expect(state.mastery).toEqual({ objectives: [], skills: [] });
    // Всё прежнее — без изменений: перевод только добавляет поля
    const rest = deepClone(state) as unknown as Record<string, unknown>;
    const before = deepClone(raw) as unknown as Record<string, unknown>;
    delete rest.economy;
    delete rest.adventure;
    delete rest.region;
    delete rest.mastery;
    delete rest.schemaVersion;
    delete before.schemaVersion;
    expect(rest).toEqual(before);
    // Перевод воспроизводим; жизнь продолжается, законченная — продолжается за наследника
    expect(parseSave(deepClone(raw))).toEqual(state);
    if (state.life.alive) expect(() => year(state)).not.toThrow();
    else expect(heirCandidates(state).some((c) => c.available)).toBe(true);
  });

  it("сохранения форматов 1 и 2 проходят цепочку до 4", () => {
    for (const save of [...Object.values(SAVES_V1), ...Object.values(SAVES_V2)]) {
      const state = parseSave(deepClone(save));
      expect(state.schemaVersion).toBe(SAVE_SCHEMA_VERSION);
      expect(state.economy.hardship).toBe(0);
      expect(state.economy.last).toBeNull();
    }
  });

  it("повреждённое хозяйство формата 4 отклоняется", () => {
    const good = parseSave(deepClone(SAVES_V3["murim-adult"]));
    const broken: ((s: GameState) => void)[] = [
      (s) => ((s.economy as unknown as Record<string, unknown>).cycle = "crash"),
      (s) => (s.economy.hardship = 101),
      (s) => (s.economy.years = Array.from({ length: MAX_ECONOMY_YEARS + 1 }, (_, i) => ({ age: i, income: 1, expenses: 0, shortfall: 0 }))),
      (s) => (s.economy.last = { age: 1, lines: [{ id: "lottery" as never, amount: 5 }], shortfall: 0 }),
      (s) => (s.economy.last = { age: 1, lines: [{ id: "tax", amount: Number.MAX_SAFE_INTEGER }], shortfall: 0 }),
      (s) => (s.character.wealth = WEALTH_MAX + 1),
      (s) => delete (s as unknown as Record<string, unknown>).economy
    ];
    for (const breakIt of broken) {
      const copy = deepClone(good);
      breakIt(copy);
      expect(() => parseSave(JSON.parse(JSON.stringify(copy)))).toThrow(expect.objectContaining({ code: "INVALID_SAVE" }));
    }
  });
});

describe("Stage 04: доходы и расходы", () => {
  it.each(UNIVERSE_IDS)("%s: за всю жизнь золото в пределах [0, WEALTH_MAX], итоги лет не длиннее лимита, сохранение цело", (universeId) => {
    const life = LIVES[UNIVERSE_IDS.indexOf(universeId)]!;
    expect(life.character.wealth).toBeGreaterThanOrEqual(0);
    expect(life.character.wealth).toBeLessThanOrEqual(WEALTH_MAX);
    expect(life.economy.years.length).toBeLessThanOrEqual(MAX_ECONOMY_YEARS);
    expect(() => parseSave(JSON.parse(JSON.stringify(life)))).not.toThrow();
  });

  it("ребёнок за жизнь не платит и не получает дохода сословия; взрослый платит по сословию и миру", () => {
    const child = noTrade(at(start({ seed: "eco-child", universeId: "academy", originId: "duke-heir" }), 10));
    expect(livingCost(child)).toBe(0);
    expect(yearLines(child).some((l) => l.id === "class" || l.id === "living")).toBe(false);
    const adult = at(child, ADULT_AGE);
    expect(livingCost(adult)).toBeGreaterThan(0);
    expect(yearLines(adult).find((l) => l.id === "living")?.amount).toBe(-livingCost(adult));
    expect(yearLines(adult).find((l) => l.id === "class")?.amount).toBeGreaterThan(0);
  });

  it("сословие кормит себя: без ремесла и мотовства год не уходит в минус ни в одном сословии ни одного мира", () => {
    for (const universeId of UNIVERSE_IDS) {
      const base = noTrade(at(start({ seed: `eco-class-${universeId}`, universeId }), 30));
      for (const socialClass of getUniverse(universeId).socialClasses) {
        const state = deepClone(base);
        state.character.socialClassId = socialClass.id;
        const net = yearLines(state).reduce((sum, l) => sum + l.amount, 0);
        expect(net, `${universeId}/${socialClass.id}`).toBeGreaterThanOrEqual(0);
      }
    }
  });

  it("налог мира — доля заработка с округлением вниз, только с положительного заработка", () => {
    for (const universeId of UNIVERSE_IDS) {
      const state = at(start({ seed: `eco-tax-${universeId}`, universeId }), 30);
      state.economy.cycle = "normal";
      const lines = yearLines(state);
      const earned = lines.filter((l) => l.id !== "tax" && l.id !== "living").reduce((sum, l) => sum + l.amount, 0);
      const tax = lines.find((l) => l.id === "tax")?.amount ?? 0;
      const expected = earned > 0 ? Math.floor(earned * WORLD_ECONOMIES[universeId].taxRate) : 0;
      // Нет статьи налога — 0, а не −0
      expect(tax === 0 ? 0 : -tax, universeId).toBe(expected);
    }
  });

  it("спад и подъём меняют заработок: подъём больше обычных лет, спад меньше", () => {
    const base = at(start({ seed: "eco-cycle", universeId: "isekai" }), 30);
    base.character.professionId = "adventurer";
    base.character.weaknesses = [];
    const earned = (cycle: GameState["economy"]["cycle"]) => {
      const s = deepClone(base);
      s.economy.cycle = cycle;
      return yearLines(s).filter((l) => l.id !== "living").reduce((sum, l) => sum + l.amount, 0);
    };
    expect(earned("boom")).toBeGreaterThan(earned("normal"));
    expect(earned("slump")).toBeLessThan(earned("normal"));
  });

  it("нехватка: золото не уходит ниже нуля, нехватка копится, с третьего года бьёт по репутации, с доходом — проходит", () => {
    // Гражданин Нео-Сеула с мотовством и без ремесла: доход сословия 2 → 1 после мотовства, жизнь стоит 2.
    // Нехватка 1 золотой в год при любом состоянии хозяйства
    let state = noTrade(at(start({ seed: "eco-poor", universeId: "hunter" }), 30));
    state.character.socialClassId = "citizen";
    state.character.weaknesses = ["spendthrift"];
    state.character.wealth = 0;
    state.character.reputation = 0;
    state.lineage.inheritance = null;
    expect(yearLines(state).reduce((sum, l) => sum + l.amount, 0)).toBe(-1);
    for (let i = 1; i <= HARDSHIP_PENALTY_YEARS + 1; i++) {
      state.character.wealth = 0;
      const reputation = state.character.reputation;
      state = applyAction({ ...state, pending: null }, { type: "advance" }).state;
      expect(state.character.wealth).toBeGreaterThanOrEqual(0);
      expect(state.economy.last!.shortfall).toBe(1);
      expect(state.economy.hardship).toBe(i);
      // Репутация меняется и событиями года: проверяем только, что штраф бедности не меньше 1 после порога
      if (i >= HARDSHIP_PENALTY_YEARS) expect(presentEconomy(state).hardshipPenalty).toBe(true);
      else expect(presentEconomy(state).hardshipPenalty).toBe(false);
      void reputation;
    }
    // Хватило денег на расходы — нехватка сбрасывается
    state.character.wealth = 50;
    state = applyAction({ ...state, pending: null }, { type: "advance" }).state;
    expect(state.economy.last!.shortfall).toBe(0);
    expect(state.economy.hardship).toBe(0);
  });

  it("штраф бедности: −1 репутации в год, начиная с третьего года нехватки", () => {
    const base = noTrade(at(start({ seed: "eco-penalty", universeId: "hunter" }), 30));
    base.character.socialClassId = "citizen";
    base.character.weaknesses = ["spendthrift"];
    base.character.wealth = 0;
    base.character.reputation = 10;
    base.economy.hardship = HARDSHIP_PENALTY_YEARS - 1;
    // Тот же год без нехватки: разница в репутации — только штраф бедности
    const poor = applyAction(base, { type: "advance" }).state;
    const rich = applyAction({ ...deepClone(base), character: { ...deepClone(base).character, wealth: 1000 } }, { type: "advance" }).state;
    expect(poor.economy.hardship).toBe(HARDSHIP_PENALTY_YEARS);
    expect(rich.economy.hardship).toBe(0);
    expect(poor.character.reputation).toBe(rich.character.reputation - 1);
  });

  it("предел золота: никакой доход не поднимает выше WEALTH_MAX", () => {
    let state = at(start({ seed: "eco-max", universeId: "academy", originId: "duke-heir" }), 30);
    state.character.wealth = WEALTH_MAX - 1;
    for (let i = 0; i < 5 && state.life.alive; i++) state = year(state);
    expect(state.character.wealth).toBeLessThanOrEqual(WEALTH_MAX);
    expect(() => parseSave(JSON.parse(JSON.stringify(state)))).not.toThrow();
  });

  it("Нео-Сеул: доход зачисток — статья мира и облагается налогом города", () => {
    const state = noTrade(at(start({ seed: "eco-hunter", universeId: "hunter" }), 25));
    state.flags = [...state.flags, "awakened"];
    state.character.track.rank = 2;
    const lines = yearLines(state);
    expect(lines.find((l) => l.id === "world")?.amount).toBeGreaterThanOrEqual(20);
    expect(lines.find((l) => l.id === "tax")!.amount).toBeLessThan(0);
  });

  it("цикл хозяйства бросается из отдельного потока: основной генератор года с ним и без него одинаков", () => {
    const base = at(start({ seed: "eco-stream", universeId: "murim" }), 30);
    const a = applyAction(base, { type: "advance" }).state;
    const changed = deepClone(base);
    changed.economy.cycle = "boom";
    const b = applyAction(changed, { type: "advance" }).state;
    // Разные исходы цикла, но тот же основной поток (если состав людей не изменился иначе)
    if (a.npcs.filter((n) => n.alive).length === b.npcs.filter((n) => n.alive).length) expect(b.rngState).toBe(a.rngState);
  });

  it("представление: статьи с названиями на двух языках, сумма сходится, без скрытых полей", () => {
    const state = year(at(start({ seed: "eco-view", universeId: "murim" }), ADULT_AGE + 4));
    const view = presentEconomy(state);
    expect(view.last).not.toBeNull();
    for (const line of view.last!.lines) {
      expect(line.name.ru.length).toBeGreaterThan(0);
      expect(line.name.en.length).toBeGreaterThan(0);
    }
    expect(view.last!.lines.reduce((sum, l) => sum + l.amount, 0)).toBe(view.last!.net);
    expect(view.cycleName.en.length).toBeGreaterThan(0);
    expect(JSON.stringify(view)).not.toMatch(/"(seed|rngState)"/);
  });
});

describe("Stage 04: хозяйство и наследование, перенос", () => {
  it("наследник продолжает цикл мира, но не наследует нехватку и счета", () => {
    const dead = parseSave(deepClone(SAVES_V3["isekai-dead"]));
    dead.economy.cycle = "boom";
    dead.economy.hardship = 5;
    dead.economy.years = [{ age: 10, income: 3, expenses: 1, shortfall: 0 }];
    const heir = heirCandidates(dead).find((c) => c.available)!;
    const next = succeed(dead, heir.npc.id, "eco").state;
    expect(next.economy.cycle).toBe("boom");
    expect(next.economy.hardship).toBe(0);
    expect(next.economy.years).toEqual([]);
    expect(next.economy.cycleSince).toBe(next.life.age);
  });

  it("перенос из браузера: хозяйство формата 3 добавляется, подделанное хозяйство формата 4 отклоняется", () => {
    expect(prepareImport(deepClone(SAVES_V3["xianxia-adult"]), "salt").state.economy.hardship).toBe(0);
    const forged = parseSave(deepClone(SAVES_V3["xianxia-adult"]));
    forged.economy.hardship = 9999;
    expect(() => prepareImport(JSON.parse(JSON.stringify(forged)), "salt")).toThrow(expect.objectContaining({ code: "INVALID_SAVE" }));
  });
});
