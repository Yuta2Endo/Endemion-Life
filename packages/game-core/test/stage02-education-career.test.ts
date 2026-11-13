// Stage 02.2: образование, карьера, жалованье и плата за обучение.
// Проверки идут через те же правила, что и игра: события, эффекты, годовой цикл и строгий parseSave.
import { describe, expect, it } from "vitest";
import {
  applyAction,
  applyEffect,
  allProfessions,
  canEnrollEducation,
  canStartCareer,
  careerWage,
  careerYear,
  deepClone,
  economyYear,
  educationYear,
  enrollEducation,
  eventProblems,
  findCareerTrack,
  findEvent,
  getUniverse,
  isEligible,
  loseCareer,
  migrateSave,
  parseSave,
  presentCareer,
  presentEducation,
  promoteCareer,
  promotionReady,
  retireCareer,
  retirementDue,
  Rng,
  SAVE_SCHEMA_VERSION,
  startCareer,
  tuitionCost,
  UNIVERSE_IDS,
  yearLines,
  type GameState
} from "../src/index.js";
import { SAVES_V1 } from "./fixtures/saves-v1.js";
import { SAVES_V2 } from "./fixtures/saves-v2.js";
import { SAVES_V4 } from "./fixtures/saves-v4.js";
import { SAVES_V8 } from "./fixtures/saves-v8.js";
import { SAVES_V9 } from "./fixtures/saves-v9.js";
import { choiceIds, start } from "./helpers.js";

function contextOf(state: GameState) {
  return { state, rng: new Rng(state.rngState), universe: getUniverse(state.character.universeId), changes: [], source: undefined as string | undefined };
}

function at(state: GameState, age: number): GameState {
  const copy = deepClone(state);
  copy.life = { ...copy.life, age, stage: age < 13 ? "child" : age < 18 ? "teen" : age < 50 ? "adult" : "middle" };
  return copy;
}

function withPending(state: GameState, eventId: string): GameState {
  const copy = deepClone(state);
  copy.pending = { eventId, age: copy.life.age };
  return copy;
}

function finishCourse(state: GameState): GameState {
  const ctx = contextOf(state);
  const years = ctx.state.education.duration;
  for (let i = 0; i < years; i++) {
    const result = educationYear(ctx);
    if (result.completedId) applyEffect(ctx, { type: "education", id: result.completedId });
  }
  return ctx.state;
}

function startCareerAt(state: GameState, professionId: string): GameState {
  const ctx = contextOf(state);
  expect(startCareer(ctx, professionId)).toBe(true);
  return ctx.state;
}

