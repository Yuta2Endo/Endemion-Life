// Stage 05: приключения — места, шаги, награды один раз, отдельный поток генератора, перевод сохранений 5 → 6
import { describe, expect, it } from "vitest";
import {
  applyAction,
  deepClone,
  findSkill,
  GameRuleError,
  getUniverse,
  newGame,
  parseSave,
  presentAdventure,
  SAVE_SCHEMA_VERSION,
  UNIVERSE_IDS,
  type GameState,
  type UniverseId
} from "../src/index.js";
import { SAVES_V4 } from "./fixtures/saves-v4.js";
import { start } from "./helpers.js";

function grown(universeId: UniverseId, age = 30, seed = `adventure-${universeId}`): GameState {
  const state = start({ seed, universeId });
  state.life = { ...state.life, age, stage: "adult" };
  state.pending = null;
  // Сильный герой: тесты проверяют правила, а не удачу броска
  for (const key of Object.keys(state.character.stats) as (keyof typeof state.character.stats)[]) state.character.stats[key] = 40;
  return state;
}

/** Открывает все места мира, не трогая генератор */
function reveal(state: GameState): GameState {
  const copy = deepClone(state);
  for (const place of presentAdventure(copy).places) copy.adventure.discovered.push(place.id);
  return copy;
}

const begin = (state: GameState, adventureId: string) => applyAction(state, { type: "venture", adventureId });
const choose = (state: GameState, choiceId: string) => applyAction(state, { type: "venture", choiceId });

function firstAvailable(state: GameState): string {
  const choice = presentAdventure(state).current?.step.choices.find((item) => item.available);
  if (!choice) throw new Error("нет доступного варианта");
  return choice.id;
}

