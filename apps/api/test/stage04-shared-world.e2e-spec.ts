// Stage 04 — Living Worlds через API: одинаковый мир для двух гостей, сезонный tick,
// replay, закрытое управление, аудит команд, независимость жизни и публичная сверка.
import { randomUUID } from "node:crypto";
import { Prisma } from "@endemion/database";
import { replaySharedWorld, sharedWorldChecksum, sharedWorldSeed, UNIVERSE_IDS } from "@endemion/game-core";
import type { LifeView } from "@endemion/shared";
import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { createTestApp, ORIGIN, resetDatabase, type TestApp } from "./helpers.js";

const TOKEN = "stage04-world-ops-token";
const previousToken = process.env.WORLD_OPS_TOKEN;

let t: TestApp;

function agent() {
  return request.agent(t.app.getHttpServer());
}
type Agent = ReturnType<typeof agent>;

async function guest(client: Agent): Promise<void> {
  await client.post("/api/session").set("Origin", ORIGIN).send({}).expect(200);
}

async function world(client: Agent, universeId: string) {
  return client.get(`/api/world/${universeId}`).expect(200);
}

function tick(client: Agent, universeId: string, token: string = TOKEN) {
  return client.post(`/api/world/${universeId}/tick`).set("Origin", ORIGIN).set("x-world-ops", token).send({});
}

beforeAll(async () => {
  process.env.WORLD_OPS_TOKEN = TOKEN;
  t = await createTestApp();
});

afterAll(async () => {
  await t.app.close();
  if (previousToken === undefined) delete process.env.WORLD_OPS_TOKEN;
  else process.env.WORLD_OPS_TOKEN = previousToken;
});

beforeEach(async () => {
  await resetDatabase(t.prisma);
});

