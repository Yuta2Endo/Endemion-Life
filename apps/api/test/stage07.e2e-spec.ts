// Stage 07: связи игроков — запрос, согласие, встречный запрос, блок, приватность визита
import type { SocialBoard, TieView } from "../src/social/social.service.js";
import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { createTestApp, ORIGIN, resetDatabase, type TestApp } from "./helpers.js";

let t: TestApp;

function agent() {
  return request.agent(t.app.getHttpServer());
}
type Agent = ReturnType<typeof agent>;

/** Гость с именем: социальное действие без имени закрыто */
async function named(client: Agent, name: string): Promise<string> {
  const res = await client.post("/api/session").set("Origin", ORIGIN).send({}).expect(200);
  const id = (res.body as { player: { id: string } }).player.id;
  await t.prisma.client.player.update({ where: { id }, data: { idUsername: name, idDisplayName: name } });
  return id;
}

beforeAll(async () => {
  t = await createTestApp();
});

afterAll(async () => {
  await t.app.close();
});

beforeEach(async () => {
  await resetDatabase(t.prisma);
});

describe("Stage 07: связи игроков", () => {
  it("запрос, согласие и отказ; повтор запроса не создаёт вторую связь", async () => {
    const a = agent();
    const b = agent();
    const aId = await named(a, "Астра");
    const bId = await named(b, "Борис");

    const first = (await a.post("/api/social/requests").set("Origin", ORIGIN).send({ playerId: bId }).expect(201)).body as TieView;
    expect(first.status).toBe("pending");
    const again = (await a.post("/api/social/requests").set("Origin", ORIGIN).send({ playerId: bId }).expect(201)).body as TieView;
    expect(again.id).toBe(first.id);
    expect(await t.prisma.client.tie.count()).toBe(1);

    const board = (await b.get("/api/social").expect(200)).body as SocialBoard;
    expect(board.incoming).toHaveLength(1);
    expect(board.incoming[0]!.player.name).toBe("Астра");

    const accepted = (await b.post(`/api/social/requests/${first.id}/accept`).set("Origin", ORIGIN).send({}).expect(200)).body as TieView;
    expect(accepted.status).toBe("accepted");
    // Своё согласие не принимается
    // Запрос уже принят: согласие второй раз не проходит
    await a.post(`/api/social/requests/${first.id}/accept`).set("Origin", ORIGIN).send({}).expect(409);

    await a.delete(`/api/social/ties/${first.id}`).set("Origin", ORIGIN).send({}).expect(200);
    expect(await t.prisma.client.tie.count()).toBe(0);
    expect(aId).not.toBe(bId);
  });

  it("встречные запросы становятся одной дружбой", async () => {
    const a = agent();
    const b = agent();
    const aId = await named(a, "Вера");
    const bId = await named(b, "Глеб");
    await a.post("/api/social/requests").set("Origin", ORIGIN).send({ playerId: bId }).expect(201);
    const back = (await b.post("/api/social/requests").set("Origin", ORIGIN).send({ playerId: aId }).expect(201)).body as TieView;
    expect(back.status).toBe("accepted");
    expect(await t.prisma.client.tie.count()).toBe(1);
  });

  it("блок скрывает профиль и запрещает запрос; визит не отдаёт сохранение и почту", async () => {
    const a = agent();
    const b = agent();
    const aId = await named(a, "Дана");
    const bId = await named(b, "Егор");
    await t.prisma.client.player.update({ where: { id: bId }, data: { idEmail: "egor@example.com" } });

    const visit = await a.get(`/api/social/players/${bId}`).expect(200);
    expect(visit.body.player.name).toBe("Егор");
    expect(JSON.stringify(visit.body)).not.toContain("egor@example.com");
    expect(visit.body).not.toHaveProperty("state");

    await b.post("/api/social/block").set("Origin", ORIGIN).send({ playerId: aId }).expect(200);
    await a.get(`/api/social/players/${bId}`).expect(404);
    await a.post("/api/social/requests").set("Origin", ORIGIN).send({ playerId: bId }).expect(403);
    // Автор блока профиль видит
    await b.get(`/api/social/players/${aId}`).expect(200);

    // Обратный блок не перезаписывает автора и не открывает профиль
    await a.post("/api/social/block").set("Origin", ORIGIN).send({ playerId: bId }).expect(403);
    const tie = await t.prisma.client.tie.findFirstOrThrow({ where: { OR: [{ playerAId: aId, playerBId: bId }, { playerAId: bId, playerBId: aId }] } });
    expect(tie.status).toBe("blocked");
    expect(tie.askedById).toBe(bId);
    await a.get(`/api/social/players/${bId}`).expect(404);
  });

  it("встречные блокировки не перезаписывают автора", async () => {
    const a = agent();
    const b = agent();
    const aId = await named(a, "Ирина");
    const bId = await named(b, "Кирилл");
    const results = await Promise.all([
      a.post("/api/social/block").set("Origin", ORIGIN).send({ playerId: bId }),
      b.post("/api/social/block").set("Origin", ORIGIN).send({ playerId: aId })
    ]);
    expect(results.map((res) => res.status).sort()).toEqual([200, 403]);
    const winner = results[0].status === 200 ? aId : bId;
    const tie = await t.prisma.client.tie.findFirstOrThrow({ where: { status: "blocked" } });
    expect(tie.askedById).toBe(winner);
    expect(await t.prisma.client.tie.count()).toBe(1);
  });

  it("без имени, без сессии и на себя — отказ", async () => {
    const guest = agent();
    await guest.post("/api/session").set("Origin", ORIGIN).send({}).expect(200);
    const named_ = agent();
    const id = await named(named_, "Жанна");
    await guest.post("/api/social/requests").set("Origin", ORIGIN).send({ playerId: id }).expect(403);
    await named_.post("/api/social/requests").set("Origin", ORIGIN).send({ playerId: id }).expect(400);
    await request(t.app.getHttpServer()).get("/api/social").set("Origin", ORIGIN).expect(401);
    const found = await named_.get("/api/social/players").query({ name: "Жанна" }).expect(200);
    expect((found.body as { players: { id: string }[] }).players).toHaveLength(0);
  });
});
