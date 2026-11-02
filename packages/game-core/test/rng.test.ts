import { describe, expect, it } from "vitest";
import { hashSeed, Rng } from "../src/index.js";

describe("Rng", () => {
  it("один seed — одна последовательность", () => {
    const a = Rng.fromSeed("seed", "life");
    const b = Rng.fromSeed("seed", "life");
    const seqA = Array.from({ length: 50 }, () => a.next());
    const seqB = Array.from({ length: 50 }, () => b.next());
    expect(seqA).toEqual(seqB);
  });

  it("разные seed и потоки дают разные последовательности", () => {
    expect(Rng.fromSeed("a", "life").next()).not.toBe(Rng.fromSeed("b", "life").next());
    expect(Rng.fromSeed("a", "life").next()).not.toBe(Rng.fromSeed("a", "other").next());
  });

  it("состояние можно сохранить и продолжить", () => {
    const rng = Rng.fromSeed("save", "life");
    rng.next();
    rng.next();
    const resumed = new Rng(rng.state);
    expect(resumed.next()).toBe(rng.next());
  });

  it("int и pick не выходят за границы", () => {
    const rng = Rng.fromSeed("bounds", "x");
    for (let i = 0; i < 2000; i++) {
      const n = rng.int(3, 7);
      expect(n).toBeGreaterThanOrEqual(3);
      expect(n).toBeLessThanOrEqual(7);
      expect(["a", "b"]).toContain(rng.pick(["a", "b"]));
    }
  });

  it("weighted не выбирает вариант с весом 0", () => {
    const rng = Rng.fromSeed("weights", "x");
    for (let i = 0; i < 500; i++) expect(rng.weighted(["never", "always"], (x) => (x === "never" ? 0 : 1))).toBe("always");
    expect(rng.weighted(["a"], () => 0)).toBeUndefined();
  });

  it("hashSeed стабилен", () => {
    expect(hashSeed("endemion")).toBe(hashSeed("endemion"));
    expect(hashSeed("endemion")).toBeGreaterThanOrEqual(0);
  });
});
