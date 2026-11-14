// Stage 06.2: player-to-player market — account gate, atomic settlement,
// idempotency, ledger, restore guard and succession cleanup.
import { randomUUID } from "node:crypto";
import { goodsOf } from "@endemion/game-core";
import type { LifeView } from "@endemion/shared";
import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { createTestApp, ORIGIN, resetDatabase, type TestApp } from "./helpers.js";

const PASSWORD = "correct-horse-battery";
const GOOD = goodsOf("hunter")[0]!;
const DEATH_SEED = "e2e-legacy-hunter-244";

let t: TestApp;

function agent() {
  return request.agent(t.app.getHttpServer());
}
type Agent = ReturnType<typeof agent>;

const post = (client: Agent, path: string, body: unknown = {}) =>
  client.post(path).set("Origin", ORIGIN).send(body as object);

async function account(client: Agent, email: string): Promise<string> {
  const res = await post(client, "/api/auth/register", { email, password: PASSWORD }).expect(201);
  return (res.body as { player: { id: string } }).player.id;
}

async function life(client: Agent, universeId = "hunter", seed = `market-${randomUUID()}`): Promise<LifeView> {
  const res = await post(client, "/api/lives", { universeId, seed }).expect(201);
  return (res.body as { life: LifeView }).life;
}

/** Makes a fresh life a solvent adult holding a known stock of the market good. */
async function prepare(lifeId: string, options: { stock: number; wealth: number }): Promise<{ id: string; version: number }> {
  const row = await t.prisma.client.life.findUniqueOrThrow({ where: { id: lifeId } });
  const state = structuredClone(row.state) as {
    life: { age: number; stage: string; alive: boolean; deathAge: number | null; deathCause: null };
    character: { wealth: number };
    economy: { goods: Record<string, number> };
    pending: null;
  };
  state.life.age = 30;
  state.life.stage = "adult";
  state.life.alive = true;
  state.life.deathAge = null;
  state.life.deathCause = null;
  state.pending = null;
  state.character.wealth = options.wealth;
  state.economy.goods = options.stock > 0 ? { [GOOD.id]: options.stock } : {};
  await t.prisma.client.life.update({
    where: { id: lifeId },
    data: { state, age: 30 }
  });
  const opened = await t.prisma.client.life.findUniqueOrThrow({ where: { id: lifeId } });
  return { ...(opened as unknown as LifeView) };
}

