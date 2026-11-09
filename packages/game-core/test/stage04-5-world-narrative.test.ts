// Stage 04.5.1: Мир → нарратив — кризис поселения и приглашение фракции как сюжетные возможности
import { describe, expect, it } from "vitest";
import {
  applyAction,
  checkCondition,
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
import { applyEffect } from "../src/engine/effects.js";
import { selectEvent } from "../src/narrative/selection.js";
import { fx } from "../src/narrative/dsl.js";
import type { EngineContext } from "../src/engine/context.js";
import { Rng } from "../src/rng.js";
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
    rng: Rng.fromSeed("stage-04-5-1", "story"),
    universe: getUniverse(state.character.universeId),
    changes: []
  };
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

/** Живой персонаж в мире dark-fantasy с заданной стабильностью Пепельной столицы */
function crisisState(seed = "s451-crisis", stability = 20): GameState {
  const state = start({ seed, universeId: "dark-fantasy" });
  state.life.age = 20;
  const settlement = settlementOf(state);
  settlement.stability = stability;
  settlement.prosperity = 30;
  return state;
}

/** Живой персонаж в мире dark-fantasy с заданным влиянием Ордена Пепла */
function factionState(seed = "s451-faction", influence = 10): GameState {
  const state = start({ seed, universeId: "dark-fantasy" });
  state.life.age = 20;
  factionOf(state).influence = influence;
  return state;
}

/** Применяет выбор так же, как игровой цикл: событие уже ждёт ответа */
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
    const { state } = playLife(start({ seed: `s451-succ-${k}`, universeId: "dark-fantasy" }), 400, (n, i) => (i * 3 + k) % n);
    if (!state.life.alive && heirCandidates(state).some((h) => h.available)) {
      deadCache = state;
      return state;
    }
  }
  throw new Error("нет жизни с наследником");
}

describe("Stage 04.5.1: кризис поселения", () => {
  it("кризис делает событие доступным", () => {
    expect(isEligible(crisisState(), eventOf(CRISIS))).toBe(true);
  });

  it("благополучное поселение не делает событие доступным", () => {
    expect(isEligible(crisisState("s451-calm", 80), eventOf(CRISIS))).toBe(false);
  });

  it("событие привязано к реальному id Пепельной столицы, а не к другой записи мира", () => {
    const state = crisisState();
    settlementOf(state, "mist-border").stability = 90;

    const settlementCondition = eventOf(CRISIS).conditions?.find((condition) => condition.type === "settlement");
    expect(settlementCondition).toMatchObject({ id: "ash-capital" });
    expect(checkCondition(state, { type: "settlement", id: "ash-capital", stability: { max: 34 } })).toBe(true);
    expect(checkCondition(state, { type: "settlement", id: "mist-border", stability: { max: 34 } })).toBe(false);
    expect(eventOf(CRISIS).text.ru).toContain("Пепельная столица");
    expect(eventOf(CRISIS).text.en).toContain("Ashen Capital");
  });

  it("помощь тратит золото и восстанавливает стабильность и процветание поселения", () => {
    const state = crisisState();
    state.character.wealth = 50;
    const before = { ...settlementOf(state) };

    const after = choose(state, CRISIS, "aid");
    const settlement = settlementOf(after);

    expect(after.character.wealth).toBe(30);
    expect(settlement.stability).toBe(before.stability + 12);
    expect(settlement.prosperity).toBe(before.prosperity + 5);
    expect(after.character.reputation).toBe(state.character.reputation + 4);
    expect(after.world?.activities.some((item) => item.id.startsWith("narrative.ash-capital"))).toBe(true);
  });

  it("отказ от помощи не меняет поселение, но бьёт по карме и славе рода", () => {
    const state = crisisState();
    const before = { ...settlementOf(state) };

    const after = choose(state, CRISIS, "ignore");

    expect(settlementOf(after).stability).toBe(before.stability);
    expect(settlementOf(after).prosperity).toBe(before.prosperity);
    expect(after.character.karma).toBe(state.character.karma - 5);
    expect(after.lineage.renown).toBe(state.lineage.renown - 2);
  });

  it("событие не повторяется бесконечно: срабатывает лимит рода и лимит вхождений", () => {
    const after = choose(crisisState(), CRISIS, "ignore");
    expect(after.lineage.stories[CRISIS]).toBe(1);
    expect(isEligible(after, eventOf(CRISIS))).toBe(false);

    const seen = crisisState("s451-seen");
    seen.occurrences[CRISIS] = 1;
    expect(isEligible(seen, eventOf(CRISIS))).toBe(false);
  });
});

