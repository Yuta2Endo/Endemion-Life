import { randomUUID } from "node:crypto";
import type { ActionResponse, LifeView } from "@endemion/shared";
import { Test } from "@nestjs/testing";
import type { NestExpressApplication } from "@nestjs/platform-express";
import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { AppModule } from "../src/app.module.js";
import { configureApp } from "../src/bootstrap.js";
import { APP_CONFIG, loadRootEnv, readConfig } from "../src/config.js";
import { PrismaService } from "../src/prisma/prisma.service.js";

loadRootEnv();
const ORIGIN = "http://localhost:3000";

let app: NestExpressApplication;
let prisma: PrismaService;

function agent() {
  return request.agent(app.getHttpServer());
}

type Agent = ReturnType<typeof agent>;

async function createLife(client: Agent, body: Record<string, unknown> = { universeId: "xianxia", seed: "e2e-seed" }): Promise<LifeView> {
  const res = await client.post("/api/lives").set("Origin", ORIGIN).send(body).expect(201);
  return (res.body as { life: LifeView }).life;
}

/** Возвращает сам запрос supertest (не Promise): к нему можно дописать .expect(статус) */
function act(client: Agent, life: LifeView, action: Record<string, unknown>, actionId: string = randomUUID()) {
  return client.post(`/api/lives/${life.id}/actions`).set("Origin", ORIGIN).send({ actionId, expectedVersion: life.version, action });
}

/** Проживает годы, пока не появится событие */
async function untilEvent(client: Agent, start: LifeView): Promise<LifeView> {
  let life = start;
  for (let i = 0; i < 100 && !life.pendingEvent; i++) {
    const res = await act(client, life, { type: "advance" });
    expect(res.status).toBe(200);
    life = (res.body as ActionResponse).life;
  }
  expect(life.pendingEvent).not.toBeNull();
  return life;
}

beforeAll(async () => {
  const config = readConfig({
    ...process.env,
    DATABASE_URL: process.env.DATABASE_URL_TEST,
    RATE_LIMIT_PER_MINUTE: "0",
    AUTH_RATE_LIMIT_PER_MINUTE: "0",
    MAIL_DRIVER: "memory",
    LOG_LEVEL: "error"
  });
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).overrideProvider(APP_CONFIG).useValue(config).compile();
  app = moduleRef.createNestApplication<NestExpressApplication>({ bodyParser: false, logger: ["error"] });
  configureApp(app);
  await app.init();
  prisma = app.get(PrismaService);
});

beforeEach(async () => {
  await prisma.client.$executeRawUnsafe(
    "TRUNCATE players, sessions, accounts, auth_tokens, lives, life_snapshots, history_entries, game_actions CASCADE"
  );
});

afterAll(async () => {
  await app?.close();
});

describe("health и каталог", () => {
  it("GET /api/health — база доступна", async () => {
    const res = await request(app.getHttpServer()).get("/api/health").expect(200);
    expect(res.body).toMatchObject({ services: { database: "up" } });
    expect(["ok", "degraded"]).toContain(res.body.status);
  });

  it("GET /api/universes — шесть вселенных", async () => {
    const res = await request(app.getHttpServer()).get("/api/universes").expect(200);
    expect(res.body.universes).toHaveLength(6);
    expect(res.body.temperaments.length).toBeGreaterThan(0);
    await request(app.getHttpServer()).get("/api/universes/murim").expect(200);
    await request(app.getHttpServer()).get("/api/universes/nope").expect(404);
  });

  it("неизвестный адрес — 404 в общем формате", async () => {
    const res = await request(app.getHttpServer()).get("/api/nothing").expect(404);
    expect(res.body.error.code).toBe("NOT_FOUND");
  });
});

