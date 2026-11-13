import { describe, expect, it } from "vitest";
import {
  addHealthCondition,
  applyAction,
  conditionDeathCause,
  deepClone,
  getUniverse,
  healthYear,
  MAX_HEALTH_CONDITIONS,
  migrateSave,
  newHealthState,
  parseSave,
  presentHealth,
  Rng,
  SAVE_SCHEMA_VERSION,
  type GameState,
  type HealthCondition
} from "../src/index.js";
import { SAVES_V1 } from "./fixtures/saves-v1.js";
import { SAVES_V2 } from "./fixtures/saves-v2.js";
import { SAVES_V4 } from "./fixtures/saves-v4.js";
import { SAVES_V8 } from "./fixtures/saves-v8.js";
import { choiceIds, playLife, start } from "./helpers.js";

function contextOf(state: GameState) {
  return { state, rng: new Rng(state.rngState), universe: getUniverse(state.character.universeId), changes: [], source: undefined as string | undefined };
}

function withWoundPending(state: GameState): GameState {
  state.pending = { eventId: "common.wound", age: state.life.age };
  return state;
}

function advanceOrChoose(state: GameState, steps: number): GameState {
  let current = state;
  for (let step = 0; step < steps && current.life.alive; step++) {
    if (current.pending) {
      const ids = choiceIds(current);
      current = applyAction(current, { type: "choose", choiceId: ids[0]! }).state;
    } else {
      current = applyAction(current, { type: "advance" }).state;
    }
  }
  return current;
}

