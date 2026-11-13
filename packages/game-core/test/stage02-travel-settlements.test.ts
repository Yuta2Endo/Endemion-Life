// Stage 02.4: текущее поселение, дорога, местные события и экономика.
// Проверки идут через те же applyAction/parseSave/eventProblems, что и игра.
import { describe, expect, it } from "vitest";
import {
  applyAction,
  deepClone,
  eventLocationWeight,
  eventProblems,
  findEvent,
  getUniverse,
  isEligible,
  livingCost,
  migrateSave,
  parseSave,
  presentLocation,
  SAVE_SCHEMA_VERSION,
  settlementSeeds,
  travelCostBetween,
  UNIVERSE_IDS,
  yearLines,
  type GameState
} from "../src/index.js";
import { SAVES_V1 } from "./fixtures/saves-v1.js";
import { SAVES_V2 } from "./fixtures/saves-v2.js";
import { SAVES_V4 } from "./fixtures/saves-v4.js";
import { SAVES_V8 } from "./fixtures/saves-v8.js";
import { SAVES_V9 } from "./fixtures/saves-v9.js";
import { SAVES_V10 } from "./fixtures/saves-v10.js";
import { SAVES_V11 } from "./fixtures/saves-v11.js";
import { start } from "./helpers.js";

const LOCATION_EVENTS: Record<(typeof UNIVERSE_IDS)[number], { event: string; settlement: string; tag: string }> = {
  "dark-fantasy": { event: "df.location.mist-road", settlement: "mist-border", tag: "frontier" },
  isekai: { event: "is.location.frontier-survey", settlement: "frontier", tag: "frontier" },
  murim: { event: "mu.location.black-market", settlement: "black-market", tag: "underworld" },
  xianxia: { event: "xx.location.mortal-harvest", settlement: "mortal-realm", tag: "mortal" },
  hunter: { event: "hu.location.gate-district", settlement: "gate-district", tag: "gate" },
  academy: { event: "ac.location.rose-salon", settlement: "rose-salon", tag: "social" }
};

function grown(state: GameState, age = 20): GameState {
  const copy = deepClone(state);
  copy.life = { ...copy.life, age, stage: "adult" };
  return copy;
}

function moveTo(state: GameState, settlementId: string): GameState {
  const copy = deepClone(state);
  copy.character.wealth = Math.max(copy.character.wealth, 500);
  return applyAction(copy, { type: "travel", settlementId }).state;
}

