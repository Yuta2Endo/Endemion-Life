// Stage 02.3: жильё, собственный дом и своё дело. Проверки идут через те же правила, что и игра:
// события, эффекты, годовой цикл хозяйства и строгий parseSave.
import { describe, expect, it } from "vitest";
import {
  applyAction,
  applyEffect,
  businessNumbers,
  businessSaleValue,
  businessesOf,
  businessYear,
  deepClone,
  economyYear,
  eventProblems,
  findBusiness,
  findEvent,
  findProperty,
  getUniverse,
  householdMembers,
  importWealthCap,
  householdSize,
  housingCosts,
  isEligible,
  MAX_ARREARS,
  MAX_BUSINESSES,
  migrateSave,
  ownHome,
  parseSave,
  prepareImport,
  presentBusiness,
  presentHousehold,
  propertiesOf,
  Rng,
  SAVE_SCHEMA_VERSION,
  startCareer,
  UNIVERSE_IDS,
  WEALTH_MAX,
  yearLines,
  type GameState
} from "../src/index.js";
import type { EngineContext } from "../src/engine/context.js";
import { SAVES_V1 } from "./fixtures/saves-v1.js";
import { SAVES_V2 } from "./fixtures/saves-v2.js";
import { SAVES_V4 } from "./fixtures/saves-v4.js";
import { SAVES_V8 } from "./fixtures/saves-v8.js";
import { SAVES_V9 } from "./fixtures/saves-v9.js";
import { SAVES_V10 } from "./fixtures/saves-v10.js";
import { choiceIds, start } from "./helpers.js";

function contextOf(state: GameState): EngineContext {
  return { state, rng: new Rng(state.rngState), universe: getUniverse(state.character.universeId), changes: [], source: undefined };
}

function at(state: GameState, age: number): GameState {
  const copy = deepClone(state);
  copy.life = { ...copy.life, age, stage: age < 13 ? "child" : age < 18 ? "teen" : age < 50 ? "adult" : age < 65 ? "middle" : "elder" };
  return copy;
}

function withPending(state: GameState, eventId: string): GameState {
  const copy = deepClone(state);
  copy.pending = { eventId, age: copy.life.age };
  return copy;
}

function choose(state: GameState, eventId: string, choiceId: string): GameState {
  return applyAction(withPending(state, eventId), { type: "choose", choiceId }).state;
}

function year(state: GameState): GameState {
  const ready = state.pending ? applyAction(state, { type: "choose", choiceId: choiceIds(state)[0]! }).state : state;
  if (!ready.life.alive) return ready;
  let next = applyAction(ready, { type: "advance" }).state;
  if (next.pending && next.life.alive) next = applyAction(next, { type: "choose", choiceId: choiceIds(next)[0]! }).state;
  return next;
}

function netWealth(state: GameState, before: number): number {
  const applied = (state.economy.last?.lines ?? []).reduce((sum, line) => sum + line.amount, 0);
  return Math.max(0, Math.min(WEALTH_MAX, before + applied));
}

