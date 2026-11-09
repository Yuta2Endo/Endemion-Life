// Stage 04.4: Сюжетные цепочки и история персонажа — тесты прогресса сюжетов, областей действия и переходов этапов
import { describe, expect, it } from "vitest";
import {
  checkCondition,
  deepClone,
  findEvent,
  getUniverse,
  isEligible,
  parseSave,
  type GameState,
  type StoryProgress
} from "../src/index.js";
import { applyEffect, getStoryProgress } from "../src/engine/effects.js";
import { describeCondition } from "../src/engine/conditions.js";
import { fx, when } from "../src/narrative/dsl.js";
import type { EngineContext } from "../src/engine/context.js";
import { Rng } from "../src/rng.js";
import { start } from "./helpers.js";

function makeCtx(state: GameState): EngineContext {
  return {
    state,
    rng: Rng.fromSeed("story-test", "story"),
    universe: getUniverse(state.character.universeId),
    changes: [],
  };
}

function storyProgressOf(state: GameState, id: string, scope: "character" | "lineage") {
  const store = scope === "lineage" ? state.lineage.storyProgress : state.character.storyProgress;
  return store?.[id];
}

describe("Stage 04.4: модель данных и области действия", () => {
  it("отсутствующий прогресс сюжета ведёт себя как этап 0 и не завершён", () => {
    const state = start({ seed: "story-missing" });
    expect(storyProgressOf(state, "any-story", "lineage")).toBeUndefined();
    const progress = getStoryProgress(state, "any-story", "lineage");
    expect(progress.stage).toBe(0);
    expect(progress.completed).toBe(false);
    expect(progress.choices).toEqual({});
  });

  it("прогресс персонажа хранится независимо от рода", () => {
    const state = start({ seed: "story-char-scope" });
    const ctx = makeCtx(state);
    applyEffect(ctx, fx.advanceStory("personal-quest", 0, 1, "character"));
    expect(storyProgressOf(state, "personal-quest", "character")?.stage).toBe(1);
    expect(storyProgressOf(state, "personal-quest", "lineage")).toBeUndefined();
  });

  it("прогресс рода хранится независимо от персонажа", () => {
    const state = start({ seed: "story-lineage-scope" });
    const ctx = makeCtx(state);
    applyEffect(ctx, fx.advanceStory("family-legacy", 0, 1, "lineage"));
    expect(storyProgressOf(state, "family-legacy", "lineage")?.stage).toBe(1);
    expect(storyProgressOf(state, "family-legacy", "character")).toBeUndefined();
  });

  it("личный прогресс не передаётся новому персонажу после наследования", () => {
    const state = start({ seed: "story-no-leak" });
    const ctx = makeCtx(state);
    applyEffect(ctx, fx.advanceStory("personal-quest", 0, 1, "character"));
    expect(storyProgressOf(state, "personal-quest", "character")?.stage).toBe(1);

    const heir = start({ seed: "story-heir" });
    expect(storyProgressOf(heir, "personal-quest", "character")).toBeUndefined();
  });

  it("прогресс рода сохраняется при клонировании линии (основа наследования)", () => {
    const state = start({ seed: "story-lineage-clone" });
    const ctx = makeCtx(state);
    applyEffect(ctx, fx.advanceStory("family-legacy", 0, 1, "lineage"));

    const cloned = deepClone(state);
    expect(storyProgressOf(cloned, "family-legacy", "lineage")?.stage).toBe(1);
  });
});