describe("Stage 02.4: дорога между поселениями", () => {
  it("каждый мир начинает в существующем поселении и может переехать во второе", () => {
    for (const universeId of UNIVERSE_IDS) {
      const state = start({ seed: `travel-${universeId}`, universeId });
      const seeds = settlementSeeds(getUniverse(universeId));
      expect(state.schemaVersion).toBe(SAVE_SCHEMA_VERSION);
      expect(seeds.some((seed) => seed.id === state.location.settlementId), universeId).toBe(true);
      expect(state.location.history, universeId).toEqual([]);
      expect(presentLocation(state).destinations.length, universeId).toBe(seeds.length);

      const to = seeds.find((seed) => seed.id !== state.location.settlementId)!;
      state.character.wealth = 500;
      const before = state.character.wealth;
      const cost = travelCostBetween(getUniverse(universeId), state.location.settlementId, to.id);
      const result = applyAction(state, { type: "travel", settlementId: to.id });

      expect(result.state.location.settlementId, universeId).toBe(to.id);
      expect(result.state.character.wealth, universeId).toBe(before - cost);
      expect(result.state.location.history.at(-1), universeId).toMatchObject({ from: state.location.settlementId, to: to.id, cost });
      expect(result.entries[0]?.kind, universeId).toBe("travel");
      expect(result.entries[0]?.changes.some((change) => change.kind === "location" && change.key === to.id), universeId).toBe(true);
      // Дорога не трогает генератор и не двигает возраст
      expect(result.state.rngState, universeId).toBe(state.rngState);
      expect(result.state.life.age, universeId).toBe(state.life.age);
      expect(parseSave(JSON.parse(JSON.stringify(result.state))), universeId).toEqual(result.state);
      expect(presentLocation(result.state).history.at(-1)?.to.en, universeId).toBe(to.name.en);
    }
  });

  it("неизвестное поселение, нынешнее место и нехватка золота отклоняются без изменения состояния", () => {
    const state = grown(start({ seed: "travel-invalid", universeId: "dark-fantasy" }));
    state.character.wealth = 100;
    const original = deepClone(state);

    expect(() => applyAction(state, { type: "travel", settlementId: "nowhere" })).toThrow();
    expect(() => applyAction(state, { type: "travel", settlementId: state.location.settlementId })).toThrow();
    expect(state).toEqual(original);

    const poor = deepClone(state);
    poor.character.wealth = 0;
    expect(() => applyAction(poor, { type: "travel", settlementId: "mist-border" })).toThrow();
    expect(poor.character.wealth).toBe(0);
    expect(poor.location.settlementId).toBe(state.location.settlementId);
  });

  it("мёртвая жизнь и незакрытое событие не пускают в дорогу", () => {
    const dead = grown(start({ seed: "travel-dead", universeId: "murim" }));
    dead.life.alive = false;
    expect(() => applyAction(dead, { type: "travel", settlementId: "orthodox-valley" })).toThrow();

    const pending = grown(start({ seed: "travel-pending", universeId: "isekai" }));
    pending.pending = { eventId: "common.first-steps", age: pending.life.age };
    expect(() => applyAction(pending, { type: "travel", settlementId: "frontier" })).toThrow();
    expect(pending.location.settlementId).toBe("system-city");
  });

  it("повторное применение того же действия детерминировано и не меняет исходное состояние", () => {
    const state = grown(start({ seed: "travel-determinism", universeId: "hunter" }));
    state.character.wealth = 200;
    const action = { type: "travel" as const, settlementId: "gate-district" };
    const first = applyAction(state, action);
    const second = applyAction(state, action);
    expect(second.state).toEqual(first.state);
    expect(second.entries).toEqual(first.entries);
    expect(state.location.settlementId).toBe("neo-seoul");
    expect(state.character.wealth).toBe(200);
  });
});

describe("Stage 02.4: местные события и экономика", () => {
  it("событие с location-условием доступно только в своём поселении; вес зависит от тега", () => {
    expect(eventProblems()).toEqual([]);
    for (const universeId of UNIVERSE_IDS) {
      const definition = LOCATION_EVENTS[universeId];
      const universe = getUniverse(universeId);
      const event = findEvent(universe, definition.event);
      expect(event, universeId).toBeDefined();
      expect(event!.locationTags, universeId).toContain(definition.tag);

      const state = grown(start({ seed: `location-event-${universeId}`, universeId }));
      expect(isEligible(state, event!), universeId).toBe(false);

      const away = state.location.settlementId;
      state.location = { ...state.location, settlementId: definition.settlement };
      expect(isEligible(state, event!), universeId).toBe(true);
      expect(eventLocationWeight(state, event!.locationTags), universeId).toBeGreaterThan(1);

      state.location = { ...state.location, settlementId: away };
      expect(eventLocationWeight(state, event!.locationTags), universeId).toBeLessThan(1);
    }
  });

  it("местная поправка входит в существующие статьи хозяйства один раз", () => {
    const state = grown(start({ seed: "travel-economy", universeId: "academy" }), 30);
    state.character.socialClassId = "imperial";
    state.character.wealth = 500;
    state.flags.push("profession");

    const home = yearLines(state);
    expect(home.find((line) => line.id === "location")).toBeUndefined();
    const homeLiving = livingCost(state);

    const away = moveTo(state, "rose-salon");
    const lines = yearLines(away);
    const local = lines.filter((line) => line.id === "location");
    expect(local).toHaveLength(1);
    expect(local[0]!.amount).toBeGreaterThan(0);
    expect(livingCost(away)).toBeGreaterThan(homeLiving);
    // Налог и цикл по-прежнему не дублируются
    expect(lines.filter((line) => line.id === "tax")).toHaveLength(1);
    expect(lines.filter((line) => line.id === "cycle").length).toBeLessThanOrEqual(1);
  });

  it("у каждого мира есть хотя бы два существующих поселения для переезда", () => {
    for (const universeId of UNIVERSE_IDS) {
      const state = start({ seed: `travel-count-${universeId}`, universeId });
      const seeds = settlementSeeds(getUniverse(universeId));
      expect(seeds.length, universeId).toBeGreaterThanOrEqual(2);
      expect(new Set(seeds.map((seed) => seed.id)).size, universeId).toBe(seeds.length);
      expect(presentLocation(state).destinations.filter((destination) => !destination.current).length, universeId).toBeGreaterThanOrEqual(1);
    }
  });
});