describe("Stage 02.1: здоровье, болезни и раны", () => {
  it("новая жизнь получает длительное здоровье 100 без недугов", () => {
    const state = start({ seed: "health-new", universeId: "academy" });
    expect(state.schemaVersion).toBe(SAVE_SCHEMA_VERSION);
    expect(state.health).toEqual(newHealthState());
    expect(presentHealth(state)).toMatchObject({ value: 100, conditions: [], deathCause: null });
  });

  it("рана появляется из выбора события и сразу отнимает силы", () => {
    const state = withWoundPending(start({ seed: "health-onset", universeId: "hunter" }));
    const result = applyAction(state, { type: "choose", choiceId: "hide" });
    expect(result.state.health.conditions).toHaveLength(1);
    expect(result.state.health.conditions[0]).toMatchObject({
      id: "common-wound",
      kind: "wound",
      severity: 2,
      source: "common.wound"
    });
    expect(result.state.health.value).toBeLessThan(100);
  });

  it("год ухудшает состояние, затем оно заживает само", () => {
    const state = start({ seed: "health-recovery", universeId: "xianxia" });
    const ctx = contextOf(state);
    ctx.source = "test";
    addHealthCondition(ctx, "common-fever", { severity: 1, duration: 2 });
    const before = state.health.value;
    const first = healthYear(ctx);
    expect(first.died).toBeNull();
    expect(state.health.value).toBeLessThan(before);
    expect(state.health.conditions.find((condition) => condition.id === "common-fever")?.remaining).toBeLessThanOrEqual(1);
    const second = healthYear(ctx);
    expect(second.died).toBeNull();
    expect(state.health.conditions.some((condition) => condition.id === "common-fever")).toBe(false);
  });

  it("смертельная рана записывает причину в здоровье, жизнь и историю", () => {
    const state = start({ seed: "health-death", universeId: "hunter" });
    const ctx = contextOf(state);
    ctx.source = "health.test";
    state.health.value = 3;
    addHealthCondition(ctx, "hu-gate-wound", { severity: 3, duration: 5 });
    const wound = state.health.conditions[0]!;
    const year = healthYear(ctx);
    expect(year.died).toEqual(conditionDeathCause(wound));
    expect(state.life.alive).toBe(true);
    // healthYear возвращает причину и не убивает сам: это делает вызывающий код
    const result = applyAction(state, { type: "advance" });
    expect(result.state.life.alive).toBe(false);
    expect(result.state.life.deathCause).toEqual(result.state.health.deathCause);
    const death = result.entries.find((entry) => entry.kind === "death");
    expect(death).toBeDefined();
    expect(death!.text.ru).toContain("Раны оказались смертельными");
    expect(death!.text.ru).toContain("Рана Врат");
  });

  it("повторный недуг усиливает существующий, а количество состояний ограничено", () => {
    const state = start({ seed: "health-caps", universeId: "dark-fantasy" });
    const ctx = contextOf(state);
    ctx.source = "test";
    addHealthCondition(ctx, "common-fever");
    addHealthCondition(ctx, "common-fever");
    expect(state.health.conditions).toHaveLength(1);
    expect(state.health.conditions[0]!.severity).toBe(2);

    for (const id of ["common-old-wound", "common-wound", "df-mist-rot", "is-mana-burn", "mu-qi-deviation", "xx-serpent-venom", "hu-gate-wound", "ac-duel-injury"]) {
      addHealthCondition(ctx, id);
    }
    expect(state.health.conditions.length).toBeLessThanOrEqual(MAX_HEALTH_CONDITIONS);
    expect(new Set(state.health.conditions.map((condition) => condition.id)).size).toBe(state.health.conditions.length);
  });

  it("одинаковый seed и одинаковые действия дают одинаковое здоровье", () => {
    const a0 = withWoundPending(start({ seed: "health-determinism", universeId: "murim" }));
    const b0 = withWoundPending(start({ seed: "health-determinism", universeId: "murim" }));
    let a = applyAction(a0, { type: "choose", choiceId: "hide" }).state;
    let b = applyAction(b0, { type: "choose", choiceId: "hide" }).state;
    a = advanceOrChoose(a, 30);
    b = advanceOrChoose(b, 30);
    expect(a.health).toEqual(b.health);
    expect(a.rngState).toBe(b.rngState);
    expect(a.life.age).toBe(b.life.age);
  });

  it("сохранение формата 8 получает здоровье 8 → 9 без потери данных и причины смерти", () => {
    for (const [key, raw] of Object.entries(SAVES_V8)) {
      const before = deepClone(raw) as Record<string, unknown>;
      const migrated = migrateSave(deepClone(raw)) as unknown as GameState;
      expect(migrated.schemaVersion, key).toBe(SAVE_SCHEMA_VERSION);
      expect(migrated.health, key).toBeDefined();
      expect(migrated.health.conditions, key).toEqual([]);
      expect(migrated.seed, key).toBe(before.seed);
      expect(migrated.rngState, key).toBe(before.rngState);
      expect(migrated.character.name, key).toBe((before.character as { name: string }).name);
      expect(migrated.life.age, key).toBe((before.life as { age: number }).age);
      if (!migrated.life.alive) expect(migrated.health.deathCause, key).toEqual(migrated.life.deathCause);
      expect(() => parseSave(deepClone(raw)), key).not.toThrow();
    }
  });

  it("сохранения форматов 1, 2 и 5 читаются с новым здоровьем", () => {
    const schema5 = deepClone(SAVES_V4["dark-fantasy-adult"]!) as Record<string, unknown>;
    schema5.schemaVersion = 5;
    (schema5.economy as Record<string, unknown>).goods = {};
    delete schema5.health;
    const saves: Array<[string, Record<string, unknown>]> = [
      ["v1", deepClone(SAVES_V1["dark-fantasy-young"]!) as Record<string, unknown>],
      ["v2", deepClone(SAVES_V2["dark-fantasy-young"]!) as Record<string, unknown>],
      ["v5", schema5]
    ];
    for (const [key, raw] of saves) {
      const before = deepClone(raw);
      const state = parseSave(deepClone(raw));
      expect(state.schemaVersion, key).toBe(SAVE_SCHEMA_VERSION);
      expect(state.health.value, key).toBeGreaterThanOrEqual(0);
      expect(state.health.value, key).toBeLessThanOrEqual(100);
      expect(state.health.conditions, key).toEqual([]);
      expect(state.seed, key).toBe(before.seed);
      expect(state.rngState, key).toBe(before.rngState);
      expect(state.character.name, key).toBe((before.character as { name: string }).name);
      expect(state.life.age, key).toBe((before.life as { age: number }).age);
    }
  });

  it("полная жизнь не раздувает список состояний и оставляет причину смерти", () => {
    const { state } = playLife(start({ seed: "health-full-life", universeId: "dark-fantasy" }), 5000, (n, i) => (i * 3) % n);
    expect(state.health.conditions.length).toBeLessThanOrEqual(MAX_HEALTH_CONDITIONS);
    if (!state.life.alive) {
      expect(state.life.deathCause).not.toBeNull();
      expect(state.health.deathCause).toEqual(state.life.deathCause);
    }
  });

  it("parseSave отвергает неограниченные и повторяющиеся состояния", () => {
    const state = start({ seed: "health-strict", universeId: "isekai" });
    const broken = deepClone(state);
    broken.health.value = 101;
    expect(() => parseSave(broken)).toThrow();

    const duplicate = deepClone(state);
    const condition: HealthCondition = {
      id: "common-fever",
      kind: "illness",
      severity: 1,
      source: "test",
      onsetAge: 1,
      remaining: 2,
      damage: 4,
      recoverable: true,
      lethal: false
    };
    duplicate.health.conditions = [condition, { ...condition }];
    expect(() => parseSave(duplicate)).toThrow();

    const tooMany = deepClone(state);
    tooMany.health.conditions = Array.from({ length: MAX_HEALTH_CONDITIONS + 1 }, (_, index) => ({ ...condition, id: `test-${index}` }));
    expect(() => parseSave(tooMany)).toThrow();
  });
});