describe("жизни", () => {
  it("создание жизни выдаёт гостевую сессию и не раскрывает seed", async () => {
    const client = agent();
    const res = await client.post("/api/lives").set("Origin", ORIGIN).send({ universeId: "murim", name: "Лин Юэ", seed: "secret-seed" }).expect(201);
    const cookie = String(res.headers["set-cookie"]);
    expect(cookie).toContain("el_session=");
    expect(cookie).toContain("HttpOnly");
    expect(res.body.life.character.name).toBe("Лин Юэ");
    expect(res.body.life.life.age).toBe(0);
    expect(JSON.stringify(res.body)).not.toContain("secret-seed");
    expect(res.body.life).not.toHaveProperty("rngState");
    const list = await client.get("/api/lives").expect(200);
    expect(list.body.lives).toHaveLength(1);
  });

  it.each(["dark-fantasy", "isekai", "murim", "xianxia", "hunter", "academy"])("можно начать жизнь во вселенной %s", async (universeId) => {
    const life = await createLife(agent(), { universeId });
    expect(life.universeId).toBe(universeId);
  });

  it("клиент не может назначить себе характеристики, возраст или награду", async () => {
    const client = agent();
    await client.post("/api/lives").set("Origin", ORIGIN).send({ universeId: "murim", stats: { strength: 100 } }).expect(400);
    await client.post("/api/lives").set("Origin", ORIGIN).send({ universeId: "murim", age: 90 }).expect(400);
    const life = await createLife(client);
    await act(client, life, { type: "advance", years: 99 }).expect(400);
    await act(client, life, { type: "setStats", strength: 100 }).expect(400);
    await act(client, life, { type: "advance", xp: 9000 }).expect(400);
  });

  it("продвижение времени увеличивает возраст и пишет историю", async () => {
    const client = agent();
    const life = await createLife(client);
    const res = await act(client, life, { type: "advance" }).expect(200);
    const body = res.body as ActionResponse;
    expect(body.life.life.age).toBe(1);
    expect(body.life.version).toBe(life.version + 1);
    expect(body.entries.some((e) => e.kind === "year")).toBe(true);
    const history = await client.get(`/api/lives/${life.id}/history`).expect(200);
    expect(history.body.entries.map((e: { kind: string }) => e.kind)).toEqual(expect.arrayContaining(["birth", "year"]));
  });

  it("выбор в событии меняет персонажа, история фиксирует решение", async () => {
    const client = agent();
    const life = await untilEvent(client, await createLife(client, { universeId: "isekai", seed: "choice-e2e" }));
    const choice = life.pendingEvent!.choices.find((c) => c.available)!;
    const res = await act(client, life, { type: "choose", choiceId: choice.id }).expect(200);
    const body = res.body as ActionResponse;
    expect(body.life.pendingEvent).toBeNull();
    const entry = body.entries.find((e) => e.kind === "event");
    expect(entry?.choiceId).toBe(choice.id);
    const stored = await prisma.client.historyEntry.count({ where: { lifeId: life.id, kind: "event" } });
    expect(stored).toBe(1);
  });

  it("повтор того же действия не применяется дважды", async () => {
    const client = agent();
    const life = await createLife(client);
    const actionId = randomUUID();
    const first = await act(client, life, { type: "advance" }, actionId).expect(200);
    const second = await act(client, life, { type: "advance" }, actionId).expect(200);
    expect(second.body.replayed).toBe(true);
    expect(second.body.life.version).toBe(first.body.life.version);
    expect(second.body.entries).toEqual(first.body.entries);
    const row = await prisma.client.life.findUniqueOrThrow({ where: { id: life.id } });
    expect(row.age).toBe(1);
    expect(await prisma.client.gameAction.count({ where: { lifeId: life.id } })).toBe(1);
    // Тот же actionId для другого действия — отказ
    await act(client, life, { type: "advance", years: 2 }, actionId).expect(409);
  });

  it("одновременные действия: проходит одно, второе получает конфликт версии", async () => {
    const client = agent();
    const life = await createLife(client);
    const results = await Promise.all([act(client, life, { type: "advance" }), act(client, life, { type: "advance" })]);
    expect(results.map((r) => r.status).sort()).toEqual([200, 409]);
    const conflict = results.find((r) => r.status === 409)!;
    expect(conflict.body.error.code).toBe("VERSION_CONFLICT");
    const row = await prisma.client.life.findUniqueOrThrow({ where: { id: life.id } });
    expect(row.age).toBe(1);
    expect(await prisma.client.historyEntry.count({ where: { lifeId: life.id, kind: "year" } })).toBe(1);
  });

  it("лимит живых жизней не превышается при одновременном создании", async () => {
    const client = agent();
    await createLife(client);
    const results = await Promise.all(
      Array.from({ length: 24 }, (_, i) =>
        client.post("/api/lives").set("Origin", ORIGIN).send({ universeId: "hunter", seed: `cap-${i}-${randomUUID()}` })
      )
    );
    const created = results.filter((r) => r.status === 201).length;
    const limited = results.filter((r) => r.status === 409 && r.body.error.code === "LIMIT_REACHED").length;
    expect(created).toBe(19);
    expect(limited).toBe(5);
    expect(await prisma.client.life.count({ where: { status: "alive" } })).toBe(20);
  });

  it("устаревший nextSeq в сохранении не ломает историю", async () => {
    const client = agent();
    const life = await createLife(client);
    await act(client, life, { type: "advance" }).expect(200);
    const row = await prisma.client.life.findUniqueOrThrow({ where: { id: life.id } });
    const state = row.state as { nextSeq: number };
    const beforeMax = (await prisma.client.historyEntry.aggregate({ where: { lifeId: life.id }, _max: { seq: true } }))._max.seq!;
    await prisma.client.life.update({ where: { id: life.id }, data: { state: { ...state, nextSeq: 1 } } });
    const current = (await client.get(`/api/lives/${life.id}`).expect(200)).body.life as LifeView;
    const choice = current.pendingEvent?.choices.find((item) => item.available);
    const res = await act(client, current, choice ? { type: "choose", choiceId: choice.id } : { type: "advance" });
    expect(res.status, JSON.stringify(res.body)).toBe(200);
    const afterMax = (await prisma.client.historyEntry.aggregate({ where: { lifeId: life.id }, _max: { seq: true } }))._max.seq!;
    expect(afterMax).toBeGreaterThan(beforeMax);
    expect((res.body as ActionResponse).life.version).toBe(current.version + 1);
  });

  it("устаревшая версия отклоняется", async () => {
    const client = agent();
    const life = await createLife(client);
    await act(client, life, { type: "advance" }).expect(200);
    const res = await act(client, life, { type: "advance" }).expect(409);
    expect(res.body.error).toMatchObject({ code: "VERSION_CONFLICT", details: { currentVersion: life.version + 1 } });
  });

  it("чужую жизнь нельзя ни прочитать, ни изменить", async () => {
    const owner = agent();
    const life = await createLife(owner);
    const stranger = agent();
    await stranger.post("/api/session").set("Origin", ORIGIN).send({}).expect(200);
    await stranger.get(`/api/lives/${life.id}`).expect(404);
    await act(stranger, life, { type: "advance" }).expect(404);
    await request(app.getHttpServer()).get(`/api/lives/${life.id}`).expect(401);
  });

  it("запрос с чужого сайта и не-JSON отклоняются", async () => {
    const client = agent();
    await client.post("/api/lives").set("Origin", "https://evil.example").send({ universeId: "murim" }).expect(403);
    await client.post("/api/lives").set("Origin", ORIGIN).set("Content-Type", "text/plain").send("universeId=murim").expect(415);
  });

  it("версии сохранения и откат", async () => {
    const client = agent();
    let life = await createLife(client, { universeId: "hunter", seed: "restore-e2e" });
    const firstVersion = life.version;
    for (let i = 0; i < 5; i++) {
      const res = life.pendingEvent
        ? await act(client, life, { type: "choose", choiceId: life.pendingEvent.choices.find((c) => c.available)!.id })
        : await act(client, life, { type: "advance" });
      life = (res.body as ActionResponse).life;
    }
    const saves = await client.get(`/api/lives/${life.id}/saves`).expect(200);
    expect(saves.body.saves[0].version).toBe(life.version);
    expect(saves.body.saves.at(-1).version).toBe(firstVersion);

    const res = await client.post(`/api/lives/${life.id}/restore`).set("Origin", ORIGIN).send({ version: firstVersion, expectedVersion: life.version }).expect(200);
    const restored = (res.body as ActionResponse).life;
    expect(restored.life.age).toBe(0);
    expect(restored.version).toBe(life.version + 1);
    const history = await client.get(`/api/lives/${life.id}/history`).expect(200);
    expect(history.body.entries.map((e: { kind: string }) => e.kind)).toEqual(["restore", "birth"]);
    // Откат к будущей версии невозможен
    await client.post(`/api/lives/${life.id}/restore`).set("Origin", ORIGIN).send({ version: restored.version, expectedVersion: restored.version }).expect(400);

    let current = restored;
    for (let i = 0; i < 3; i++) {
      const step = current.pendingEvent
        ? await act(client, current, { type: "choose", choiceId: current.pendingEvent.choices.find((c) => c.available)!.id })
        : await act(client, current, { type: "advance" });
      current = (step.body as ActionResponse).life;
    }
    const actionId = randomUUID();
    const again = await client
      .post(`/api/lives/${life.id}/restore`)
      .set("Origin", ORIGIN)
      .send({ version: restored.version, expectedVersion: current.version, actionId })
      .expect(200);
    const second = (again.body as ActionResponse).life;
    expect(again.body.replayed).toBe(false);
    const replay = await client
      .post(`/api/lives/${life.id}/restore`)
      .set("Origin", ORIGIN)
      .send({ version: restored.version, expectedVersion: current.version, actionId })
      .expect(200);
    expect(replay.body.replayed).toBe(true);
    expect((replay.body as ActionResponse).life.version).toBe(second.version);
    const moved = await client
      .post(`/api/lives/${life.id}/restore`)
      .set("Origin", ORIGIN)
      .send({ version: restored.version, expectedVersion: second.version, actionId })
      .expect(200);
    expect(moved.body.replayed).toBe(true);
    expect((moved.body as ActionResponse).life.version).toBe(second.version);
    const other = await client
      .post(`/api/lives/${life.id}/restore`)
      .set("Origin", ORIGIN)
      .send({ version: firstVersion, expectedVersion: second.version, actionId })
      .expect(409);
    expect(other.body.error.code).toBe("ACTION_ID_REUSED");
  });

  it("история загружается страницами", async () => {
    const client = agent();
    let life = await createLife(client);
    for (let i = 0; i < 6; i++) {
      const res = life.pendingEvent
        ? await act(client, life, { type: "choose", choiceId: life.pendingEvent.choices.find((c) => c.available)!.id })
        : await act(client, life, { type: "advance" });
      life = (res.body as ActionResponse).life;
    }
    const all = await client.get(`/api/lives/${life.id}/history?limit=200`).expect(200);
    const first = await client.get(`/api/lives/${life.id}/history?limit=2`).expect(200);
    expect(first.body.entries).toHaveLength(2);
    const second = await client.get(`/api/lives/${life.id}/history?limit=200&before=${first.body.nextBefore}`).expect(200);
    expect([...first.body.entries, ...second.body.entries]).toEqual(all.body.entries);
  });
});