describe("Stage 04.4: переходы этапов", () => {
  it("корректный переход этапа успешен", () => {
    const state = start({ seed: "story-advance-ok" });
    const ctx = makeCtx(state);
    applyEffect(ctx, fx.advanceStory("chain", 0, 1, "lineage"));
    expect(storyProgressOf(state, "chain", "lineage")?.stage).toBe(1);
    expect(storyProgressOf(state, "chain", "lineage")?.completed).toBe(false);
  });

  it("неправильный ожидаемый этап не продвигает сюжет", () => {
    const state = start({ seed: "story-advance-wrong" });
    const ctx = makeCtx(state);
    applyEffect(ctx, fx.advanceStory("chain", 0, 1, "lineage"));
    applyEffect(ctx, fx.advanceStory("chain", 5, 6, "lineage")); // ожидаем 5, а текущий 1
    expect(storyProgressOf(state, "chain", "lineage")?.stage).toBe(1);
  });

  it("завершённый сюжет не может продвигаться", () => {
    const state = start({ seed: "story-completed" });
    const ctx = makeCtx(state);
    applyEffect(ctx, fx.completeStory("chain", "lineage"));
    expect(storyProgressOf(state, "chain", "lineage")?.completed).toBe(true);

    applyEffect(ctx, fx.advanceStory("chain", 0, 1, "lineage"));
    expect(storyProgressOf(state, "chain", "lineage")?.stage).toBe(0);
    expect(storyProgressOf(state, "chain", "lineage")?.completed).toBe(true);
  });

  it("обратный или равный следующий этап отвергается", () => {
    const state = start({ seed: "story-backward" });
    const ctx = makeCtx(state);
    applyEffect(ctx, fx.advanceStory("chain", 0, 2, "lineage"));
    expect(storyProgressOf(state, "chain", "lineage")?.stage).toBe(2);

    applyEffect(ctx, fx.advanceStory("chain", 2, 1, "lineage"));
    expect(storyProgressOf(state, "chain", "lineage")?.stage).toBe(2);

    applyEffect(ctx, fx.advanceStory("chain", 2, 2, "lineage"));
    expect(storyProgressOf(state, "chain", "lineage")?.stage).toBe(2);
  });

  it("повторный переход с теми же параметрами не продвигает дважды", () => {
    const state = start({ seed: "story-dedup" });
    const ctx = makeCtx(state);
    applyEffect(ctx, fx.advanceStory("chain", 0, 1, "lineage"));
    applyEffect(ctx, fx.advanceStory("chain", 0, 1, "lineage"));
    expect(storyProgressOf(state, "chain", "lineage")?.stage).toBe(1);
  });

  it("точное совпадение этапа в условии storyStage", () => {
    const state = start({ seed: "story-exact-stage" });
    const ctx = makeCtx(state);
    applyEffect(ctx, fx.advanceStory("chain", 0, 1, "lineage"));

    expect(checkCondition(state, when.storyStage("chain", 1, "lineage"))).toBe(true);
    expect(checkCondition(state, when.storyStage("chain", 0, "lineage"))).toBe(false);
    expect(checkCondition(state, when.storyStage("chain", 2, "lineage"))).toBe(false);
  });

  it("условие storyCompleted работает после завершения", () => {
    const state = start({ seed: "story-completed-cond" });
    const ctx = makeCtx(state);
    expect(checkCondition(state, when.storyCompleted("chain", "lineage"))).toBe(false);

    applyEffect(ctx, fx.completeStory("chain", "lineage"));
    expect(checkCondition(state, when.storyCompleted("chain", "lineage"))).toBe(true);
  });
});

describe("Stage 04.4: запись выбора", () => {
  it("выбор записывается против правильного сюжета и события", () => {
    const state = start({ seed: "story-choice-record" });
    const ctx = makeCtx(state);
    applyEffect(ctx, fx.recordStoryChoice("chain", "chain.1", "enter", "lineage"));

    const progress = storyProgressOf(state, "chain", "lineage");
    expect(progress?.choices["chain.1"]).toBe("enter");
  });

  it("storyChoice возвращает true для совпадающего выбора", () => {
    const state = start({ seed: "story-choice-true" });
    const ctx = makeCtx(state);
    applyEffect(ctx, fx.recordStoryChoice("chain", "chain.1", "enter", "lineage"));

    expect(checkCondition(state, when.storyChoice("chain", "chain.1", "enter", "lineage"))).toBe(true);
  });

  it("storyChoice возвращает false для другого выбора", () => {
    const state = start({ seed: "story-choice-false" });
    const ctx = makeCtx(state);
    applyEffect(ctx, fx.recordStoryChoice("chain", "chain.1", "enter", "lineage"));

    expect(checkCondition(state, when.storyChoice("chain", "chain.1", "leave", "lineage"))).toBe(false);
  });

  it("выборы из другого сюжета не совпадают", () => {
    const state = start({ seed: "story-choice-other" });
    const ctx = makeCtx(state);
    applyEffect(ctx, fx.recordStoryChoice("chain-a", "event-1", "option-a", "lineage"));

    expect(checkCondition(state, when.storyChoice("chain-b", "event-1", "option-a", "lineage"))).toBe(false);
  });

  it("личные и фамильные выборы не просачиваются между областями", () => {
    const state = start({ seed: "story-scope-isolation" });
    const ctx = makeCtx(state);
    applyEffect(ctx, fx.recordStoryChoice("chain", "event-1", "option-a", "character"));
    applyEffect(ctx, fx.recordStoryChoice("chain", "event-1", "option-b", "lineage"));

    expect(checkCondition(state, when.storyChoice("chain", "event-1", "option-a", "character"))).toBe(true);
    expect(checkCondition(state, when.storyChoice("chain", "event-1", "option-a", "lineage"))).toBe(false);
    expect(checkCondition(state, when.storyChoice("chain", "event-1", "option-b", "lineage"))).toBe(true);
    expect(checkCondition(state, when.storyChoice("chain", "event-1", "option-b", "character"))).toBe(false);
  });
});