describe("Stage 02.2: образование", () => {
  it("новая жизнь начинает без курса и без работы; строгий round trip проходит", () => {
    const state = start({ seed: "edu-new", universeId: "dark-fantasy" });
    expect(state.schemaVersion).toBe(SAVE_SCHEMA_VERSION);
    expect(state.education).toEqual({ currentId: null, startedAt: 0, progress: 0, duration: 0 });
    expect(state.career).toEqual({ rank: 0, since: 0, tenure: 0, employed: false, retired: false });
    expect(parseSave(JSON.parse(JSON.stringify(state)))).toEqual(state);
    expect(presentEducation(state, getUniverse("dark-fantasy")).current).toBeNull();
  });

  it("ребёнок выбирает школу событием, ступени идут по порядку и заканчиваются дипломом", () => {
    const universe = getUniverse("dark-fantasy");
    let state = at(start({ seed: "edu-path", universeId: "dark-fantasy" }), 6);
    expect(isEligible(state, findEvent(universe, "edu.school.dark-fantasy")!)).toBe(true);
    state = applyAction(withPending(state, "edu.school.dark-fantasy"), { type: "choose", choiceId: "study" }).state;
    expect(state.education.currentId).toBe("df-letters");
    expect(state.education.duration).toBe(2);
    // Вторую ступень нельзя начать, пока не пройдена первая
    expect(canEnrollEducation(universe, state, "df-squire")).toBe(false);
    state = finishCourse(state);
    expect(state.character.educationId).toBe("df-letters");
    expect(state.education.currentId).toBeNull();
    // Следующая ступень открыта только с 12 лет и только после первой
    expect(canEnrollEducation(universe, at(state, 11), "df-squire")).toBe(false);
    expect(canEnrollEducation(universe, at(state, 12), "df-squire")).toBe(true);
  });

  it("плата за обучение входит в годовой расчёт один раз и не уводит золото ниже нуля", () => {
    const state = at(start({ seed: "edu-tuition", universeId: "isekai" }), 13);
    state.character.educationId = "is-temple";
    state.character.wealth = 40;
    const ctx = contextOf(state);
    expect(enrollEducation(ctx, "is-guild-course")).toBe(true);
    expect(tuitionCost(ctx.state)).toBe(8);
    const lines = yearLines(ctx.state);
    const tuition = lines.filter((line) => line.id === "tuition");
    expect(tuition).toHaveLength(1);
    expect(tuition[0]!.amount).toBe(-8);
    const before = ctx.state.character.wealth;
    // yearLines ничего не меняет; год применяет ровно один итог
    expect(ctx.state.character.wealth).toBe(before);
    economyYear(ctx);
    const applied = (ctx.state.economy.last?.lines ?? []).reduce((sum, line) => sum + line.amount, 0);
    expect(ctx.state.character.wealth).toBe(Math.max(0, Math.min(100_000, before + applied)));
    expect(ctx.state.character.wealth).toBeGreaterThanOrEqual(0);
  });
});

