// Stage 10: освоение мира. Цели зачитываются один раз и ничего не выдают
import { describe, expect, it } from "vitest";
import { masteryYearly } from "../src/endgame/mastery.js";
import {
  applyAction,
  deepClone,
  GameRuleError,
  getUniverse,
  heirCandidates,
  newGame,
  parseSave,
  pathSkill,
  SAVE_SCHEMA_VERSION,
  succeed,
  unlockAchievements,
  type GameState
} from "../src/index.js";
import { start } from "./helpers.js";

function adult(): GameState {
  const state = start({ seed: "mastery", universeId: "dark-fantasy" });
  state.life = { ...state.life, age: 40, stage: "adult" };
  state.pending = null;
  return state;
}

describe("Stage 10: освоение", () => {
  it("новая жизнь пуста, сохранение формата 7 получает пустое мастерство и ничего не теряет", () => {
    expect(SAVE_SCHEMA_VERSION).toBe(8);
    const fresh = newGame({ seed: "mastery-new", universeId: "isekai" }).state;
    expect(fresh.mastery).toEqual({ objectives: [], skills: [] });
    const old = deepClone(fresh) as unknown as Record<string, unknown>;
    old.schemaVersion = 7;
    delete old.mastery;
    const restored = parseSave(old);
    expect(restored.schemaVersion).toBe(8);
    expect(restored.mastery.objectives).toEqual([]);
    expect(restored.character.name).toBe(fresh.character.name);
    expect(restored.rngState).toBe(fresh.rngState);
  });

  it("цель зачитывается один раз и не даёт золота, опыта и статов", () => {
    const state = adult();
    state.adventure.discovered = ["df.ember-wall", "df.ash-cathedral"];
    const wealth = state.character.wealth;
    masteryYearly(state);
    expect(state.mastery.objectives).toContain("roads");
    expect(state.character.wealth).toBe(wealth);
    expect(state.character.xp).toBe(0);
    const once = applyAction(state, { type: "advance" }).state;
    expect(once.mastery.objectives.filter((id) => id === "roads")).toHaveLength(1);
    const twice = applyAction(once, { type: "advance" }).state;
    expect(twice.mastery.objectives.filter((id) => id === "roads")).toHaveLength(1);
  });

  it("редкая цель требует все три условия, достижение пишется один раз и только в своём мире", () => {
    const state = adult();
    state.adventure.discovered = ["df.ember-wall", "df.ash-cathedral"];
    state.adventure.done = ["df.night-watch", "df.ash-relic"];
    const skill = pathSkill(getUniverse("dark-fantasy"));
    state.character.skills[skill.id] = 80;
    const oneRoad = deepClone(state);
    oneRoad.adventure.done = ["df.night-watch"];
    masteryYearly(oneRoad);
    expect(oneRoad.mastery.objectives).not.toContain("deed");
    expect(oneRoad.mastery.objectives).not.toContain("master-of-world");

    const missing = deepClone(state);
    missing.adventure.discovered = ["df.ember-wall"];
    masteryYearly(missing);
    expect(missing.mastery.objectives).not.toContain("master-of-world");

    state.adventure.discovered = ["df.ember-wall", "df.ash-cathedral"];
    const next = applyAction(state, { type: "advance" }).state;
    expect(next.mastery.skills).toContain(skill.id);
    expect(next.mastery.objectives).toContain("master-of-world");
    expect(next.mastery.skills.filter((id) => id === skill.id)).toHaveLength(1);
    expect(next.lineage.achievements.map((item) => item.id)).toContain("world.mastery.dark-fantasy");
    expect(next.lineage.achievements.map((item) => item.id)).not.toContain("world.mastery.isekai");
    expect(unlockAchievements(next)).toEqual([]);
  });

  it("навык ниже 80 отметки не получает, чужой id сохранение отвергает", () => {
    const state = adult();
    state.character.skills.melee = 79;
    const next = applyAction(state, { type: "advance" }).state;
    expect(next.mastery.skills).not.toContain("melee");
    const broken = deepClone(next);
    broken.mastery.objectives = ["not-a-goal"];
    expect(() => parseSave(broken)).toThrow(GameRuleError);
    const foreign = deepClone(next);
    foreign.mastery.skills = ["spellcraft"];
    expect(() => parseSave(foreign)).toThrow(GameRuleError);
  });

  it("наследник не получает освоение предка и сохраняет достижения рода", () => {
    const state = adult();
    state.life.alive = false;
    state.life.deathAge = 40;
    state.mastery.objectives = ["roads"];
    state.lineage.achievements.push({ id: "wedding", gen: 1, age: 20 });
    const heir = heirCandidates(state).find((item) => item.available);
    expect(heir).toBeDefined();
    const born = succeed(state, heir!.npc.id, "stage10-salt").state;
    expect(born.mastery).toEqual({ objectives: [], skills: [] });
    expect(born.lineage.achievements.map((item) => item.id)).toContain("wedding");
  });
});
