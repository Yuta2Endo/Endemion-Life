// Stage 04.5.4: обратная связь мира — восстановление поселения, которому помог род, открывает новый нарратив
import { describe, expect, it } from "vitest";
import {
  applyAction,
  deepClone,
  eventProblems,
  findEvent,
  getUniverse,
  heirCandidates,
  isEligible,
  parseSave,
  succeed,
  type GameState
} from "../src/index.js";
import { applyEffect, getStoryProgress } from "../src/engine/effects.js";
import { selectEvent } from "../src/narrative/selection.js";
import { fx } from "../src/narrative/dsl.js";
import type { EngineContext } from "../src/engine/context.js";
import { Rng } from "../src/rng.js";
import { worldTick } from "../src/world/state.js";
import { playLife, start } from "./helpers.js";

const UNIVERSE = getUniverse("dark-fantasy");
const EVENT = "world.settlement-recovery.ash-capital";
const MEMORY = "story.ancestor-promise";
const CRISIS = "world.settlement-crisis.ash-capital";
const ANCESTOR = "world.ancestor-promise.ash-capital";

function eventOf(id: string) {
  const event = findEvent(UNIVERSE, id);
  if (!event) throw new Error(`нет события ${id}`);
  return event;
}

function ctxOf(state: GameState, seed = "stage-04-5-4"): EngineContext {
  return {
    state,
    rng: Rng.fromSeed(seed, "story"),
    universe: getUniverse(state.character.universeId),
    changes: []
  };
}

function livingState(seed = "s454-living"): GameState {
  const state = start({ seed, universeId: "dark-fantasy" });
  state.life.age = 20;
  return state;
}

function settlementOf(state: GameState, id = "ash-capital") {
  const settlement = state.world?.settlements.find((item) => item.id === id);
  if (!settlement) throw new Error(`нет поселения ${id}`);
  return settlement;
}

function influenceOf(state: GameState, id = "ash-capital"): number {
  return state.lineage.worldInfluence.settlements.find((item) => item.id === id)?.value ?? 0;
}

function choose(state: GameState, eventId: string, choiceId: string): GameState {
  const next = deepClone(state);
  next.pending = { eventId, age: next.life.age };
  return applyAction(next, { type: "choose", choiceId }).state;
}

/** Записывает ровно те эффекты, которыми выбор aid предка создаёт родовую память */
function markAid(state: GameState): GameState {
  const ctx = ctxOf(state);
  applyEffect(ctx, fx.advanceStory(MEMORY, 0, 1, "lineage"));
  applyEffect(ctx, fx.recordStoryChoice(MEMORY, CRISIS, "aid", "lineage"));
  return ctx.state;
}

/** Живой персонаж, чей род ранее помог Пепельной столице, а город уже восстановился */
function recoveredState(seed = "s454-recovered"): GameState {
  const state = markAid(livingState(seed));
  settlementOf(state).stability = 70;
  return state;
}

let deadCache: GameState | undefined;

/** Мёртвая жизнь с живым наследником — общая для тестов наследования */
function deadWithHeir(): GameState {
  if (deadCache) return deadCache;
  for (let k = 0; k < 30; k++) {
    const { state } = playLife(start({ seed: `s454-succ-${k}`, universeId: "dark-fantasy" }), 400, (n, i) => (i * 3 + k) % n);
    if (!state.life.alive && heirCandidates(state).some((h) => h.available)) {
      deadCache = state;
      return state;
    }
  }
  throw new Error("нет жизни с наследником");
}

/** Чистый род без случайно накопленной памяти о кризисе */
function cleanDead(): GameState {
  const dead = deepClone(deadWithHeir());
  dead.lineage.storyProgress = {};
  dead.lineage.stories[EVENT] = 0;
  return dead;
}

describe("Stage 04.5.4: доступность реакции мира", () => {
  it("без памяти о помощи событие недоступно, даже если город восстановился", () => {
    const state = livingState("s454-no-memory");
    settlementOf(state).stability = 70;

    expect(isEligible(state, eventOf(EVENT))).toBe(false);
  });

  it("при памяти о помощи событие недоступно, пока город не восстановился", () => {
    const state = markAid(livingState("s454-not-yet"));
    settlementOf(state).stability = 69;

    expect(isEligible(state, eventOf(EVENT))).toBe(false);
  });

  it("при памяти о помощи и реальном восстановлении событие доступно", () => {
    const state = recoveredState();

    expect(isEligible(state, eventOf(EVENT))).toBe(true);
  });

  it("восстановление другого поселения не открывает событие", () => {
    const state = markAid(livingState("s454-other-settlement"));
    settlementOf(state).stability = 50;
    settlementOf(state, "mist-border").stability = 95;

    expect(isEligible(state, eventOf(EVENT))).toBe(false);
  });

  it("условия опираются на состояние мира и машинные id, а не на локализованный текст", () => {
    const event = eventOf(EVENT);
    const conditions = event.conditions ?? [];
    const settlement = conditions.find((item) => item.type === "settlement");
    const choice = conditions.find((item) => item.type === "storyChoice");

    expect(settlement).toMatchObject({ type: "settlement", id: "ash-capital", stability: { min: 70 } });
    expect(choice).toMatchObject({ type: "storyChoice", id: MEMORY, eventId: CRISIS, choiceId: "aid", scope: "lineage" });
    expect(EVENT).not.toMatch(/[А-Яа-я]/u);
  });
});