describe("Stage 02.2: карьера", () => {
  it("работа требует образования и навыка; без них найм невозможен", () => {
    const universe = getUniverse("hunter");
    const state = at(start({ seed: "career-gate", universeId: "hunter" }), 24);
    expect(canStartCareer(universe, state, "gate-analyst")).toBe(false);
    const ctx = contextOf(state);
    expect(startCareer(ctx, "gate-analyst")).toBe(false);
    expect(ctx.state.character.professionId).toBeNull();
    expect(ctx.state.career.employed).toBe(false);
    // Диплом и навык открывают работу
    ctx.state.character.educationId = "hu-gate-institute";
    ctx.state.character.skills.lore = 18;
    expect(canStartCareer(universe, ctx.state, "gate-analyst")).toBe(true);
    expect(startCareer(ctx, "gate-analyst")).toBe(true);
    expect(ctx.state.character.professionId).toBe("gate-analyst");
    expect(ctx.state.career).toMatchObject({ rank: 0, employed: true, retired: false });
    expect(careerWage(ctx.state)).toBeGreaterThan(0);
  });

  it("повышение поднимает ступень и жалованье, а доход считается ровно одной статьёй", () => {
    const state = at(start({ seed: "career-promotion", universeId: "murim" }), 30);
    state.character.educationId = "mu-outer-court";
    state.character.skills.medicine = 20;
    let current = startCareerAt(state, "physician");
    current.career.since = 26;
    current.career.tenure = 4;
    expect(promotionReady(current)).toBe(true);
    const before = careerWage(current);
    const ctx = contextOf(current);
    expect(promoteCareer(ctx)).toBe(true);
    current = ctx.state;
    expect(current.career.rank).toBe(1);
    expect(careerWage(current)).toBeGreaterThan(before);
    const lines = yearLines(current);
    expect(lines.filter((line) => line.id === "wage")).toHaveLength(1);
    expect(lines.filter((line) => line.id === "profession")).toHaveLength(0);
    const wealth = current.character.wealth;
    economyYear(ctx);
    const applied = (ctx.state.economy.last?.lines ?? []).reduce((sum, line) => sum + line.amount, 0);
    expect(ctx.state.character.wealth).toBe(Math.max(0, Math.min(100_000, wealth + applied)));
    expect(ctx.state.economy.last?.lines.filter((line) => line.id === "wage")).toHaveLength(1);
  });

  it("потеря работы обнуляет жалованье, но оставляет профессию и открывает предложения", () => {
    const universe = getUniverse("academy");
    let state = at(start({ seed: "career-layoff", universeId: "academy" }), 35);
    state.character.educationId = "ac-tutor";
    state.character.skills.duelling = 12;
    state = startCareerAt(state, "duellist");
    const ctx = contextOf(state);
    expect(loseCareer(ctx)).toBe(true);
    state = ctx.state;
    expect(state.character.professionId).toBe("duellist");
    expect(state.career.employed).toBe(false);
    expect(state.career.retired).toBe(false);
    expect(careerWage(state)).toBe(0);
    expect(yearLines(state).some((line) => line.id === "wage")).toBe(false);
    expect(presentCareer(state, universe).status).toBe("unemployed");
    expect(isEligible(state, findEvent(universe, "career.offer.academy")!)).toBe(true);
    // Наём снова возможен: ступень начинается с нуля
    const offer = withPending(state, "career.offer.academy");
    const next = applyAction(offer, { type: "choose", choiceId: "take-laborer" }).state;
    expect(next.character.professionId).toBe("laborer");
    expect(next.career.employed).toBe(true);
  });

  it("выход на покой прекращает жалованье; жёсткий срок выводит на покой сам", () => {
    const universe = getUniverse("xianxia");
    let state = at(start({ seed: "career-retire", universeId: "xianxia" }), 70);
    state.character.educationId = "xx-village";
    state.character.skills.survival = 10;
    state = startCareerAt(state, "herb-gatherer");
    expect(retirementDue(state)).toBe(true);
    expect(isEligible(state, findEvent(universe, "career.retirement.xianxia")!)).toBe(true);
    const ctx = contextOf(state);
    expect(retireCareer(ctx)).toBe(true);
    state = ctx.state;
    expect(state.career.retired).toBe(true);
    expect(state.career.employed).toBe(false);
    expect(careerWage(state)).toBe(0);
    expect(yearLines(state).some((line) => line.id === "wage")).toBe(false);

    // Жёсткий срок: на три года позже пенсионного возраста работа закрывается сама
    let auto = at(start({ seed: "career-auto-retire", universeId: "xianxia" }), 73);
    auto.character.educationId = "xx-village";
    auto.character.skills.survival = 10;
    auto = startCareerAt(auto, "herb-gatherer");
    const autoCtx = contextOf(auto);
    expect(careerYear(autoCtx).retired).toBe(true);
    expect(autoCtx.state.career.retired).toBe(true);
    expect(careerWage(autoCtx.state)).toBe(0);
  });

  it("событие сокращения даёт выбор и не оставляет невозможного состояния", () => {
    const universe = getUniverse("dark-fantasy");
    let state = at(start({ seed: "career-risk", universeId: "dark-fantasy" }), 40);
    state.character.educationId = "df-letters";
    state.character.skills.survival = 10;
    state = startCareerAt(state, "lamplighter");
    state.economy.cycle = "slump";
    state.economy.hardship = 1;
    expect(isEligible(state, findEvent(universe, "career.layoff.dark-fantasy")!)).toBe(true);
    const next = applyAction(withPending(state, "career.layoff.dark-fantasy"), { type: "choose", choiceId: "accept" }).state;
    expect(next.career.employed).toBe(false);
    expect(next.career.retired).toBe(false);
    expect(next.character.wealth).toBeGreaterThan(state.character.wealth);
    expect(() => parseSave(JSON.parse(JSON.stringify(next)))).not.toThrow();
  });

  it("полный путь одной жизни: школа, ремесло, работа, повышение, увольнение и покой", () => {
    let state = at(start({ seed: "career-full-path", universeId: "dark-fantasy" }), 6);
    state = applyAction(withPending(state, "edu.school.dark-fantasy"), { type: "choose", choiceId: "study" }).state;
    state = finishCourse(state);
    state = at(state, 13);
    state.character.wealth = 100;
    state = applyAction(withPending(state, "edu.trade.dark-fantasy"), { type: "choose", choiceId: "enroll" }).state;
    state = finishCourse(state);
    expect(state.character.educationId).toBe("df-squire");
    state.character.skills["hollow-hunting"] = 15;
    state = at(state, 18);
    state = applyAction(withPending(state, "career.offer.dark-fantasy"), { type: "choose", choiceId: "take-hollow-hunter" }).state;
    expect(state.career.employed).toBe(true);
    state.career.since = 15;
    state.career.tenure = 4;
    const promoted = contextOf(state);
    expect(promoteCareer(promoted)).toBe(true);
    state = promoted.state;
    expect(state.career.rank).toBe(1);
    const fired = contextOf(state);
    expect(loseCareer(fired)).toBe(true);
    state = fired.state;
    expect(presentCareer(state, getUniverse("dark-fantasy")).status).toBe("unemployed");
    // Возвращение на ту же работу и честный выход на покой
    state = startCareerAt(state, "hollow-hunter");
    state = at(state, 61);
    expect(retirementDue(state)).toBe(true);
    const retired = contextOf(state);
    expect(retireCareer(retired)).toBe(true);
    expect(presentCareer(retired.state, getUniverse("dark-fantasy")).status).toBe("retired");
    expect(careerWage(retired.state)).toBe(0);
  });
});

