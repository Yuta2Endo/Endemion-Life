import { newGame } from "@endemion/game-core";
import { describe, expect, it } from "vitest";
import { actionRequestSchema, createLifeSchema, historyQuerySchema, toLifeView } from "../src/index.js";

const actionId = "6f1c1d1e-6a3b-4c1e-9a7a-0d6b1f2c3d4e";

describe("контракты API", () => {
  it("создание жизни: вселенная обязательна, лишние поля запрещены", () => {
    expect(createLifeSchema.safeParse({ universeId: "murim" }).success).toBe(true);
    expect(createLifeSchema.safeParse({}).success).toBe(false);
    expect(createLifeSchema.safeParse({ universeId: "unknown" }).success).toBe(false);
    // Клиент не может назначить себе характеристики или возраст
    expect(createLifeSchema.safeParse({ universeId: "murim", stats: { strength: 100 } }).success).toBe(false);
    expect(createLifeSchema.safeParse({ universeId: "murim", age: 50 }).success).toBe(false);
  });

  it("действие: только advance и choose, с actionId и версией", () => {
    expect(actionRequestSchema.safeParse({ actionId, expectedVersion: 1, action: { type: "advance" } }).success).toBe(true);
    expect(actionRequestSchema.safeParse({ actionId, expectedVersion: 1, action: { type: "choose", choiceId: "fight" } }).success).toBe(true);
    expect(actionRequestSchema.safeParse({ actionId: "x", expectedVersion: 1, action: { type: "advance" } }).success).toBe(false);
    expect(actionRequestSchema.safeParse({ actionId, action: { type: "advance" } }).success).toBe(false);
    expect(actionRequestSchema.safeParse({ actionId, expectedVersion: 1, action: { type: "advance", years: 50 } }).success).toBe(false);
    expect(actionRequestSchema.safeParse({ actionId, expectedVersion: 1, action: { type: "setStats" } }).success).toBe(false);
    expect(actionRequestSchema.safeParse({ actionId, expectedVersion: 1, action: { type: "choose", choiceId: "fight", reward: 9000 } }).success).toBe(false);
  });

  it("общение с NPC: только известные действия и id вида n1", () => {
    expect(actionRequestSchema.safeParse({ actionId, expectedVersion: 1, action: { type: "interact", npcId: "n3", interaction: "talk" } }).success).toBe(true);
    expect(actionRequestSchema.safeParse({ actionId, expectedVersion: 1, action: { type: "interact", npcId: "n3", interaction: "marry" } }).success).toBe(false);
    expect(actionRequestSchema.safeParse({ actionId, expectedVersion: 1, action: { type: "interact", npcId: "<script>", interaction: "talk" } }).success).toBe(false);
    expect(actionRequestSchema.safeParse({ actionId, expectedVersion: 1, action: { type: "interact", npcId: "n3", interaction: "talk", affinity: 100 } }).success).toBe(false);
  });

  it("представление жизни Stage 02: профиль есть, скрытые характеристики — нет", () => {
    const { state } = newGame({ seed: "hidden-seed", universeId: "academy" });
    const view = toLifeView({ id: "id", createdAt: "", updatedAt: "" }, state);
    expect(view.profile.biography.length).toBeGreaterThan(0);
    expect(view.profile.npcs.length).toBeGreaterThan(0);
    expect(view.profile.potential).toBeNull();
    expect(view).not.toHaveProperty("hidden");
    const json = JSON.stringify(view);
    expect(json).not.toContain("dormantTalents\":[\"");
    for (const talent of state.hidden.dormantTalents) expect(json).not.toContain(`"${talent}"`);
  });

  it("представление жизни Stage 02.1: здоровье и недуги видны, причина смерти сохраняется", () => {
    const { state } = newGame({ seed: "health-view", universeId: "hunter" });
    state.health.value = 37;
    state.health.conditions.push({
      id: "hu-gate-wound",
      kind: "wound",
      severity: 2,
      source: "health.hunter.gate-wound",
      onsetAge: 18,
      remaining: 2,
      damage: 8,
      recoverable: true,
      lethal: true
    });
    const view = toLifeView({ id: "id", createdAt: "", updatedAt: "" }, state);
    expect(view.health.value).toBe(37);
    expect(view.health.conditions).toHaveLength(1);
    expect(view.health.conditions[0]).toMatchObject({ id: "hu-gate-wound", kind: "wound", severity: 2 });
    expect(view.health.conditions[0]!.name.ru).toBe("Рана Врат");
    state.life.alive = false;
    state.life.deathCause = { ru: "Раны оказались смертельными", en: "The wounds proved fatal" };
    state.health.deathCause = state.life.deathCause;
    const dead = toLifeView({ id: "id", createdAt: "", updatedAt: "" }, state);
    expect(dead.health.deathCause).toEqual(state.life.deathCause);
    expect(dead.life.deathCause).toEqual(state.life.deathCause);
  });

  it("представление жизни Stage 02.2: обучение и карьера видны, покой прекращает жалованье", () => {
    const meta = { id: "id", createdAt: "", updatedAt: "" };
    const { state } = newGame({ seed: "career-view", universeId: "hunter" });
    state.character.educationId = "hu-hunter-academy";
    state.character.professionId = "raid-hunter";
    state.career = { rank: 1, since: 20, tenure: 4, employed: true, retired: false };
    const view = toLifeView(meta, state);
    expect(view.education.completed?.id).toBe("hu-hunter-academy");
    expect(view.education.current).toBeNull();
    expect(view.career.status).toBe("employed");
    expect(view.career.profession?.en).toBe("Raid hunter");
    expect(view.career.rankName?.en).toBe("Raid hunter");
    expect(view.career.wage).toBeGreaterThan(0);
    state.career = { rank: 1, since: 30, tenure: 6, employed: false, retired: true };
    const retired = toLifeView(meta, state);
    expect(retired.career.status).toBe("retired");
    expect(retired.career.wage).toBe(0);
  });

  it("представление жизни Stage 02.3: жильё, дом и своё дело видны", () => {
    const meta = { id: "id", createdAt: "", updatedAt: "" };
    const { state } = newGame({ seed: "estate-view", universeId: "dark-fantasy" });
    state.life.age = 30;
    state.character.wealth = 200;
    state.household = { residence: "own", homeId: "df-home-small", since: 20, condition: 90, arrears: 0 };
    state.business.ventures.push({ id: "df-business-stall", foundedAge: 20, level: 1, capital: 20, years: 3, losses: 0, lastNet: 5 });
    const view = toLifeView(meta, state);
    expect(view.household.residence).toBe("own");
    expect(view.household.home?.name.ru).toContain("Угол");
    expect(view.household.condition).toBe(90);
    expect(view.household.rent).toBe(0);
    expect(view.household.upkeep).toBeGreaterThan(0);
    expect(view.household.tax).toBeGreaterThan(0);
    expect(view.business.ventures).toHaveLength(1);
    expect(view.business.ventures[0]!.name.en).toContain("Chandler");
    expect(view.business.ventures[0]!.revenue).toBeGreaterThan(0);
    expect(view.business.ventures[0]!.costs).toBeGreaterThan(0);
    expect(view.business.ventures[0]!.net).toBeGreaterThan(0);
    expect(JSON.stringify(view)).not.toMatch(/"(seed|rngState)"/);
  });

  it("история: limit по умолчанию и ограничение сверху", () => {
    expect(historyQuerySchema.parse({})).toEqual({ limit: 50 });
    expect(historyQuerySchema.safeParse({ limit: "1000" }).success).toBe(false);
  });

  it("представление жизни не раскрывает seed и состояние генератора", () => {
    const { state } = newGame({ seed: "secret-seed", universeId: "hunter" });
    const view = toLifeView({ id: "id", createdAt: "", updatedAt: "" }, state);
    const json = JSON.stringify(view);
    expect(json).not.toContain("secret-seed");
    expect(view).not.toHaveProperty("rngState");
    expect(view).not.toHaveProperty("seed");
    expect(view.summary.stats.strength).toBeGreaterThan(0);
  });

  it("Stage 12: метрики мира производные, обновляются и безопасны без мира", () => {
    const meta = { id: "id", createdAt: "", updatedAt: "" };
    const { state } = newGame({ seed: "s12-metrics", universeId: "murim" });
    const before = toLifeView(meta, state);
    expect(before.metrics.hasWorld).toBe(true);
    expect(before.metrics.settlements.count).toBe(state.world!.settlements.length);
    state.world!.settlements[0]!.prosperity = 100;
    const after = toLifeView(meta, state);
    expect(after.metrics.settlements.prosperity.max).toBe(100);
    delete state.world;
    const empty = toLifeView(meta, state);
    expect(empty.metrics.hasWorld).toBe(false);
    expect(empty.metrics.settlements.count).toBe(0);
    expect(Number.isNaN(empty.metrics.settlements.prosperity.mean)).toBe(false);
  });
});