describe("Stage 02.3: жильё и дом", () => {
  it("новая жизнь начинает без отдельного жилья и без дел; строгий round trip проходит", () => {
    const state = start({ seed: "estate-new", universeId: "dark-fantasy" });
    expect(state.schemaVersion).toBe(SAVE_SCHEMA_VERSION);
    expect(state.household).toEqual({ residence: "homeless", homeId: null, since: 0, condition: 0, arrears: 0 });
    expect(state.business).toEqual({ ventures: [] });
    expect(parseSave(JSON.parse(JSON.stringify(state)))).toEqual(state);
    const view = presentHousehold(state);
    expect(view.home).toBeNull();
    expect(view.residence).toBe("homeless");
    // Младенец живёт с родителями: это существующие NPC, а не выдуманная семья
    expect(view.members.length).toBeGreaterThan(0);
    for (const member of view.members) expect(state.npcs.some((npc) => npc.id === member.id && npc.alive)).toBe(true);
  });

  it("аренда и покупка дома: цена покупки списывается один раз, аренда и налог идут в год", () => {
    const universe = getUniverse("dark-fantasy");
    const state = at(start({ seed: "estate-home", universeId: "dark-fantasy" }), 20);
    state.character.wealth = 500;
    expect(isEligible(state, findEvent(universe, "home.choice.dark-fantasy")!)).toBe(true);

    // Аренда: ключи без первого взноса, годовая аренда — одна статья
    const rented = choose(state, "home.choice.dark-fantasy", "rent-df-home-small");
    expect(rented.household.residence).toBe("rent");
    expect(rented.household.homeId).toBe("df-home-small");
    expect(rented.character.wealth).toBe(500);
    const rentLines = yearLines(rented);
    expect(rentLines.filter((line) => line.id === "rent")).toHaveLength(1);
    expect(rentLines.find((line) => line.id === "rent")?.amount).toBe(-5);
    expect(rentLines.some((line) => line.id === "upkeep" || line.id === "propertyTax")).toBe(false);

    // Покупка: цена уходит один раз, затем содержание и налог
    const bought = choose(state, "home.choice.dark-fantasy", "buy-df-home-small");
    expect(bought.household.residence).toBe("own");
    expect(bought.household.condition).toBe(100);
    expect(bought.character.wealth).toBe(445);
    const ownLines = yearLines(bought);
    expect(ownLines.some((line) => line.id === "rent")).toBe(false);
    expect(ownLines.find((line) => line.id === "upkeep")?.amount).toBe(-1);
    expect(ownLines.find((line) => line.id === "propertyTax")?.amount).toBe(-1);
    expect(housingCosts(bought).total).toBe(2);

    const before = bought.character.wealth;
    const ctx = contextOf(bought);
    economyYear(ctx);
    expect(ctx.state.character.wealth).toBe(netWealth(ctx.state, before));
    expect(ctx.state.character.wealth).toBeGreaterThanOrEqual(0);
    expect(presentHousehold(ctx.state).home?.name.ru).toContain("Угол");
  });

  it("дом ветшает, ремонт возвращает состояние, а неуплата отбирает жильё", () => {
    // Ветеран без дохода: содержать дом нечем
    const state = at(start({ seed: "estate-arrears", universeId: "dark-fantasy" }), 30);
    state.character.socialClassId = "outcast";
    state.character.professionId = null;
    state.character.wealth = 0;
    state.flags = state.flags.filter((flag) => flag !== "profession" && flag !== "guild-member");
    expect(ownHome(state, "df-home-small")).toBe(true);
    const ctx = contextOf(state);
    economyYear(ctx);
    expect(ctx.state.household.residence).toBe("own");
    expect(ctx.state.household.arrears).toBe(1);
    economyYear(ctx);
    expect(ctx.state.household.residence).toBe("homeless");
    expect(ctx.state.household.homeId).toBeNull();
    expect(ctx.changes.some((change) => change.kind === "property" && change.value === "lost")).toBe(true);

    // Ремонт: событие доступно при плохом состоянии и возвращает дому прочность
    const damaged = at(start({ seed: "estate-repair", universeId: "dark-fantasy" }), 30);
    damaged.character.wealth = 100;
    expect(ownHome(damaged, "df-home-small")).toBe(true);
    damaged.household.condition = 30;
    const universe = getUniverse("dark-fantasy");
    expect(isEligible(damaged, findEvent(universe, "property.maintenance.dark-fantasy.df-home-small")!)).toBe(true);
    const repaired = choose(damaged, "property.maintenance.dark-fantasy.df-home-small", "repair");
    expect(repaired.household.condition).toBeGreaterThan(30);
    expect(repaired.character.wealth).toBe(100 - 7);

    // Запустение: состояние падает, здоровье страдает
    const neglected = choose(damaged, "property.maintenance.dark-fantasy.df-home-small", "defer");
    expect(neglected.household.condition).toBe(15);
  });

  it("продажа дома возвращает золото и оставляет без жилья; событие продажи доступно в нужде", () => {
    const state = at(start({ seed: "estate-sale", universeId: "dark-fantasy" }), 30);
    state.character.wealth = 0;
    expect(ownHome(state, "df-home-small")).toBe(true);
    state.economy.hardship = 1;
    const before = state.character.wealth;
    const universe = getUniverse("dark-fantasy");
    expect(isEligible(state, findEvent(universe, "property.sale.dark-fantasy.df-home-small")!)).toBe(true);
    const sold = choose(state, "property.sale.dark-fantasy.df-home-small", "sell");
    expect(sold.household.residence).toBe("homeless");
    expect(sold.character.wealth).toBe(before + 44);
    expect(sold.character.wealth).toBeLessThanOrEqual(WEALTH_MAX);

    // Снятое жильё продать нельзя: это не собственность
    const rentStart = at(start({ seed: "estate-rent-sale", universeId: "dark-fantasy" }), 30);
    rentStart.character.wealth = 10;
    const rented = choose(rentStart, "home.choice.dark-fantasy", "rent-df-home-small");
    const rentCtx = contextOf(rented);
    const rentWealth = rented.character.wealth;
    applyEffect(rentCtx, { type: "sellProperty" });
    expect(rentCtx.state.household.residence).toBe("rent");
    expect(rentCtx.state.character.wealth).toBe(rentWealth);
  });

  it("домашние выводятся из существующих NPC: супруг и ребёнок, без выдуманных людей; вместимость видна", () => {
    let state = at(start({ seed: "estate-members", universeId: "dark-fantasy" }), 30);
    const ctx = contextOf(state);
    applyEffect(ctx, { type: "npc", role: "spouse" });
    applyEffect(ctx, { type: "npc", role: "child" });
    state = ctx.state;
    const spouse = state.npcs.find((npc) => npc.role === "spouse")!;
    const child = state.npcs.find((npc) => npc.role === "child")!;
    const members = householdMembers(state);
    expect(members.map((member) => member.npc.id)).toEqual(expect.arrayContaining([spouse.id, child.id]));
    expect(householdSize(state)).toBe(3);
    expect(members.filter((member) => member.dependent).map((member) => member.npc.id)).toEqual([child.id]);
    // Все члены дома — реальные живые NPC
    for (const member of members) expect(state.npcs.some((npc) => npc.id === member.npc.id && npc.alive && npc.status !== "missing")).toBe(true);
    expect(ownHome(state, "df-home-small")).toBe(true);
    const view = presentHousehold(state);
    expect(view.home?.capacity).toBe(2);
    expect(view.crowded).toBe(true);
    expect(view.dependents).toBe(1);
  });
});

