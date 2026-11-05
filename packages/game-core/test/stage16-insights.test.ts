import { describe, expect, it } from "vitest";
import { balanceNote, factProblem, isInsightName, type InsightFact } from "../src/live/insights.js";

function fact(over: Partial<InsightFact> = {}): InsightFact {
  return { name: "life.created", world: "murim", age: 0, level: 1, amount: 0, ref: "11111111-1111-1111-1111-111111111111", ...over };
}

describe("Stage 16: факты", () => {
  it("принимает только известное имя и короткий ключ", () => {
    expect(isInsightName("life.created")).toBe(true);
    expect(isInsightName("click.button")).toBe(false);
    expect(factProblem(fact())).toBe("");
    expect(factProblem(fact({ name: "click.button" as "life.created" }))).toBe("имя");
    expect(factProblem(fact({ ref: "short" }))).toBe("ключ");
    expect(factProblem(fact({ age: -1 }))).toBe("возраст");
    expect(factProblem(fact({ amount: 2_000_000_000 }))).toBe("число");
  });

  it("малая выборка не становится выводом, большая доля провалов — трудный шаг", () => {
    expect(balanceNote("adventure.failed", 1, 2)?.kind).toBe("thin");
    expect(balanceNote("adventure.failed", 2, 8)?.kind).toBe("hard");
    expect(balanceNote("quest.failed", 8, 1)).toBeNull();
    expect(balanceNote("quest.failed", 0, 0)).toBeNull();
    expect(balanceNote("quest.done", 0, 9)?.kind).toBe("quiet");
  });
});