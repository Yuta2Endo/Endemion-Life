import { describe, expect, it } from "vitest";
import { applyAction, GameRuleError, parseSave, restoreState, SAVE_SCHEMA_VERSION } from "../src/index.js";
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
});
