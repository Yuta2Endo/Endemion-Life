// Stage 04.5.2: многолетнее влияние династии на живой мир
import { describe, expect, it } from "vitest";
import {
  applyAction,
  deepClone,
  findEvent,
  getUniverse,
  heirCandidates,
  isEligible,
  parseSave,
  succeed,
  type GameState,
  type WorldInfluenceState
} from "../src/index.js";
import { applyEffect } from "../src/engine/effects.js";
import { fx } from "../src/narrative/dsl.js";
import type { EngineContext } from "../src/engine/context.js";
import { Rng } from "../src/rng.js";
import {
  factionInfluenceBonus,
  MAX_WORLD_INFLUENCE,
  settlementInfluenceDrift,
  worldInfluenceValue,
  worldTick
} from "../src/world/state.js";
import { playLife, start } from "./helpers.js";

const UNIVERSE = getUniverse("dark-fantasy");
const CRISIS = "world.settlement-crisis.ash-capital";
const FOLLOWUP = "world.settlement-crisis-followup.ash-capital";
const FACTION = "world.faction-invitation.order-of-ash";

function eventOf(id: string) {
  const event = findEvent(UNIVERSE, id);
  if (!event) throw new Error(`нет события ${id}`);
  return event;
}

function ctxOf(state: GameState): EngineContext {
  return {
    state,
    rng: Rng.fromSeed("stage-04-5-2", "story"),
    universe: getUniverse(state.character.universeId),
    changes: []
  };
}

function tick(state: GameState, seed = "s452-tick"): GameState {
  const clone = deepClone(state);
  const ctx: EngineContext = {
    state: clone,
    rng: Rng.fromSeed(seed, "world"),
    universe: getUniverse(clone.character.universeId),
    changes: []
  };
  worldTick(ctx);
  return clone;
}

function influence(settlements: { id: string; value: number }[] = [], factions: { id: string; value: number }[] = []): WorldInfluenceState {
  return { settlements, factions };
}

function settlementOf(state: GameState, id = "ash-capital") {
  const settlement = state.world?.settlements.find((item) => item.id === id);
  if (!settlement) throw new Error(`нет поселения ${id}`);
  return settlement;
}

function factionOf(state: GameState, id = "order-of-ash") {
  const faction = state.world?.factions.find((item) => item.id === id);
  if (!faction) throw new Error(`нет фракции ${id}`);
  return faction;
}

function livingState(seed = "s452-living"): GameState {
  const state = start({ seed, universeId: "dark-fantasy" });
  state.life.age = 20;
  return state;
}

function choose(state: GameState, eventId: string, choiceId: string): GameState {
  const next = deepClone(state);
  next.pending = { eventId, age: next.life.age };
  return applyAction(next, { type: "choose", choiceId }).state;
}

let deadCache: GameState | undefined;

/** Мёртвая жизнь с живым наследником — общая для тестов наследования */
function deadWithHeir(): GameState {
  if (deadCache) return deadCache;
  for (let k = 0; k < 30; k++) {
    const { state } = playLife(start({ seed: `s452-succ-${k}`, universeId: "dark-fantasy" }), 400, (n, i) => (i * 3 + k) % n);
    if (!state.life.alive && heirCandidates(state).some((h) => h.available)) {
      deadCache = state;
      return state;
    }
  }
  throw new Error("нет жизни с наследником");
}