describe("Stage 04.5.4: последствия восстановления", () => {
  it("принятие благодарности даёт славу, репутацию и ограниченное влияние", () => {
    const state = recoveredState("s454-accept");
    const beforeReputation = state.character.reputation;
    const beforeKarma = state.character.karma;
    const beforeRenown = state.lineage.renown;
    const beforeSettlement = { ...settlementOf(state) };

    const after = choose(state, EVENT, "accept");

    expect(settlementOf(after)).toEqual(beforeSettlement);
    expect(after.character.reputation).toBe(beforeReputation + 2);
    expect(after.character.karma).toBe(beforeKarma + 2);
    expect(after.lineage.renown).toBe(beforeRenown + 2);
    expect(influenceOf(after)).toBe(influenceOf(state) + 1);
    expect(settlementOf(after, "mist-border")).toEqual(settlementOf(state, "mist-border"));
    expect(after.lineage.worldInfluence.settlements.map((item) => item.id)).toEqual(["ash-capital"]);
  });

  it("влияние уважает существующий предел 04.5.2 и не создаёт второй счётчик", () => {
    const state = recoveredState("s454-cap");
    state.lineage.worldInfluence.settlements = [{ id: "ash-capital", value: 5 }];

    const after = choose(state, EVENT, "accept");

    expect(influenceOf(after)).toBe(5);
    expect(after.lineage.worldInfluence.settlements).toEqual([{ id: "ash-capital", value: 5 }]);
    expect(Object.keys(after.lineage.worldInfluence).sort()).toEqual(["factions", "settlements"]);
  });

  it("подать даёт золото, но не трогает мир и влияние", () => {
    const state = recoveredState("s454-levy");
    state.character.wealth = 10;
    const beforeReputation = state.character.reputation;
    const beforeKarma = state.character.karma;
    const beforeSettlement = { ...settlementOf(state) };
    const beforeInfluence = influenceOf(state);

    const after = choose(state, EVENT, "levy");

    expect(after.character.wealth).toBe(30);
    expect(after.character.karma).toBe(beforeKarma - 3);
    expect(after.character.reputation).toBe(beforeReputation - 1);
    expect(settlementOf(after)).toEqual(beforeSettlement);
    expect(influenceOf(after)).toBe(beforeInfluence);
  });

  it("одно и то же восстановление не выдаёт награду дважды", () => {
    const state = recoveredState("s454-duplicate");
    // Как и в реальном цикле: событие выбрано в этом году, счётчик повторов уже поднят
    state.occurrences[EVENT] = 1;
    const after = choose(state, EVENT, "accept");

    expect(after.lineage.stories[EVENT]).toBe(1);
    expect(after.occurrences[EVENT]).toBe(1);
    expect(isEligible(after, eventOf(EVENT))).toBe(false);

    // Даже если личный счётчик повторов сбросить, родовой предел блокирует событие
    after.occurrences[EVENT] = 0;
    expect(isEligible(after, eventOf(EVENT))).toBe(false);
  });
});

describe("Stage 04.5.4: сохранение и наследование", () => {
  it("полученная реакция и её последствия переживают сохранение и загрузку", () => {
    const state = recoveredState("s454-save-after");
    const after = choose(state, EVENT, "accept");

    const restored = parseSave(deepClone(after));

    expect(restored.schemaVersion).toBe(8);
    expect(restored.lineage.stories[EVENT]).toBe(1);
    expect(influenceOf(restored)).toBe(influenceOf(after));
    restored.life.age = 20;
    expect(isEligible(restored, eventOf(EVENT))).toBe(false);
  });

  it("несработавшая реакция остаётся доступной после сохранения", () => {
    const state = recoveredState("s454-save-before");
    const restored = parseSave(deepClone(state));

    expect(restored.schemaVersion).toBe(8);
    restored.life.age = 20;
    expect(isEligible(restored, eventOf(EVENT))).toBe(true);
  });

  it("старое сохранение без storyProgress остаётся валидным", () => {
    const state = livingState("s454-legacy-save");
    const raw = deepClone(state);
    delete (raw.lineage as unknown as Record<string, unknown>).storyProgress;
    delete (raw.character as unknown as Record<string, unknown>).storyProgress;

    const restored = parseSave(raw);
    expect(restored.lineage).not.toHaveProperty("storyProgress");

    const normalized = applyAction(restored, { type: "setMode", mode: "manual" }).state;
    expect(normalized.lineage.storyProgress).toEqual({});
  });

  it("испорченный storyProgress отклоняется существующей валидацией", () => {
    const state = livingState("s454-malformed");
    state.lineage.storyProgress = { [MEMORY]: { stage: -1, completed: false, choices: {} } };

    expect(() => parseSave(deepClone(state))).toThrow();
  });

  it("родовая реакция и память о помощи переживают наследование", () => {
    const dead = cleanDead();
    const ctx = ctxOf(dead);
    applyEffect(ctx, fx.advanceStory(MEMORY, 0, 1, "lineage"));
    applyEffect(ctx, fx.recordStoryChoice(MEMORY, CRISIS, "aid", "lineage"));
    settlementOf(dead).stability = 80;

    const heir = heirCandidates(dead).find((candidate) => candidate.available)!;
    const { state } = succeed(dead, heir.npc.id, "s454-heir");
    state.life.age = 20;

    expect(isEligible(state, eventOf(EVENT))).toBe(true);
    // Регрессия 04.5.3: сюжет о памяти предка продолжает работать
    expect(isEligible(state, eventOf(ANCESTOR))).toBe(true);
  });

  it("полученная реакция не повторяется после следующего наследования", () => {
    const consumed = choose(recoveredState("s454-consumed"), EVENT, "accept");
    const dead = cleanDead();
    dead.lineage = deepClone(consumed.lineage);
    settlementOf(dead).stability = 80;

    const heir = heirCandidates(dead).find((candidate) => candidate.available)!;
    const { state } = succeed(dead, heir.npc.id, "s454-consumed-heir");
    state.life.age = 20;

    expect(state.lineage.stories[EVENT]).toBe(1);
    expect(isEligible(state, eventOf(EVENT))).toBe(false);
  });
});

