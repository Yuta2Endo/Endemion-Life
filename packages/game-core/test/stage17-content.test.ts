// Stage 17: конец второй дороги — выбор, не единственная печать. Третьей дороги нет: цель «все дела» не сдвигается.
import { describe, expect, it } from "vitest";
import { adventuresOf, applyAction, contentProblems, eventProblems, findEvent, getUniverse, presentAdventure, presentEvent, UNIVERSE_IDS, type GameState, type UniverseId } from "../src/index.js";
import { playLife, start } from "./helpers.js";

const FORK: Readonly<Record<UniverseId, string>> = {
  "dark-fantasy": "bury",
  isekai: "keep",
  murim: "share",
  xianxia: "silence",
  hunter: "quiet",
  academy: "rose"
};

function grown(universeId: UniverseId): GameState {
  const state = start({ seed: `pack-${universeId}`, universeId });
  state.life = { ...state.life, age: 30, stage: "adult" };
  state.pending = null;
  for (const key of Object.keys(state.character.stats) as (keyof typeof state.character.stats)[]) state.character.stats[key] = 40;
  return state;
}

function walk(state: GameState, prefer: string): GameState {
  let current = state;
  for (let guard = 0; guard < 8 && current.adventure.active; guard += 1) {
    const choices = presentAdventure(current).current?.step.choices.filter((item) => item.available) ?? [];
    const pick = choices.find((item) => item.id === prefer) ?? choices[0];
    if (!pick) break;
    current = applyAction(current, { type: "venture", choiceId: pick.id }).state;
  }
  return current;
}

const FORK_YEAR: Readonly<Record<UniverseId, { id: string; choice: string; later: string }>> = {
  "dark-fantasy": { id: "df.winter-call", choice: "stay", later: "df.c-winter-kept" },
  isekai: { id: "is.guild-or-home", choice: "sign", later: "is.c-guild-year" },
  murim: { id: "mu.tournament-or-mother", choice: "go", later: "mu.c-mother-blessing" },
  xianxia: { id: "xx.seclusion-letter", choice: "stay", later: "xx.c-letter-unopened" },
  hunter: { id: "hu.raid-or-recital", choice: "raid", later: "hu.c-missed-night" },
  academy: { id: "ac.ball-or-exam", choice: "exam", later: "ac.c-exam-notice" }
};

describe("Stage 24: развилка года", () => {
  const CHAINS: Readonly<Record<UniverseId, { first: string; second: string; choice: string }>> = {
  "dark-fantasy": { first: "df.winter-call", second: "df.ash-return", choice: "stay" },
  isekai: { first: "is.guild-or-home", second: "is.seal-year", choice: "sign" },
  murim: { first: "mu.tournament-or-mother", second: "mu.platform-return", choice: "go" },
  xianxia: { first: "xx.seclusion-letter", second: "xx.cave-door", choice: "stay" },
  hunter: { first: "hu.raid-or-recital", second: "hu.ranking-cut", choice: "raid" },
  academy: { first: "ac.ball-or-exam", second: "ac.tower-reply", choice: "exam" }
};

it("цепочка года ставит продолжение через несколько лет", () => {
  for (const universeId of UNIVERSE_IDS) {
    const chain = CHAINS[universeId];
    const state = grown(universeId);
    state.pending = { eventId: chain.first, age: state.life.age };
    const next = applyAction(state, { type: "choose", choiceId: chain.choice }).state;
    expect(next.scheduled.some((item) => item.eventId === chain.second && item.age >= state.life.age + 3), universeId).toBe(true);
    expect(findEvent(getUniverse(universeId), chain.second)?.scheduledOnly).toBe(true);
  }
});

it("за сорок лет одно событие не приходит трижды подряд", () => {
  for (const universeId of UNIVERSE_IDS) {
    const played = playLife(start({ seed: `pace-${universeId}`, universeId }), 120);
    const ids = played.entries.filter((entry) => entry.kind === "event" && entry.eventId).map((entry) => entry.eventId);
    for (let i = 2; i < ids.length; i++) {
      expect(ids[i] === ids[i - 1] && ids[i] === ids[i - 2], `${universeId} ${ids[i]}`).toBe(false);
    }
  }
});

it("у каждого мира есть выбор с отложенным последствием", () => {
    expect(eventProblems()).toEqual([]);
    for (const universeId of UNIVERSE_IDS) {
      const fork = FORK_YEAR[universeId];
      const event = findEvent(getUniverse(universeId), fork.id);
      expect(event, universeId).toBeDefined();
      expect(event!.choices.length).toBeGreaterThanOrEqual(3);
      const state = grown(universeId);
      state.pending = { eventId: fork.id, age: state.life.age };
      const view = presentEvent(state);
      expect(view!.scheduled).toBe(false);
      expect(view!.choices.some((choice) => choice.available)).toBe(true);
      const next = applyAction(state, { type: "choose", choiceId: fork.choice }).state;
      expect(next.consequences.some((item) => item.id === fork.later)).toBe(true);
    }
  });
});

describe("Stage 17: развилка второй дороги", () => {
  it("контент цел, дорог по-прежнему две, у финала два конца", () => {
    expect(contentProblems()).toEqual([]);
    expect(eventProblems()).toEqual([]);
    for (const universeId of UNIVERSE_IDS) {
      const list = adventuresOf(universeId);
      expect(list, universeId).toHaveLength(2);
      const last = list[1]!.steps.at(-1)!;
      const ids = last.choices.map((choice) => choice.id);
      expect(ids, list[1]!.id).toContain(FORK[universeId]);
      expect(last.choices.every((choice) => choice.success.complete === true)).toBe(true);
      expect(last.choices.every((choice) => choice.check === undefined)).toBe(true);
    }
  });

  it("тихий конец закрывает дело и не повторяет награду", () => {
    for (const universeId of UNIVERSE_IDS) {
      const list = adventuresOf(universeId);
      const state = grown(universeId);
      state.adventure.discovered.push(list[0]!.placeId, list[1]!.placeId);
      state.adventure.done.push(list[0]!.id);
      let current = applyAction(state, { type: "venture", adventureId: list[1]!.id }).state;
      current = walk(current, FORK[universeId]);
      expect(current.adventure.done, universeId).toContain(list[1]!.id);
      expect(current.adventure.active).toBeNull();
      const wealth = current.character.wealth;
      expect(() => applyAction(current, { type: "venture", adventureId: list[1]!.id })).toThrow();
      expect(current.character.wealth).toBe(wealth);
    }
  });
});