describe("Stage 04.5.2: модель многолетнего влияния", () => {
  it("новая династия начинает с пустым влиянием", () => {
    const state = start({ seed: "s452-new", universeId: "dark-fantasy" });
    expect(state.lineage.worldInfluence).toEqual({ settlements: [], factions: [] });
  });

  it("неизвестные поселения и фракции не принимают влияние", () => {
    const ctx = ctxOf(livingState());
    applyEffect(ctx, fx.influence("settlement", "nowhere", 3));
    applyEffect(ctx, fx.influence("faction", "nobody", 3));

    expect(ctx.state.lineage.worldInfluence).toEqual({ settlements: [], factions: [] });
  });

  it("влияние зажимается в допустимый диапазон ±MAX", () => {
    const ctx = ctxOf(livingState());
    applyEffect(ctx, fx.influence("settlement", "ash-capital", 100));
    expect(worldInfluenceValue(ctx.state.lineage.worldInfluence, "settlement", "ash-capital")).toBe(MAX_WORLD_INFLUENCE);

    applyEffect(ctx, fx.influence("settlement", "ash-capital", -100));
    expect(worldInfluenceValue(ctx.state.lineage.worldInfluence, "settlement", "ash-capital")).toBe(-MAX_WORLD_INFLUENCE);
  });

  it("влияние складывается по одному и тому же id", () => {
    const ctx = ctxOf(livingState());
    applyEffect(ctx, fx.influence("settlement", "ash-capital", 2));
    applyEffect(ctx, fx.influence("settlement", "ash-capital", 1));
    applyEffect(ctx, fx.influence("settlement", "mist-border", 2));

    expect(ctx.state.lineage.worldInfluence.settlements).toEqual([
      { id: "ash-capital", value: 3 },
      { id: "mist-border", value: 2 }
    ]);
  });

  it("нулевое влияние удаляет запись, а не оставляет пустой след", () => {
    const ctx = ctxOf(livingState());
    applyEffect(ctx, fx.influence("faction", "order-of-ash", 2));
    applyEffect(ctx, fx.influence("faction", "order-of-ash", -2));

    expect(ctx.state.lineage.worldInfluence.factions).toEqual([]);
  });

  it("производные коэффициенты влияния ограничены и предсказуемы", () => {
    expect(settlementInfluenceDrift(0)).toBe(0);
    expect(settlementInfluenceDrift(1)).toBe(1);
    expect(settlementInfluenceDrift(2)).toBe(1);
    expect(settlementInfluenceDrift(3)).toBe(2);
    expect(settlementInfluenceDrift(5)).toBe(2);
    expect(settlementInfluenceDrift(-5)).toBe(-2);
    expect(factionInfluenceBonus(0)).toBe(0);
    expect(factionInfluenceBonus(5)).toBe(10);
    expect(factionInfluenceBonus(-5)).toBe(-10);
  });
});

describe("Stage 04.5.2: влияние зарабатывается в игре", () => {
  it("помощь в кризисе даёт многолетнее влияние на поселение", () => {
    const state = livingState("s452-aid");
    state.character.wealth = 50;
    settlementOf(state).stability = 20;

    const after = choose(state, CRISIS, "aid");

    expect(worldInfluenceValue(after.lineage.worldInfluence, "settlement", "ash-capital")).toBe(2);
    expect(settlementOf(after).prosperity).toBe(settlementOf(state).prosperity + 5);
    expect(settlementOf(after).stability).toBe(settlementOf(state).stability + 12);
  });

  it("отказ от помощи даёт отрицательное влияние на поселение", () => {
    const state = livingState("s452-ignore");
    settlementOf(state).stability = 20;

    const after = choose(state, CRISIS, "ignore");

    expect(worldInfluenceValue(after.lineage.worldInfluence, "settlement", "ash-capital")).toBe(-1);
  });

  it("принятие приглашения Ордена даёт влияние на фракцию", () => {
    const state = livingState("s452-accept");
    factionOf(state).influence = 10;

    const after = choose(state, FACTION, "accept");

    expect(worldInfluenceValue(after.lineage.worldInfluence, "faction", "order-of-ash")).toBe(2);
  });

  it("уплата долга Пепельной столицы усиливает влияние на поселение", () => {
    const state = livingState("s452-pay");
    state.character.wealth = 50;
    settlementOf(state).stability = 20;

    const after = choose(state, FOLLOWUP, "pay");

    expect(worldInfluenceValue(after.lineage.worldInfluence, "settlement", "ash-capital")).toBe(2);
  });

  it("одна лишь доступность события не даёт влияние — нужен выбор", () => {
    const state = livingState("s452-eligible");
    settlementOf(state).stability = 20;

    expect(isEligible(state, eventOf(CRISIS))).toBe(true);
    expect(state.lineage.worldInfluence).toEqual({ settlements: [], factions: [] });
  });

  it("торг с Орденом записывает влияние и в успех, и в провал", () => {
    const negotiate = eventOf(FACTION).choices.find((choice) => choice.id === "negotiate");
    if (!negotiate) throw new Error("нет выбора negotiate");

    const success = negotiate.success.effects ?? [];
    const failure = negotiate.failure?.effects ?? [];

    expect(success).toContainEqual({ type: "influence", kind: "faction", id: "order-of-ash", delta: 1 });
    expect(failure).toContainEqual({ type: "influence", kind: "faction", id: "order-of-ash", delta: -1 });
  });
});

