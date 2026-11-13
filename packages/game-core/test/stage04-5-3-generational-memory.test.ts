// Stage 04.5.3: поколенческая память мира — предок помог Пепельной столице, наследник встречает её благодарность
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
const CRISIS = "world.settlement-crisis.ash-capital";
const MEMORY = "story.ancestor-promise";
const FOLLOWUP = "world.ancestor-promise.ash-capital";

function eventOf(id: string) {
  const event = findEvent(UNIVERSE, id);
  if (!event) throw new Error(`нет события ${id}`);
  return event;
}

function ctxOf(state: GameState, seed = "stage-04-5-3"): EngineContext {
  return {
    state,
    rng: Rng.fromSeed(seed, "story"),
    universe: getUniverse(state.character.universeId),
    changes: []
  };
}

function livingState(seed = "s453-living"): GameState {
  const state = start({ seed, universeId: "dark-fantasy" });
  state.life.age = 20;
  return state;
}

function settlementOf(state: GameState, id = "ash-capital") {
  const settlement = state.world?.settlements.find((item) => item.id === id);
  if (!settlement) throw new Error(`нет поселения ${id}`);
  return settlement;
}

function choose(state: GameState, eventId: string, choiceId: string): GameState {
  const next = deepClone(state);
  next.pending = { eventId, age: next.life.age };
  return applyAction(next, { type: "choose", choiceId }).state;
}

/** Повторяет ровно те эффекты, которыми выбор aid предка записывает память рода */
function markAncestorAid(state: GameState): GameState {
  const ctx = ctxOf(state);
  applyEffect(ctx, fx.advanceStory(MEMORY, 0, 1, "lineage"));
  applyEffect(ctx, fx.recordStoryChoice(MEMORY, CRISIS, "aid", "lineage"));
  return ctx.state;
}

let deadCache: GameState | undefined;

/** Мёртвая жизнь с живым наследником — общая для тестов наследования */
function deadWithHeir(): GameState {
  if (deadCache) return deadCache;
  for (let k = 0; k < 30; k++) {
    const { state } = playLife(start({ seed: `s453-succ-${k}`, universeId: "dark-fantasy" }), 400, (n, i) => (i * 3 + k) % n);
    if (!state.life.alive && heirCandidates(state).some((h) => h.available)) {
      deadCache = state;
      return state;
    }
  }
  throw new Error("нет жизни с наследником");
}

/** Наследник, который уже знает о поступке предка */
function heirWithMemory(): GameState {
  const dead = markAncestorAid(deepClone(deadWithHeir()));
  const heir = heirCandidates(dead).find((candidate) => candidate.available)!;
  const { state } = succeed(dead, heir.npc.id, "s453-memory-salt");
  state.life.age = 20;
  return state;
}

describe("Stage 04.5.3: создание поколенческой памяти", () => {
  it("помощь предка в кризисе записывает родовой сюжет и стабильные id выбора", () => {
    const state = livingState("s453-aid");
    state.character.wealth = 50;
    settlementOf(state).stability = 20;

    const after = choose(state, CRISIS, "aid");
    const progress = getStoryProgress(after, MEMORY, "lineage");

    expect(progress.stage).toBe(1);
    expect(progress.completed).toBe(false);
    expect(progress.choices[CRISIS]).toBe("aid");
    expect(after.lineage.chronicle.some((entry) => entry.kind === "story" && entry.v.story === MEMORY)).toBe(true);
  });

  it("обычный отказ от помощи не создаёт поколенческую память", () => {
    const state = livingState("s453-ignore");
    settlementOf(state).stability = 20;

    const after = choose(state, CRISIS, "ignore");

    expect(getStoryProgress(after, MEMORY, "lineage")).toEqual({ stage: 0, completed: false, choices: {} });
    expect(after.lineage.storyProgress?.[MEMORY]).toBeUndefined();
  });

  it("другие значимые выборы 04.5.1 не помечаются как память о помощи", () => {
    const state = livingState("s453-other");
    state.character.wealth = 50;
    state.lineage.renown = 25;
    settlementOf(state).stability = 20;

    const after = choose(state, CRISIS, "influence");

    expect(getStoryProgress(after, MEMORY, "lineage").stage).toBe(0);
  });

  it("память опирается на машинные id, а не на локализованный текст", () => {
    const event = eventOf(FOLLOWUP);
    const condition = event.conditions?.find((item) => item.type === "storyStage");

    expect(event.id).toBe(FOLLOWUP);
    expect(condition).toMatchObject({ type: "storyStage", id: MEMORY, stage: 1, scope: "lineage" });
    expect(MEMORY).not.toMatch(/[А-Яа-я]/u);
  });
});

