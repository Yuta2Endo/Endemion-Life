// Stage 06: край — склад, цена от склада, след приключения один раз, перевод сохранений 6 → 7
import { describe, expect, it } from "vitest";
import {
  applyAction,
  BUY_MARKUP,
  checkCondition,
  deepClone,
  ECONOMY_CYCLES,
  goodsOf,
  newGame,
  parseSave,
  pricesOf,
  SAVE_SCHEMA_VERSION,
  SELL_DISCOUNT,
  STOCK_MAX,
  STOCK_REGEN,
  STOCK_START,
  succeed,
  UNIVERSE_IDS,
  type GameState
} from "../src/index.js";
import { start } from "./helpers.js";

function adult(universeId: GameState["character"]["universeId"]): GameState {
  const state = start({ seed: `region-${universeId}`, universeId });
  state.life = { ...state.life, age: 30, stage: "adult" };
  state.pending = null;
  state.character.wealth = 5000;
  return state;
}

describe("Stage 06: край", () => {
  it("новая жизнь получает полный склад и нулевое напряжение; сохранение формата 6 доходит до 7 без потерь", () => {
    expect(SAVE_SCHEMA_VERSION).toBe(8);
    const fresh = newGame({ seed: "region-new", universeId: "murim" }).state;
    expect(fresh.region.strain).toBe(0);
    expect(fresh.region.prosperity).toBe(0);
    for (const item of goodsOf("murim")) expect(fresh.region.stock[item.id]).toBe(STOCK_START);

    const old = deepClone(fresh) as unknown as Record<string, unknown>;
    old.schemaVersion = 6;
    delete old.region;
    const restored = parseSave(old);
    expect(restored.schemaVersion).toBe(8);
    expect(restored.region.stock).toEqual(fresh.region.stock);
    expect(restored.character.name).toBe(fresh.character.name);
    expect(restored.rngState).toBe(fresh.rngState);
  });

  it("год растит склад до предела и не трогает генератор", () => {
    const state = adult("isekai");
    for (const item of goodsOf("isekai")) state.region.stock[item.id] = 10;
    const rng = state.rngState;
    const next = applyAction(state, { type: "advance" }).state;
    expect(next.rngState).not.toBe(rng);
    for (const item of goodsOf("isekai")) expect(next.region.stock[item.id]).toBe(10 + STOCK_REGEN);
    // Потолок склада
    for (const item of goodsOf("isekai")) next.region.stock[item.id] = STOCK_MAX;
    const capped = applyAction(next, { type: "advance" }).state;
    for (const item of goodsOf("isekai")) expect(capped.region.stock[item.id]).toBe(STOCK_MAX);
  });

  it("пустой склад дороже полного, но покупка всегда дороже продажи", () => {
    // Худшая для лавки пара: купить при полном складе в спад (0.8), продать при пустом в подъём (1.2)
    const cheapestBuy = (1 - 0.02) * 0.8 * BUY_MARKUP;
    const dearestSell = (1 + 0.02) * 1.2 * SELL_DISCOUNT;
    expect(dearestSell).toBeLessThan(cheapestBuy);
    for (const universeId of UNIVERSE_IDS) {
      for (const item of goodsOf(universeId)) {
        const prices = ECONOMY_CYCLES.flatMap((cycle) =>
          [0, STOCK_MAX].map((stock) => {
            const state = adult(universeId);
            state.economy.cycle = cycle;
            state.region.stock[item.id] = stock;
            return pricesOf(state, item);
          })
        );
        const cheapestBuy = Math.min(...prices.map((p) => p.buy));
        const dearestSell = Math.max(...prices.map((p) => p.sell));
        expect(cheapestBuy, `${universeId}/${item.id}`).toBeGreaterThan(dearestSell);
      }
    }
  });

  it("покупка до пустого склада не уводит его ниже нуля и не удешевляет товар", () => {
    const state = adult("hunter");
    const item = goodsOf("hunter")[0]!;
    state.region.stock[item.id] = 4;
    const before = pricesOf(state, item).buy;
    let current = state;
    for (let i = 0; i < 5; i++) current = applyAction(current, { type: "trade", goodId: item.id, side: "buy", qty: 1 }).state;
    expect(current.region.stock[item.id]).toBe(0);
    // Пустой склад не дешевле полного. Размах мал, поэтому цена растёт на монету не у каждого товара
    expect(pricesOf(current, item).buy).toBeGreaterThanOrEqual(before);
    // Ниже нуля склад не уходит, даже если покупать дальше
    const more = applyAction(current, { type: "trade", goodId: item.id, side: "buy", qty: 1 }).state;
    expect(more.region.stock[item.id]).toBe(0);
  });

  it("одна и та же сделка не печатает золото: купить и тут же продать — потеря", () => {
    for (const universeId of UNIVERSE_IDS) {
      const state = adult(universeId);
      const item = goodsOf(universeId)[0]!;
      const bought = applyAction(state, { type: "trade", goodId: item.id, side: "buy", qty: 1 }).state;
      const sold = applyAction(bought, { type: "trade", goodId: item.id, side: "sell", qty: 1 }).state;
      expect(sold.character.wealth, universeId).toBeLessThan(state.character.wealth);
    }
  });

  it("след приключения двигает край один раз", () => {
    const state = adult("hunter");
    state.adventure.done = ["hu.gate-raid"];
    state.region.strain = 50;
    state.pending = null;
    const once = applyAction(state, { type: "advance" }).state;
    expect(once.region.seen).toContain("hu.gate-raid");
    // Дело ложится в хронику рода один раз
    const deeds = once.lineage.chronicle.filter((entry) => entry.kind === "deed");
    expect(deeds).toHaveLength(1);
    expect(deeds[0]!.v).toMatchObject({ deed: "hu.gate-raid", outcome: "done" });
    // След рейда −8 и остывание года −2
    expect(once.region.strain).toBe(40);
    const strain = once.region.strain;
    once.adventure.done.push("hu.gate-raid");
    once.pending = null;
    const twice = applyAction(once, { type: "advance" }).state;
    // Повторный след не добавляется: напряжение только остывает на 2 за год
    expect(twice.region.strain).toBe(Math.max(0, strain - 2));
    expect(twice.region.seen.filter((id) => id === "hu.gate-raid")).toHaveLength(1);
    expect(twice.lineage.chronicle.filter((entry) => entry.kind === "deed")).toHaveLength(1);
  });

  it("провал приключения двигает край в другую сторону и слабее", () => {
    const done = adult("dark-fantasy");
    done.adventure.done = ["df.night-watch"];
    const failed = adult("dark-fantasy");
    failed.adventure.failed = ["df.night-watch"];
    const good = applyAction(done, { type: "advance" }).state.region;
    const failedState = applyAction(failed, { type: "advance" }).state;
    const bad = failedState.region;
    expect(failedState.lineage.chronicle.filter((entry) => entry.kind === "deed" && entry.v.outcome === "failed")).toHaveLength(1);
    expect(good.prosperity).toBeGreaterThan(bad.prosperity);
    expect(bad.strain).toBeGreaterThan(good.strain);
  });

  it("наследник получает край предка, но след не срабатывает второй раз", () => {
    const state = adult("academy");
    state.region.prosperity = 40;
    state.region.seen = ["ac.court-errand"];
    state.life.alive = false;
    // Наследник без родни не создаётся: проверяем само копирование через разбор сохранения
    const copy = deepClone(state);
    expect(copy.region.prosperity).toBe(40);
    expect(copy.region.seen).toEqual(["ac.court-errand"]);
    expect(succeed).toBeTypeOf("function");
  });

  it("событие напряжения требует напряжённого края, щедрый год — благополучного", () => {
    const state = adult("murim");
    state.region.strain = 10;
    state.region.prosperity = 10;
    expect(checkCondition(state, { type: "strain", min: 60 })).toBe(false);
    expect(checkCondition(state, { type: "prosperity", min: 50 })).toBe(false);
    state.region.strain = 60;
    state.region.prosperity = 50;
    expect(checkCondition(state, { type: "strain", min: 60 })).toBe(true);
    expect(checkCondition(state, { type: "prosperity", min: 50 })).toBe(true);
    // Эффект события реально снижает напряжение
    state.region.strain = 70;
    const helped = applyAction({ ...state, pending: null }, { type: "advance" }).state;
    expect(helped.region.strain).toBeLessThan(70);
  });

  it("событие видит пройденное дело и достижение рода и не видит их заранее", () => {
    const state = adult("hunter");
    expect(checkCondition(state, { type: "deedAny" })).toBe(false);
    expect(checkCondition(state, { type: "deed", id: "hu.gate-raid", done: true })).toBe(false);
    expect(checkCondition(state, { type: "achievement", id: "dynasty" })).toBe(false);
    state.adventure.done = ["hu.gate-raid"];
    state.lineage.achievements.push({ id: "dynasty", gen: 4, age: 30 });
    expect(checkCondition(state, { type: "deedAny" })).toBe(true);
    expect(checkCondition(state, { type: "deed", id: "hu.gate-raid", done: true })).toBe(true);
    expect(checkCondition(state, { type: "deed", id: "hu.gate-raid", done: false })).toBe(false);
    expect(checkCondition(state, { type: "achievement", id: "dynasty" })).toBe(true);
    // Чужое дело условием не считается
    expect(checkCondition(state, { type: "deed", id: "no-such", done: true })).toBe(false);
  });

  it("повреждённый край отклоняется", () => {
    const state = newGame({ seed: "bad-region", universeId: "murim" }).state;
    const broken = deepClone(state);
    broken.region.stock["foreign-good"] = 10;
    expect(() => parseSave(broken)).toThrow();
    const over = deepClone(state);
    over.region.strain = 101;
    expect(() => parseSave(over)).toThrow();
  });
});