describe("Stage 04: общий мир", () => {
  it("два независимых гостя видят одинаковый мир; миров ровно шесть", async () => {
    const a = agent();
    const b = agent();
    await guest(a);
    await guest(b);

    const listA = await a.get("/api/world").expect(200);
    const listB = await b.get("/api/world").expect(200);
    expect(listA.body.worlds).toHaveLength(6);
    expect(listB.body.worlds).toEqual(listA.body.worlds);
    expect(listA.body.worlds.map((item: { universeId: string }) => item.universeId).sort()).toEqual([...UNIVERSE_IDS].sort());

    for (const universeId of UNIVERSE_IDS) {
      const first = await world(a, universeId);
      const second = await world(b, universeId);
      expect(second.body.world).toEqual(first.body.world);
      expect(first.body.world.season).toBe(1);
      expect(first.body.world.settlements).toHaveLength(3);
      expect(first.body.world.events).toEqual([]);
    }

    expect(await t.prisma.client.world.count()).toBe(6);
    expect(await t.prisma.client.worldSeason.count()).toBe(6);
    expect(await t.prisma.client.settlement.count()).toBe(18);
    expect(await t.prisma.client.faction.count()).toBe(18);
    // Повторное чтение не создаёт вторую строку мира
    await a.get("/api/world").expect(200);
    expect(await t.prisma.client.world.count()).toBe(6);
  });

  it("управление закрыто без токена, при неверном и при коротком токене", async () => {
    const client = agent();
    await guest(client);
    await client.get("/api/world/murim/replay").expect(404);
    await client.get("/api/world/murim/replay").set("x-world-ops", "wrong-token-value").expect(404);
    await client.post("/api/world/murim/tick").set("Origin", ORIGIN).send({}).expect(404);
    await client.post("/api/world/murim/tick").set("Origin", ORIGIN).set("x-world-ops", "wrong-token-value").send({}).expect(404);

    delete process.env.WORLD_OPS_TOKEN;
    await client.post("/api/world/murim/tick").set("Origin", ORIGIN).set("x-world-ops", TOKEN).send({}).expect(404);
    process.env.WORLD_OPS_TOKEN = "short-token";
    await client.post("/api/world/murim/tick").set("Origin", ORIGIN).set("x-world-ops", "short-token").send({}).expect(404);
    process.env.WORLD_OPS_TOKEN = TOKEN;

    const ok = await tick(client, "murim");
    expect(ok.body.season).toBe(2);
  });

  it("tick меняет сезон детерминированно, replay сходится с движком и снимками сезонов", async () => {
    const client = agent();
    await guest(client);
    const before = await world(client, "murim");
    expect(before.body.world.season).toBe(1);
    const seed = sharedWorldSeed("murim");
    const expectedTick = replaySharedWorld("murim", seed, [{ type: "tick" }]);

    const ticked = await tick(client, "murim");
    expect(ticked.body.season).toBe(2);
    expect(ticked.body.checksum).toBe(sharedWorldChecksum(expectedTick));
    expect(ticked.body.world.season).toBe(2);
    expect(ticked.body.world.events).toHaveLength(1);
    expect(ticked.body.latestEvent.season).toBe(2);

    const firstSeason = await client.get("/api/world/murim/seasons/1").expect(200);
    expect(firstSeason.body.world.season).toBe(1);
    expect(firstSeason.body.checksum).toBe(before.body.checksum);
    const secondSeason = await client.get("/api/world/murim/seasons/2").expect(200);
    expect(secondSeason.body.checksum).toBe(ticked.body.checksum);
    await client.get("/api/world/murim/seasons/99").expect(404);

    const currentReplay = await client.get("/api/world/murim/replay").set("x-world-ops", TOKEN).expect(200);
    expect(currentReplay.body).toMatchObject({ commands: 1, valid: true, expectedChecksum: ticked.body.checksum });
    const seasonOneReplay = await client.get("/api/world/murim/seasons/1/replay").set("x-world-ops", TOKEN).expect(200);
    expect(seasonOneReplay.body).toMatchObject({ commands: 0, valid: true, expectedChecksum: before.body.checksum });
    const seasonTwoReplay = await client.get("/api/world/murim/seasons/2/replay").set("x-world-ops", TOKEN).expect(200);
    expect(seasonTwoReplay.body).toMatchObject({ commands: 1, valid: true, expectedChecksum: ticked.body.checksum });

    const again = await tick(client, "murim");
    expect(again.body.season).toBe(3);
    expect(await t.prisma.client.worldSeason.count()).toBe(3);
    expect(await t.prisma.client.worldCommand.count()).toBe(2);
  });

  it("команда администратора пишет событие, команду и аудит, replay остаётся верным", async () => {
    const client = agent();
    await guest(client);
    await world(client, "academy");

    const eventCommand = {
      type: "event",
      kind: "politics",
      title: { ru: "Королевский указ", en: "A royal decree" },
      text: { ru: "Двор объявляет новый сезон.", en: "The court announces a new season." },
      settlementId: "lirevale",
      factionId: "imperial-court",
      severity: 4
    };
    const event = await client
      .post("/api/world/academy/commands")
      .set("Origin", ORIGIN)
      .set("x-world-ops", TOKEN)
      .send(eventCommand)
      .expect(200);
    expect(event.body.world.season).toBe(1);
    expect(event.body.event).toMatchObject({ kind: "politics", severity: 4, settlementId: "lirevale", factionId: "imperial-court", season: 1 });
    expect(event.body.world.events[0].id).toBe(event.body.event.id);

    const settlementCommand = {
      type: "settlement",
      settlementId: "lirevale",
      population: 12_345,
      prosperity: 88,
      stability: 17,
      dominantFactionId: "magic-tower"
    };
    const settlement = await client
      .post("/api/world/academy/commands")
      .set("Origin", ORIGIN)
      .set("x-world-ops", TOKEN)
      .send(settlementCommand)
      .expect(200);
    const settlementState = settlement.body.world.settlements.find((item: { id: string }) => item.id === "lirevale");
    expect(settlementState).toMatchObject({ population: 12_345, prosperity: 88, stability: 17, dominantFactionId: "magic-tower" });

    const factionCommand = { type: "faction", factionId: "magic-tower", power: 91, influence: 44, standing: 60 };
    await client
      .post("/api/world/academy/commands")
      .set("Origin", ORIGIN)
      .set("x-world-ops", TOKEN)
      .send(factionCommand)
      .expect(200);

    expect(await t.prisma.client.worldCommand.count()).toBe(3);
    const audits = await t.prisma.client.worldAudit.findMany();
    expect(audits.map((item) => item.action).sort()).toEqual(["command.event", "command.faction", "command.settlement", "seed"]);
    const projection = await t.prisma.client.settlement.findUniqueOrThrow({
      where: { worldId_settlementId: { worldId: (await t.prisma.client.world.findUniqueOrThrow({ where: { universeId: "academy" } })).id, settlementId: "lirevale" } }
    });
    expect(projection).toMatchObject({ population: 12_345, prosperity: 88, stability: 17, dominantFactionId: "magic-tower" });
    const eventRows = await t.prisma.client.worldEvent.findMany({ where: { kind: "politics" } });
    expect(eventRows).toHaveLength(1);

    const replay = await client.get("/api/world/academy/replay").set("x-world-ops", TOKEN).expect(200);
    expect(replay.body).toMatchObject({ commands: 3, valid: true });

    await client
      .post("/api/world/academy/commands")
      .set("Origin", ORIGIN)
      .set("x-world-ops", TOKEN)
      .send({ type: "settlement", settlementId: "nowhere", prosperity: 50 })
      .expect(404);
    await client
      .post("/api/world/academy/commands")
      .set("Origin", ORIGIN)
      .set("x-world-ops", TOKEN)
      .send({ type: "settlement", settlementId: "lirevale" })
      .expect(400);
    await client
      .post("/api/world/academy/commands")
      .set("Origin", ORIGIN)
      .set("x-world-ops", TOKEN)
      .send({ type: "settlement", settlementId: "lirevale", population: 50 })
      .expect(400);
    await client
      .post("/api/world/academy/commands")
      .set("Origin", ORIGIN)
      .set("x-world-ops", TOKEN)
      .send({ type: "tick" })
      .expect(400);
  });

  it("ход одинокой жизни не пишет в общий мир", async () => {
    const client = agent();
    await guest(client);
    const created = await client.post("/api/lives").set("Origin", ORIGIN).send({ universeId: "murim", seed: "solo-life" }).expect(201);
    const life = created.body.life as LifeView;
    const before = await world(client, "murim");
    const commandsBefore = await t.prisma.client.worldCommand.count();
    const auditsBefore = await t.prisma.client.worldAudit.count();

    await client
      .post(`/api/lives/${life.id}/actions`)
      .set("Origin", ORIGIN)
      .send({ actionId: randomUUID(), expectedVersion: life.version, action: { type: "advance" } })
      .expect(200);

    const after = await world(client, "murim");
    expect(after.body.world.season).toBe(before.body.world.season);
    expect(after.body.checksum).toBe(before.body.checksum);
    expect(after.body.updatedAt).toBe(before.body.updatedAt);
    expect(await t.prisma.client.worldCommand.count()).toBe(commandsBefore);
    expect(await t.prisma.client.worldAudit.count()).toBe(auditsBefore);
  });

  it("публичная сверка показывает счётчики и примеры без id жизни", async () => {
    const client = agent();
    await guest(client);
    const created = await client.post("/api/lives").set("Origin", ORIGIN).send({ universeId: "murim", seed: "reconciliation-life" }).expect(201);
    const life = created.body.life as LifeView;

    const clean = await client.get("/api/world/murim/reconciliation").expect(200);
    expect(clean.body).toMatchObject({
      universeId: "murim",
      season: 1,
      lives: { total: 1, aligned: 1, drifted: 0, unreadable: 0 },
      settlements: { compared: 3, aligned: 3, drifted: 0, missing: 0 }
    });
    expect(clean.body.examples).toEqual({ settlements: [], factions: [] });
    expect(JSON.stringify(clean.body)).not.toContain(life.id);

    const row = await t.prisma.client.life.findUniqueOrThrow({ where: { id: life.id } });
    const state = row.state as Record<string, unknown>;
    const worldState = state.world as { settlements: Array<{ prosperity: number }> };
    worldState.settlements[0]!.prosperity = 100;
    await t.prisma.client.life.update({ where: { id: life.id }, data: { state: state as Prisma.InputJsonValue } });

    const drifted = await client.get("/api/world/murim/reconciliation").expect(200);
    expect(drifted.body.lives).toMatchObject({ total: 1, aligned: 0, drifted: 1, unreadable: 0 });
    expect(drifted.body.settlements.drifted).toBeGreaterThan(0);
    expect(drifted.body.examples.settlements.length).toBeGreaterThan(0);
    expect(JSON.stringify(drifted.body)).not.toContain(life.id);
  });

  it("metrics показывает длительность tick, отставание проекции и состояние checksum", async () => {
    const client = agent();
    await guest(client);
    await tick(client, "hunter");
    const response = await client.get("/api/world/admin/metrics").set("x-world-ops", TOKEN).expect(200);
    expect(response.body.worlds).toHaveLength(6);
    const hunter = response.body.worlds.find((item: { universeId: string }) => item.universeId === "hunter");
    expect(hunter).toMatchObject({
      season: 2,
      seasons: 2,
      checksum: { valid: true, snapshotValid: true }
    });
    expect(hunter.lastTickDurationMs).toBeGreaterThanOrEqual(0);
    expect(hunter.projectionLagMs).toBeGreaterThanOrEqual(0);
    expect(hunter.commands).toBe(1);
    expect(hunter.events).toBeGreaterThanOrEqual(1);
    expect(hunter.lastTickAt).not.toBeNull();
    await client.get("/api/world/admin/metrics").expect(404);
  });

  it("одновременные tick не теряют сезон, а сбой транзакции не оставляет следов", async () => {
    const client = agent();
    await guest(client);
    await world(client, "xianxia");
    const results = await Promise.all([tick(client, "xianxia"), tick(client, "xianxia")]);
    expect(results.map((res) => res.status)).toEqual([200, 200]);
    const seasons = results.map((res) => (res.body as { season: number }).season).sort((a, b) => a - b);
    expect(seasons).toEqual([2, 3]);
    expect(await t.prisma.client.worldSeason.count()).toBe(3);
    const commands = await t.prisma.client.worldCommand.findMany({ orderBy: { seq: "asc" } });
    expect(commands.map((item) => item.seq)).toEqual([1, 2]);
    const current = await t.prisma.client.world.findUniqueOrThrow({ where: { universeId: "xianxia" } });
    expect(current.season).toBe(3);

    const seasonCount = await t.prisma.client.worldSeason.count();
    const commandCount = await t.prisma.client.worldCommand.count();
    const original = current.state;
    await t.prisma.client.$executeRaw`UPDATE worlds SET state = jsonb_set(state, '{season}', '"broken"'::jsonb) WHERE id = ${current.id}::uuid`;
    const failed = await tick(client, "xianxia");
    expect(failed.status).toBe(500);
    expect(await t.prisma.client.worldSeason.count()).toBe(seasonCount);
    expect(await t.prisma.client.worldCommand.count()).toBe(commandCount);
    expect((await t.prisma.client.world.findUniqueOrThrow({ where: { id: current.id } })).season).toBe(3);
    await t.prisma.client.world.update({ where: { id: current.id }, data: { state: original as Prisma.InputJsonValue } });

    const replay = await client.get("/api/world/xianxia/replay").set("x-world-ops", TOKEN).expect(200);
    expect(replay.body.valid).toBe(true);
    expect(replay.body.commands).toBe(2);
  });
});
