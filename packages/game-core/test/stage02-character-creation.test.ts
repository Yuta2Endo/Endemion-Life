// Stage 02.5: выбор уклада и очков при рождении. Проверяем пользу, границы и совместимость старого пути.
import { describe, expect, it } from "vitest";
import {
  BIRTH_STAT_MAX,
  GameRuleError,
  generateCharacter,
  getUniverse,
  listUniverses,
  newGame,
  parseSave,
  POINT_BUY_PER_STAT,
  POINT_BUY_TOTAL,
  presentProfile,
  Rng,
  SAVE_SCHEMA_VERSION,
  STAT_KEYS,
  STAT_MIN,
  summarizeUniverse,
  upbringingsFor
} from "../src/index.js";
import { start } from "./helpers.js";

describe("Stage 02.5: уклад детства и очки при создании", () => {
  it("уклад и очки применяются, сохраняются в персонаже и остаются в пределах потолка рождения", () => {
    const state = start({
      seed: "creation-valid",
      universeId: "academy",
      name: "Лин",
      gender: "female",
      raceId: "human",
      originId: "duke-heir",
      temperamentId: "calm",
      upbringingId: "ac-salon-upbringing",
      statPoints: { charisma: 2, wisdom: 1 }
    });
    const c = state.character;
    expect(c.creation).toEqual({ upbringingId: "ac-salon-upbringing", statPoints: { charisma: 2, wisdom: 1 } });
    expect(c.talents).toContain("courtly-grace");
    expect(c.skills.etiquette).toBeGreaterThanOrEqual(7);
    expect(c.stats.charisma).toBeGreaterThan(0);
    for (const key of STAT_KEYS) {
      expect(c.stats[key], key).toBeGreaterThanOrEqual(STAT_MIN);
      expect(c.stats[key], key).toBeLessThanOrEqual(BIRTH_STAT_MAX);
    }
    // Выбор виден и в представлении жизни, а не только в сыром состоянии
    const profile = presentProfile(state);
    expect(profile.upbringing?.id).toBe("ac-salon-upbringing");
    expect(profile.upbringing?.talent?.id).toBe("courtly-grace");
  });

  it("уклад даёт заявленные модификации, а очки — ровно вложенные значения", () => {
    const base = {
      seed: "creation-delta",
      universeId: "academy" as const,
      name: "Лин",
      gender: "female" as const,
      raceId: "human",
      originId: "duke-heir",
      temperamentId: "calm"
    };
    const plain = generateCharacter(base, Rng.fromSeed("creation-delta", "life")).character;
    const chosen = generateCharacter(
      { ...base, upbringingId: "ac-salon-upbringing", statPoints: { charisma: 2, wisdom: 1 } },
      Rng.fromSeed("creation-delta", "life")
    ).character;
    // Броски те же: уклад и очки не тратят числа Rng, они просто добавляются сверху
    expect(chosen.stats.charisma - plain.stats.charisma).toBe(4);
    expect(chosen.stats.wisdom - plain.stats.wisdom).toBe(2);
    expect((chosen.skills.etiquette ?? 0) - (plain.skills.etiquette ?? 0)).toBe(7);
    expect((chosen.skills.persuasion ?? 0) - (plain.skills.persuasion ?? 0)).toBe(5);
    expect(chosen.talents).toContain("courtly-grace");
  });

  it("тот же seed и тот же выбор дают того же персонажа и ту же историю рождения", () => {
    const input = {
      seed: "creation-determinism",
      universeId: "xianxia" as const,
      upbringingId: "xx-herb-garden",
      statPoints: { wisdom: 2, intelligence: 1 }
    };
    const a = newGame(input);
    const b = newGame(input);
    expect(a).toEqual(b);
    expect(a.state.seed).toBe(input.seed);
    expect(a.state.rngState).toBe(b.state.rngState);
  });

  it("выбор при рождении не сдвигает поток событий: rngState одинаков при разных укладах", () => {
    const base = { seed: "creation-rng", universeId: "academy" as const };
    const plain = newGame(base).state;
    const withUpbringing = newGame({ ...base, upbringingId: "ac-salon-upbringing" }).state;
    const withPoints = newGame({ ...base, statPoints: { agility: 2, luck: 1 } }).state;
    expect(withUpbringing.rngState).toBe(plain.rngState);
    expect(withPoints.rngState).toBe(plain.rngState);
    expect(withUpbringing.seed).toBe(plain.seed);
    expect(withPoints.seed).toBe(plain.seed);
  });

  it("неизвестный уклад и чужой мир отклоняются до броска", () => {
    expect(() => newGame({ seed: "bad-upbringing", universeId: "academy", upbringingId: "does-not-exist" })).toThrow(GameRuleError);
    expect(() => newGame({ seed: "wrong-world", universeId: "academy", upbringingId: "df-chapel-ward" })).toThrow(GameRuleError);
    // Каталог тоже не показывает чужой уклад
    const academy = summarizeUniverse(getUniverse("academy"));
    expect(academy.upbringings.some((item) => item.id === "ac-salon-upbringing")).toBe(true);
    expect(academy.upbringings.some((item) => item.id === "df-chapel-ward")).toBe(false);
  });

  it("превышение бюджета, лишние очки в характеристику и отрицательные значения отклоняются", () => {
    expect(() => newGame({ seed: "over-budget", universeId: "academy", statPoints: { strength: 2, agility: 2 } })).toThrow(GameRuleError);
    expect(() => newGame({ seed: "per-stat", universeId: "academy", statPoints: { strength: POINT_BUY_PER_STAT + 1 } })).toThrow(GameRuleError);
    expect(() => newGame({ seed: "negative", universeId: "academy", statPoints: { strength: -1 } })).toThrow(GameRuleError);
    expect(() => newGame({ seed: "unknown-stat", universeId: "academy", statPoints: { mana: 1 } as never })).toThrow(GameRuleError);
    expect(() =>
      newGame({ seed: "all-budget", universeId: "academy", statPoints: { strength: 1, agility: 1, intelligence: 1 } })
    ).not.toThrow();
    expect(POINT_BUY_TOTAL).toBe(3);
  });

  it("старый запрос без уклада и очков работает как раньше", () => {
    const state = start({ seed: "old-request", universeId: "hunter" });
    expect(state.character.creation).toBeUndefined();
    for (const key of STAT_KEYS) {
      expect(state.character.stats[key]).toBeGreaterThanOrEqual(STAT_MIN);
      expect(state.character.stats[key]).toBeLessThanOrEqual(BIRTH_STAT_MAX);
    }
  });

  it("старое сохранение без creation читается, а seed и rngState не меняются", () => {
    const { state } = newGame({ seed: "creation-compat", universeId: "academy", upbringingId: "ac-salon-upbringing", statPoints: { charisma: 2 } });
    const raw = JSON.parse(JSON.stringify(state)) as Record<string, unknown> & { schemaVersion: number; seed: string; rngState: number };
    const character = raw.character as Record<string, unknown>;
    delete character.creation;
    raw.schemaVersion = 12;
    const parsed = parseSave(raw);
    expect(parsed.schemaVersion).toBe(SAVE_SCHEMA_VERSION);
    expect(parsed.character.creation).toBeUndefined();
    expect(parsed.seed).toBe(state.seed);
    expect(parsed.rngState).toBe(state.rngState);
  });

  it("новое сохранение с creation проходит проверку и читается без изменений", () => {
    const { state } = newGame({ seed: "creation-roundtrip", universeId: "murim", upbringingId: "mu-sect-yard", statPoints: { agility: 2 } });
    expect(parseSave(JSON.parse(JSON.stringify(state)))).toEqual(state);
  });

  it("любой уклад во всех мирах не выводит характеристики за пределы рождения", () => {
    for (const universe of listUniverses()) {
      for (const view of summarizeUniverse(universe).upbringings) {
        for (let i = 0; i < 3; i++) {
          const { state } = newGame({ seed: `upbringing-${universe.id}-${view.id}-${i}`, universeId: universe.id, upbringingId: view.id });
          for (const key of STAT_KEYS) {
            expect(state.character.stats[key], `${universe.id}/${view.id}/${key}`).toBeGreaterThanOrEqual(STAT_MIN);
            expect(state.character.stats[key], `${universe.id}/${view.id}/${key}`).toBeLessThanOrEqual(BIRTH_STAT_MAX);
          }
          expect(state.character.talents, view.id).toContain(view.talent!.id);
        }
      }
    }
  });

  it("во всех шести мирах есть уклады, а их навыки и таланты существуют в каталоге", () => {
    for (const universe of listUniverses()) {
      const views = summarizeUniverse(universe).upbringings;
      expect(views.length, universe.id).toBeGreaterThanOrEqual(4);
      expect(upbringingsFor(universe).length).toBe(views.length);
      const ids = new Set<string>();
      for (const view of views) {
        expect(ids.has(view.id), `${universe.id}: ${view.id} повторяется`).toBe(false);
        ids.add(view.id);
        expect(view.skills.length, view.id).toBeGreaterThan(0);
        expect(view.talent, view.id).not.toBeNull();
      }
    }
  });
});
