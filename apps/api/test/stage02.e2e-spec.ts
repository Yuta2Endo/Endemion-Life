// Stage 02 через API: профиль жизни, общение с NPC, совместимость жизней Stage 01 в базе
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import type { ActionResponse, LifeView } from "@endemion/shared";
import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { createTestApp, ORIGIN, resetDatabase, type TestApp } from "./helpers.js";

/** Сохранение формата 1, записанное игрой Stage 01: та же жизнь, что в packages/game-core/test/fixtures/saves-v1.ts (murim-adult) */
const SAVE_V1 = JSON.parse(readFileSync(new URL("./fixtures/save-v1-murim.json", import.meta.url), "utf8")) as { version: number; life: { age: number }; character: { name: string } };

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

describe("Stage 02: профиль жизни", () => {
  it("новая жизнь приходит с биографией, семьёй и шкалами мира, без скрытых характеристик", async () => {
    const life = await createLife(agent(), { universeId: "dark-fantasy", originId: "peasant", seed: "api-stage02" });
    expect(life.profile.biography.length).toBeGreaterThanOrEqual(2);
    expect(life.profile.npcs.some((n) => n.role === "mother")).toBe(true);
    expect(life.profile.meters.map((m) => m.id).sort()).toEqual(["corruption", "ember"]);
    expect(life.character.socialClassId).toBe("serf");
    expect(life.profile.potential).toBeNull();
    expect(life).not.toHaveProperty("hidden");
    expect(JSON.stringify(life)).not.toContain("api-stage02");
  });

  it("общение с NPC считает сервер: отношение меняется, повтор в том же году отклоняется", async () => {
    const client = agent();
    let life = await createLife(client, { universeId: "academy", originId: "duke-heir", seed: "api-talk" });
    // Подрасти, чтобы разговор стал доступен
    for (let i = 0; i < 40 && life.life.age < 6; i++) {
      const res = life.pendingEvent
        ? await act(client, life, { type: "choose", choiceId: life.pendingEvent.choices.find((c) => c.available)!.id })
        : await act(client, life, { type: "advance" });
      expect(res.status).toBe(200);
      life = (res.body as ActionResponse).life;
    }
    if (life.pendingEvent) {
      const res = await act(client, life, { type: "choose", choiceId: life.pendingEvent.choices.find((c) => c.available)!.id });
      life = (res.body as ActionResponse).life;
    }
    const mother = life.profile.npcs.find((n) => n.role === "mother" && n.alive);
    expect(mother).toBeDefined();
    const talk = mother!.interactions.find((i) => i.id === "talk")!;
    expect(talk.available).toBe(true);
    expect(talk.chance).toBeGreaterThan(0);

    const res = await act(client, life, { type: "interact", npcId: mother!.id, interaction: "talk" }).expect(200);
    const body = res.body as ActionResponse;
    expect(body.entries[0]?.kind).toBe("people");
    expect(body.entries[0]?.check).toBeDefined();
    expect(body.life.life.age).toBe(life.life.age);
    const after = body.life.profile.npcs.find((n) => n.id === mother!.id)!;
    expect(after.interactions.find((i) => i.id === "talk")!.available).toBe(false);

    await act(client, body.life, { type: "interact", npcId: mother!.id, interaction: "talk" }).expect(409);
    await act(client, body.life, { type: "interact", npcId: "n999", interaction: "talk" }).expect(400);
    await act(client, body.life, { type: "interact", npcId: mother!.id, interaction: "steal" }).expect(400);
  });
});

describe("Stage 02: жизни Stage 01 в базе", () => {
  it("жизнь формата 1 открывается, продолжается и сохраняется в формате 2; откат к версии формата 1 работает", async () => {
    const client = agent();
    // Гостевая сессия и место под жизнь: создаём обычную жизнь и подменяем её состояние на сохранение Stage 01
    const created = await createLife(client, { universeId: "murim", seed: "placeholder" });
    const v1 = SAVE_V1;
    await t.prisma.client.life.update({ where: { id: created.id }, data: { state: v1, version: v1.version, age: v1.life.age, name: v1.character.name, schemaVersion: 1 } });
    await t.prisma.client.lifeSnapshot.updateMany({ where: { lifeId: created.id }, data: { state: v1, version: v1.version, age: v1.life.age } });

    const list = await client.get("/api/lives").expect(200);
    expect((list.body as { lives: { id: string; age: number }[] }).lives.find((l) => l.id === created.id)?.age).toBe(v1.life.age);

    const opened = await client.get(`/api/lives/${created.id}`).expect(200);
    let life = (opened.body as { life: LifeView }).life;
    expect(life.version).toBe(v1.version);
    expect(life.character.name).toBe(v1.character.name);
    expect(life.profile.biography.length).toBeGreaterThan(0);
    expect(life.profile.npcs.some((n) => n.role === "spouse")).toBe(true);

    for (let i = 0; i < 3; i++) {
      const res = life.pendingEvent
        ? await act(client, life, { type: "choose", choiceId: life.pendingEvent.choices.find((c) => c.available)!.id })
        : await act(client, life, { type: "advance" });
      expect(res.status).toBe(200);
      life = (res.body as ActionResponse).life;
      if (life.status === "dead") break;
    }
    const row = await t.prisma.client.life.findUniqueOrThrow({ where: { id: created.id } });
    expect((row.state as { schemaVersion: number }).schemaVersion).toBe(2);
    expect(row.schemaVersion).toBe(2);

    // Откат к снимку, записанному ещё в формате 1
    const restored = await client.post(`/api/lives/${created.id}/restore`).set("Origin", ORIGIN).send({ version: v1.version, expectedVersion: life.version }).expect(200);
    const back = (restored.body as ActionResponse).life;
    expect(back.life.age).toBe(v1.life.age);
    expect(back.profile.npcs.length).toBeGreaterThan(0);
  });
});
