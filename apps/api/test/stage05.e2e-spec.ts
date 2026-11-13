// Stage 05: multiplayer foundation — account gate, presence, shared contribution,
// moderation report, account export/deletion. No realtime client beyond SSE.
import { randomUUID } from "node:crypto";
import type { AddressInfo } from "node:net";
import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { RedisService } from "../src/redis/redis.service.js";
import type { WorldCurrent } from "../src/world/world.service.js";
import { createTestApp, ORIGIN, resetDatabase, sessionCookieOf, type TestApp } from "./helpers.js";

let t: TestApp;
const PASSWORD = "correct-horse-battery";

function agent() {
  return request.agent(t.app.getHttpServer());
}
type Agent = ReturnType<typeof agent>;

const post = (client: Agent, path: string, body: unknown = {}) =>
  client.post(path).set("Origin", ORIGIN).send(body as object);

async function account(client: Agent, email: string): Promise<{ playerId: string; cookie: string }> {
  const res = await post(client, "/api/auth/register", { email, password: PASSWORD }).expect(201);
  return {
    playerId: (res.body as { player: { id: string } }).player.id,
    cookie: sessionCookieOf(res)!
  };
}

async function world(): Promise<WorldCurrent> {
  const res = await request(t.app.getHttpServer()).get("/api/world/hunter").expect(200);
  return res.body as WorldCurrent;
}

function contribute(client: Agent, input: Record<string, unknown>) {
  return post(client, "/api/world/hunter/contribute", input);
}

beforeAll(async () => {
  t = await createTestApp();
});

afterAll(async () => {
  await t.app.close();
});

beforeEach(async () => {
  await resetDatabase(t.prisma);
  await t.app.get(RedisService).client.del(
    "presence:world:dark-fantasy",
    "presence:world:isekai",
    "presence:world:murim",
    "presence:world:xianxia",
    "presence:world:hunter",
    "presence:world:academy"
  );
});

describe("Stage 05: аккаунт и присутствие", () => {
  it("гость играет соло, но не может менять общий мир и не виден в присутствии", async () => {
    const guest = agent();
    await guest.post("/api/session").set("Origin", ORIGIN).send({}).expect(200);

    // Соло-жизнь по-прежнему создаётся без аккаунта.
    await post(guest, "/api/lives", { universeId: "hunter", seed: `stage05-${randomUUID()}` }).expect(201);

    const heartbeat = await post(guest, "/api/presence/heartbeat", { universeId: "hunter" }).expect(403);
    expect(heartbeat.body.error.code).toBe("ACCOUNT_REQUIRED");
    const online = await guest.get("/api/presence/online?universeId=hunter").expect(403);
    expect(online.body.error.code).toBe("ACCOUNT_REQUIRED");
    const stream = await guest.get("/api/presence/stream?universeId=hunter").expect(403);
    expect(stream.body.error.code).toBe("ACCOUNT_REQUIRED");
    const current = await world();
    const contributed = await contribute(guest, {
      actionId: randomUUID(),
      expectedSeason: current.world.season,
      targetKind: "settlement",
      targetId: current.world.settlements[0]!.id
    }).expect(403);
    expect(contributed.body.error.code).toBe("ACCOUNT_REQUIRED");
  });

  it("аккаунт отмечается в мире и виден другому аккаунту; старые следы истекают", async () => {
    const a = agent();
    const b = agent();
    const accA = await account(a, "presence-a@example.com");
    await account(b, "presence-b@example.com");

    const beat = await post(a, "/api/presence/heartbeat", { universeId: "hunter" }).expect(201);
    expect(beat.body).toMatchObject({ universeId: "hunter", available: true, count: 1 });
    expect(beat.body.players[0].id).toBe(accA.playerId);

    const seen = (await b.get("/api/presence/online?universeId=hunter").expect(200)).body as {
      count: number;
      players: Array<{ id: string }>;
    };
    expect(seen.count).toBe(1);
    expect(seen.players.some((player) => player.id === accA.playerId)).toBe(true);

    // Неподтверждённый аккаунт не должен появляться в другом мире.
    const other = (await b.get("/api/presence/online?universeId=murim").expect(200)).body as { count: number };
    expect(other.count).toBe(0);

    // Presence — эфемерная: старый score не попадает в выборку 90-секундного окна.
    const redis = t.app.get(RedisService);
    await redis.client.zadd("presence:world:hunter", 0, accA.playerId);
    const expired = (await b.get("/api/presence/online?universeId=hunter").expect(200)).body as { count: number };
    expect(expired.count).toBe(0);
  });
});

