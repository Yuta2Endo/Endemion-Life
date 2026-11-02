import { describe, expect, it } from "vitest";
import {
  BIRTH_STAT_MAX,
  GameRuleError,
  generateCharacter,
  listUniverses,
  maxResources,
  Rng,
  STAT_KEYS,
  STAT_MIN,
  UNIVERSE_IDS,
  validateName
} from "../src/index.js";

describe("Character Engine", () => {
  it("один seed — один и тот же персонаж", () => {
    const a = generateCharacter({ universeId: "murim" }, Rng.fromSeed("same", "life"));
    const b = generateCharacter({ universeId: "murim" }, Rng.fromSeed("same", "life"));
    expect(a).toEqual(b);
  });

  it("разные seed дают разных персонажей", () => {
    const names = new Set(
      Array.from({ length: 20 }, (_, i) => JSON.stringify(generateCharacter({ universeId: "xianxia" }, Rng.fromSeed(`s${i}`, "life")).character.stats))
    );
    expect(names.size).toBeGreaterThan(10);
  });

  it("выбор игрока не меняет броски характеристик", () => {
    const random = generateCharacter({ universeId: "isekai" }, Rng.fromSeed("roll", "life")).character;
    const chosen = generateCharacter({ universeId: "isekai", raceId: random.raceId, originId: random.originId, temperamentId: random.temperamentId, gender: random.gender }, Rng.fromSeed("roll", "life")).character;
    expect(chosen.stats).toEqual(random.stats);
  });

  it.each(UNIVERSE_IDS)("во вселенной %s персонаж корректен", (universeId) => {
    for (let i = 0; i < 30; i++) {
      const { character } = generateCharacter({ universeId }, Rng.fromSeed(`u${i}`, "life"));
      const universe = listUniverses().find((u) => u.id === universeId)!;
      expect(universe.races.map((r) => r.id)).toContain(character.raceId);
      expect(universe.origins.map((o) => o.id)).toContain(character.originId);
      for (const key of STAT_KEYS) {
        expect(character.stats[key]).toBeGreaterThanOrEqual(STAT_MIN);
        expect(character.stats[key]).toBeLessThanOrEqual(BIRTH_STAT_MAX);
      }
      expect(character.resources).toEqual(maxResources(character));
      expect(character.name.length).toBeGreaterThan(1);
    }
  });

  it("раса и происхождение меняют характеристики", () => {
    const base = { universeId: "xianxia" as const, temperamentId: "calm" };
    const dragon = generateCharacter({ ...base, raceId: "half-dragon", originId: "farm-child" }, Rng.fromSeed("mods", "life")).character;
    const fox = generateCharacter({ ...base, raceId: "fox-spirit", originId: "farm-child" }, Rng.fromSeed("mods", "life")).character;
    expect(dragon.stats.strength - fox.stats.strength).toBe(4);
    expect(fox.stats.charisma - dragon.stats.charisma).toBe(4);
  });

  it("происхождение задаёт стартовые флаги и золото", () => {
    const result = generateCharacter({ universeId: "xianxia", originId: "cultivator-clan" }, Rng.fromSeed("flags", "life"));
    expect(result.flags).toContain("spirit-root");
    expect(result.character.wealth).toBe(70);
  });

  it("неизвестные значения отклоняются", () => {
    const rng = Rng.fromSeed("bad", "life");
    expect(() => generateCharacter({ universeId: "murim", raceId: "elf" }, rng)).toThrow(GameRuleError);
    expect(() => generateCharacter({ universeId: "murim", originId: "nope" }, rng)).toThrow(GameRuleError);
    expect(() => generateCharacter({ universeId: "unknown" as never }, rng)).toThrow(GameRuleError);
  });

  it("имя проверяется и очищается", () => {
    expect(validateName("  Лин   Юэ ")).toBe("Лин Юэ");
    expect(validateName("Jean-Luc d'Arc")).toBe("Jean-Luc d'Arc");
    for (const bad of ["A", "<script>", "Имя123", "x".repeat(41), "  "]) expect(() => validateName(bad)).toThrow(GameRuleError);
  });
});