describe("Stage 02.3: своё дело", () => {
  it("дело открывается событием, приносит доход одной статьёй и растёт каждые три прибыльных года", () => {
    let state = at(start({ seed: "estate-business", universeId: "dark-fantasy" }), 20);
    state.character.wealth = 100;
    const universe = getUniverse("dark-fantasy");
    expect(isEligible(state, findEvent(universe, "business.opportunity.dark-fantasy")!)).toBe(true);
    state = choose(state, "business.opportunity.dark-fantasy", "start-df-business-stall");
    expect(state.business.ventures).toHaveLength(1);
    expect(state.business.ventures[0]!.id).toBe("df-business-stall");
    expect(state.character.wealth).toBe(72);
    expect(state.business.ventures[0]!.capital).toBe(10);

    const lines = yearLines(state);
    const venture = state.business.ventures[0]!;
    const numbers = businessNumbers(state, venture);
    expect(lines.filter((line) => line.id === "business")).toHaveLength(1);
    expect(lines.find((line) => line.id === "business")?.amount).toBe(numbers.revenue);
    expect(lines.filter((line) => line.id === "businessCosts")).toHaveLength(1);
    expect(lines.find((line) => line.id === "businessCosts")?.amount).toBe(-numbers.costs);

    // Рост: три прибыльных года без убытков поднимают ступень
    state.life.age = 22;
    state.business.ventures[0]!.years = 2;
    state.business.ventures[0]!.losses = 0;
    const ctx = contextOf(state);
    const beforeLevel = state.business.ventures[0]!.level;
    let grew = false;
    for (let age = 22; age < 40 && !grew; age++) {
      ctx.state.life.age = age;
      const current = ctx.state.business.ventures[0]!;
      current.years = 2;
      current.losses = 0;
      current.level = beforeLevel;
      businessYear(ctx);
      if (ctx.state.business.ventures[0]?.level === beforeLevel + 1) grew = true;
    }
    expect(grew).toBe(true);
  });

  it("можно держать два дела, но предложение не приходит, когда места нет", () => {
    let state = at(start({ seed: "estate-business-two", universeId: "dark-fantasy" }), 20);
    state.character.wealth = 300;
    const universe = getUniverse("dark-fantasy");
    state = choose(state, "business.opportunity.dark-fantasy", "start-df-business-stall");
    expect(state.business.ventures).toHaveLength(1);
    expect(isEligible(state, findEvent(universe, "business.opportunity.dark-fantasy")!)).toBe(true);
    state = choose(state, "business.opportunity.dark-fantasy", "start-df-business-workshop");
    expect(state.business.ventures).toHaveLength(2);
    expect(state.business.ventures.map((venture) => venture.id).sort()).toEqual(["df-business-stall", "df-business-workshop"]);
    expect(isEligible(state, findEvent(universe, "business.opportunity.dark-fantasy")!)).toBe(false);
  });

  it("плохой год уменьшает капитал, а разорение закрывает дело", () => {
    let state = at(start({ seed: "estate-business-loss", universeId: "dark-fantasy" }), 20);
    state.character.wealth = 100;
    state = choose(state, "business.opportunity.dark-fantasy", "start-df-business-stall");
    // Находим детерминированный плохой год
    let badAge = -1;
    for (let age = 20; age < 120; age++) {
      const copy = deepClone(state);
      copy.life.age = age;
      const current = copy.business.ventures[0]!;
      if (businessNumbers(copy, current).net < 0) {
        badAge = age;
        break;
      }
    }
    expect(badAge).toBeGreaterThanOrEqual(20);
    state.life.age = badAge;
    const capitalBefore = state.business.ventures[0]!.capital;
    const ctx = contextOf(state);
    businessYear(ctx);
    expect(ctx.state.business.ventures[0]!.capital).toBeLessThan(capitalBefore);
    expect(ctx.state.business.ventures[0]!.losses).toBeGreaterThan(0);

    // Разорение: капитал не выдержал убытка или общая нужда добила дело
    const bankrupt = deepClone(ctx.state);
    bankrupt.business.ventures[0]!.capital = 1;
    bankrupt.business.ventures[0]!.losses = 1;
    bankrupt.economy.hardship = 3;
    const bankruptCtx = contextOf(bankrupt);
    businessYear(bankruptCtx);
    expect(bankruptCtx.state.business.ventures).toHaveLength(0);
    expect(bankruptCtx.changes.some((change) => change.kind === "business" && change.value === "failed")).toBe(true);
  });

  it("дело можно продать или закрыть: продажа возвращает часть капитала, закрытие — нет", () => {
    let state = at(start({ seed: "estate-business-sale", universeId: "dark-fantasy" }), 20);
    state.character.wealth = 100;
    state = choose(state, "business.opportunity.dark-fantasy", "start-df-business-stall");
    const venture = state.business.ventures[0]!;
    const value = businessSaleValue(state, venture);
    const before = state.character.wealth;
    const ctx = contextOf(state);
    applyEffect(ctx, { type: "sellBusiness", id: venture.id });
    expect(ctx.state.business.ventures).toHaveLength(0);
    expect(ctx.state.character.wealth).toBe(before + value);
    expect(ctx.changes.some((change) => change.kind === "business" && change.value === "sold")).toBe(true);

    let closed = at(start({ seed: "estate-business-close", universeId: "dark-fantasy" }), 20);
    closed.character.wealth = 100;
    closed = choose(closed, "business.opportunity.dark-fantasy", "start-df-business-stall");
    const closeCtx = contextOf(closed);
    applyEffect(closeCtx, { type: "closeBusiness", id: closed.business.ventures[0]!.id });
    expect(closeCtx.state.business.ventures).toHaveLength(0);
    expect(closeCtx.changes.some((change) => change.kind === "business" && change.value === "closed")).toBe(true);
  });

  it("жалованье и доход дела не считаются дважды; каждая статья года применяется один раз", () => {
    let state = at(start({ seed: "estate-once", universeId: "dark-fantasy" }), 30);
    state.character.wealth = 500;
    state.character.educationId = "df-letters";
    state.character.skills.survival = 10;
    const careerCtx = contextOf(state);
    expect(startCareer(careerCtx, "lamplighter")).toBe(true);
    state = careerCtx.state;
    expect(ownHome(state, "df-home-small")).toBe(true);
    state = choose(state, "business.opportunity.dark-fantasy", "start-df-business-stall");
    const lines = yearLines(state);
    expect(lines.filter((line) => line.id === "wage")).toHaveLength(1);
    expect(lines.some((line) => line.id === "profession")).toBe(false);
    expect(lines.filter((line) => line.id === "business")).toHaveLength(1);
    expect(lines.filter((line) => line.id === "businessCosts")).toHaveLength(1);
    expect(lines.filter((line) => line.id === "upkeep")).toHaveLength(1);
    expect(lines.filter((line) => line.id === "propertyTax")).toHaveLength(1);
    const before = state.character.wealth;
    const ctx = contextOf(state);
    economyYear(ctx);
    expect(ctx.state.character.wealth).toBe(netWealth(ctx.state, before));
    // Никакой второй статьи той же природы
    expect(ctx.state.economy.last!.lines.filter((line) => line.id === "business")).toHaveLength(1);
    expect(ctx.state.economy.last!.lines.filter((line) => line.id === "wage")).toHaveLength(1);
  });
});