describe("Stage 04.5.3: встреча памяти наследником", () => {
  it("без памяти событие недоступно", () => {
    const state = livingState("s453-no-memory");
    expect(isEligible(state, eventOf(FOLLOWUP))).toBe(false);
  });

  it("во втором поколении без памяти событие тоже недоступно", () => {
    const dead = deepClone(deadWithHeir());
    // Прошедшая жизнь могла сама пережить кризис: для теста нужен род без памяти о помощи
    dead.lineage.storyProgress = {};
    dead.lineage.stories[FOLLOWUP] = 0;
    const heir = heirCandidates(dead).find((candidate) => candidate.available)!;
    const { state } = succeed(dead, heir.npc.id, "s453-no-memory-salt");
    state.life.age = 20;

    expect(isEligible(state, eventOf(FOLLOWUP))).toBe(false);
  });

  it("память предка делает событие доступным наследнику", () => {
    const heir = heirWithMemory();
    expect(isEligible(heir, eventOf(FOLLOWUP))).toBe(true);
  });

  it("в поколении самого предка событие ещё не показывается", () => {
    const state = markAncestorAid(livingState("s453-same-gen"));
    expect(state.lineage.generation).toBe(1);
    expect(isEligible(state, eventOf(FOLLOWUP))).toBe(false);
  });

  it("после завершения сюжета событие больше не выбирается", () => {
    const heir = heirWithMemory();
    heir.character.wealth = 50;
    const after = choose(heir, FOLLOWUP, "renew");

    const progress = getStoryProgress(after, MEMORY, "lineage");
    expect(progress.stage).toBe(2);
    expect(progress.completed).toBe(true);
    expect(after.lineage.stories[FOLLOWUP]).toBe(1);
    expect(isEligible(after, eventOf(FOLLOWUP))).toBe(false);
  });

  it("завершённая память не возвращается после следующего наследования", () => {
    const dead = deepClone(deadWithHeir());
    const ctx = ctxOf(dead);
    applyEffect(ctx, fx.advanceStory(MEMORY, 0, 1, "lineage"));
    applyEffect(ctx, fx.recordStoryChoice(MEMORY, CRISIS, "aid", "lineage"));
    applyEffect(ctx, fx.advanceStory(MEMORY, 1, 2, "lineage"));
    applyEffect(ctx, fx.completeStory(MEMORY, "lineage"));
    dead.lineage.stories[FOLLOWUP] = 1;

    const heir = heirCandidates(dead).find((candidate) => candidate.available)!;
    const { state } = succeed(dead, heir.npc.id, "s453-consumed-salt");
    state.life.age = 20;

    expect(getStoryProgress(state, MEMORY, "lineage").completed).toBe(true);
    expect(state.lineage.stories[FOLLOWUP]).toBe(1);
    expect(isEligible(state, eventOf(FOLLOWUP))).toBe(false);
  });

  it("история не может тянуться вечно: лимит рода блокирует повтор", () => {
    const state = heirWithMemory();
    state.lineage.stories[FOLLOWUP] = 1;

    expect(isEligible(state, eventOf(FOLLOWUP))).toBe(false);
  });
});

describe("Stage 04.5.3: последствия памяти", () => {
  it("подтверждение обещания тратит золото и меняет именно Пепельную столицу", () => {
    const heir = heirWithMemory();
    heir.character.wealth = 50;
    const before = { ...settlementOf(heir) };
    const beforeElsewhere = { ...settlementOf(heir, "mist-border") };
    const beforeInfluence = heir.lineage.worldInfluence.settlements.find((item) => item.id === "ash-capital")?.value ?? 0;

    const after = choose(heir, FOLLOWUP, "renew");

    expect(after.character.wealth).toBe(35);
    expect(settlementOf(after).prosperity).toBe(before.prosperity + 5);
    expect(settlementOf(after).stability).toBe(before.stability + 8);
    expect(settlementOf(after, "mist-border")).toEqual(beforeElsewhere);
    const influence = after.lineage.worldInfluence.settlements.find((item) => item.id === "ash-capital")?.value ?? 0;
    expect(influence).toBe(beforeInfluence + 1);
    expect(after.character.reputation).toBe(heir.character.reputation + 3);
    expect(after.lineage.renown).toBe(heir.lineage.renown + 2);
  });

  it("благодарность без обещания даёт репутацию рода, но не трогает поселение", () => {
    const heir = heirWithMemory();
    const before = { ...settlementOf(heir) };

    const after = choose(heir, FOLLOWUP, "honour");

    expect(settlementOf(after)).toEqual(before);
    expect(after.character.karma).toBe(heir.character.karma + 2);
    expect(after.lineage.renown).toBe(heir.lineage.renown + 1);
    expect(getStoryProgress(after, MEMORY, "lineage").completed).toBe(true);
  });

  it("память переиспользует ограниченное влияние 04.5.2, а не создаёт второй счётчик", () => {
    const heir = heirWithMemory();
    heir.character.wealth = 50;
    heir.lineage.worldInfluence.settlements = [{ id: "ash-capital", value: 5 }];

    const after = choose(heir, FOLLOWUP, "renew");

    const entries = after.lineage.worldInfluence.settlements;
    expect(entries).toEqual([{ id: "ash-capital", value: 5 }]);
    expect(Object.keys(after.lineage.worldInfluence).sort()).toEqual(["factions", "settlements"]);
  });

  it("сюжет и эффекты остаются в родовой области, не в личной", () => {
    const heir = heirWithMemory();
    heir.character.wealth = 50;

    const after = choose(heir, FOLLOWUP, "renew");

    expect(getStoryProgress(after, MEMORY, "lineage").completed).toBe(true);
    expect(after.character.storyProgress?.[MEMORY]).toBeUndefined();
  });
});