describe("Stage 04.5.2: влияние меняет мир через worldTick", () => {
  function influencePair(kind: "settlement" | "faction") {
    const base = livingState("s452-pair");
    const control = deepClone(base);
    const influenced = deepClone(base);
    if (kind === "settlement") {
      settlementOf(influenced).prosperity = 50;
      settlementOf(control).prosperity = 50;
      influenced.lineage.worldInfluence = influence([{ id: "ash-capital", value: 4 }]);
      control.lineage.worldInfluence = influence();
    } else {
      factionOf(influenced).influence = 0;
      factionOf(control).influence = 0;
      influenced.lineage.worldInfluence = influence([], [{ id: "order-of-ash", value: 3 }]);
      control.lineage.worldInfluence = influence();
    }
    return { control: tick(control, "s452-pair-tick"), influenced: tick(influenced, "s452-pair-tick") };
  }

  it("влияние на поселение добавляет процветание и не трогает чужие поселения", () => {
    const { control, influenced } = influencePair("settlement");

    const boosted = settlementOf(influenced).prosperity - settlementOf(control).prosperity;
    const untouched = settlementOf(influenced, "mist-border").prosperity - settlementOf(control, "mist-border").prosperity;

    expect(boosted).toBe(settlementInfluenceDrift(4));
    expect(boosted).toBe(2);
    expect(untouched).toBe(0);
  });

  it("влияние на фракцию меняет её производное отношение и не трогает другие фракции", () => {
    const { control, influenced } = influencePair("faction");

    const boosted = factionOf(influenced).standing - factionOf(control).standing;
    const untouched = factionOf(influenced, "mist-cult").standing - factionOf(control, "mist-cult").standing;

    expect(boosted).toBe(factionInfluenceBonus(3));
    expect(boosted).toBe(6);
    expect(untouched).toBe(0);
  });

  it("влияние не меняет мир в момент выдачи — только в годовом тике", () => {
    const state = livingState("s452-phase");
    settlementOf(state).prosperity = 50;
    const before = settlementOf(state).prosperity;

    const ctx = ctxOf(state);
    applyEffect(ctx, fx.influence("settlement", "ash-capital", 4));
    expect(settlementOf(ctx.state).prosperity).toBe(before);

    const ticked = tick(ctx.state, "s452-phase-tick");
    expect(settlementOf(ticked).prosperity).toBeGreaterThan(before);
  });

  it("годовое применение влияния детерминировано", () => {
    const state = livingState("s452-deterministic");
    settlementOf(state).prosperity = 50;
    state.lineage.worldInfluence = influence([{ id: "ash-capital", value: 4 }], [{ id: "order-of-ash", value: 2 }]);

    const first = tick(state, "s452-det");
    const second = tick(state, "s452-det");

    expect(first.world).toEqual(second.world);
    expect(first.lineage.worldInfluence).toEqual(second.lineage.worldInfluence);
  });

  it("влияние не отменяет существующую логику кризиса", () => {
    const state = livingState("s452-crisis-logic");
    settlementOf(state).stability = 35;
    settlementOf(state).prosperity = 20;
    state.lineage.worldInfluence = influence([{ id: "ash-capital", value: 5 }]);

    const ticked = tick(state, "s452-crisis-tick");

    expect(ticked.world!.activities.some((item) => item.id.startsWith("unrest.ash-capital"))).toBe(true);
  });

  it("влияние не даёт неограниченного роста значений мира", () => {
    let state = livingState("s452-growth");
    settlementOf(state).prosperity = 95;
    state.lineage.worldInfluence = influence([{ id: "ash-capital", value: 5 }]);

    for (let age = 20; age < 50; age++) {
      state.life.age = age;
      state = tick(state, `s452-growth-${age}`);
    }

    expect(settlementOf(state).prosperity).toBeLessThanOrEqual(100);
    expect(worldInfluenceValue(state.lineage.worldInfluence, "settlement", "ash-capital")).toBe(MAX_WORLD_INFLUENCE);
  });
});