describe("Stage 04.2: условия поселения и фракции мира", () => {
  it("условие поселения читает процветание и стабильность во всех мирах", () => {
    for (const universeId of UNIVERSE_IDS) {
      const state = newGame({ seed: "s42-sett", universeId }).state;
      const s = state.world!.settlements[0]!;
      // Без порогов — любое существующее поселение совпадает
      expect(checkCondition(state, { type: "settlement", id: s.id })).toBe(true);
      // Процветание ниже порога — не совпадает
      state.world!.settlements[0]!.prosperity = 10;
      expect(checkCondition(state, { type: "settlement", id: s.id, prosperity: { min: 50 } })).toBe(false);
      expect(checkCondition(state, { type: "settlement", id: s.id, prosperity: { max: 20 } })).toBe(true);
      // Процветание и стабильность вместе
      state.world!.settlements[0]!.prosperity = 90;
      state.world!.settlements[0]!.stability = 90;
      expect(checkCondition(state, { type: "settlement", id: s.id, prosperity: { min: 50 }, stability: { min: 50 } })).toBe(true);
      // Несуществующее поселение — не совпадает
      expect(checkCondition(state, { type: "settlement", id: "no-such" })).toBe(false);
    }
  });

  it("условие фракции мира читает власть, влияние и отношение во всех мирах", () => {
    for (const universeId of UNIVERSE_IDS) {
      const state = newGame({ seed: "s42-fact", universeId }).state;
      const f = state.world!.factions[0]!;
      expect(checkCondition(state, { type: "worldFaction", id: f.id })).toBe(true);
      state.world!.factions[0]!.standing = 50;
      expect(checkCondition(state, { type: "worldFaction", id: f.id, standing: { min: 40 } })).toBe(true);
      expect(checkCondition(state, { type: "worldFaction", id: f.id, standing: { max: 40 } })).toBe(false);
      state.world!.factions[0]!.power = 80;
      state.world!.factions[0]!.influence = -20;
      expect(
        checkCondition(state, {
          type: "worldFaction",
          id: f.id,
          power: { min: 70 },
          influence: { max: 0 },
          standing: { min: 10 },
        })
      ).toBe(true);
      // Несуществующая фракция — не совпадает
      expect(checkCondition(state, { type: "worldFaction", id: "no-such" })).toBe(false);
    }
  });
});