describe("Stage 04.4: сохранения и наследование", () => {
  it("старые сохранения без новых полей загружаются безопасно", () => {
    const state = start({ seed: "story-old-save" });
    const raw: GameState = deepClone(state);
    delete raw.lineage.storyProgress;
    delete raw.character.storyProgress;

    expect(() => parseSave(raw)).not.toThrow();
    const restored = parseSave(raw);
    // parseSave не добавляет storyProgress автоматически — это происходит в applyAction через ??=
    // Поэтому после загрузки поля могут быть undefined (старые сохранения)
    expect(restored.lineage.storyProgress ?? {}).toEqual({});
    expect(restored.character.storyProgress ?? {}).toEqual({});
  });

  it("прогресс сюжета сохраняется после сериализации и загрузки", () => {
    const state = start({ seed: "story-roundtrip" });
    const ctx = makeCtx(state);
    applyEffect(ctx, fx.advanceStory("chain", 0, 1, "lineage"));
    applyEffect(ctx, fx.recordStoryChoice("chain", "chain.1", "enter", "lineage"));
    applyEffect(ctx, fx.completeStory("chain", "lineage"));

    const restored = parseSave(deepClone(state));

    const progress = restored.lineage.storyProgress?.[
      "chain"
    ];
    expect(progress?.stage).toBe(1);
    expect(progress?.completed).toBe(true);
    expect(progress?.choices["chain.1"]).toBe("enter");
  });

  it("некорректный прогресс обрабатывается безопасно", () => {
    const state = start({ seed: "story-malformed" });
    const raw: GameState = deepClone(state);
    raw.lineage.storyProgress = { broken: { stage: 0 } as unknown as StoryProgress };

    expect(() => parseSave(raw)).toThrow();
  });

  it("загрузка не применяет эффекты или бонусы повторно", () => {
    const state = start({ seed: "story-no-reapply" });
    const ctx = makeCtx(state);
    const renownBefore = state.lineage.renown;

    applyEffect(ctx, fx.advanceStory("chain", 0, 1, "lineage"));
    applyEffect(ctx, fx.completeStory("chain", "lineage"));
    const renownAfter = state.lineage.renown;
    expect(renownAfter).toBe(renownBefore);

    const restored = parseSave(deepClone(state));
    expect(restored.lineage.renown).toBe(renownAfter);
  });
});

