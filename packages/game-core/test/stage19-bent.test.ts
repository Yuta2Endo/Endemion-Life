// Stage 19: нрав уже был. Личная цель — первая характеристика роста до 40. Событие не закрывает чужой нрав.
import { describe, expect, it } from "vitest";
import { applyAction, eventIndex, findObjective, getUniverse, isEligible, newGame, TEMPERAMENTS } from "../src/index.js";

describe("Stage 19: свой нрав", () => {
  it("цель закрывается на 40 и не раньше, чужие дороги не требует", () => {
    const bent = findObjective("bent");
    expect(bent).toBeDefined();
    const { state } = newGame({ seed: "bent", universeId: "murim", temperamentId: "brave" });
    const key = TEMPERAMENTS.find((item) => item.id === "brave")!.growth[0]!;
    state.character.stats[key] = 39;
    expect(bent!.check(state)).toBe(false);
    state.character.stats[key] = 40;
    expect(bent!.check(state)).toBe(true);
    expect(state.adventure.done).toEqual([]);
  });

  it("событие открывает только вариант своего нрава", () => {
    const { state } = newGame({ seed: "bent-event", universeId: "academy", temperamentId: "kind" });
    state.life = { ...state.life, age: 20, stage: "adult" };
    state.pending = null;
    const event = eventIndex(getUniverse("academy")).get("common.own-bent");
    expect(event).toBeDefined();
    expect(isEligible(state, event!)).toBe(true);
    const open = event!.choices.filter((choice) => choice.requires?.every((rule) => rule.type !== "temperament" || rule.ids.includes("kind")));
    expect(open.map((choice) => choice.id)).toEqual(["kind"]);
    state.pending = { eventId: "common.own-bent", age: 20 };
    const before = state.character.stats.wisdom;
    const next = applyAction(state, { type: "choose", choiceId: "kind" }).state;
    expect(next.character.stats.wisdom).toBe(before + 1);
    const locked = newGame({ seed: "bent-event", universeId: "academy", temperamentId: "kind" }).state;
    locked.life = { ...locked.life, age: 20, stage: "adult" };
    locked.pending = { eventId: "common.own-bent", age: 20 };
    expect(() => applyAction(locked, { type: "choose", choiceId: "brave" })).toThrow();
  });
});