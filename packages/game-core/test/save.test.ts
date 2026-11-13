import { describe, expect, it } from "vitest";
import { applyAction, GameRuleError, migrateSave, parseSave, restoreState, SAVE_SCHEMA_VERSION } from "../src/index.js";
import { playLife, start } from "./helpers.js";

describe("Save Engine", () => {
  it("сохранение переживает JSON и продолжается так же", () => {
    const { state } = playLife(start({ seed: "save", universeId: "murim" }), 30);
    const restored = parseSave(JSON.parse(JSON.stringify(state)));
    expect(restored).toEqual(state);
    if (state.life.alive && !state.pending) {
      expect(applyAction(restored, { type: "advance" })).toEqual(applyAction(state, { type: "advance" }));
    }
  });

  it("откат возвращает прошлое состояние с новой версией и записью в истории", () => {
    const early = playLife(start({ seed: "rewind", universeId: "academy" }), 10).state;
    const later = playLife(early, 20).state;
    const { state, entries } = restoreState(early, later.version);
    expect(state.version).toBe(later.version + 1);
    expect(state.life).toEqual(early.life);
    expect(state.character).toEqual(early.character);
    expect(state.rngState).not.toBe(early.rngState);
    expect(entries).toHaveLength(1);
    expect(entries[0]).toMatchObject({ kind: "restore", seq: early.nextSeq, age: early.life.age });
    expect(state.nextSeq).toBe(early.nextSeq + 1);
    // Исходный снимок не меняется
    expect(early.version).toBeLessThan(later.version);
  });

  it("повреждённые сохранения отклоняются", () => {
    const state = start();
    const broken: unknown[] = [
      null,
      "text",
      { ...state, schemaVersion: undefined },
      { ...state, schemaVersion: SAVE_SCHEMA_VERSION + 1 },
      { ...state, character: { ...state.character, universeId: "nope" } },
      { ...state, character: { ...state.character, stats: { ...state.character.stats, strength: 1000 } } },
      { ...state, character: { ...state.character, raceId: "dragon-god" } },
      { ...state, character: { ...state.character, track: { points: 0, rank: 99 } } },
      { ...state, life: { ...state.life, age: -1 } },
      { ...state, rngState: -5 }
    ];
    for (const save of broken) expect(() => parseSave(save)).toThrow(GameRuleError);
  });

  it("старые форматы 5, 6, 7 и 8 поднимаются до текущей версии без потери персонажа", () => {
    const current = start({ seed: "save-format-5", universeId: "murim" });
    const formats: Array<{ version: number; remove: string[] }> = [
      { version: 5, remove: ["adventure", "region", "mastery"] },
      { version: 6, remove: ["region", "mastery"] },
      { version: 7, remove: ["mastery"] },
      { version: 8, remove: [] }
    ];
    for (const format of formats) {
      const raw = JSON.parse(JSON.stringify(current)) as Record<string, unknown>;
      raw.schemaVersion = format.version;
      for (const key of format.remove) delete raw[key];
      const migrated = migrateSave(raw) as unknown as ReturnType<typeof start>;
      expect(migrated.schemaVersion).toBe(SAVE_SCHEMA_VERSION);
      expect(migrated.character.name).toBe(current.character.name);
      expect(migrated.character.universeId).toBe(current.character.universeId);
      expect(migrated.life.age).toBe(current.life.age);
      expect(migrated.adventure).toBeDefined();
      expect(migrated.region).toBeDefined();
      expect(migrated.mastery).toBeDefined();
      expect(() => parseSave(migrated)).not.toThrow();
    }
  });
});
