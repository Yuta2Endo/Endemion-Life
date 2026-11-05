import { describe, expect, it } from "vitest";
import {
  applyAction,
  checkChance,
  deepClone,
  effectiveStats,
  findEvent,
  getUniverse,
  MAX_CHANCE,
  MIN_CHANCE,
  presentEvent,
  STAT_KEYS,
  type GameState
} from "../src/index.js";
import { choiceIds, start } from "./helpers.js";

/** Состояние с заданным событием в ожидании ответа */
function withPending(state: GameState, eventId: string): GameState {
  return { ...deepClone(state), pending: { eventId, age: state.life.age } };
}

function untilEvent(state: GameState): GameState {
  let current = state;
  for (let i = 0; i < 200 && !current.pending; i++) current = applyAction(current, { type: "advance" }).state;
  if (!current.pending) throw new Error("событие не наступило");
  return current;
}

describe("Narrative Engine", () => {
  it("события появляются и имеют варианты выбора", () => {
    const state = untilEvent(start({ seed: "events" }));
    const view = presentEvent(state);
    expect(view).not.toBeNull();
    expect(view!.choices.length).toBeGreaterThanOrEqual(2);
    expect(view!.choices.some((c) => c.available)).toBe(true);
    expect(view!.title.ru.length).toBeGreaterThan(0);
    expect(view!.title.en.length).toBeGreaterThan(0);
    expect(view!.scheduled).toBe(false);
  });

  it("выбор меняет характеристики и записывается в историю", () => {
    const base = start({ seed: "choice", universeId: "isekai" });
    const state = withPending({ ...base, life: { ...base.life, age: 5, stage: "child" } }, "common.first-friend");
    const before = state.character.stats.charisma;
    const { state: next, entries } = applyAction(state, { type: "choose", choiceId: "befriend" });
    expect(next.character.stats.charisma).toBe(before + 2);
    expect(next.character.karma).toBe(state.character.karma + 5);
    expect(next.flags).toContain("childhood-friend");
    expect(next.pending).toBeNull();
    const entry = entries.find((e) => e.kind === "event");
    expect(entry?.choiceId).toBe("befriend");
    expect(entry?.changes).toContainEqual({ kind: "stat", key: "charisma", delta: 2 });
  });

  it("недоступный вариант отклоняется", () => {
    const base = start({ seed: "locked" });
    const poor = { ...base, character: { ...base.character, wealth: 0 }, life: { ...base.life, age: 20, stage: "adult" as const } };
    const state = withPending(poor, "common.fever");
    const physician = presentEvent(state)!.choices.find((c) => c.id === "physician")!;
    expect(physician.available).toBe(false);
    expect(physician.locked[0]?.ru).toContain("Золото");
    expect(() => applyAction(state, { type: "choose", choiceId: "physician" })).toThrow(expect.objectContaining({ code: "CHOICE_LOCKED" }));
  });

  it("продолжение цепочки помечено на карточке и не пишется в сохранение", () => {
    const base = start({ seed: "chain" });
    const state = withPending(base, "common.love-test");
    expect(presentEvent(state)!.scheduled).toBe(true);
    expect(state.pending).toEqual({ eventId: "common.love-test", age: base.life.age });
  });

  it("неизвестный вариант и выбор без события отклоняются", () => {
    const state = untilEvent(start({ seed: "unknown" }));
    expect(() => applyAction(state, { type: "choose", choiceId: "hack" })).toThrow(expect.objectContaining({ code: "UNKNOWN_CHOICE" }));
    expect(() => applyAction(start(), { type: "choose", choiceId: "x" })).toThrow(expect.objectContaining({ code: "NO_PENDING_EVENT" }));
  });

  it("повтор того же выбора невозможен: событие уже закрыто", () => {
    const state = untilEvent(start({ seed: "double" }));
    const choiceId = choiceIds(state)[0]!;
    const { state: next } = applyAction(state, { type: "choose", choiceId });
    expect(() => applyAction(next, { type: "choose", choiceId })).toThrow(expect.objectContaining({ code: "NO_PENDING_EVENT" }));
  });

  it("шанс проверки зависит от характеристик и ограничен", () => {
    const state = start({ seed: "chance" });
    const check = { stats: ["strength" as const], difficulty: 12 };
    const weak = { ...state.character, stats: { ...state.character.stats, strength: 5, luck: 10 } };
    const strong = { ...state.character, stats: { ...state.character.stats, strength: 20, luck: 10 } };
    expect(checkChance(strong, check)).toBeGreaterThan(checkChance(weak, check));
    const godlike = { ...state.character, stats: Object.fromEntries(STAT_KEYS.map((k) => [k, 100])) as typeof state.character.stats };
    const hopeless = { ...state.character, stats: Object.fromEntries(STAT_KEYS.map((k) => [k, 1])) as typeof state.character.stats };
    expect(checkChance(godlike, check)).toBe(MAX_CHANCE);
    expect(checkChance(hopeless, check)).toBe(MIN_CHANCE);
  });

  it("сюжетная цепочка продолжается запланированным событием", () => {
    const base = start({ seed: "chain", universeId: "isekai" });
    const strong = { ...base.character, stats: Object.fromEntries(STAT_KEYS.map((k) => [k, 100])) as typeof base.character.stats };
    let state = withPending({ ...base, character: strong, life: { ...base.life, age: 18, stage: "teen" } }, "common.first-love");
    state = applyAction(state, { type: "choose", choiceId: "approach" }).state;
    expect(state.flags).toContain("in-love");
    expect(state.scheduled).toContainEqual({ eventId: "common.love-test", age: 21 });
    for (let i = 0; i < 5 && state.pending?.eventId !== "common.love-test"; i++) {
      state = state.pending ? applyAction(state, { type: "choose", choiceId: choiceIds(state)[0]! }).state : applyAction(state, { type: "advance" }).state;
    }
    expect(state.pending?.eventId).toBe("common.love-test");
  });

  it("прорыв повышает ранг пути и бонус к характеристикам", () => {
    const base = start({ seed: "rank", universeId: "xianxia", originId: "cultivator-clan" });
    const universe = getUniverse("xianxia");
    const ready = {
      ...base,
      character: {
        ...base.character,
        stats: Object.fromEntries(STAT_KEYS.map((k) => [k, 100])) as typeof base.character.stats,
        track: { points: universe.track.ranks[1]!.threshold, rank: 0 }
      },
      life: { ...base.life, age: 16, stage: "teen" as const }
    };
    const state = withPending(ready, "xx.tribulation");
    // При максимальных характеристиках шанс 95%: перебираем seed, пока проверка не пройдёт
    let next: GameState | undefined;
    for (let i = 0; i < 20 && !next; i++) {
      const result = applyAction({ ...state, rngState: i * 7919 }, { type: "choose", choiceId: "face" });
      if (result.state.character.track.rank === 1) next = result.state;
    }
    expect(next).toBeDefined();
    expect(effectiveStats(next!.character).vitality).toBe(100);
    expect(next!.character.stats.vitality).toBe(100);
    const lowered = { ...next!.character, stats: { ...next!.character.stats, vitality: 10 } };
    expect(effectiveStats(lowered).vitality).toBe(10 + (universe.track.ranks[1]!.statBonus.vitality ?? 0));
  });

  it("путь силы закрыт без клятвы: очки не копятся", () => {
    let state = start({ seed: "closed", universeId: "dark-fantasy", originId: "peasant" });
    for (let i = 0; i < 40 && state.life.alive; i++) {
      state = state.pending
        ? applyAction(state, { type: "choose", choiceId: choiceIds(state).includes("refuse") ? "refuse" : choiceIds(state)[0]! }).state
        : applyAction(state, { type: "advance" }).state;
    }
    if (!state.flags.includes("oath-sworn")) expect(state.character.track.points).toBe(0);
  });

  it("findEvent находит общие события в любой вселенной", () => {
    expect(findEvent(getUniverse("hunter"), "common.fever")).toBeDefined();
    expect(findEvent(getUniverse("hunter"), "xx.tribulation")).toBeUndefined();
  });
});
