// Stage 06 через API: склад края меняет покупка, повтор того же actionId не меняет его второй раз,
// цену с клиента сервер не принимает
import { randomUUID } from "node:crypto";
import type { GameState } from "@endemion/game-core";
import type { ActionResponse, LifeView } from "@endemion/shared";
import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { createTestApp, ORIGIN, resetDatabase, type TestApp } from "./helpers.js";

let t: TestApp;

function agent() {
  return request.agent(t.app.getHttpServer());
}
type Agent = ReturnType<typeof agent>;

async function createLife(client: Agent): Promise<LifeView> {
  const res = await client.post("/api/lives").set("Origin", ORIGIN).send({ universeId: "isekai", name: "Лавочник" }).expect(201);
  return res.body.life as LifeView;
}

function act(client: Agent, life: LifeView, action: Record<string, unknown>, actionId = randomUUID()) {
  return client.post(`/api/lives/${life.id}/actions`).set("Origin", ORIGIN).send({ actionId, expectedVersion: life.version, action });
}

/** До 16 лет: раньше рынок закрыт */
async function growUp(client: Agent, life: LifeView): Promise<LifeView> {
  let current = life;
  for (let i = 0; i < 40 && current.life.age < 16 && current.status === "alive"; i++) {
    const choice = current.pendingEvent?.choices.find((item) => item.available);
    const action = current.pendingEvent && choice ? { type: "choose" as const, choiceId: choice.id } : { type: "advance" as const, years: 5 };
    const res = await act(client, current, action);
    if (res.status !== 200) throw new Error(`ход вернул ${res.status}: ${JSON.stringify(res.body).slice(0, 200)}`);
    current = (res.body as ActionResponse).life;
  }
  for (let i = 0; i < 6 && current.pendingEvent && current.status === "alive"; i++) {
    const choice = current.pendingEvent.choices.find((item) => item.available);
    if (!choice) break;
    current = ((await act(client, current, { type: "choose", choiceId: choice.id }).expect(200)).body as ActionResponse).life;
  }
  return current;
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

describe("Stage 06: край", () => {
  it("покупка уменьшает склад, повтор того же actionId не уменьшает его снова", async () => {
    const client = agent();
    let life = await growUp(client, await createLife(client));
    if (!life.market.goods.some((item) => item.canBuy) && life.status === "alive" && !life.pendingEvent) {
      const row = await t.prisma.client.life.findUniqueOrThrow({ where: { id: life.id } });
      const state = row.state as GameState;
      state.character.wealth = Math.max(state.character.wealth, 200);
      await t.prisma.client.life.update({ where: { id: life.id }, data: { state } });
      life = ((await client.get(`/api/lives/${life.id}`).expect(200)).body as { life: LifeView }).life;
    }
    const good = life.market.goods.find((item) => item.canBuy);
    expect(good, "нет товара, который можно купить").toBeDefined();
    const before = life.region.goods.find((item) => item.id === good!.id)?.stock ?? 0;
    const actionId = randomUUID();
    const bought = (await act(client, life, { type: "trade", goodId: good!.id, side: "buy", qty: 1 }, actionId).expect(200)).body as ActionResponse;
    const stock = bought.life.region.goods.find((item) => item.id === good!.id)?.stock;
    expect(stock).toBeLessThan(before);
    const again = (await act(client, life, { type: "trade", goodId: good!.id, side: "buy", qty: 1 }, actionId).expect(200)).body as ActionResponse;
    expect(again.replayed).toBe(true);
    expect(again.life.region.goods.find((item) => item.id === good!.id)?.stock).toBe(stock);
    expect(again.life.character.wealth).toBe(bought.life.character.wealth);
  });

  it("цену с клиента сервер не принимает, чужая жизнь закрыта", async () => {
    const owner = agent();
    const life = await createLife(owner);
    const extra = await act(owner, life, { type: "trade", goodId: "spell-scroll", side: "buy", qty: 1, price: 1 });
    expect(extra.status).toBe(400);

    const stranger = agent();
    await stranger.post("/api/session").set("Origin", ORIGIN).send({}).expect(200);
    await stranger.get(`/api/lives/${life.id}`).expect(404);

    const row = await t.prisma.client.life.findUniqueOrThrow({ where: { id: life.id } });
    expect((row.state as unknown as GameState).region.strain).toBe(0);
  });
});