describe("Stage 04.5.3: сохранение, детерминизм и регрессия", () => {
  it("память и завершение переживают сохранение и загрузку", () => {
    const heir = heirWithMemory();
    heir.character.wealth = 50;
    const after = choose(heir, FOLLOWUP, "renew");

    const restored = parseSave(deepClone(after));

    expect(restored.schemaVersion).toBe(10);
    expect(getStoryProgress(restored, MEMORY, "lineage")).toEqual(getStoryProgress(after, MEMORY, "lineage"));
    expect(restored.lineage.stories[FOLLOWUP]).toBe(1);
    restored.life.age = 20;
    expect(isEligible(restored, eventOf(FOLLOWUP))).toBe(false);
  });

  it("незавершённая память остаётся доступной после сохранения", () => {
    const heir = heirWithMemory();
    const restored = parseSave(deepClone(heir));

    restored.life.age = 20;
    expect(getStoryProgress(restored, MEMORY, "lineage").stage).toBe(1);
    expect(isEligible(restored, eventOf(FOLLOWUP))).toBe(true);
  });

  it("старое сохранение без storyProgress остаётся валидным", () => {
    const state = livingState("s453-legacy");
    const raw = deepClone(state);
    delete (raw.lineage as unknown as Record<string, unknown>).storyProgress;
    delete (raw.character as unknown as Record<string, unknown>).storyProgress;

    const restored = parseSave(raw);
    expect(restored.lineage).not.toHaveProperty("storyProgress");

    const normalized = applyAction(restored, { type: "setMode", mode: "manual" }).state;
    expect(normalized.lineage.storyProgress).toEqual({});
  });

  it("испорченный storyProgress отклоняется существующей валидацией", () => {
    const state = livingState("s453-malformed");
    state.lineage.storyProgress = { [MEMORY]: { stage: -1, completed: false, choices: {} } };

    expect(() => parseSave(deepClone(state))).toThrow();
  });

  it("одинаковые состояния и выборы дают одинаковый сюжет, мир и выбор события", () => {
    const first = heirWithMemory();
    const second = deepClone(first);
    first.character.wealth = 50;
    second.character.wealth = 50;

    const chosenFirst = choose(first, FOLLOWUP, "renew");
    const chosenSecond = choose(second, FOLLOWUP, "renew");

    expect(getStoryProgress(chosenFirst, MEMORY, "lineage")).toEqual(getStoryProgress(chosenSecond, MEMORY, "lineage"));
    expect(chosenFirst.world).toEqual(chosenSecond.world);
    expect(chosenFirst.lineage.worldInfluence).toEqual(chosenSecond.lineage.worldInfluence);

    const eventFirst = selectEvent(ctxOf(deepClone(first), "s453-select"))?.id;
    const eventSecond = selectEvent(ctxOf(deepClone(first), "s453-select"))?.id;
    expect(eventFirst).toBe(eventSecond);
  });

  it("Stage 04.5.1: кризис по-прежнему восстанавливает поселение", () => {
    const state = livingState("s453-reg-451");
    state.character.wealth = 50;
    settlementOf(state).stability = 20;

    const after = choose(state, CRISIS, "aid");

    expect(settlementOf(after).stability).toBe(20 + 12);
    expect(settlementOf(after).prosperity).toBe(settlementOf(state).prosperity + 5);
  });

  it("Stage 04.5.2: влияние по-прежнему применяется через worldTick", () => {
    const state = livingState("s453-reg-452");
    settlementOf(state).prosperity = 50;
    state.lineage.worldInfluence.settlements = [{ id: "ash-capital", value: 4 }];

    const ctx = ctxOf(state, "s453-world");
    worldTick(ctx);

    expect(settlementOf(ctx.state).prosperity).toBeGreaterThan(50);
  });

  it("контент мира проходит проверку ссылок после добавления памяти", () => {
    expect(eventProblems("dark-fantasy")).toEqual([]);
  });
});