describe("Stage 02.2: совместимость, детерминизм и границы", () => {
  it("перевод 9 → 11 сохраняет seed, rngState, диплом и выводит карьеру из профессии", () => {
    for (const [key, raw] of Object.entries(SAVES_V9)) {
      const before = deepClone(raw) as Record<string, unknown>;
      const migrated = migrateSave(deepClone(raw)) as unknown as GameState;
      expect(migrated.schemaVersion, key).toBe(SAVE_SCHEMA_VERSION);
      expect(migrated.seed, key).toBe(before.seed);
      expect(migrated.rngState, key).toBe(before.rngState);
      expect(migrated.character.name, key).toBe((before.character as { name: string }).name);
      expect(migrated.life.age, key).toBe((before.life as { age: number }).age);
      expect(migrated.education, key).toEqual({ currentId: null, startedAt: 0, progress: 0, duration: 0 });
      expect(migrated.career, key).toBeDefined();
      // Ничего, кроме двух новых полей, не изменилось
      const rest = deepClone(migrated) as unknown as Record<string, unknown>;
      const original = deepClone(raw) as Record<string, unknown>;
      delete rest.education;
      delete rest.career;
      delete rest.household;
      delete rest.business;
      delete rest.schemaVersion;
      delete original.schemaVersion;
      expect(rest, key).toEqual(original);
      expect(() => parseSave(deepClone(raw)), key).not.toThrow();
    }
    const employed = parseSave(deepClone(SAVES_V9["hunter-employed"]!));
    expect(employed.character.educationId).toBe("hu-hunter-academy");
    expect(employed.character.professionId).toBe("raid-hunter");
    expect(employed.career.employed).toBe(true);
    expect(employed.career.rank).toBe(0);
  });

  it("старые сохранения 1, 2, 5 и 8 доходят до 11 без потери данных", () => {
    const schema5 = deepClone(SAVES_V4["dark-fantasy-adult"]!) as Record<string, unknown>;
    schema5.schemaVersion = 5;
    (schema5.economy as Record<string, unknown>).goods = {};
    delete schema5.health;
    const saves: Array<[string, Record<string, unknown>]> = [
      ["v1", deepClone(SAVES_V1["dark-fantasy-young"]!) as Record<string, unknown>],
      ["v2", deepClone(SAVES_V2["dark-fantasy-young"]!) as Record<string, unknown>],
      ["v5", schema5],
      ["v8", deepClone(SAVES_V8["murim-alive"]!) as Record<string, unknown>]
    ];
    for (const [key, raw] of saves) {
      const before = deepClone(raw);
      const state = parseSave(deepClone(raw));
      expect(state.schemaVersion, key).toBe(SAVE_SCHEMA_VERSION);
      expect(state.seed, key).toBe(before.seed);
      expect(state.rngState, key).toBe(before.rngState);
      expect(state.education, key).toBeDefined();
      expect(state.career, key).toBeDefined();
      expect(() => parseSave(JSON.parse(JSON.stringify(state))), key).not.toThrow();
    }
  });

  it("тот же seed и те же действия дают то же образование, карьеру и золото", () => {
    const script = (seed: string): GameState => {
      let state = at(start({ seed, universeId: "dark-fantasy" }), 6);
      state = applyAction(withPending(state, "edu.school.dark-fantasy"), { type: "choose", choiceId: "study" }).state;
      state = finishCourse(state);
      state = at(state, 13);
      state.character.wealth = 100;
      state = applyAction(withPending(state, "edu.trade.dark-fantasy"), { type: "choose", choiceId: "enroll" }).state;
      state = finishCourse(state);
      state.character.skills["hollow-hunting"] = 15;
      state = at(state, 18);
      state = applyAction(withPending(state, "career.offer.dark-fantasy"), { type: "choose", choiceId: "take-hollow-hunter" }).state;
      return state;
    };
    const a = script("career-determinism");
    const b = script("career-determinism");
    expect(a.education).toEqual(b.education);
    expect(a.career).toEqual(b.career);
    expect(a.character.wealth).toBe(b.character.wealth);
    expect(a.rngState).toBe(b.rngState);
    expect(a.character.professionId).toBe(b.character.professionId);
  });

  it("у каждого мира есть три ступени и карьера для каждой профессии; события проходят проверку", () => {
    expect(eventProblems()).toEqual([]);
    for (const universeId of UNIVERSE_IDS) {
      const universe = getUniverse(universeId);
      expect(universe.education.map((item) => item.tier).sort(), universeId).toEqual([1, 2, 3]);
      for (const profession of allProfessions(universe)) {
        expect(findCareerTrack(universeId, profession.id), `${universeId}:${profession.id}`).toBeDefined();
      }
      for (const eventId of ["edu.school", "edu.trade", "edu.university", "edu.specialize", "career.offer", "career.promotion", "career.layoff", "career.retirement"]) {
        expect(findEvent(universe, `${eventId}.${universeId}`), `${universeId}:${eventId}`).toBeDefined();
      }
    }
  });

  it("полная жизнь не оставляет работающего без профессии, покой без работы и курс без срока", () => {
    for (const universeId of UNIVERSE_IDS) {
      let state = start({ seed: `career-soak-${universeId}`, universeId });
      for (let step = 0; step < 2500 && state.life.alive; step++) {
        state = applyAction(state, state.pending ? { type: "choose", choiceId: choiceIds(state)[0]! } : { type: "advance" }).state;
        if (state.career.employed) expect(state.character.professionId, `${universeId}:${step}`).not.toBeNull();
        expect(state.career.employed && state.career.retired, `${universeId}:${step}`).toBe(false);
        if (state.education.currentId !== null) expect(state.education.progress, `${universeId}:${step}`).toBeLessThan(state.education.duration);
      }
      expect(() => parseSave(JSON.parse(JSON.stringify(state))), universeId).not.toThrow();
    }
  });

  it("parseSave отвергает занятость без профессии, покой вместе с работой и курс без предыдущей ступени", () => {
    const state = start({ seed: "career-strict", universeId: "academy" });
    const noJob = deepClone(state);
    noJob.career.employed = true;
    expect(() => parseSave(noJob)).toThrow();

    const both = deepClone(state);
    both.character.professionId = "duellist";
    both.career = { rank: 0, since: 0, tenure: 0, employed: true, retired: true };
    expect(() => parseSave(both)).toThrow();

    const skip = deepClone(state);
    skip.character.educationId = null;
    skip.education = { currentId: "ac-tower", startedAt: 1, progress: 0, duration: 4 };
    expect(() => parseSave(skip)).toThrow();

    const noDuration = deepClone(state);
    noDuration.character.educationId = "ac-tutor";
    noDuration.education = { currentId: "ac-astrein", startedAt: 13, progress: 0, duration: 0 };
    expect(() => parseSave(noDuration)).toThrow();
  });
});