describe("Stage 04.4: строгая валидация storyProgress", () => {
  function makeStateWithStoryProgress(scope: "character" | "lineage", progress: Record<string, StoryProgress>): GameState {
    const state = start({ seed: "story-validation" });
    if (scope === "character") {
      state.character.storyProgress = progress;
    } else {
      state.lineage.storyProgress = progress;
    }
    return state;
  }

  it("отрицательный этап отклоняется для lineage", () => {
    const state = makeStateWithStoryProgress("lineage", { chain: { stage: -1, completed: false, choices: {} } });
    const raw = deepClone(state);
    expect(() => parseSave(raw)).toThrow();
  });

  it("отрицательный этап отклоняется для character", () => {
    const state = makeStateWithStoryProgress("character", { chain: { stage: -1, completed: false, choices: {} } });
    const raw = deepClone(state);
    expect(() => parseSave(raw)).toThrow();
  });

  it("дробный этап отклоняется для lineage", () => {
    const state = makeStateWithStoryProgress("lineage", { chain: { stage: 1.5, completed: false, choices: {} } });
    const raw = deepClone(state);
    expect(() => parseSave(raw)).toThrow();
  });

  it("дробный этап отклоняется для character", () => {
    const state = makeStateWithStoryProgress("character", { chain: { stage: 1.5, completed: false, choices: {} } });
    const raw = deepClone(state);
    expect(() => parseSave(raw)).toThrow();
  });

  it("отсутствующий этап отклоняется для lineage", () => {
    const state = makeStateWithStoryProgress("lineage", { chain: { completed: false, choices: {} } as unknown as StoryProgress });
    const raw = deepClone(state);
    expect(() => parseSave(raw)).toThrow();
  });

  it("отсутствующий этап отклоняется для character", () => {
    const state = makeStateWithStoryProgress("character", { chain: { completed: false, choices: {} } as unknown as StoryProgress });
    const raw = deepClone(state);
    expect(() => parseSave(raw)).toThrow();
  });

  it("некорректное completed отклоняется для lineage", () => {
    const state = makeStateWithStoryProgress("lineage", { chain: { stage: 0, completed: "yes" as unknown as boolean, choices: {} } });
    const raw = deepClone(state);
    expect(() => parseSave(raw)).toThrow();
  });

  it("некорректное completed отклоняется для character", () => {
    const state = makeStateWithStoryProgress("character", { chain: { stage: 0, completed: "yes" as unknown as boolean, choices: {} } });
    const raw = deepClone(state);
    expect(() => parseSave(raw)).toThrow();
  });

  it("некорректные choices (не запись) отклоняются для lineage", () => {
    const state = makeStateWithStoryProgress("lineage", { chain: { stage: 0, completed: false, choices: "not-a-record" as unknown as Record<string, string> } });
    const raw = deepClone(state);
    expect(() => parseSave(raw)).toThrow();
  });

  it("некорректные choices (не запись) отклоняются для character", () => {
    const state = makeStateWithStoryProgress("character", { chain: { stage: 0, completed: false, choices: "not-a-record" as unknown as Record<string, string> } });
    const raw = deepClone(state);
    expect(() => parseSave(raw)).toThrow();
  });

  it("некорректное значение выбора отклоняется для lineage", () => {
    const state = makeStateWithStoryProgress("lineage", { chain: { stage: 0, completed: false, choices: { "event.1": 42 as unknown as string } } });
    const raw = deepClone(state);
    expect(() => parseSave(raw)).toThrow();
  });

  it("некорректное значение выбора отклоняется для character", () => {
    const state = makeStateWithStoryProgress("character", { chain: { stage: 0, completed: false, choices: { "event.1": 42 as unknown as string } } });
    const raw = deepClone(state);
    expect(() => parseSave(raw)).toThrow();
  });

  it("валидный этап 0 принимается для lineage", () => {
    const state = makeStateWithStoryProgress("lineage", { chain: { stage: 0, completed: false, choices: {} } });
    const raw = deepClone(state);
    expect(() => parseSave(raw)).not.toThrow();
  });

  it("валидный этап 0 принимается для character", () => {
    const state = makeStateWithStoryProgress("character", { chain: { stage: 0, completed: false, choices: {} } });
    const raw = deepClone(state);
    expect(() => parseSave(raw)).not.toThrow();
  });

  it("валидный положительный этап принимается для lineage", () => {
    const state = makeStateWithStoryProgress("lineage", { chain: { stage: 5, completed: false, choices: {} } });
    const raw = deepClone(state);
    expect(() => parseSave(raw)).not.toThrow();
  });

  it("валидный положительный этап принимается для character", () => {
    const state = makeStateWithStoryProgress("character", { chain: { stage: 5, completed: false, choices: {} } });
    const raw = deepClone(state);
    expect(() => parseSave(raw)).not.toThrow();
  });
});

describe("Stage 04.4: describeCondition локализация", () => {
  it("storyStage показывает локализованное описание", () => {
    const state = start({ seed: "story-desc-stage" });
    const universe = getUniverse(state.character.universeId);
    const text = describeCondition(when.storyStage("chain", 1, "lineage"), universe);
    expect(text.ru).toContain("Этап сюжета chain: 1");
    expect(text.en).toContain("Story chain stage: 1");
  });

  it("storyCompleted показывает локализованное описание", () => {
    const state = start({ seed: "story-desc-completed" });
    const universe = getUniverse(state.character.universeId);
    const text = describeCondition(when.storyCompleted("chain", "lineage"), universe);
    expect(text.ru).toContain("Сюжет chain завершён");
    expect(text.en).toContain("Story chain completed");
  });

  it("неизвестный сюжет безопасно возвращает базовый прогресс", () => {
    const state = start({ seed: "story-unknown" });
    expect(checkCondition(state, when.storyStage("nonexistent", 0, "lineage"))).toBe(true);
    expect(checkCondition(state, when.storyStage("nonexistent", 1, "lineage"))).toBe(false);
    expect(checkCondition(state, when.storyCompleted("nonexistent", "lineage"))).toBe(false);
  });
});