describe("Stage 04.5.4: детерминизм и регрессия", () => {
  it("одинаковые состояния и выборы дают одинаковый мир и родовые записи", () => {
    const first = recoveredState("s454-det");
    const second = deepClone(first);

    const chosenFirst = choose(first, EVENT, "accept");
    const chosenSecond = choose(second, EVENT, "accept");

    expect(chosenFirst.world).toEqual(chosenSecond.world);
    expect(chosenFirst.lineage.worldInfluence).toEqual(chosenSecond.lineage.worldInfluence);
    expect(chosenFirst.lineage.stories).toEqual(chosenSecond.lineage.stories);
    expect(chosenFirst.character.reputation).toBe(chosenSecond.character.reputation);
  });

  it("выбор события детерминирован при одинаковом состоянии и seed", () => {
    const state = recoveredState("s454-select");

    const first = selectEvent(ctxOf(deepClone(state), "s454-select-seed"));
    const second = selectEvent(ctxOf(deepClone(state), "s454-select-seed"));

    expect(first?.id ?? null).toBe(second?.id ?? null);
    expect(isEligible(state, eventOf(EVENT))).toBe(true);
  });

  it("повторные worldTick не выдают родовую награду и не включают событие после расхода", () => {
    const state = recoveredState("s454-ticks");
    settlementOf(state).stability = 100;
    settlementOf(state).prosperity = 100;
    const beforeRenown = state.lineage.renown;

    const ctx = ctxOf(deepClone(state), "s454-ticks-rng");
    worldTick(ctx);
    worldTick(ctx);

    expect(ctx.state.lineage.renown).toBe(beforeRenown);
    expect(ctx.state.lineage.stories[EVENT]).toBeUndefined();
    expect(isEligible(ctx.state, eventOf(EVENT))).toBe(true);

    ctx.state.occurrences[EVENT] = 1;
    ctx.state.lineage.stories[EVENT] = 1;
    worldTick(ctx);
    expect(isEligible(ctx.state, eventOf(EVENT))).toBe(false);
  });

  it("Stage 04.5.1: кризис по-прежнему восстанавливает Пепельную столицу", () => {
    const state = livingState("s454-reg-451");
    state.character.wealth = 50;
    settlementOf(state).stability = 20;
    const beforeProsperity = settlementOf(state).prosperity;

    const after = choose(state, CRISIS, "aid");

    expect(settlementOf(after).stability).toBe(32);
    expect(settlementOf(after).prosperity).toBe(beforeProsperity + 5);
  });

  it("Stage 04.5.2: влияние по-прежнему применяется через worldTick", () => {
    const state = livingState("s454-reg-452");
    settlementOf(state).prosperity = 50;
    state.lineage.worldInfluence.settlements = [{ id: "ash-capital", value: 4 }];

    const ctx = ctxOf(state, "s454-world");
    worldTick(ctx);

    expect(settlementOf(ctx.state).prosperity).toBeGreaterThan(50);
  });

  it("Stage 04.5.3: сюжет памяти предка сохраняет свою область и завершение", () => {
    const state = recoveredState("s454-reg-453");
    state.character.wealth = 50;

    expect(isEligible(state, eventOf(EVENT))).toBe(true);
    // Новое событие не пишет в чужой сюжет и не подменяет его выбор
    const after = choose(state, EVENT, "accept");
    const progress = getStoryProgress(after, MEMORY, "lineage");
    expect(progress.stage).toBe(1);
    expect(progress.choices[CRISIS]).toBe("aid");
    expect(after.character.storyProgress?.[MEMORY]).toBeUndefined();
  });

  it("контент мира проходит проверку ссылок после добавления реакции", () => {
    expect(eventProblems("dark-fantasy")).toEqual([]);
  });
});
