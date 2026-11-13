import { randomUUID } from "node:crypto";
import type { ActionResponse, LifeView } from "@endemion/shared";
import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { createTestApp, ORIGIN, resetDatabase, type TestApp } from "./helpers.js";

let t: TestApp;

function agent() {
  return request.agent(t.app.getHttpServer());
}
type Agent = ReturnType<typeof agent>;

async function createLife(client: Agent, seed = `rel-${randomUUID()}`): Promise<LifeView> {
  const res = await client.post("/api/lives").set("Origin", ORIGIN).send({ universeId: "hunter", seed }).expect(201);
  return (res.body as { life: LifeView }).life;
}

function act(client: Agent, life: LifeView, actionId: string = randomUUID()) {
  const action = life.pendingEvent ? { type: "choose", choiceId: life.pendingEvent.choices.find((c) => c.available)!.id } : { type: "advance" };
  return client.post(`/api/lives/${life.id}/actions`).set("Origin", ORIGIN).send({ actionId, expectedVersion: life.version, action });
}

/** Целостность жизни в базе: версия = 1 + принятые действия, у текущей версии есть снимок, номера истории без пропусков */
async function expectConsistent(lifeId: string): Promise<void> {
  const life = await t.prisma.client.life.findUniqueOrThrow({ where: { id: lifeId } });
  const actions = await t.prisma.client.gameAction.count({ where: { lifeId } });
  expect(life.version).toBe(1 + actions);
  expect(await t.prisma.client.lifeSnapshot.count({ where: { lifeId, version: life.version } })).toBe(1);
  const seqs = (await t.prisma.client.historyEntry.findMany({ where: { lifeId }, select: { seq: true }, orderBy: { seq: "asc" } })).map((row) => row.seq);
  expect(seqs).toEqual(Array.from({ length: seqs.length }, (_, i) => (seqs[0] ?? 0) + i));
  const state = life.state as { version: number; life: { age: number } };
  expect(state.version).toBe(life.version);
  expect(state.life.age).toBe(life.age);
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

describe("параллельные действия", () => {
  it("10 одновременных действий над одной жизнью: принимается ровно одно", async () => {
    const client = agent();
    const life = await createLife(client);
    const results = await Promise.all(Array.from({ length: 10 }, () => act(client, life)));
    const statuses = results.map((r) => r.status);
    expect(statuses.filter((s) => s === 200)).toHaveLength(1);
    expect(statuses.filter((s) => s === 409)).toHaveLength(9);
    expect(results.filter((r) => r.status === 409).every((r) => r.body.error.code === "VERSION_CONFLICT")).toBe(true);
    await expectConsistent(life.id);
    expect((await t.prisma.client.life.findUniqueOrThrow({ where: { id: life.id } })).version).toBe(life.version + 1);
  });

  it("один actionId, отправленный 8 раз одновременно: применяется один раз, остальные — повтор того же ответа", async () => {
    const client = agent();
    const life = await createLife(client);
    const actionId = randomUUID();
    const results = await Promise.all(Array.from({ length: 8 }, () => act(client, life, actionId)));
    expect(results.every((r) => r.status === 200)).toBe(true);
    expect(results.filter((r) => (r.body as ActionResponse).replayed === false)).toHaveLength(1);
    const versions = new Set(results.map((r) => (r.body as ActionResponse).life.version));
    expect([...versions]).toEqual([life.version + 1]);
    expect(await t.prisma.client.gameAction.count({ where: { lifeId: life.id } })).toBe(1);
    await expectConsistent(life.id);
  });

  it("20 жизней разных игроков, по 5 ходов одновременно: все действия приняты, данные целы", async () => {
    const players = Array.from({ length: 20 }, () => agent());
    const lives = await Promise.all(players.map((client) => createLife(client)));
    await Promise.all(
      players.map(async (client, i) => {
        let life = lives[i]!;
        for (let step = 0; step < 5; step++) {
          const res = await act(client, life);
          expect(res.status).toBe(200);
          life = (res.body as ActionResponse).life;
        }
      })
    );
    for (const life of lives) {
      await expectConsistent(life.id);
      expect(await t.prisma.client.gameAction.count({ where: { lifeId: life.id } })).toBe(5);
    }
  });
});

describe("сбой посреди транзакции", () => {
  it("ошибка записи истории откатывает всё действие; повтор с тем же actionId проходит", async () => {
    const client = agent();
    const life = await createLife(client);
    const before = await t.prisma.client.life.findUniqueOrThrow({ where: { id: life.id } });
    // Внедряем сбой именно на вставке истории: проверяем, что обновление жизни
    // и снимок откатываются вместе с записью действия.
    const marker = randomUUID().replaceAll("-", "");
    const fn = `test_fail_history_${marker}`;
    const trigger = `test_fail_history_${marker}`;
    await t.prisma.client.$executeRawUnsafe(`
      CREATE FUNCTION ${fn}() RETURNS trigger AS $$
      BEGIN
        IF NEW.life_id = '${life.id}'::uuid THEN
          RAISE EXCEPTION 'injected history failure';
        END IF;
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql
    `);
    await t.prisma.client.$executeRawUnsafe(`CREATE TRIGGER ${trigger} BEFORE INSERT ON history_entries FOR EACH ROW EXECUTE FUNCTION ${fn}()`);

    const actionId = randomUUID();
    try {
      const failed = await act(client, life, actionId);
      expect(failed.status).toBe(500);
      expect(failed.body.error.code).toBe("INTERNAL");
      expect(JSON.stringify(failed.body)).not.toMatch(/prisma|unique|constraint|history_entries|injected/i);
    } finally {
      await t.prisma.client.$executeRawUnsafe(`DROP TRIGGER IF EXISTS ${trigger} ON history_entries`);
      await t.prisma.client.$executeRawUnsafe(`DROP FUNCTION IF EXISTS ${fn}()`);
    }

    const after = await t.prisma.client.life.findUniqueOrThrow({ where: { id: life.id } });
    expect(after.version).toBe(before.version);
    expect(after.age).toBe(before.age);
    expect(after.state).toEqual(before.state);
    expect(await t.prisma.client.gameAction.count({ where: { lifeId: life.id } })).toBe(0);
    expect(await t.prisma.client.lifeSnapshot.count({ where: { lifeId: life.id, version: { gt: before.version } } })).toBe(0);

    const retried = await act(client, life, actionId);
    expect(retried.status).toBe(200);
    expect((retried.body as ActionResponse).replayed).toBe(false);
    await expectConsistent(life.id);
  });
});

describe("PostgreSQL недоступен", () => {
  let offline: TestApp;

  beforeAll(async () => {
    // Порт, на котором PostgreSQL нет. Пул подключается лениво, поэтому приложение запускается
    offline = await createTestApp({ DATABASE_URL: "postgresql://endemion:x@127.0.0.1:1/endemion_life_test" });
  });

  afterAll(async () => {
    await offline?.app.close();
  });

  it("health — 503, запросы игры — 503 UNAVAILABLE без подробностей", async () => {
    const health = await request(offline.app.getHttpServer()).get("/api/health").expect(503);
    expect(health.body.services.database).toBe("down");
    const res = await request(offline.app.getHttpServer()).post("/api/lives").set("Origin", ORIGIN).send({ universeId: "hunter" }).expect(503);
    expect(res.body).toEqual({ error: { code: "UNAVAILABLE", message: "Сервис временно недоступен, попробуйте через минуту" } });
  });
});

describe("Redis недоступен", () => {
  let offline: TestApp;

  beforeAll(async () => {
    // Порт, на котором Redis нет: клиент не подключится
    offline = await createTestApp({ REDIS_URL: "redis://127.0.0.1:1", RATE_LIMIT_PER_MINUTE: "5", AUTH_RATE_LIMIT_PER_MINUTE: "3" });
  });

  afterAll(async () => {
    await offline?.app.close();
  });

  it("health degraded, игровые маршруты fail-closed", async () => {
    const health = await request(offline.app.getHttpServer()).get("/api/health").expect(503);
    expect(health.body).toMatchObject({ status: "degraded", services: { database: "up", redis: "down" } });

    const res = await request(offline.app.getHttpServer()).post("/api/lives").set("Origin", ORIGIN).send({ universeId: "murim" }).expect(503);
    expect((res.body as { error: { code: string } }).error.code).toBe("UNAVAILABLE");
  });

  it("лимит входа без Redis продолжает действовать (счётчик в памяти)", async () => {
    const statuses: number[] = [];
    for (let i = 0; i < 5; i++) {
      const res = await request(offline.app.getHttpServer())
        .post("/api/auth/login")
        .set("Origin", ORIGIN)
        .send({ email: "nobody@example.com", password: "wrong-password-1" });
      statuses.push(res.status);
    }
    expect(statuses.slice(0, 3)).toEqual([401, 401, 401]);
    expect(statuses.slice(3)).toEqual([429, 429]);
  });
});
