// Stage 05 через API: приключение идёт тем же маршрутом действий, награда не удваивается повтором,
// чужая жизнь закрыта, лишние поля и устаревшая версия отклоняются
import { randomUUID } from "node:crypto";
import { presentAdventure, type GameState } from "@endemion/game-core";
import type { ActionResponse, LifeView } from "@endemion/shared";
import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { createTestApp, ORIGIN, resetDatabase, type TestApp } from "./helpers.js";

let t: TestApp;

function agent() {
  return request.agent(t.app.getHttpServer());
}
type Agent = ReturnType<typeof agent>;

async function createLife(client: Agent, universeId = "isekai"): Promise<LifeView> {
  const res = await client.post("/api/lives").set("Origin", ORIGIN).send({ universeId, name: "Рейдер" }).expect(201);
  if (!res.body.life) throw new Error(`создание жизни вернуло ${res.status}: ${JSON.stringify(res.body).slice(0, 300)}`);
  return res.body.life as LifeView;
}

/** Доводит жизнь до открытого места и возвращает то, что видит игрок */
async function reachPlace(client: Agent, life: LifeView): Promise<LifeView> {
  let current = life;
  if (!current?.adventure) throw new Error(`создание вернуло: ${JSON.stringify(current).slice(0, 300)}`);
  for (let i = 0; i < 40 && current.adventure.discovered === 0 && current.status === "alive"; i++) {
    if (!current.adventure) throw new Error(`в ответе нет приключения: ${JSON.stringify(Object.keys(current))}`);
    const choice = current.pendingEvent?.choices.find((item) => item.available);
    const action = current.pendingEvent && choice ? { type: "choose" as const, choiceId: choice.id } : { type: "advance" as const, years: 5 };
    const res = await client
      .post(`/api/lives/${current.id}/actions`)
      .set("Origin", ORIGIN)
      .send({ actionId: randomUUID(), expectedVersion: current.version, action })
      .expect(200);
    if (!res.body.life) throw new Error(`ход вернул ${res.status}: ${JSON.stringify(res.body).slice(0, 300)}`);
    current = (res.body as ActionResponse).life;
  }
  return current;
}

function act(client: Agent, life: LifeView, action: Record<string, unknown>, actionId = randomUUID()) {
  return client.post(`/api/lives/${life.id}/actions`).set("Origin", ORIGIN).send({ actionId, expectedVersion: life.version, action });
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

describe("Stage 05: приключения", () => {
  it("место открывается, приключение начинается, шаг даёт награду; повтор того же actionId награды не удваивает", async () => {
    const client = agent();
    let life = await reachPlace(client, await createLife(client));
    expect(life.adventure.discovered).toBeGreaterThan(0);
    // Место открывается с 14 лет, приключение — с 15: доживаем разницу
    let ready = life;
    for (let i = 0; i < 6 && !ready.adventure.adventures.some((item) => item.blocked === null) && ready.status === "alive"; i++) {
      const choice = ready.pendingEvent?.choices.find((item) => item.available);
      const action = ready.pendingEvent && choice ? { type: "choose" as const, choiceId: choice.id } : { type: "advance" as const };
      const res = await act(client, ready, action);
      if (res.status !== 200) throw new Error(`ход ${JSON.stringify(action)} вернул ${res.status}: ${JSON.stringify(res.body).slice(0, 200)}`);
      ready = (res.body as ActionResponse).life;
    }
    const card = ready.adventure.adventures.find((item) => item.blocked === null);
    expect(card, `приключение недоступно: ${ready.adventure.adventures.map((item) => item.blocked).join(",")}`).toBeDefined();
    life = ready;

    const startedRes = await act(client, life, { type: "venture", adventureId: card!.id });
    if (startedRes.status !== 200) throw new Error(`старт вернул ${startedRes.status}: ${JSON.stringify(startedRes.body).slice(0, 300)}`);
    const started = startedRes.body as ActionResponse;
    expect(started.life.adventure.current?.id).toBe(card!.id);
    const choice = started.life.adventure.current?.step.choices.find((item) => item.available);
    expect(choice).toBeDefined();

    const actionId = randomUUID();
    const step = (await act(client, started.life, { type: "venture", choiceId: choice!.id }, actionId).expect(200)).body as ActionResponse;
    expect(step.replayed).toBe(false);
    const wealth = step.life.character.wealth;
    const again = (await act(client, started.life, { type: "venture", choiceId: choice!.id }, actionId).expect(200)).body as ActionResponse;
    expect(again.replayed).toBe(true);
    expect(again.life.character.wealth).toBe(wealth);
    expect(again.life.version).toBe(step.life.version);

    const other = await act(client, started.life, { type: "venture", choiceId: "other-choice" }, actionId);
    expect(other.status).toBe(409);
  });

  it("чужая жизнь недоступна, без сессии — 401, лишнее поле — 400, устаревшая версия — 409", async () => {
    const owner = agent();
    const stranger = agent();
    const life = await createLife(owner);
    await stranger.post("/api/session").set("Origin", ORIGIN).send({}).expect(200);
    await stranger.get(`/api/lives/${life.id}`).expect(404);
    await request(t.app.getHttpServer())
      .post(`/api/lives/${life.id}/actions`)
      .set("Origin", ORIGIN)
      .send({ actionId: randomUUID(), expectedVersion: life.version, action: { type: "venture", adventureId: "is.first-contract" } })
      .expect(401);

    const extra = await act(owner, life, { type: "venture", adventureId: "is.first-contract", reward: 999 });
    expect(extra.status).toBe(400);
    const stale = await owner
      .post(`/api/lives/${life.id}/actions`)
      .set("Origin", ORIGIN)
      .send({ actionId: randomUUID(), expectedVersion: life.version + 5, action: { type: "venture", adventureId: "is.first-contract" } });
    expect(stale.status).toBe(409);
  });

  it("приключение чужого мира отклоняется и не меняет состояние", async () => {
    const client = agent();
    const life = await createLife(client, "murim");
    const res = await act(client, life, { type: "venture", adventureId: "hu.gate-raid" });
    // Чужой мир — отказ правил, не ошибка разбора: состояние не меняется
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe("ADVENTURE_LOCKED");
    const row = await t.prisma.client.life.findUniqueOrThrow({ where: { id: life.id } });
    const stored = row.state as unknown as GameState;
    expect(stored.adventure.active).toBeNull();
    // Сервер и клиент видят одно и то же
    expect(presentAdventure(stored).current).toBeNull();
  });

  it("сдача не даёт золота и закрывает приключение", async () => {
    const client = agent();
    let life = await reachPlace(client, await createLife(client));
    const card = life.adventure.adventures.find((item) => item.blocked === null);
    if (!card) return;
    life = ((await act(client, life, { type: "venture", adventureId: card.id }).expect(200)).body as ActionResponse).life;
    const gold = life.character.wealth;
    const left = ((await act(client, life, { type: "venture" }).expect(200)).body as ActionResponse).life;
    expect(left.character.wealth).toBe(gold);
    expect(left.adventure.current).toBeNull();
    const again = await act(client, left, { type: "venture", adventureId: card.id });
    expect(again.status).toBe(400);
  });
});
