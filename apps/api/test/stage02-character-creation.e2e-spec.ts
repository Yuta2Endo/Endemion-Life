// Stage 02.5: сервер принимает только уклад, очки и seed, а характеристики считает сам.
import { randomUUID } from "node:crypto";
import { SAVE_SCHEMA_VERSION } from "@endemion/game-core";
import type { ActionResponse, LifeView } from "@endemion/shared";
import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { createTestApp, ORIGIN, resetDatabase, type TestApp } from "./helpers.js";

let t: TestApp;

function agent() {
  return request.agent(t.app.getHttpServer());
}

type Agent = ReturnType<typeof agent>;

async function createLife(client: Agent, body: Record<string, unknown>): Promise<LifeView> {
  const res = await client.post("/api/lives").set("Origin", ORIGIN).send(body).expect(201);
  return (res.body as { life: LifeView }).life;
}

function act(client: Agent, life: LifeView, action: Record<string, unknown>) {
  return client.post(`/api/lives/${life.id}/actions`).set("Origin", ORIGIN).send({ actionId: randomUUID(), expectedVersion: life.version, action });
}

beforeAll(async () => {
  t = await createTestApp();
});

beforeEach(async () => {
  await resetDatabase(t.prisma);
});

afterAll(async () => {
  await t?.app.close();
});

describe("Stage 02.5: выбор при рождении через API", () => {
  it("принимает уклад и очки, показывает выбор в жизни и сохраняет его после хода", async () => {
    const client = agent();
    const life = await createLife(client, {
      universeId: "academy",
      seed: "api-creation-valid",
      upbringingId: "ac-salon-upbringing",
      statPoints: { charisma: 2, wisdom: 1 }
    });
    expect(life.character.creation).toEqual({ upbringingId: "ac-salon-upbringing", statPoints: { charisma: 2, wisdom: 1 } });
    expect(life.character.talents).toContain("courtly-grace");
    expect(life.character.skills.etiquette).toBeGreaterThanOrEqual(7);
    expect(life.profile.upbringing?.id).toBe("ac-salon-upbringing");

    const res = await act(client, life, { type: "advance" }).expect(200);
    const next = (res.body as ActionResponse).life;
    expect(next.character.creation).toEqual(life.character.creation);
    const row = await t.prisma.client.life.findUniqueOrThrow({ where: { id: life.id } });
    const state = row.state as { schemaVersion: number; character: { creation?: unknown } };
    expect(state.schemaVersion).toBe(SAVE_SCHEMA_VERSION);
    expect(state.character.creation).toEqual(life.character.creation);
  });

  it("отклоняет чужой уклад, неизвестный уклад, лишние очки и поддельные характеристики", async () => {
    const client = agent();
    const bad = (body: Record<string, unknown>) => client.post("/api/lives").set("Origin", ORIGIN).send({ universeId: "academy", ...body });
    const wrongWorld = await bad({ upbringingId: "df-chapel-ward" }).expect(400);
    expect(wrongWorld.body.error.message).toContain("уклад");
    await bad({ upbringingId: "not-a-real-upbringing" }).expect(400);
    await bad({ statPoints: { strength: 2, agility: 2 } }).expect(400);
    await bad({ statPoints: { strength: 3 } }).expect(400);
    await bad({ statPoints: { strength: -1 } }).expect(400);
    await bad({ statPoints: { mana: 1 } }).expect(400);
    // Клиент не может прислать готовые характеристики вместо выбора
    await bad({ stats: { strength: 100 } }).expect(400);
    await bad({ finalStats: { strength: 100 } }).expect(400);
    // Ни одна отклонённая попытка не создала жизнь
    expect(await t.prisma.client.life.count()).toBe(0);
  });

  it("старый запрос без новых полей по-прежнему создаёт случайную жизнь", async () => {
    const life = await createLife(agent(), { universeId: "hunter", seed: "api-creation-old" });
    expect(life.character.creation).toBeUndefined();
    expect(life.profile.upbringing).toBeNull();
    expect(life.status).toBe("alive");
  });

  it("тот же seed и тот же выбор детерминированы; другой уклад даёт другой билд", async () => {
    const client = agent();
    const input = { universeId: "murim", seed: "api-creation-determinism", upbringingId: "mu-sect-yard", statPoints: { agility: 2, luck: 1 } };
    const first = await createLife(client, input);
    const second = await createLife(client, input);
    expect(second.character).toEqual(first.character);
    expect(second.profile.biography).toEqual(first.profile.biography);
    expect(first.id).not.toBe(second.id);

    const plain = await createLife(client, { universeId: "murim", seed: "api-creation-determinism" });
    expect(plain.character.creation).toBeUndefined();
    expect(first.character.talents).toContain("sword-heart");
    expect(first.character.stats.agility).toBeGreaterThan(plain.character.stats.agility);
  });
});