function offerBody(lifeView: { id: string; version: number }, overrides: Partial<Record<string, unknown>> = {}) {
  return {
    actionId: randomUUID(),
    lifeId: lifeView.id,
    goodId: GOOD.id,
    qty: 2,
    unitPrice: 50,
    expectedVersion: lifeView.version,
    ...overrides
  };
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

describe("Stage 06.2: рынок игроков", () => {
  it("гость не может выставить или купить товар", async () => {
    const guest = agent();
    await guest.post("/api/session").set("Origin", ORIGIN).send({}).expect(200);
    const created = await life(guest);
    const denied = await post(guest, "/api/market/offers", offerBody(created)).expect(403);
    expect(denied.body.error.code).toBe("ACCOUNT_REQUIRED");
  });

  it("публичная витрина показывает предложение, а покупка атомарно меняет оба состояния", async () => {
    const seller = agent();
    const buyer = agent();
    await account(seller, "seller@example.com");
    await account(buyer, "buyer@example.com");
    const sellerLife = await prepare((await life(seller)).id, { stock: 5, wealth: 100 });
    const buyerLife = await prepare((await life(buyer)).id, { stock: 0, wealth: 1_000 });

    const made = await post(seller, "/api/market/offers", offerBody(sellerLife)).expect(201);
    expect(made.body.offer).toMatchObject({ goodId: GOOD.id, qty: 2, unitPrice: 50, total: 100, mine: true });
    const offerId = (made.body.offer as { id: string }).id;

    const board = await request(t.app.getHttpServer()).get("/api/market?universeId=hunter").expect(200);
    expect((board.body.offers as unknown[]).length).toBe(1);

    const bought = await post(buyer, `/api/market/offers/${offerId}/buy`, {
      actionId: randomUUID(),
      buyerLifeId: buyerLife.id,
      expectedVersion: buyerLife.version
    }).expect(200);
    expect(bought.body.life.character.wealth).toBe(900);
    expect((bought.body.life.market.goods as Array<{ id: string; stock: number }>).find((g) => g.id === GOOD.id)?.stock).toBe(2);
    expect(bought.body.trade).toMatchObject({ qty: 2, unitPrice: 50, total: 100 });

    const sellerState = await t.prisma.client.life.findUniqueOrThrow({ where: { id: sellerLife.id } });
    const sellerSave = sellerState.state as { character: { wealth: number }; economy: { goods: Record<string, number> } };
    expect(sellerSave.character.wealth).toBe(200);
    expect(sellerSave.economy.goods[GOOD.id]).toBe(3);
    expect(sellerState.version).toBe(sellerLife.version + 1);

    const offer = await t.prisma.client.marketOffer.findUniqueOrThrow({ where: { id: offerId } });
    expect(offer.status).toBe("sold");
    expect(await t.prisma.client.marketTrade.count()).toBe(1);
    expect(await t.prisma.client.marketLedger.count()).toBe(4);
    const history = await t.prisma.client.historyEntry.findMany({
      where: { lifeId: { in: [sellerLife.id, buyerLife.id] }, kind: "market" }
    });
    expect(history).toHaveLength(2);
  });

  it("повторная покупка с тем же actionId не создаёт вторую сделку", async () => {
    const seller = agent();
    const buyer = agent();
    await account(seller, "idem-seller@example.com");
    await account(buyer, "idem-buyer@example.com");
    const sellerLife = await prepare((await life(seller)).id, { stock: 5, wealth: 100 });
    const buyerLife = await prepare((await life(buyer)).id, { stock: 0, wealth: 1_000 });
    const offer = (await post(seller, "/api/market/offers", offerBody(sellerLife)).expect(201)).body.offer as { id: string };
    const actionId = randomUUID();
    const body = { actionId, buyerLifeId: buyerLife.id, expectedVersion: buyerLife.version };

    await post(buyer, `/api/market/offers/${offer.id}/buy`, body).expect(200);
    const replay = await post(buyer, `/api/market/offers/${offer.id}/buy`, body).expect(200);
    expect(replay.body.replayed).toBe(true);
    expect(await t.prisma.client.marketTrade.count()).toBe(1);
    expect(await t.prisma.client.marketLedger.count()).toBe(4);
    expect(await t.prisma.client.marketOffer.findUniqueOrThrow({ where: { id: offer.id } })).toMatchObject({ status: "sold" });
  });

  it("нельзя купить собственное предложение и нельзя продать больше запаса", async () => {
    const seller = agent();
    await account(seller, "self@example.com");
    const sellerLife = await prepare((await life(seller)).id, { stock: 1, wealth: 100 });

    const tooMany = await post(seller, "/api/market/offers", offerBody(sellerLife, { qty: 2 })).expect(409);
    expect(tooMany.body.error.code).toBe("INSUFFICIENT_GOODS");

    const offer = (await post(seller, "/api/market/offers", offerBody(sellerLife, { qty: 1 })).expect(201)).body.offer as { id: string };
    const self = await post(seller, `/api/market/offers/${offer.id}/buy`, {
      actionId: randomUUID(),
      buyerLifeId: sellerLife.id,
      expectedVersion: sellerLife.version
    }).expect(409);
    expect(self.body.error.code).toBe("SELF_TRADE");
  });

  it("откат жизни до завершённой сделки запрещён", async () => {
    const seller = agent();
    const buyer = agent();
    await account(seller, "restore-seller@example.com");
    await account(buyer, "restore-buyer@example.com");
    const sellerLife = await prepare((await life(seller)).id, { stock: 5, wealth: 100 });
    const buyerLife = await prepare((await life(buyer)).id, { stock: 0, wealth: 1_000 });
    const snapshot = buyerLife.version;

    const offer = (await post(seller, "/api/market/offers", offerBody(sellerLife)).expect(201)).body.offer as { id: string };
    await post(buyer, `/api/market/offers/${offer.id}/buy`, {
      actionId: randomUUID(),
      buyerLifeId: buyerLife.id,
      expectedVersion: buyerLife.version
    }).expect(200);

    const blocked = await post(buyer, `/api/lives/${buyerLife.id}/restore`, {
      version: snapshot,
      expectedVersion: snapshot + 1
    }).expect(409);
    expect(blocked.body.error.code).toBe("MARKET_RESTORE_BLOCKED");
    const row = await t.prisma.client.life.findUniqueOrThrow({ where: { id: buyerLife.id } });
    expect(row.version).toBe(snapshot + 1);
  });

  it("смерть продавца закрывает его активные предложения до вступления наследника", async () => {
    const seller = agent();
    await account(seller, "succession-seller@example.com");
    const created = await life(seller, "hunter", DEATH_SEED);
    let current = created;
    const step = async () => {
      const action = current.pendingEvent
        ? { type: "choose" as const, choiceId: current.pendingEvent.choices.find((choice) => choice.available)!.id }
        : { type: "advance" as const, years: 1 };
      const res = await post(seller, `/api/lives/${current.id}/actions`, {
        actionId: randomUUID(),
        expectedVersion: current.version,
        action
      }).expect(200);
      current = (res.body as { life: LifeView }).life;
    };
    for (let i = 0; i < 40 && current.status === "alive" && current.life.age < 18; i++) await step();

    const row = await t.prisma.client.life.findUniqueOrThrow({ where: { id: current.id } });
    const state = structuredClone(row.state) as {
      character: { wealth: number };
      economy: { goods: Record<string, number> };
    };
    state.character.wealth = Math.max(100, state.character.wealth);
    state.economy.goods = { [GOOD.id]: 5 };
    await t.prisma.client.life.update({ where: { id: current.id }, data: { state } });

    const offer = (await post(seller, "/api/market/offers", offerBody(current, { qty: 1 })).expect(201)).body.offer as { id: string };
    for (let i = 0; i < 260 && current.status === "alive"; i++) await step();
    expect(current.status).toBe("dead");
    const heir = current.legacy.summary!.heirs.find((candidate) => candidate.available);
    expect(heir).toBeTruthy();

    await post(seller, `/api/lives/${current.id}/succession`, {
      actionId: randomUUID(),
      expectedVersion: current.version,
      heirId: heir!.id
    }).expect(200);
    const closed = await t.prisma.client.marketOffer.findUniqueOrThrow({ where: { id: offer.id } });
    expect(closed.status).toBe("cancelled");
  });

  it("продавец может снять своё предложение, чужое снять нельзя", async () => {
    const seller = agent();
    const stranger = agent();
    await account(seller, "cancel-seller@example.com");
    await account(stranger, "cancel-stranger@example.com");
    const sellerLife = await prepare((await life(seller)).id, { stock: 5, wealth: 100 });
    await prepare((await life(stranger)).id, { stock: 0, wealth: 100 });
    const offer = (await post(seller, "/api/market/offers", offerBody(sellerLife)).expect(201)).body.offer as { id: string };

    const foreign = await stranger.delete(`/api/market/offers/${offer.id}`).set("Origin", ORIGIN).send({ expectedVersion: 1 }).expect(403);
    expect(foreign.body.error.code).toBe("FORBIDDEN");

    const cancelled = await seller.delete(`/api/market/offers/${offer.id}`).set("Origin", ORIGIN).send({ expectedVersion: sellerLife.version }).expect(200);
    expect(cancelled.body.offer.status).toBe("cancelled");
    const board = await request(t.app.getHttpServer()).get("/api/market?universeId=hunter").expect(200);
    expect((board.body.offers as unknown[]).length).toBe(0);
  });
});
