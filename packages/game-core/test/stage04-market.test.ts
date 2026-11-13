// Stage 04, срез 4: рынок — товары миров, цены от цикла хозяйства, покупка и продажа, запас и его годовой расход,
// отсутствие бесконечного источника золота, генератор не трогается, перевод сохранений 4 → 5
import { describe, expect, it } from "vitest";
import {
  applyAction,
  BUY_MARKUP,
  deepClone,
  ECONOMY_CYCLES,
  findSkill,
  getUniverse,
  goodsOf,
  MARKET_AGE,
  MAX_STOCK,
  MAX_TRADE_QTY,
  parseSave,
  presentMarket,
  pricesOf,
  SAVE_SCHEMA_VERSION,
  SELL_DISCOUNT,
  UNIVERSE_IDS,
  type GameState
} from "../src/index.js";
import { SAVES_V4 } from "./fixtures/saves-v4.js";
import { start } from "./helpers.js";

function at(state: GameState, age: number): GameState {
  const copy = deepClone(state);
  copy.life = { ...copy.life, age, stage: age < 13 ? "child" : age < 18 ? "teen" : "adult" };
  copy.pending = null;
  return copy;
}

function adult(universeId: GameState["character"]["universeId"], wealth = 1000): GameState {
  const state = at(start({ seed: `market-${universeId}`, universeId }), 30);
  state.character.wealth = wealth;
  return state;
}

const buy = (state: GameState, goodId: string, qty = 1) => applyAction(state, { type: "trade", goodId, side: "buy", qty });
const sell = (state: GameState, goodId: string, qty = 1) => applyAction(state, { type: "trade", goodId, side: "sell", qty });