describe("Stage 04.5.1: фракция мира", () => {
  it("влияние Ордена Пепла выше порога делает событие доступным", () => {
    expect(isEligible(factionState("s451-faction-on", 10), eventOf(FACTION))).toBe(true);
  });

  it("влияние ниже порога не делает событие доступным", () => {
    expect(isEligible(factionState("s451-faction-off", 9), eventOf(FACTION))).toBe(false);
    expect(isEligible(start({ seed: "s451-faction-zero", universeId: "dark-fantasy" }), eventOf(FACTION))).toBe(false);
  });

  it("влияние другой фракции не подменяет условие Ордена Пепла", () => {
    const state = factionState("s451-other-faction", 0);
    state.life.age = 20;
    factionOf(state, "crown").influence = 100;
    expect(isEligible(state, eventOf(FACTION))).toBe(false);
  });

  it("событие уважает лимит вхождений", () => {
    const state = factionState("s451-faction-limit");
    state.occurrences[FACTION] = 1;
    expect(isEligible(state, eventOf(FACTION))).toBe(false);

    const after = choose(factionState("s451-faction-choice"), FACTION, "accept");
    expect(after.lineage.stories[FACTION]).toBe(1);
    expect(isEligible(after, eventOf(FACTION))).toBe(false);
  });

  it("выборы меняют правильное личное отношение к фракции", () => {
    const state = factionState();
    const before = state.character.factions["order-of-ash"] ?? 0;
    const otherBefore = state.character.factions["mist-cult"] ?? 0;

    const accepted = choose(state, FACTION, "accept");
    expect(accepted.character.factions["order-of-ash"]).toBe(before + 10);
    expect(accepted.character.factions["mist-cult"] ?? 0).toBe(otherBefore);

    const declined = choose(state, FACTION, "decline");
    expect(declined.character.factions["order-of-ash"]).toBe(before - 6);
    expect(declined.character.karma).toBe(state.character.karma + 2);
  });
});

describe("Stage 04.5.1: отложенные события и согласованность мира", () => {
  it("повторное планирование одного события не создаёт дубль", () => {
    const state = crisisState();
    const ctx = ctxOf(state);
    applyEffect(ctx, fx.schedule(FOLLOWUP, 3));
    applyEffect(ctx, fx.schedule(FOLLOWUP, 3));

    expect(ctx.state.scheduled.filter((item) => item.eventId === FOLLOWUP)).toHaveLength(1);
  });

  it("обещание помощи действительно ставит продолжение в очередь", () => {
    const after = choose(crisisState(), CRISIS, "postpone");
    expect(after.scheduled.some((item) => item.eventId === FOLLOWUP)).toBe(true);
  });

  it("продолжение не показывается, если кризис уже прошёл", () => {
    const state = crisisState();
    state.scheduled.push({ eventId: FOLLOWUP, age: state.life.age });
    settlementOf(state).stability = 80;

    const ctx = ctxOf(state);
    const picked = selectEvent(ctx);

    expect(picked?.id).not.toBe(FOLLOWUP);
    expect(ctx.state.scheduled.some((item) => item.eventId === FOLLOWUP)).toBe(true);
  });

  it("устаревшее продолжение отбрасывается после льготного срока, а не копится вечно", () => {
    const state = crisisState();
    state.scheduled.push({ eventId: FOLLOWUP, age: 20 });
    settlementOf(state).stability = 80;
    state.life.age = 26;

    selectEvent(ctxOf(state));

    expect(state.scheduled.some((item) => item.eventId === FOLLOWUP)).toBe(false);
  });

  it("старые записи мира не переоткрывают уже случившееся событие", () => {
    const state = crisisState();
    state.world!.activities = Array.from({ length: 24 }, (_, index) => ({
      id: `unrest.ash-capital.20.${index}`,
      age: 20,
      kind: "crisis" as const,
      title: { ru: "Беспокойство", en: "Unrest" },
      text: { ru: "Тревога", en: "Alarm" }
    }));
    state.lineage.stories[CRISIS] = 1;

    expect(isEligible(state, eventOf(CRISIS))).toBe(false);
  });

  it("разные кризисы проверяются независимо: закрытие одного не закрывает другой", () => {
    const state = crisisState();
    factionOf(state).influence = 10;
    state.lineage.stories[CRISIS] = 1;

    expect(isEligible(state, eventOf(CRISIS))).toBe(false);
    expect(isEligible(state, eventOf(FACTION))).toBe(true);

    state.lineage.stories[CRISIS] = 0;
    state.lineage.stories[FACTION] = 1;
    expect(isEligible(state, eventOf(CRISIS))).toBe(true);
    expect(isEligible(state, eventOf(FACTION))).toBe(false);
  });

  it("новые события проходят проверку ссылок и локализации", () => {
    const problems = eventProblems("dark-fantasy").filter((problem) => problem.includes("world."));
    expect(problems).toEqual([]);
  });
});

