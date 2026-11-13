// Stage 15: окна календаря. Срок, повтор вклада, награда один раз, чужая жизнь, закрытое управление.
import type { LifeView } from "@endemion/shared";
import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { createTestApp, ORIGIN, resetDatabase, type TestApp } from "./helpers.js";

const TOKEN = "stage15-ops-token-ok";

let t: TestApp;

function agent() {
  return request.agent(t.app.getHttpServer());
}
type Agent = ReturnType<typeof agent>;

async function guest(client: Agent): Promise<void> {
  await client.post("/api/session").set("Origin", ORIGIN).send({}).expect(200);
}

async function lifeOf(client: Agent, name: string): Promise<LifeView> {
  const res = await client.post("/api/lives").set("Origin", ORIGIN).send({ universeId: "murim", name }).expect(201);
  return res.body.life as LifeView;
}

function windowBody(over: Record<string, unknown> = {}) {
  const start = new Date(Date.now() - 60_000).toISOString();
  const end = new Date(Date.now() + 3_600_000).toISOString();
  return {
    titleRu: "Сбор",
    titleEn: "A gathering",
    textRu: "Одно окно.",
    textEn: "One window.",
    worlds: ["murim"],
    minAge: 0,
    goal: 3,
    perLife: 1,
    gold: 25,
    startsAt: start,
    endsAt: end,
    ...over
  };
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

describe("Stage 15: живые окна", () => {
  it("без токена управления нет, с токеном черновик ставится в срок", async () => {
    const client = agent();
    await guest(client);
    await client.post("/api/live/manage").set("Origin", ORIGIN).send(windowBody()).expect(404);
    await client.post("/api/live/manage").set("Origin", ORIGIN).set("x-live-ops", "wrong-token-value").send(windowBody()).expect(404);

    const created = await client.post("/api/live/manage").set("Origin", ORIGIN).set("x-live-ops", TOKEN).send(windowBody()).expect(201);
    expect(created.body.status).toBe("draft");
    const id = created.body.id as string;

    await client.post(`/api/live/manage/${id}`).set("Origin", ORIGIN).set("x-live-ops", TOKEN).send({ to: "active" }).expect(409);
    const scheduled = await client.post(`/api/live/manage/${id}`).set("Origin", ORIGIN).set("x-live-ops", TOKEN).send({ to: "scheduled" }).expect(200);
    expect(scheduled.body.status).toBe("active");

    const log = await client.get(`/api/live/manage/${id}/log`).set("x-live-ops", TOKEN).expect(200);
    expect(log.body.log.length).toBeGreaterThan(0);
    await client.get(`/api/live/manage/${id}/log`).expect(404);
  });

  it("вклад один раз за год жизни, чужая жизнь закрыта, награда не двоится", async () => {
    const a = agent();
    const b = agent();
    await guest(a);
    await guest(b);
    const mine = await lifeOf(a, "Страж");
    const other = await lifeOf(b, "Чужой");

    const created = await a.post("/api/live/manage").set("Origin", ORIGIN).set("x-live-ops", TOKEN).send(windowBody()).expect(201);
    const id = created.body.id as string;
    await a.post(`/api/live/manage/${id}`).set("Origin", ORIGIN).set("x-live-ops", TOKEN).send({ to: "scheduled" }).expect(200);

    const first = await a.post(`/api/live/${id}/contribute`).set("Origin", ORIGIN).send({ lifeId: mine.id }).expect(200);
    expect(first.body).toMatchObject({ counted: true, count: 1, progress: 1 });
    const again = await a.post(`/api/live/${id}/contribute`).set("Origin", ORIGIN).send({ lifeId: mine.id }).expect(200);
    expect(again.body).toMatchObject({ counted: false, count: 1, progress: 1 });
    expect(await t.prisma.client.livePart.count()).toBe(1);

    await a.post(`/api/live/${id}/contribute`).set("Origin", ORIGIN).send({ lifeId: other.id }).expect(404);
    await b.post(`/api/live/${id}/contribute`).set("Origin", ORIGIN).send({ lifeId: other.id }).expect(200);

    const before = (await t.prisma.client.life.findUniqueOrThrow({ where: { id: mine.id } })).state as { character: { wealth: number }; flags: string[] };
    const claim = await a.post(`/api/live/${id}/claim`).set("Origin", ORIGIN).send({ lifeId: mine.id }).expect(200);
    expect(claim.body).toMatchObject({ gold: 25, replayed: false });
    const replay = await a.post(`/api/live/${id}/claim`).set("Origin", ORIGIN).send({ lifeId: mine.id }).expect(200);
    expect(replay.body.replayed).toBe(true);

    const after = (await t.prisma.client.life.findUniqueOrThrow({ where: { id: mine.id } })).state as { character: { wealth: number }; flags: string[]; version: number };
    expect(after.character.wealth).toBe(before.character.wealth + 25);
    expect(after.flags.some((flag) => flag.startsWith("live."))).toBe(true);
    const third = await a.post(`/api/live/${id}/claim`).set("Origin", ORIGIN).send({ lifeId: mine.id }).expect(200);
    const still = (await t.prisma.client.life.findUniqueOrThrow({ where: { id: mine.id } })).state as { character: { wealth: number }; version: number };
    expect(still.character.wealth).toBe(after.character.wealth);
    expect(still.version).toBe(after.version);
    expect(third.body.replayed).toBe(true);
    const snap = await t.prisma.client.lifeSnapshot.findUnique({ where: { lifeId_version: { lifeId: mine.id, version: after.version } } });
    expect(snap).not.toBeNull();
  });

  it("откат не возвращает награду и не разрешает повторный вклад", async () => {
    const client = agent();
    await guest(client);
    const life = await lifeOf(client, "Откат");
    const created = await client.post("/api/live/manage").set("Origin", ORIGIN).set("x-live-ops", TOKEN).send(windowBody()).expect(201);
    const id = created.body.id as string;
    await client.post(`/api/live/manage/${id}`).set("Origin", ORIGIN).set("x-live-ops", TOKEN).send({ to: "scheduled" }).expect(200);
    await client.post(`/api/live/${id}/contribute`).set("Origin", ORIGIN).send({ lifeId: life.id }).expect(200);
    await client.post(`/api/live/${id}/claim`).set("Origin", ORIGIN).send({ lifeId: life.id }).expect(200);
    const claimed = await t.prisma.client.life.findUniqueOrThrow({ where: { id: life.id } });
    await client.post(`/api/lives/${life.id}/restore`).set("Origin", ORIGIN).send({ version: 1, expectedVersion: claimed.version }).expect(200);
    const restoredRow = await t.prisma.client.life.findUniqueOrThrow({ where: { id: life.id } });
    const restoredState = restoredRow.state as { flags: string[]; character: { wealth: number } };
    const part = await t.prisma.client.livePart.findUniqueOrThrow({ where: { windowId_lifeId: { windowId: id, lifeId: life.id } } });
    expect(part.claimedAt).not.toBeNull();
    expect(restoredState.flags.some((flag) => flag.startsWith("live."))).toBe(true);
    const again = await client.post(`/api/live/${id}/claim`).set("Origin", ORIGIN).send({ lifeId: life.id }).expect(200);
    expect(again.body.replayed).toBe(true);
    const reContribute = await client.post(`/api/live/${id}/contribute`).set("Origin", ORIGIN).send({ lifeId: life.id }).expect(200);
    expect(reContribute.body.counted).toBe(false);
    expect(reContribute.body.count).toBe(1);
  });

  it("одновременные запросы награды выдают золото один раз", async () => {
    const client = agent();
    await guest(client);
    const life = await lifeOf(client, "Гонка");
    const created = await client.post("/api/live/manage").set("Origin", ORIGIN).set("x-live-ops", TOKEN).send(windowBody()).expect(201);
    const id = created.body.id as string;
    await client.post(`/api/live/manage/${id}`).set("Origin", ORIGIN).set("x-live-ops", TOKEN).send({ to: "scheduled" }).expect(200);
    await client.post(`/api/live/${id}/contribute`).set("Origin", ORIGIN).send({ lifeId: life.id }).expect(200);

    const before = (await t.prisma.client.life.findUniqueOrThrow({ where: { id: life.id } })).state as { character: { wealth: number }; version: number };
    const results = await Promise.all([
      client.post(`/api/live/${id}/claim`).set("Origin", ORIGIN).send({ lifeId: life.id }),
      client.post(`/api/live/${id}/claim`).set("Origin", ORIGIN).send({ lifeId: life.id })
    ]);
    expect(results.map((res) => res.status)).toEqual([200, 200]);
    expect(results.filter((res) => res.body.replayed === false)).toHaveLength(1);
    expect(results.filter((res) => res.body.replayed === true)).toHaveLength(1);

    const after = (await t.prisma.client.life.findUniqueOrThrow({ where: { id: life.id } })).state as { character: { wealth: number }; version: number };
    expect(after.character.wealth).toBe(before.character.wealth + 25);
    expect(after.version).toBe(before.version + 1);
  });

  it("два вклада в одну цель не теряют единицу", async () => {
    const a = agent();
    const b = agent();
    await guest(a);
    await guest(b);
    const left = await lifeOf(a, "Левый");
    const right = await lifeOf(b, "Правый");
    const created = await a.post("/api/live/manage").set("Origin", ORIGIN).set("x-live-ops", TOKEN).send(windowBody({ goal: 10 })).expect(201);
    const id = created.body.id as string;
    await a.post(`/api/live/manage/${id}`).set("Origin", ORIGIN).set("x-live-ops", TOKEN).send({ to: "scheduled" }).expect(200);
    await Promise.all([
      a.post(`/api/live/${id}/contribute`).set("Origin", ORIGIN).send({ lifeId: left.id }),
      b.post(`/api/live/${id}/contribute`).set("Origin", ORIGIN).send({ lifeId: right.id })
    ]);
    const row = await t.prisma.client.liveWindow.findUniqueOrThrow({ where: { id } });
    expect(row.progress).toBe(2);
  });

  it("после конца окна вклад закрыт, уже выданное не забирается", async () => {
    const client = agent();
    await guest(client);
    const life = await lifeOf(client, "Поздний");
    const created = await client.post("/api/live/manage").set("Origin", ORIGIN).set("x-live-ops", TOKEN).send(windowBody()).expect(201);
    const id = created.body.id as string;
    await client.post(`/api/live/manage/${id}`).set("Origin", ORIGIN).set("x-live-ops", TOKEN).send({ to: "scheduled" }).expect(200);
    await client.post(`/api/live/${id}/contribute`).set("Origin", ORIGIN).send({ lifeId: life.id }).expect(200);
    await client.post(`/api/live/${id}/claim`).set("Origin", ORIGIN).send({ lifeId: life.id }).expect(200);
    const wealth = ((await t.prisma.client.life.findUniqueOrThrow({ where: { id: life.id } })).state as { character: { wealth: number } }).character.wealth;

    await t.prisma.client.liveWindow.update({ where: { id }, data: { endsAt: new Date(Date.now() - 1000), status: "active" } });
    await client.post(`/api/live/${id}/contribute`).set("Origin", ORIGIN).send({ lifeId: life.id }).expect(409);
    const board = await client.get("/api/live").expect(200);
    expect(board.body.windows.find((item: { id: string }) => item.id === id).status).toBe("completed");
    const kept = ((await t.prisma.client.life.findUniqueOrThrow({ where: { id: life.id } })).state as { character: { wealth: number } }).character.wealth;
    expect(kept).toBe(wealth);
  });

  it("битый срок не ставится в календарь", async () => {
    const client = agent();
    await guest(client);
    const end = new Date(Date.now() + 1000).toISOString();
    const start = new Date(Date.now() + 5000).toISOString();
    await client.post("/api/live/manage").set("Origin", ORIGIN).set("x-live-ops", TOKEN).send(windowBody({ startsAt: start, endsAt: end })).expect(400);
  });

  it("доска заводит шаблон дня один раз", async () => {
    const client = agent();
    await guest(client);
    await client.get("/api/live").expect(200);
    await client.get("/api/live").expect(200);
    const rows = await t.prisma.client.liveWindow.findMany({ where: { templateId: "daily-watch" } });
    expect(rows).toHaveLength(1);
    expect(rows[0]!.slotKey).toContain("daily-watch:");
  });
});
