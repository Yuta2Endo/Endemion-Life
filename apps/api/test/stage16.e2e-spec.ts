// Stage 16: факты хода. Клиент факт не пишет. Сводка без токена закрыта. Повтор хода не двоит счётчик.
import { randomUUID } from "node:crypto";
import type { ActionResponse, LifeView } from "@endemion/shared";
import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { createTestApp, ORIGIN, resetDatabase, type TestApp } from "./helpers.js";

const TOKEN = "stage16-ops-token-ok";

let t: TestApp;

function agent() {
  return request.agent(t.app.getHttpServer());
}
type Agent = ReturnType<typeof agent>;

async function guest(client: Agent): Promise<void> {
  await client.post("/api/session").set("Origin", ORIGIN).send({}).expect(200);
}

async function lifeOf(client: Agent): Promise<LifeView> {
  const res = await client.post("/api/lives").set("Origin", ORIGIN).send({ universeId: "murim", name: "Счёт" }).expect(201);
  return res.body.life as LifeView;
}

beforeAll(async () => {
  t = await createTestApp({ LIVE_OPS_TOKEN: TOKEN });
});

afterAll(async () => {
  await t.app.close();
});

beforeEach(async () => {
  await resetDatabase(t.prisma);
});

describe("Stage 16: факты", () => {
  it("создание жизни пишет один факт, повтор хода не пишет второй, без токена сводки нет", async () => {
    const client = agent();
    await guest(client);
    await client.get("/api/insights").expect(404);
    await client.post("/api/insights").set("Origin", ORIGIN).send({ name: "life.created", ref: randomUUID() }).expect(404);

    const life = await lifeOf(client);
    expect(await t.prisma.client.insight.count({ where: { name: "life.created" } })).toBe(1);

    const actionId = randomUUID();
    const first = await client
      .post(`/api/lives/${life.id}/actions`)
      .set("Origin", ORIGIN)
      .send({ actionId, expectedVersion: life.version, action: { type: "advance", years: 1 } })
      .expect(200);
    const again = await client
      .post(`/api/lives/${life.id}/actions`)
      .set("Origin", ORIGIN)
      .send({ actionId, expectedVersion: life.version, action: { type: "advance", years: 1 } })
      .expect(200);
    expect((again.body as ActionResponse).replayed).toBe(true);
    expect((first.body as ActionResponse).replayed).toBe(false);
    const facts = await t.prisma.client.insight.findMany({ where: { ref: actionId } });
    const names = facts.map((row) => row.name);
    expect(new Set(names).size).toBe(names.length);

    const closed = await client.get("/api/insights?days=30").expect(404);
    expect(JSON.stringify(closed.body)).not.toContain(life.id);
    const open = await client.get("/api/insights?days=30").set("x-live-ops", TOKEN).expect(200);
    expect(open.body.total).toBeGreaterThan(0);
    expect(open.body.keptDays).toBe(90);
    expect(JSON.stringify(open.body)).not.toContain(life.id);
    expect(JSON.stringify(open.body)).not.toContain("Счёт");
  });

  it("отклонённый ход не ломает игру и пишет отказ один раз на ключ", async () => {
    const client = agent();
    await guest(client);
    const life = await lifeOf(client);
    const actionId = randomUUID();
    await client
      .post(`/api/lives/${life.id}/actions`)
      .set("Origin", ORIGIN)
      .send({ actionId, expectedVersion: life.version, action: { type: "choose", choiceId: "nope" } })
      .expect(409);
    await client
      .post(`/api/lives/${life.id}/actions`)
      .set("Origin", ORIGIN)
      .send({ actionId, expectedVersion: life.version, action: { type: "choose", choiceId: "nope" } })
      .expect(409);
    expect(await t.prisma.client.insight.count({ where: { name: "action.rejected", ref: actionId } })).toBe(1);
    const still = await client.get(`/api/lives/${life.id}`).expect(200);
    expect((still.body as { life: LifeView }).life.version).toBe(life.version);
  });

  it("срок хранения стирает старые факты и не трогает свежие", async () => {
    const client = agent();
    await guest(client);
    await lifeOf(client);
    const old = await t.prisma.client.insight.findFirstOrThrow({ where: { name: "life.created" } });
    await t.prisma.client.insight.update({ where: { id: old.id }, data: { createdAt: new Date(Date.now() - 100 * 86_400_000) } });
    const { InsightsService } = await import("../src/insights/insights.service.js");
    const service = t.app.get(InsightsService);
    service.resetSweep();
    const dropped = await service.sweep();
    expect(dropped).toBe(1);
    expect(await t.prisma.client.insight.count({ where: { id: old.id } })).toBe(0);
  });

  it("срок сводки не длиннее 90 дней", async () => {
    const client = agent();
    await guest(client);
    await client.get("/api/insights?days=365").set("x-live-ops", TOKEN).expect(400);
    await client.get("/api/insights?days=0").set("x-live-ops", TOKEN).expect(400);
  });

  it("R1.2: сигнал гида принимается только для своей жизни и не дублируется", async () => {
    const client = agent();
    await guest(client);
    const life = await lifeOf(client);

    await client
      .post("/api/insights/guide")
      .set("Origin", ORIGIN)
      .send({ lifeId: life.id, event: "view" })
      .expect(200);
    await client
      .post("/api/insights/guide")
      .set("Origin", ORIGIN)
      .send({ lifeId: life.id, event: "view" })
      .expect(200);
    await client
      .post("/api/insights/guide")
      .set("Origin", ORIGIN)
      .send({ lifeId: life.id, event: "advance" })
      .expect(200);
    expect(await t.prisma.client.insight.count({ where: { name: "guide.view", ref: `${life.id}:view:0` } })).toBe(1);
    expect(await t.prisma.client.insight.count({ where: { name: "guide.advance", ref: `${life.id}:advance:0` } })).toBe(1);

    await client.post("/api/insights/guide").set("Origin", ORIGIN).send({ lifeId: life.id, event: "nope" }).expect(400);
    await request(t.app.getHttpServer())
      .post("/api/insights/guide")
      .set("Origin", ORIGIN)
      .send({ lifeId: life.id, event: "view" })
      .expect(401);

    const other = agent();
    await guest(other);
    await other
      .post("/api/insights/guide")
      .set("Origin", ORIGIN)
      .send({ lifeId: life.id, event: "view" })
      .expect(404);
  });

  it("R1.2: воронка первой жизни считается по серверным данным", async () => {
    const client = agent();
    await guest(client);
    const life = await lifeOf(client);
    await t.prisma.client.life.update({ where: { id: life.id }, data: { age: 18, status: "dead" } });
    await t.prisma.client.historyEntry.create({
      data: { lifeId: life.id, seq: 999, age: 18, kind: "event", data: {} }
    });
    await client.post("/api/insights/guide").set("Origin", ORIGIN).send({ lifeId: life.id, event: "view" }).expect(200);

    await client.get("/api/insights/funnel?days=30").expect(404);
    const funnel = await client.get("/api/insights/funnel?days=30").set("x-live-ops", TOKEN).expect(200);
    expect(funnel.body.lives).toMatchObject({ created: 1, players: 1, adults: 1, decisions: 1, deaths: 1, successors: 0 });
    expect(funnel.body.rates.adult).toBe(1);
    expect(funnel.body.guide.view).toBe(1);
    expect(funnel.body.byWorld[0]).toMatchObject({ world: "murim", created: 1 });
    expect(JSON.stringify(funnel.body)).not.toContain(life.id);
  });
});
