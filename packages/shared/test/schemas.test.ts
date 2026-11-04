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
});