describe("Stage 05: вклад в общий мир", () => {
  it("вклад одного аккаунта меняет проекцию, пишет аудит и повторяется идемпотентно", async () => {
    const a = agent();
    const accA = await account(a, "contrib-a@example.com");
    const before = await world();
    const settlement = before.world.settlements[0]!;
    const actionId = randomUUID();

    const first = (await contribute(a, {
      actionId,
      expectedSeason: before.world.season,
      targetKind: "settlement",
      targetId: settlement.id
    }).expect(200)).body as {
      replayed: boolean;
      world: WorldCurrent["world"];
      contribution: { actionId: string; targetId: string };
    };
    expect(first.replayed).toBe(false);
    expect(first.world.settlements[0]!.prosperity).toBe(Math.min(100, settlement.prosperity + 1));
    expect(first.world.settlements[0]!.stability).toBe(Math.min(100, settlement.stability + 1));

    const contribution = await t.prisma.client.worldContribution.findUniqueOrThrow({
      where: { playerId_actionId: { playerId: accA.playerId, actionId } }
    });
    expect(contribution.targetId).toBe(settlement.id);
    const command = await t.prisma.client.worldCommand.findFirstOrThrow({ orderBy: { seq: "desc" } });
    expect(command.actor).toBe(accA.playerId);
    expect(command.type).toBe("settlement");
    const audit = await t.prisma.client.worldAudit.findFirstOrThrow({ where: { action: "player.contribute" } });
    expect(audit.actor).toBe(accA.playerId);

    const replay = (await contribute(a, {
      actionId,
      expectedSeason: before.world.season,
      targetKind: "settlement",
      targetId: settlement.id
    }).expect(200)).body as { replayed: boolean; world: WorldCurrent["world"] };
    expect(replay.replayed).toBe(true);
    expect(replay.world.settlements[0]!.prosperity).toBe(first.world.settlements[0]!.prosperity);
    expect(await t.prisma.client.worldContribution.count()).toBe(1);
    expect(await t.prisma.client.worldCommand.count({ where: { actor: accA.playerId } })).toBe(1);
  });

  it("один аккаунт — один вклад в сезон; чужой сезон и неверная цель отклоняются", async () => {
    const a = agent();
    await account(a, "contrib-b@example.com");
    const state = await world();
    const settlement = state.world.settlements[0]!;
    const faction = state.world.factions[0]!;

    await contribute(a, {
      actionId: randomUUID(),
      expectedSeason: state.world.season,
      targetKind: "settlement",
      targetId: settlement.id
    }).expect(200);

    const second = await contribute(a, {
      actionId: randomUUID(),
      expectedSeason: state.world.season,
      targetKind: "settlement",
      targetId: settlement.id
    }).expect(409);
    expect(second.body.error.code).toBe("ALREADY_CONTRIBUTED");

    const stale = await contribute(a, {
      actionId: randomUUID(),
      expectedSeason: state.world.season + 1,
      targetKind: "settlement",
      targetId: settlement.id
    }).expect(409);
    expect(stale.body.error.code).toBe("WORLD_CONFLICT");

    const missingClient = agent();
    await account(missingClient, "contrib-missing@example.com");
    const missing = await contribute(missingClient, {
      actionId: randomUUID(),
      expectedSeason: state.world.season,
      targetKind: "faction",
      targetId: "no-such-faction"
    }).expect(404);
    expect(missing.body.error.code).toBe("NOT_FOUND");

    const b = agent();
    await account(b, "contrib-c@example.com");
    const current = await world();
    const factionContribution = (await contribute(b, {
      actionId: randomUUID(),
      expectedSeason: current.world.season,
      targetKind: "faction",
      targetId: faction.id
    }).expect(200)).body as { world: WorldCurrent["world"] };
    expect(factionContribution.world.factions[0]!.influence).toBe(Math.min(100, faction.influence + 1));
    expect(factionContribution.world.factions[0]!.standing).toBe(Math.min(100, faction.standing + 1));
  });

  it("конкурентные вклады одного аккаунта не создают двойную награду", async () => {
    const a = agent();
    await account(a, "contrib-race@example.com");
    const state = await world();
    const settlement = state.world.settlements[0]!;
    const results = await Promise.all(
      [randomUUID(), randomUUID()].map((actionId) =>
        contribute(a, {
          actionId,
          expectedSeason: state.world.season,
          targetKind: "settlement",
          targetId: settlement.id
        })
      )
    );
    const codes = results.map((result) => result.status).sort();
    expect(codes).toEqual([200, 409]);
    const current = await world();
    expect(current.world.settlements[0]!.prosperity).toBe(Math.min(100, settlement.prosperity + 1));
    expect(await t.prisma.client.worldContribution.count()).toBe(1);
  });

  it("несколько аккаунтов могут поддержать мир в одном сезоне без потери проекции", async () => {
    const players = await Promise.all(
      ["multi-a@example.com", "multi-b@example.com", "multi-c@example.com"].map(async (email) => {
        const client = agent();
        await account(client, email);
        return client;
      })
    );
    const state = await world();
    const settlement = state.world.settlements[1]!;
    const results = await Promise.all(
      players.map((client) =>
        contribute(client, {
          actionId: randomUUID(),
          expectedSeason: state.world.season,
          targetKind: "settlement",
          targetId: settlement.id
        })
      )
    );
    expect(results.map((result) => result.status)).toEqual([200, 200, 200]);
    const current = await world();
    expect(current.world.settlements[1]!.prosperity).toBe(Math.min(100, settlement.prosperity + 3));
    expect(current.world.settlements[1]!.stability).toBe(Math.min(100, settlement.stability + 3));
    expect(await t.prisma.client.worldContribution.count()).toBe(3);
  });
});

