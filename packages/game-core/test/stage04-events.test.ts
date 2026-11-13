// Stage 04: экономические и социальные события — ссылки на существующие фракции, сословия и шкалы, условия, паузы,
// пределы повторов, события мира только в своём мире, события выпадают в обычной игре
import { describe, expect, it } from "vitest";
import {
  applyAction,
  COMMON_EVENTS,
  deepClone,
  eventIndex,
  getUniverse,
  isEligible,
  UNIVERSE_IDS,
  type Condition,
  type Effect,
  type EventDefinition,
  type GameState
} from "../src/index.js";
import { ECONOMY_EVENTS, WORLD_ECONOMY_EVENTS } from "../src/narrative/economy-events.js";
import { findEvent } from "../src/narrative/selection.js";
import { choiceIds, start } from "./helpers.js";

function effects(event: EventDefinition): Effect[] {
  return event.choices.flatMap((c) => [...c.success.effects, ...(c.failure?.effects ?? [])]);
}

function conditions(event: EventDefinition): Condition[] {
  return [...(event.conditions ?? []), ...event.choices.flatMap((c) => c.requires ?? [])];
}

function at(state: GameState, age: number): GameState {
  const copy = deepClone(state);
  copy.life = { ...copy.life, age, stage: age < 13 ? "child" : age < 18 ? "teen" : "adult" };
  return copy;
}

const WORLD_EVENTS = Object.entries(WORLD_ECONOMY_EVENTS).flatMap(([universeId, list]) => list.map((event) => ({ universeId, event })));
const ALL = [...ECONOMY_EVENTS.map((event) => ({ universeId: null as string | null, event })), ...WORLD_EVENTS];

