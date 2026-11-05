import { describe, expect, it } from "vitest";
import { applyAction, deepClone, GameRuleError, lifespanOf, MAX_ADVANCE_YEARS, stageForAge, UNIVERSE_IDS } from "../src/index.js";
import { playLife, start } from "./helpers.js";

describe("Life Engine", () => {
  it("продвижение времени увеличивает возраст на год", () => {
    let state = start({ seed: "aging" });
    expect(state.life.age).toBe(0);
    const result = applyAction(state, { type: "advance" });
    state = result.state;
    expect(state.life.age).toBe(1);
    expect(result.entries.some((e) => e.kind === "year" && e.age === 1)).toBe(true);
  });

  it("тихий год называет то, что выросло, а не крутит одну фразу по возрасту", () => {
    const state = start({ seed: "quiet-year", universeId: "hunter" });
    state.character.professionId = "hunter";
    state.life = { ...state.life, age: 20, stage: "adult" };
    const result = applyAction(state, { type: "advance" });
    const year = result.entries.find((entry) => entry.kind === "year");
    expect(year?.text.ru).toMatch(/Ремесло|Путь силы|Золото|повседневных|Времена|Тихий год|Ничего|Дни похожи/);
    if (year?.changes.some((change) => change.kind === "skill")) expect(year.text.ru).toContain("Ремесло");
  });

  it("исходное состояние не меняется", () => {
    const state = start({ seed: "pure" });
    const copy = deepClone(state);
    applyAction(state, { type: "advance", years: 5 });
    expect(state).toEqual(copy);
  });

  it("несколько лет за раз останавливаются на первом событии", () => {
    const state = start({ seed: "multi" });
    const { state: next } = applyAction(state, { type: "advance", years: MAX_ADVANCE_YEARS });
    expect(next.life.age).toBeGreaterThanOrEqual(1);
    expect(next.life.age).toBeLessThanOrEqual(MAX_ADVANCE_YEARS);
    if (next.life.age < MAX_ADVANCE_YEARS) expect(next.pending).not.toBeNull();
  });

  it("число лет проверяется", () => {
    const state = start();
    for (const years of [0, -1, 1.5, MAX_ADVANCE_YEARS + 1]) {
      expect(() => applyAction(state, { type: "advance", years })).toThrow(GameRuleError);
    }
  });

  it("пока событие ждёт ответа, время не идёт", () => {
    let state = start({ seed: "pending" });
    while (!state.pending) state = applyAction(state, { type: "advance" }).state;
    expect(() => applyAction(state, { type: "advance" })).toThrow(expect.objectContaining({ code: "EVENT_PENDING" }));
  });

  it("этапы жизни сменяются по возрасту и сроку", () => {
    expect(stageForAge(0, 70)).toBe("infant");
    expect(stageForAge(8, 70)).toBe("child");
    expect(stageForAge(15, 70)).toBe("teen");
    expect(stageForAge(30, 70)).toBe("adult");
    expect(stageForAge(50, 70)).toBe("middle");
    expect(stageForAge(65, 70)).toBe("elder");
    // У долгоживущих старость приходит позже
    expect(stageForAge(65, 200)).toBe("adult");
  });

  it.each(UNIVERSE_IDS)("жизнь в %s заканчивается смертью, история последовательна", (universeId) => {
    const { state, entries } = playLife(start({ seed: `full-${universeId}`, universeId }), 5000);
    expect(state.life.alive).toBe(false);
    expect(state.life.deathAge).toBe(state.life.age);
    expect(state.life.age).toBeLessThanOrEqual(lifespanOf(state.character) + 20);
    expect(entries.at(-1)?.kind).toBe("death");
    const seqs = entries.map((e) => e.seq);
    expect(seqs).toEqual([...seqs].sort((a, b) => a - b));
    expect(new Set(seqs).size).toBe(seqs.length);
    expect(() => applyAction(state, { type: "advance" })).toThrow(expect.objectContaining({ code: "LIFE_ENDED" }));
  });

  it("характеристики растут в детстве", () => {
    const born = start({ seed: "growth" });
    const { state } = playLife(born, 400);
    const before = Object.values(born.character.stats).reduce((a, b) => a + b, 0);
    let grown = state;
    if (state.life.alive) grown = state;
    const after = Object.values(grown.character.stats).reduce((a, b) => a + b, 0);
    expect(after).toBeGreaterThan(before);
  });

  it("одинаковые seed и действия дают одинаковую жизнь", () => {
    const a = playLife(start({ seed: "replay", universeId: "hunter" }), 300, (n, step) => step % n);
    const b = playLife(start({ seed: "replay", universeId: "hunter" }), 300, (n, step) => step % n);
    expect(a.state).toEqual(b.state);
    expect(a.entries).toEqual(b.entries);
  });

  it("версия состояния растёт на 1 за действие", () => {
    const state = start();
    const next = applyAction(state, { type: "advance" }).state;
    expect(next.version).toBe(state.version + 1);
  });
});