describe("Stage 04.5.2: сохранение и наследование", () => {
  it("влияние переживает сохранение и загрузку", () => {
    const state = livingState("s452-save");
    state.lineage.worldInfluence = influence([{ id: "ash-capital", value: 4 }], [{ id: "order-of-ash", value: -2 }]);

    const restored = parseSave(deepClone(state));

    expect(restored.schemaVersion).toBe(13);
    expect(restored.lineage.worldInfluence).toEqual(state.lineage.worldInfluence);
  });

  it("влияние переживает наследование", () => {
    const dead = deepClone(deadWithHeir());
    dead.lineage.worldInfluence = influence([{ id: "ash-capital", value: 3 }], [{ id: "order-of-ash", value: -2 }]);
    const heir = heirCandidates(dead).find((candidate) => candidate.available)!;

    const { state } = succeed(dead, heir.npc.id, "s452-succ-salt");

    expect(state.lineage.worldInfluence).toEqual(dead.lineage.worldInfluence);
    expect(state.world).toBeDefined();
  });

  it("старое сохранение без поля влияния остаётся валидным", () => {
    const state = livingState("s452-legacy");
    const raw = deepClone(state);
    delete (raw.lineage as unknown as Record<string, unknown>).worldInfluence;

    const restored = parseSave(raw);
    expect(restored.lineage).not.toHaveProperty("worldInfluence");

    // Как и остальные поля старых сохранений, влияние нормализуется на границе действия
    const normalized = applyAction(restored, { type: "setMode", mode: "manual" }).state;
    expect(normalized.lineage.worldInfluence).toEqual({ settlements: [], factions: [] });
  });

  it("испорченные данные влияния отклоняются, а не принимаются молча", () => {
    const state = livingState("s452-malformed");
    const base = deepClone(state);

    const outOfRange = deepClone(base);
    outOfRange.lineage.worldInfluence = { settlements: [{ id: "ash-capital", value: 99 }], factions: [] };
    expect(() => parseSave(outOfRange)).toThrow();

    const unknownId = deepClone(base);
    unknownId.lineage.worldInfluence = { settlements: [{ id: "nowhere", value: 1 }], factions: [] };
    expect(() => parseSave(unknownId)).toThrow();

    const duplicate = deepClone(base);
    duplicate.lineage.worldInfluence = { settlements: [{ id: "ash-capital", value: 1 }, { id: "ash-capital", value: 2 }], factions: [] };
    expect(() => parseSave(duplicate)).toThrow();
  });

  it("старое состояние мира без поля влияния не ломает мировой тик", () => {
    const state = livingState("s452-legacy-tick");
    delete (state.lineage as unknown as Record<string, unknown>).worldInfluence;

    expect(() => tick(state, "s452-legacy-tick-world")).not.toThrow();
  });
});

describe("Stage 04.5.2: регрессия Stage 04.5.1", () => {
  it("кризис поселения по-прежнему доступен по реальному состоянию мира", () => {
    const state = livingState("s452-reg-crisis");
    settlementOf(state).stability = 20;
    expect(isEligible(state, eventOf(CRISIS))).toBe(true);

    settlementOf(state).stability = 80;
    expect(isEligible(state, eventOf(CRISIS))).toBe(false);
  });

  it("приглашение фракции по-прежнему зависит от её влияния", () => {
    const state = livingState("s452-reg-faction");
    factionOf(state).influence = 10;
    expect(isEligible(state, eventOf(FACTION))).toBe(true);

    factionOf(state).influence = 9;
    expect(isEligible(state, eventOf(FACTION))).toBe(false);
  });

  it("влияние не подменяет личный прогресс сюжетов и славу рода", () => {
    const state = livingState("s452-reg-scope");
    state.character.wealth = 50;
    settlementOf(state).stability = 20;

    const after = choose(state, CRISIS, "aid");

    expect(after.lineage.stories[CRISIS]).toBe(1);
    expect(after.character.storyProgress?.[CRISIS]).toBeUndefined();
    expect(after.character.reputation).toBe(state.character.reputation + 4);
  });
});