describe("Stage 02.3: совместимость, детерминизм и границы", () => {
  it("перевод 10 → 12 добавляет жильё и дело, сохраняя seed, rngState и все прежние поля", () => {
    for (const [key, raw] of Object.entries(SAVES_V10)) {
      const before = deepClone(raw) as Record<string, unknown>;
      const migrated = migrateSave(deepClone(raw)) as unknown as GameState;
      expect(migrated.schemaVersion, key).toBe(SAVE_SCHEMA_VERSION);
      expect(migrated.seed, key).toBe(before.seed);
      expect(migrated.rngState, key).toBe(before.rngState);
      expect(migrated.character.name, key).toBe((before.character as { name: string }).name);
      expect(migrated.life.age, key).toBe((before.life as { age: number }).age);
      expect(migrated.household, key).toEqual({ residence: "homeless", homeId: null, since: 0, condition: 0, arrears: 0 });
      expect(migrated.business, key).toEqual({ ventures: [] });
      const rest = deepClone(migrated) as unknown as Record<string, unknown>;
      const original = deepClone(raw) as Record<string, unknown>;
      delete rest.household;
      delete rest.business;
      delete rest.location;
      delete rest.schemaVersion;
      delete original.schemaVersion;
      expect(rest, key).toEqual(original);
      expect(() => parseSave(deepClone(raw)), key).not.toThrow();
    }
    const employed = parseSave(deepClone(SAVES_V10["hunter-employed"]!));
    expect(employed.character.professionId).toBe("raid-hunter");
    expect(employed.career.employed).toBe(true);
    expect(employed.household.residence).toBe("homeless");
    expect(employed.business.ventures).toEqual([]);
  });

  it("старые сохранения 1, 2, 5, 8, 9 и 10 доходят до 11 без потери данных", () => {
    const schema5 = deepClone(SAVES_V4["dark-fantasy-adult"]!) as Record<string, unknown>;
    schema5.schemaVersion = 5;
    (schema5.economy as Record<string, unknown>).goods = {};
    delete schema5.health;
    const saves: Array<[string, Record<string, unknown>]> = [
      ["v1", deepClone(SAVES_V1["dark-fantasy-young"]!) as Record<string, unknown>],
      ["v2", deepClone(SAVES_V2["dark-fantasy-young"]!) as Record<string, unknown>],
      ["v5", schema5],
      ["v8", deepClone(SAVES_V8["murim-alive"]!) as Record<string, unknown>],
      ["v9", deepClone(SAVES_V9["murim-alive"]!) as Record<string, unknown>],
      ["v10", deepClone(SAVES_V10["murim-alive"]!) as Record<string, unknown>]
    ];
    for (const [key, raw] of saves) {
      const before = deepClone(raw);
      const state = parseSave(deepClone(raw));
      expect(state.schemaVersion, key).toBe(SAVE_SCHEMA_VERSION);
      expect(state.seed, key).toBe(before.seed);
      expect(state.rngState, key).toBe(before.rngState);
      expect(state.household, key).toBeDefined();
      expect(state.business, key).toBeDefined();
      expect(() => parseSave(JSON.parse(JSON.stringify(state))), key).not.toThrow();
    }
  });

  it("у каждого мира есть дома, дела и события жилья/дела; проверка контента проходит", () => {
    expect(eventProblems()).toEqual([]);
    for (const universeId of UNIVERSE_IDS) {
      const universe = getUniverse(universeId);
      const homes = propertiesOf(universeId);
      expect(homes.length, universeId).toBeGreaterThan(0);
      expect(new Set(homes.map((home) => home.id)).size).toBe(homes.length);
      for (const home of homes) {
        expect(findProperty(universeId, home.id)).toBeDefined();
        expect(findEvent(universe, `property.maintenance.${universeId}.${home.id}`), `${universeId}:${home.id}:maintenance`).toBeDefined();
        expect(findEvent(universe, `property.sale.${universeId}.${home.id}`), `${universeId}:${home.id}:sale`).toBeDefined();
      }
      expect(findEvent(universe, `home.choice.${universeId}`), universeId).toBeDefined();
      const ventures = businessesOf(universeId);
      expect(ventures.length, universeId).toBeGreaterThan(0);
      expect(findEvent(universe, `business.opportunity.${universeId}`), universeId).toBeDefined();
      for (const venture of ventures) {
        expect(findBusiness(universeId, venture.id)).toBeDefined();
        expect(findEvent(universe, `business.trouble.${universeId}.${venture.id}`), `${universeId}:${venture.id}:trouble`).toBeDefined();
      }
    }
  });

  it("тот же seed и те же действия дают то же жильё, дело, золото и rngState", () => {
    const script = (seed: string): GameState => {
      let state = at(start({ seed, universeId: "dark-fantasy" }), 20);
      state.character.wealth = 200;
      state = choose(state, "home.choice.dark-fantasy", "rent-df-home-small");
      state = choose(state, "business.opportunity.dark-fantasy", "start-df-business-stall");
      return year(state);
    };
    const a = script("estate-determinism");
    const b = script("estate-determinism");
    expect(a.household).toEqual(b.household);
    expect(a.business).toEqual(b.business);
    expect(a.character.wealth).toBe(b.character.wealth);
    expect(a.rngState).toBe(b.rngState);
  });

  it("parseSave отвергает невозможное жильё и дела", () => {
    const good = start({ seed: "estate-strict", universeId: "dark-fantasy" });
    const broken: ((s: GameState) => void)[] = [
      (s) => (s.household.homeId = "no-such-home"),
      (s) => {
        s.household.residence = "rent";
        s.household.homeId = null;
      },
      (s) => {
        s.household.residence = "own";
        s.household.homeId = null;
      },
      (s) => (s.household.arrears = MAX_ARREARS + 1),
      (s) => {
        s.household.residence = "rent";
        s.household.homeId = "df-home-small";
        s.household.condition = 50;
      },
      (s) => {
        s.business.ventures.push({ id: "no-such-business", foundedAge: 0, level: 0, capital: 1, years: 0, losses: 0, lastNet: null });
      },
      (s) => {
        s.business.ventures.push({ id: "df-business-stall", foundedAge: 99, level: 0, capital: 1, years: 0, losses: 0, lastNet: null });
      },
      (s) => {
        s.business.ventures.push({ id: "df-business-stall", foundedAge: 0, level: 0, capital: 1, years: 0, losses: 0, lastNet: null });
        s.business.ventures.push({ id: "df-business-stall", foundedAge: 0, level: 0, capital: 1, years: 0, losses: 0, lastNet: null });
      }
    ];
    for (const breakIt of broken) {
      const copy = deepClone(good);
      breakIt(copy);
      expect(() => parseSave(JSON.parse(JSON.stringify(copy)))).toThrow(expect.objectContaining({ code: "INVALID_SAVE" }));
    }
    expect(MAX_BUSINESSES).toBe(2);
  });

  it("перенос из браузера режет неправдоподобный капитал дела по тому же пределу, что и золото", () => {
    const state = start({ seed: "estate-import", universeId: "dark-fantasy" });
    state.business.ventures.push({ id: "df-business-stall", foundedAge: 0, level: 0, capital: WEALTH_MAX, years: 0, losses: 0, lastNet: null });
    const result = prepareImport(JSON.parse(JSON.stringify(state)), "estate-salt");
    expect(result.state.business.ventures[0]!.capital).toBeLessThanOrEqual(importWealthCap(result.state));
    expect(result.adjustments.some((adjustment) => adjustment.field.includes("business.df-business-stall.capital"))).toBe(true);
  });

  it("полная жизнь не оставляет неизвестных домов и дел и проходит строгий parseSave", () => {
    for (const universeId of UNIVERSE_IDS) {
      let state = start({ seed: `estate-soak-${universeId}`, universeId });
      for (let step = 0; step < 1500 && state.life.alive; step++) {
        state = applyAction(state, state.pending ? { type: "choose", choiceId: choiceIds(state)[0]! } : { type: "advance" }).state;
        expect(state.character.wealth, `${universeId}:${step}`).toBeGreaterThanOrEqual(0);
        expect(state.character.wealth, `${universeId}:${step}`).toBeLessThanOrEqual(WEALTH_MAX);
        if (state.household.homeId !== null) expect(findProperty(universeId, state.household.homeId), `${universeId}:${step}`).toBeDefined();
        for (const venture of state.business.ventures) expect(findBusiness(universeId, venture.id), `${universeId}:${step}`).toBeDefined();
        expect(state.business.ventures.length, `${universeId}:${step}`).toBeLessThanOrEqual(MAX_BUSINESSES);
      }
      const view = presentBusiness(state);
      expect(view.ventures.length).toBe(state.business.ventures.length);
      expect(() => parseSave(JSON.parse(JSON.stringify(state))), universeId).not.toThrow();
    }
  });
});