describe("Stage 04.5.1: детерминизм и наследование", () => {
  it("одинаковое состояние и выбор дают одинаковый результат, включая проверку", () => {
    const state = factionState("s451-deterministic");

    const first = choose(state, FACTION, "negotiate");
    const second = choose(deepClone(state), FACTION, "negotiate");

    expect(first.character.factions["order-of-ash"]).toBe(second.character.factions["order-of-ash"]);
    expect(first.character.wealth).toBe(second.character.wealth);
    expect(first.rngState).toBe(second.rngState);
    expect(first.world).toEqual(second.world);
  });

  it("мир переживает наследование без сброса поселений и фракций", () => {
    const dead = deadWithHeir();
    const heir = heirCandidates(dead).find((candidate) => candidate.available)!;
    const { state } = succeed(dead, heir.npc.id, "s451-succ-salt");

    expect(state.world).toBeDefined();
    expect(state.world!.tick).toBe(dead.world!.tick);
    expect(state.world!.settlements.map((item) => item.id)).toEqual(dead.world!.settlements.map((item) => item.id));
    expect(state.world!.factions.map((item) => item.id)).toEqual(dead.world!.factions.map((item) => item.id));
  });

  it("завершённая возможность не возвращается после наследования", () => {
    const dead = deadWithHeir();
    const completed = deepClone(dead);
    completed.lineage.stories[CRISIS] = 1;
    completed.world!.settlements.find((item) => item.id === "ash-capital")!.stability = 20;
    const heir = heirCandidates(completed).find((candidate) => candidate.available)!;
    const { state } = succeed(completed, heir.npc.id, "s451-succ-done");

    state.life.age = 20;
    expect(state.lineage.stories[CRISIS]).toBe(1);
    expect(isEligible(state, eventOf(CRISIS))).toBe(false);
  });

  it("личный и родовой прогресс остаются раздельными", () => {
    const after = choose(crisisState("s451-scope"), CRISIS, "ignore");

    expect(after.lineage.stories[CRISIS]).toBe(1);
    expect(after.character.storyProgress?.[CRISIS]).toBeUndefined();
    expect(after.lineage.storyProgress?.[CRISIS]).toBeUndefined();
  });

  it("состояние мира переживает сериализацию сохранения", () => {
    const state = crisisState("s451-roundtrip");
    state.character.wealth = 50;
    const after = choose(state, CRISIS, "aid");
    const restored = parseSave(deepClone(after));

    expect(settlementOf(restored).stability).toBe(settlementOf(after).stability);
    expect(settlementOf(restored).prosperity).toBe(settlementOf(after).prosperity);
    expect(restored.lineage.stories[CRISIS]).toBe(1);
    expect(restored.schemaVersion).toBe(8);
  });
});