describe("Stage 04: рынок", () => {
  it("у каждого мира три товара; эффекты ссылаются на навыки, шкалы и фракции своего мира; тексты на двух языках", () => {
    for (const universeId of UNIVERSE_IDS) {
      const universe = getUniverse(universeId);
      const goods = goodsOf(universeId);
      expect(goods.length, universeId).toBe(3);
      expect(new Set(goods.map((g) => g.id)).size).toBe(goods.length);
      for (const good of goods) {
        expect(good.base, good.id).toBeGreaterThan(0);
        for (const text of [good.name, good.description]) {
          expect(text.ru.length).toBeGreaterThan(0);
          expect(text.en.length).toBeGreaterThan(0);
        }
        const e = good.effect;
        if (e.type === "skill") expect(findSkill(universe, e.id), `${universeId}/${good.id}`).toBeDefined();
        if (e.type === "meter") expect(universe.meters.map((m) => m.id), `${universeId}/${good.id}`).toContain(e.id);
        if (e.type === "faction") expect(universe.factions.map((f) => f.id), `${universeId}/${good.id}`).toContain(e.id);
      }
    }
  });

  it("нет бесконечного источника золота: покупка при любом цикле дороже продажи при любом цикле", () => {
    expect(SELL_DISCOUNT * 1.2).toBeLessThan(0.8 * BUY_MARKUP + 1e-9);
    for (const universeId of UNIVERSE_IDS) {
      for (const good of goodsOf(universeId)) {
        const prices = ECONOMY_CYCLES.map((cycle) => {
          const s = adult(universeId);
          s.economy.cycle = cycle;
          return pricesOf(s, good);
        });
        const cheapestBuy = Math.min(...prices.map((p) => p.buy));
        const dearestSell = Math.max(...prices.map((p) => p.sell));
        expect(cheapestBuy, `${universeId}/${good.id}`).toBeGreaterThan(dearestSell);
      }
    }
  });

  it("купить и сразу продать — потеря; круг покупок и продаж за много лет не даёт прибыли", () => {
    for (const universeId of UNIVERSE_IDS) {
      const good = goodsOf(universeId)[0]!;
      let state = adult(universeId, 500);
      state = buy(state, good.id, MAX_TRADE_QTY).state;
      state = sell(state, good.id, MAX_TRADE_QTY).state;
      expect(state.character.wealth, universeId).toBeLessThan(500);
    }
    // Лучший случай для игрока: купить в спад, продать в подъём, без хода времени
    let state = adult("isekai", 10_000);
    const good = goodsOf("isekai")[0]!;
    for (let i = 0; i < 50; i++) {
      state.economy.cycle = "slump";
      state = buy(state, good.id, MAX_TRADE_QTY).state;
      state.economy.cycle = "boom";
      state = sell(state, good.id, MAX_TRADE_QTY).state;
    }
    expect(state.character.wealth).toBeLessThan(10_000);
  });

  it("покупка списывает цену и пополняет запас; продажа — наоборот; сделка пишется в историю", () => {
    const state = adult("academy");
    const good = goodsOf("academy")[0]!;
    const price = pricesOf(state, good);
    const bought = buy(state, good.id, 3);
    expect(bought.state.character.wealth).toBe(1000 - price.buy * 3);
    expect(bought.state.economy.goods[good.id]).toBe(3);
    expect(bought.entries).toHaveLength(1);
    expect(bought.entries[0]!.kind).toBe("market");
    expect(bought.entries[0]!.changes).toEqual(expect.arrayContaining([{ kind: "wealth", delta: -price.buy * 3 }, { kind: "good", key: good.id, delta: 3 }]));
    expect(bought.state.life.age).toBe(state.life.age);
    expect(bought.state.version).toBe(state.version + 1);
    const sold = sell(bought.state, good.id, 3).state;
    // Цена продажи считается заново: покупка уменьшила склад, поэтому она чуть выше прежней
    const sellNow = pricesOf(bought.state, good).sell;
    expect(sellNow).toBeGreaterThanOrEqual(price.sell);
    expect(sold.character.wealth).toBe(bought.state.character.wealth + sellNow * 3);
    expect(sold.economy.goods[good.id]).toBeUndefined();
  });

  it("сделка не трогает генератор случайных чисел", () => {
    const state = adult("murim");
    const good = goodsOf("murim")[1]!;
    expect(buy(state, good.id, 2).state.rngState).toBe(state.rngState);
  });

  it("запреты: событие ждёт ответа, ребёнок, нет денег, сверх запаса, продать больше, чем есть, чужой товар, количество", () => {
    const base = adult("hunter", 20);
    const good = goodsOf("hunter")[0]!;
    const code = (fn: () => unknown) => {
      try {
        fn();
        return null;
      } catch (error) {
        return (error as { code?: string }).code ?? "unknown";
      }
    };
    expect(code(() => buy({ ...deepClone(base), pending: { eventId: "common.first-steps", age: 30 } }, good.id))).toBe("EVENT_PENDING");
    expect(code(() => buy(at(base, MARKET_AGE - 1), good.id))).toBe("CHOICE_LOCKED");
    expect(code(() => buy(base, good.id, 5))).toBe("CHOICE_LOCKED");
    const full = deepClone(base);
    full.character.wealth = 100_000;
    full.economy.goods[good.id] = MAX_STOCK;
    expect(code(() => buy(full, good.id))).toBe("CHOICE_LOCKED");
    expect(code(() => sell(base, good.id))).toBe("CHOICE_LOCKED");
    expect(code(() => buy(base, goodsOf("academy")[0]!.id))).toBe("INVALID_INPUT");
    expect(code(() => buy(base, good.id, 0))).toBe("INVALID_INPUT");
    expect(code(() => buy(base, good.id, MAX_TRADE_QTY + 1))).toBe("INVALID_INPUT");
    expect(code(() => buy(base, good.id, 1.5))).toBe("INVALID_INPUT");
    expect(code(() => applyAction(base, { type: "trade", goodId: good.id, side: "steal" as "buy", qty: 1 }))).toBe("INVALID_INPUT");
    // Мёртвый не торгует
    const dead = deepClone(base);
    dead.life = { ...dead.life, alive: false, deathAge: 30, deathCause: { ru: "—", en: "—" } };
    expect(code(() => buy(dead, good.id))).toBe("LIFE_ENDED");
  });

  it("запас тратится по штуке в год и даёт своё: навык, шкалу мира, отношение фракции", () => {
    for (const universeId of UNIVERSE_IDS) {
      for (const good of goodsOf(universeId)) {
        let state = adult(universeId);
        state = buy(state, good.id, 2).state;
        // Шкала в середине: товару есть куда её сдвинуть (у скверны и искажения ци минимум — 0)
        const effect = good.effect;
        if (effect.type === "meter") {
          const meter = getUniverse(universeId).meters.find((m) => m.id === effect.id)!;
          state.meters[effect.id] = Math.round((meter.min + meter.max) / 2);
        }
        const before = deepClone(state);
        state = applyAction(state, { type: "advance" }).state;
        expect(state.economy.goods[good.id] ?? 0, `${universeId}/${good.id}`).toBe(1);
        const e = good.effect;
        if (e.type === "skill") expect(state.character.skills[e.id] ?? 0).toBeGreaterThan(before.character.skills[e.id] ?? 0);
        if (e.type === "faction") expect(state.character.factions[e.id] ?? 0).not.toBe(before.character.factions[e.id] ?? 0);
        if (e.type === "meter") expect(state.economy.goods[good.id] ?? 0).toBe(1);
      }
    }
  });

  it("запас не тратится впустую: шкала на минимуме — свеча остаётся", () => {
    let state = adult("dark-fantasy");
    state = buy(state, "ash-candles", 1).state;
    state.meters.corruption = 0;
    state = applyAction(state, { type: "advance" }).state;
    if ((state.meters.corruption ?? 0) === 0) expect(state.economy.goods["ash-candles"]).toBe(1);
  });

  it("запас не тратится впустую: навык на пределе — штука остаётся", () => {
    let state = adult("dark-fantasy");
    const good = goodsOf("dark-fantasy").find((g) => g.effect.type === "skill")!;
    state = buy(state, good.id, 1).state;
    state.character.skills[(good.effect as { id: string }).id] = 100;
    state = applyAction(state, { type: "advance" }).state;
    expect(state.economy.goods[good.id]).toBe(1);
  });

  it("представление: цены, запас, доступность, причина закрытия", () => {
    const state = adult("xianxia", 5);
    const view = presentMarket(state);
    expect(view.open).toBe(true);
    expect(view.goods).toHaveLength(3);
    for (const good of view.goods) {
      expect(good.buy).toBeGreaterThan(good.sell);
      expect(good.canBuy).toBe(5 >= good.buy);
      expect(good.canSell).toBe(false);
      expect(good.effect.en).toMatch(/a year$/);
    }
    expect(presentMarket(at(state, 10)).closed).toBe("age");
    expect(presentMarket({ ...deepClone(state), pending: { eventId: "common.first-steps", age: 30 } }).closed).toBe("pending");
    expect(JSON.stringify(view)).not.toMatch(/"(seed|rngState)"/);
  });

  it("перевод 4 → 5: пустой запас, остальное без изменений; повреждённый запас отклоняется", () => {
    for (const [key, raw] of Object.entries(SAVES_V4)) {
      const state = parseSave(deepClone(raw));
      expect(state.schemaVersion, key).toBe(SAVE_SCHEMA_VERSION);
      expect(state.economy.goods, key).toEqual({});
      expect(state.adventure, key).toEqual({ discovered: [], active: null, done: [], failed: [], log: [] });
      expect(state.health.conditions, key).toEqual([]);
      const rest = deepClone(state) as unknown as Record<string, unknown>;
      const before = deepClone(raw) as Record<string, unknown>;
      (rest.economy as Record<string, unknown>).goods = undefined;
      delete (rest.economy as Record<string, unknown>).goods;
      delete rest.adventure;
      delete rest.region;
      delete rest.mastery;
      delete rest.health;
      delete rest.education;
      delete rest.career;
      delete rest.household;
      delete rest.business;
      delete rest.schemaVersion;
      delete before.schemaVersion;
      expect(rest, key).toEqual(before);
    }
    const good = parseSave(deepClone(SAVES_V4["isekai-adult"]));
    const broken: ((s: GameState) => void)[] = [
      (s) => (s.economy.goods = { "no-such-good": 1 }),
      (s) => (s.economy.goods = { [goodsOf("academy")[0]!.id]: 1 }),
      (s) => (s.economy.goods = { [goodsOf("isekai")[0]!.id]: MAX_STOCK + 1 }),
      (s) => (s.economy.goods = { [goodsOf("isekai")[0]!.id]: 0 }),
      (s) => delete (s.economy as unknown as Record<string, unknown>).goods
    ];
    for (const breakIt of broken) {
      const copy = deepClone(good);
      breakIt(copy);
      expect(() => parseSave(JSON.parse(JSON.stringify(copy)))).toThrow(expect.objectContaining({ code: "INVALID_SAVE" }));
    }
  });
});