describe("Stage 05: модерация, экспорт и удаление", () => {
  it("жалоба создаётся только аккаунтом и не на себя", async () => {
    const a = agent();
    const b = agent();
    const accA = await account(a, "report-a@example.com");
    const accB = await account(b, "report-b@example.com");

    await post(a, "/api/social/reports", {
      playerId: accB.playerId,
      reason: "harassment",
      details: "оскорбления в чате"
    }).expect(201);
    const report = await t.prisma.client.playerReport.findFirstOrThrow();
    expect(report).toMatchObject({ reporterId: accA.playerId, targetId: accB.playerId, reason: "harassment" });
    expect(await t.prisma.client.playerReport.count()).toBe(1);

    await post(a, "/api/social/reports", { playerId: accA.playerId, reason: "other" }).expect(400);
    const guest = agent();
    await guest.post("/api/session").set("Origin", ORIGIN).send({}).expect(200);
    await post(guest, "/api/social/reports", { playerId: accB.playerId, reason: "spam" }).expect(403);
  });

  it("экспорт не содержит паролей и токенов, удаление каскадно убирает аккаунт", async () => {
    const a = agent();
    const acc = await account(a, "export-a@example.com");
    const life = (await post(a, "/api/lives", { universeId: "hunter", seed: `export-${randomUUID()}` }).expect(201)).body as {
      life: { id: string; name: string };
    };

    const exported = (await a.get("/api/auth/export").expect(200)).body as {
      player: { id: string };
      account: { email: string };
      lives: Array<{ id: string }>;
      sessions: unknown[];
    };
    expect(exported.player.id).toBe(acc.playerId);
    expect(exported.account.email).toBe("export-a@example.com");
    expect(exported.lives.map((item) => item.id)).toContain(life.life.id);
    const serialized = JSON.stringify(exported);
    expect(serialized).not.toContain("passwordHash");
    expect(serialized).not.toContain("tokenHash");
    expect(serialized).not.toContain("refreshToken");

    await post(a, "/api/auth/login", { email: "export-a@example.com", password: PASSWORD }).expect(200);
    await a.delete("/api/auth/account").set("Origin", ORIGIN).send({ confirm: "WRONG" }).expect(400);
    await a.delete("/api/auth/account").set("Origin", ORIGIN).send({ confirm: "DELETE" }).expect(200);

    expect(await t.prisma.client.player.findUnique({ where: { id: acc.playerId } })).toBeNull();
    expect(await t.prisma.client.account.count()).toBe(0);
    expect(await t.prisma.client.life.count()).toBe(0);
    expect(await t.prisma.client.session.count()).toBe(0);
  });
});

describe("Stage 05: SSE присутствия", () => {
  it("поток отдаёт снимок и уведомление о вкладе другого игрока", async () => {
    const a = agent();
    const b = agent();
    const accA = await account(a, "sse-a@example.com");
    await account(b, "sse-b@example.com");

    const server = t.app.getHttpServer();
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
    const port = (server.address() as AddressInfo).port;
    const controller = new AbortController();
    try {
      const response = await fetch(`http://127.0.0.1:${port}/api/presence/stream?universeId=hunter`, {
        headers: { Cookie: `el_session=${accA.cookie}` },
        signal: controller.signal
      });
      expect(response.status).toBe(200);
      expect(response.headers.get("content-type")).toContain("text/event-stream");
      const reader = response.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      const readUntil = async (marker: string): Promise<void> => {
        const deadline = Date.now() + 8_000;
        while (!buffer.includes(marker)) {
          const remaining = deadline - Date.now();
          if (remaining <= 0) throw new Error(`SSE timeout waiting for ${marker}; got ${buffer}`);
          const chunk = await Promise.race([
            reader.read(),
            new Promise<never>((_, reject) => setTimeout(() => reject(new Error(`SSE timeout waiting for ${marker}`)), remaining))
          ]);
          if (chunk.done) throw new Error(`SSE closed before ${marker}`);
          buffer += decoder.decode(chunk.value, { stream: true });
        }
      };
      await readUntil("event: hello");

      const state = await world();
      await contribute(b, {
        actionId: randomUUID(),
        expectedSeason: state.world.season,
        targetKind: "settlement",
        targetId: state.world.settlements[0]!.id
      }).expect(200);
      await readUntil("event: world");
      expect(buffer).toContain("Support:");
      expect(buffer).toContain("Поддержка:");
    } finally {
      controller.abort();
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  });
});