describe("Stage 04: экономические и социальные события", () => {
  it("общих событий не меньше восьми, у каждого мира есть свои", () => {
    expect(ECONOMY_EVENTS.length).toBeGreaterThanOrEqual(8);
    for (const universeId of UNIVERSE_IDS) expect(WORLD_ECONOMY_EVENTS[universeId].length, universeId).toBeGreaterThanOrEqual(1);
  });

  it("у каждого события — пауза и предел повторов, тексты на двух языках, хотя бы один вариант без условий", () => {
    for (const { event } of ALL) {
      expect(event.cooldown, event.id).toBeGreaterThanOrEqual(4);
      expect(event.maxOccurrences, event.id).toBeGreaterThanOrEqual(1);
      expect(event.maxOccurrences, event.id).toBeLessThanOrEqual(4);
      for (const text of [event.title, event.text, ...event.choices.flatMap((c) => [c.text, c.success.text, ...(c.failure ? [c.failure.text] : [])])]) {
        expect(text.ru.trim().length, event.id).toBeGreaterThan(0);
        expect(text.en.trim().length, event.id).toBeGreaterThan(0);
      }
      // Игрок не застрянет: есть вариант, который доступен всегда
      expect(event.choices.some((c) => (c.requires ?? []).length === 0), event.id).toBe(true);
    }
  });

  it("ссылки на фракции, сословия и шкалы указывают на существующее в своём мире", () => {
    for (const { universeId, event } of ALL) {
      const worlds = universeId ? [universeId] : [...UNIVERSE_IDS];
      for (const id of worlds) {
        const universe = getUniverse(id as (typeof UNIVERSE_IDS)[number]);
        for (const effect of effects(event)) {
          // Общие события не ссылаются на фракции и шкалы конкретного мира
          if (effect.type === "faction") {
            expect(universeId, `${event.id}: фракция в общем событии`).not.toBeNull();
            expect(universe.factions.map((f) => f.id), `${event.id} → ${effect.id}`).toContain(effect.id);
          }
          if (effect.type === "meter") {
            expect(universeId, `${event.id}: шкала в общем событии`).not.toBeNull();
            expect(universe.meters.map((m) => m.id), `${event.id} → ${effect.id}`).toContain(effect.id);
          }
        }
        for (const condition of conditions(event)) {
          if (condition.type === "socialClass") for (const cls of condition.ids) expect(universe.socialClasses.map((c) => c.id), `${event.id} → ${cls}`).toContain(cls);
          if (condition.type === "world") expect(condition.ids, event.id).toContain(id);
        }
      }
    }
  });

  it("событие мира есть только в своём мире; общие события — во всех", () => {
    for (const universeId of UNIVERSE_IDS) {
      const index = eventIndex(getUniverse(universeId));
      for (const { universeId: owner, event } of WORLD_EVENTS) expect(index.has(event.id), `${universeId}: ${event.id}`).toBe(owner === universeId);
      for (const event of ECONOMY_EVENTS) expect(index.has(event.id), `${universeId}: ${event.id}`).toBe(true);
    }
    expect(COMMON_EVENTS.map((e) => e.id)).toEqual(expect.arrayContaining(ECONOMY_EVENTS.map((e) => e.id)));
  });

  it("условия хозяйства: кризис — только в спад, возможность — только в подъём, нужда — только при нехватке", () => {
    const universe = getUniverse("isekai");
    const base = at(start({ seed: "eco-events", universeId: "isekai" }), 30);
    base.character.wealth = 500;
    const hard = findEvent(universe, "eco.hard-times")!;
    const boom = findEvent(universe, "eco.boom-chance")!;
    const need = findEvent(universe, "eco.need-help")!;
    const with_ = (patch: (s: GameState) => void) => {
      const s = deepClone(base);
      patch(s);
      return s;
    };
    expect(isEligible(with_((s) => (s.economy.cycle = "slump")), hard)).toBe(true);
    expect(isEligible(with_((s) => (s.economy.cycle = "normal")), hard)).toBe(false);
    expect(isEligible(with_((s) => (s.economy.cycle = "boom")), boom)).toBe(true);
    expect(isEligible(with_((s) => (s.economy.cycle = "slump")), boom)).toBe(false);
    expect(isEligible(with_((s) => (s.economy.hardship = 2)), need)).toBe(true);
    expect(isEligible(with_((s) => (s.economy.hardship = 0)), need)).toBe(false);
  });

  it("пауза и предел повторов работают: после события оно недоступно до cooldown, после maxOccurrences — навсегда", () => {
    const universe = getUniverse("hunter");
    const event = findEvent(universe, "hu.eco-tax-audit")!;
    const base = at(start({ seed: "eco-cooldown", universeId: "hunter" }), 30);
    base.character.wealth = 500;
    expect(isEligible(base, event)).toBe(true);
    const recent = deepClone(base);
    recent.occurrences[event.id] = 1;
    recent.lastSeen[event.id] = 29;
    expect(isEligible(recent, event)).toBe(false);
    const later = at(recent, 29 + event.cooldown!);
    later.recentEvents = [];
    expect(isEligible(later, event)).toBe(true);
    const done = deepClone(later);
    done.occurrences[event.id] = event.maxOccurrences!;
    expect(isEligible(done, event)).toBe(false);
  });

  it("подъём сословия стоит денег и поднимает на ступень; падение — опускает и даёт передышку", () => {
    const universe = getUniverse("dark-fantasy");
    let state = at(start({ seed: "eco-rise", universeId: "dark-fantasy" }), 30);
    state.character.socialClassId = "townsfolk";
    state.character.wealth = 300;
    state.character.reputation = 30;
    expect(isEligible(state, findEvent(universe, "eco.rise")!)).toBe(true);
    const risen = applyAction({ ...state, pending: { eventId: "eco.rise", age: 30 } }, { type: "choose", choiceId: "buy" }).state;
    expect(risen.character.wealth).toBe(150);
    expect(getUniverse("dark-fantasy").socialClasses.find((c) => c.id === risen.character.socialClassId)!.standing).toBe(3);

    state = deepClone(risen);
    state.economy.hardship = 3;
    expect(isEligible(state, findEvent(universe, "eco.fall")!)).toBe(true);
    const fallen = applyAction({ ...state, pending: { eventId: "eco.fall", age: 30 } }, { type: "choose", choiceId: "sell" }).state;
    expect(getUniverse("dark-fantasy").socialClasses.find((c) => c.id === fallen.character.socialClassId)!.standing).toBe(2);
    expect(fallen.character.wealth).toBe(risen.character.wealth + 40);
  });

  it("событие мира меняет отношение своих фракций", () => {
    const state = at(start({ seed: "eco-faction", universeId: "isekai" }), 25);
    const before = deepClone(state.character.factions);
    const next = applyAction({ ...state, pending: { eventId: "is.eco-guild-war", age: 25 } }, { type: "choose", choiceId: "guild" }).state;
    expect(next.character.factions.guild ?? 0).toBe((before.guild ?? 0) + 12);
    expect(next.character.factions["merchant-league"] ?? 0).toBe((before["merchant-league"] ?? 0) - 10);
  });

  it("в обычной игре события хозяйства выпадают, но не вытесняют остальные", () => {
    const ids = new Set(ALL.map(({ event }) => event.id));
    let total = 0;
    let economy = 0;
    const seen = new Set<string>();
    for (const universeId of UNIVERSE_IDS) {
      for (let k = 0; k < 12; k++) {
        let state = start({ seed: `eco-play-${universeId}-${k}`, universeId });
        for (let step = 0; step < 3000 && state.life.alive && state.life.age < 90; step++) {
          if (state.pending) {
            total += 1;
            if (ids.has(state.pending.eventId)) {
              economy += 1;
              seen.add(state.pending.eventId);
            }
            const choices = choiceIds(state);
            state = applyAction(state, { type: "choose", choiceId: choices[(step + k) % choices.length]! }).state;
          } else state = applyAction(state, { type: "advance" }).state;
        }
      }
    }
    expect(economy).toBeGreaterThan(0);
    // Не больше пятой части всех событий жизни
    expect(economy / total).toBeLessThan(0.2);
    // Выпадают и общие, и события миров
    expect([...seen].some((id) => id.startsWith("eco."))).toBe(true);
    expect([...seen].some((id) => !id.startsWith("eco."))).toBe(true);
  }, 15_000);
});