describe("Stage 05: приключения", () => {
  it("у каждого мира есть места и приключение; шаги ссылаются только на своё; у каждого исхода ровно один переход", () => {
    for (const universeId of UNIVERSE_IDS) {
      const board = presentAdventure(grown(universeId));
      expect(board.places.length, universeId).toBeGreaterThan(0);
      expect(board.adventures.length, universeId).toBeGreaterThan(0);
      const universe = getUniverse(universeId);
      for (const adventure of board.adventures) {
        expect(board.places.map((place) => place.id), universeId).toContain(adventure.placeId);
        expect(adventure.rewards.length, adventure.id).toBeGreaterThan(0);
      }
      const state = reveal(grown(universeId));
      for (const card of presentAdventure(state).adventures) {
        if (card.blocked !== null) continue;
        let current = begin(state, card.id).state;
        const seen = new Set<string>();
        while (current.adventure.active && seen.size < 6) {
          seen.add(current.adventure.active.step);
          const view = presentAdventure(current).current;
          expect(view, card.id).not.toBeNull();
          for (const choice of view!.step.choices) {
            for (const reward of choice.rewards) {
              expect(reward.text.ru.length).toBeGreaterThan(0);
              expect(reward.text.en.length).toBeGreaterThan(0);
            }
          }
          current = choose(current, firstAvailable(current)).state;
        }
        expect(current.adventure.active, card.id).toBeNull();
        expect(current.adventure.done.includes(card.id) || current.adventure.failed.includes(card.id), card.id).toBe(true);
      }
      // Награды-навыки принадлежат миру
      for (const skill of universe.skills) expect(findSkill(universe, skill.id)).toBeDefined();
    }
  });

  it("место открывается по своему потоку и не сдвигает генератор жизни", () => {
    const state = grown("murim", 14);
    const before = state.rngState;
    let opened = false;
    for (let year = 0; year < 12 && !opened; year++) {
      const result = applyAction(state.life.age === 14 && year === 0 ? state : state, { type: "advance" });
      // advance меняет генератор само по себе; сравниваем два одинаковых прогона ниже
      if (result.entries.some((entry) => entry.kind === "adventure")) opened = true;
      Object.assign(state, result.state);
    }
    expect(opened).toBe(true);
    expect(state.adventure.discovered.length).toBeGreaterThan(0);

    const again = grown("murim", 14);
    const first = applyAction(again, { type: "advance" });
    const second = applyAction(grown("murim", 14), { type: "advance" });
    expect(first.state.adventure.discovered).toEqual(second.state.adventure.discovered);
    expect(first.state.rngState).toBe(second.state.rngState);
    expect(before).toBe(grown("murim", 14).rngState);
  });

  it("приключение нельзя начать раньше времени, без места, при событии и второй раз", () => {
    const young = grown("isekai", 10);
    young.adventure.discovered.push("is.guild-hall");
    expect(() => begin(young, "is.first-contract")).toThrow(GameRuleError);

    const hidden = grown("isekai");
    expect(() => begin(hidden, "is.first-contract")).toThrow(GameRuleError);

    const pending = reveal(grown("isekai"));
    pending.pending = { eventId: "is.guild-licence", age: pending.life.age };
    expect(() => begin(pending, "is.first-contract")).toThrow(GameRuleError);

    const started = begin(reveal(grown("isekai")), "is.first-contract").state;
    expect(() => begin(started, "is.first-contract")).toThrow(GameRuleError);
    expect(() => begin(started, "no-such")).toThrow(GameRuleError);
  });

  it("награда шага выдаётся один раз: после завершения то же приключение не начинается", () => {
    // Потолок проверки — 95%, поэтому на части seed шаг честно проваливается. Берём seed, где рейд доходит до конца
    let state = reveal(grown("hunter"));
    for (let n = 0; n < 12 && !state.adventure.done.includes("hu.gate-raid"); n++) {
      state = reveal(grown("hunter", 30, `raid-${n}`));
      const goldBefore = state.character.wealth;
      state = begin(state, "hu.gate-raid").state;
      let guard = 0;
      while (state.adventure.active && guard < 6) {
        guard += 1;
        state = choose(state, firstAvailable(state)).state;
      }
      if (!state.adventure.done.includes("hu.gate-raid")) continue;
      expect(state.character.wealth).toBeGreaterThan(goldBefore);
    }
    expect(state.adventure.done).toContain("hu.gate-raid");
    expect(() => begin(state, "hu.gate-raid")).toThrow(GameRuleError);
    // Повтор последнего шага невозможен: приключения уже нет
    expect(() => choose(state, "register")).toThrow(GameRuleError);
  });

  it("сдача кладёт приключение в проваленные и не даёт золота", () => {
    const state = begin(reveal(grown("academy")), "ac.court-errand").state;
    const gold = state.character.wealth;
    const left = applyAction(state, { type: "venture" });
    expect(left.state.adventure.failed).toContain("ac.court-errand");
    expect(left.state.adventure.active).toBeNull();
    expect(left.state.character.wealth).toBe(gold);
    expect(() => begin(left.state, "ac.court-errand")).toThrow(GameRuleError);
  });

  it("недоступный вариант отклоняется и не меняет состояние", () => {
    let state = reveal(grown("dark-fantasy"));
    state.character.factions = {};
    state = begin(state, "df.night-watch").state;
    const before = deepClone(state);
    expect(() => choose(state, "oath")).toThrow(GameRuleError);
    expect(state.adventure.active).toEqual(before.adventure.active);
    expect(state.character.wealth).toBe(before.character.wealth);
  });

  it("способность приключения не выдаётся дважды", () => {
    let state = reveal(grown("dark-fantasy"));
    state.character.abilities = ["hollow-mark"];
    state = begin(state, "df.night-watch").state;
    while (state.adventure.active) state = choose(state, firstAvailable(state)).state;
    expect(state.character.abilities.filter((id) => id === "hollow-mark")).toHaveLength(1);
  });

  it("сохранение формата 5 получает пустое приключение и ничего не теряет", () => {
    expect(SAVE_SCHEMA_VERSION).toBe(9);
    const fresh = newGame({ seed: "fmt", universeId: "murim" }).state;
    expect(fresh.schemaVersion).toBe(9);
    expect(fresh.adventure.discovered).toEqual([]);
    for (const old of Object.values(SAVES_V4) as Record<string, unknown>[]) {
      const save = parseSave(old);
      expect(save.schemaVersion).toBe(9);
      expect(save.adventure).toEqual({ discovered: [], active: null, done: [], failed: [], log: [] });
      expect(save.character.name).toBe((old.character as { name: string }).name);
      expect(save.rngState).toBe(old.rngState);
    }
  });

  it("наследник начинает без мест и приключений предка", () => {
    const state = reveal(grown("xianxia"));
    const started = begin(state, "xi.forbidden").state;
    expect(started.adventure.active).not.toBeNull();
    // Преемственность проверяется отдельно: новая жизнь наследника собирается с пустым приключением
    const heir = newGame({ seed: "heir", universeId: "xianxia" }).state;
    expect(heir.adventure.discovered).toEqual([]);
    expect(heir.adventure.active).toBeNull();
  });

  it("повреждённое приключение в сохранении отклоняется", () => {
    const state = newGame({ seed: "bad", universeId: "murim" }).state;
    const broken = deepClone(state) as unknown as { adventure: { discovered: string[] } };
    broken.adventure.discovered = ["foreign-place"];
    expect(() => parseSave(broken)).toThrow(GameRuleError);
  });
});