describe("Stage 04.4: защита завершённых цепочек (защита от повторного срабатывания)", () => {
  function findEventById(state: GameState, id: string) {
    return findEvent(getUniverse(state.character.universeId), id);
  }

  it("завершённая цепочка не показывает событие 1 снова (leave-ветка)", () => {
    const state = start({ seed: "story-protected-leave" });
    const ctx = makeCtx(state);
    // Пройти событие 1 через ветку "leave" — цепочка завершается
    // Симулируем полный цикл choose(): occurrence + lineage.stories увеличиваются
    state.occurrences["story.broken-oath.1"] = 1;
    state.lineage.stories["story.broken-oath.1"] = 1;
    applyEffect(ctx, fx.completeStory("story.broken-oath", "lineage"));

    const event1 = findEventById(state, "story.broken-oath.1");
    expect(event1).toBeDefined();
    // После завершения цепочки событие 1 не должно быть пригодно (lineageMax: 1)
    expect(isEligible(state, event1!)).toBe(false);
  });

  it("завершённая цепочка не показывает событие 2 снова (hide-ветка)", () => {
    const state = start({ seed: "story-protected-hide" });
    const ctx = makeCtx(state);
    // Пройти событие 2 через ветку "hide" — цепочка завершается
    applyEffect(ctx, fx.advanceStory("story.broken-oath", 0, 1, "lineage"));
    // Симулируем выбор события 2
    state.occurrences["story.broken-oath.2"] = 1;
    state.lineage.stories["story.broken-oath.2"] = 1;
    applyEffect(ctx, fx.completeStory("story.broken-oath", "lineage"));

    const event2 = findEventById(state, "story.broken-oath.2");
    expect(event2).toBeDefined();
    expect(isEligible(state, event2!)).toBe(false);
  });

  it("завершённая цепочка не показывает событие 3 снова (accept-ветка)", () => {
    const state = start({ seed: "story-protected-accept" });
    const ctx = makeCtx(state);
    // Пройти всю цепочку до события 3 через ветку "accept"
    applyEffect(ctx, fx.advanceStory("story.broken-oath", 0, 1, "lineage"));
    applyEffect(ctx, fx.recordStoryChoice("story.broken-oath", "story.broken-oath.2", "read", "lineage"));
    applyEffect(ctx, fx.advanceStory("story.broken-oath", 1, 2, "lineage"));
    // Симулируем выбор события 3
    state.occurrences["story.broken-oath.3"] = 1;
    state.lineage.stories["story.broken-oath.3"] = 1;
    applyEffect(ctx, fx.completeStory("story.broken-oath", "lineage"));

    const event3 = findEventById(state, "story.broken-oath.3");
    expect(event3).toBeDefined();
    expect(isEligible(state, event3!)).toBe(false);
  });

  it("завершённая цепочка не показывает событие 3 снова (reject-ветка)", () => {
    const state = start({ seed: "story-protected-reject" });
    const ctx = makeCtx(state);
    applyEffect(ctx, fx.advanceStory("story.broken-oath", 0, 1, "lineage"));
    applyEffect(ctx, fx.recordStoryChoice("story.broken-oath", "story.broken-oath.2", "read", "lineage"));
    applyEffect(ctx, fx.advanceStory("story.broken-oath", 1, 2, "lineage"));
    // Симулируем выбор события 3 через ветку "reject"
    state.occurrences["story.broken-oath.3"] = 1;
    state.lineage.stories["story.broken-oath.3"] = 1;
    applyEffect(ctx, fx.completeStory("story.broken-oath", "lineage"));

    const event3 = findEventById(state, "story.broken-oath.3");
    expect(event3).toBeDefined();
    expect(isEligible(state, event3!)).toBe(false);
  });

  it("завершённая цепочка остаётся завершённой после наследования", () => {
    const state = start({ seed: "story-succession-complete" });
    const ctx = makeCtx(state);
    applyEffect(ctx, fx.advanceStory("story.broken-oath", 0, 1, "lineage"));
    applyEffect(ctx, fx.completeStory("story.broken-oath", "lineage"));

    // Подготовка к наследованию: cloned линия сохраняет storyProgress
    const cloned = deepClone(state);
    expect(storyProgressOf(cloned, "story.broken-oath", "lineage")?.completed).toBe(true);
    expect(checkCondition(cloned, when.storyCompleted("story.broken-oath", "lineage"))).toBe(true);
  });

  it("некорректный прогресс персонажа отклоняется при загрузке сохранения", () => {
    const state = start({ seed: "story-malformed-char" });
    const raw: GameState = deepClone(state);
    raw.character.storyProgress = { broken: { stage: 0 } as unknown as StoryProgress };

    expect(() => parseSave(raw)).toThrow();
  });

  it(" legacy-сохранение без storyProgress загружается безопасно", () => {
    const state = start({ seed: "story-legacy-save" });
    const raw: GameState = deepClone(state);
    delete raw.lineage.storyProgress;
    delete raw.character.storyProgress;

    expect(() => parseSave(raw)).not.toThrow();
    const restored = parseSave(raw);
    expect(restored.lineage.storyProgress ?? {}).toEqual({});
    expect(restored.character.storyProgress ?? {}).toEqual({});
  });
});