describe("Stage 02.4: сохранение и миграция", () => {
  it("формат 11 → 12 добавляет домашнее поселение, сохраняя seed, rngState и все прежние поля", () => {
    for (const [key, raw] of Object.entries(SAVES_V11)) {
      const before = deepClone(raw) as Record<string, unknown>;
      const migrated = migrateSave(deepClone(raw)) as unknown as GameState;
      expect(migrated.schemaVersion, key).toBe(SAVE_SCHEMA_VERSION);
      expect(migrated.seed, key).toBe(before.seed);
      expect(migrated.rngState, key).toBe(before.rngState);
      expect(migrated.character.name, key).toBe((before.character as { name: string }).name);
      expect(migrated.life.age, key).toBe((before.life as { age: number }).age);
      const seeds = settlementSeeds(getUniverse(migrated.character.universeId));
      expect(seeds.some((seed) => seed.id === migrated.location.settlementId), key).toBe(true);
      expect(migrated.location.history, key).toEqual([]);
      expect(migrated.location.since, key).toBe(migrated.life.age);

      const rest = deepClone(migrated) as unknown as Record<string, unknown>;
      const original = deepClone(raw) as Record<string, unknown>;
      delete rest.location;
      delete rest.schemaVersion;
      delete original.schemaVersion;
      expect(rest, key).toEqual(original);
      expect(() => parseSave(deepClone(raw)), key).not.toThrow();
    }
  });

  it("старые форматы 1, 2, 5, 8, 9, 10 и 11 читаются и получают поселение", () => {
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
      ["v10", deepClone(SAVES_V10["murim-alive"]!) as Record<string, unknown>],
      ["v11", deepClone(SAVES_V11["murim-alive"]!) as Record<string, unknown>]
    ];
    for (const [key, raw] of saves) {
      const before = deepClone(raw);
      const state = parseSave(deepClone(raw));
      expect(state.schemaVersion, key).toBe(SAVE_SCHEMA_VERSION);
      expect(state.seed, key).toBe(before.seed);
      expect(state.rngState, key).toBe(before.rngState);
      expect(state.location, key).toBeDefined();
      expect(() => parseSave(JSON.parse(JSON.stringify(state))), key).not.toThrow();
    }
  });

  it("повреждённое или чужое поселение в сохранении отклоняется", () => {
    const state = start({ seed: "travel-save-bad", universeId: "xianxia" });
    const foreign = deepClone(state);
    foreign.location = { settlementId: "ash-capital", since: 0, history: [] };
    expect(() => parseSave(JSON.parse(JSON.stringify(foreign)))).toThrow();

    const badHistory = deepClone(state);
    badHistory.location = { settlementId: "cloud-peak", since: 0, history: [{ from: "cloud-peak", to: "nowhere", age: 0, cost: 3 }] };
    expect(() => parseSave(JSON.parse(JSON.stringify(badHistory)))).toThrow();
  });
});
