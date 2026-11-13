// Stage 02.4 через API: дорога считает сервер, а повтор actionId не списывает золото второй раз.
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

async function createLife(client: Agent, body: Record<string, unknown>): Promise<LifeView> {
  const res = await client.post("/api/lives").set("Origin", ORIGIN).send(body).expect(201);
  return (res.body as { life: LifeView }).life;
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

describe("Stage 02.4: дорога", () => {
  it("переезд меняет поселение и списывает цену; повтор с тем же actionId не списывает её снова", async () => {
    const client = agent();
    const life = await createLife(client, { universeId: "dark-fantasy", originId: "fallen-noble", seed: "api-stage02-travel" });
    expect(life.location.settlementId).toBe("ash-capital");
    const destination = life.location.destinations.find((item) => !item.current && item.affordable);
    expect(destination, "нужно доступное второе поселение").toBeDefined();

    const actionId = randomUUID();
    const payload = { actionId, expectedVersion: life.version, action: { type: "travel", settlementId: destination!.id } };
    const first = await client.post(`/api/lives/${life.id}/actions`).set("Origin", ORIGIN).send(payload).expect(200);
    const moved = first.body as ActionResponse;
    expect(moved.replayed).toBe(false);
    expect(moved.life.location.settlementId).toBe(destination!.id);
    expect(moved.life.character.wealth).toBe(life.character.wealth - destination!.cost);
    expect(moved.entries[0]?.kind).toBe("travel");
    expect(moved.entries[0]?.changes.some((change) => change.kind === "location")).toBe(true);

    const replay = await client.post(`/api/lives/${life.id}/actions`).set("Origin", ORIGIN).send(payload).expect(200);
    const again = replay.body as ActionResponse;
    expect(again.replayed).toBe(true);
    expect(again.life.location.settlementId).toBe(destination!.id);
    expect(again.life.character.wealth).toBe(moved.life.character.wealth);
    expect(again.entries).toEqual(moved.entries);
  });

  it("параллельный повтор того же actionId списывает золото один раз", async () => {
    const client = agent();
    const life = await createLife(client, { universeId: "academy", originId: "duke-heir", seed: "api-stage02-travel-race" });
    const destination = life.location.destinations.find((item) => !item.current && item.affordable);
    expect(destination, "нужно доступное второе поселение").toBeDefined();
    const payload = { actionId: randomUUID(), expectedVersion: life.version, action: { type: "travel", settlementId: destination!.id } };
    const send = () => client.post(`/api/lives/${life.id}/actions`).set("Origin", ORIGIN).send(payload);
    const [a, b] = await Promise.all([send(), send()]);
    expect([a.status, b.status]).toEqual([200, 200]);
    const bodies = [a.body as ActionResponse, b.body as ActionResponse];
    expect(bodies.filter((body) => body.replayed)).toHaveLength(1);
    for (const body of bodies) {
      expect(body.life.location.settlementId).toBe(destination!.id);
      expect(body.life.character.wealth).toBe(life.character.wealth - destination!.cost);
    }
  });

  it("чужое поселение отклоняется, состояние не меняется", async () => {
    const client = agent();
    const life = await createLife(client, { universeId: "murim", originId: "clan-heir", seed: "api-stage02-travel-bad" });
    const res = await client
      .post(`/api/lives/${life.id}/actions`)
      .set("Origin", ORIGIN)
      .send({ actionId: randomUUID(), expectedVersion: life.version, action: { type: "travel", settlementId: "ash-capital" } });
    expect(res.status).toBe(400);
    const fresh = await client.get(`/api/lives/${life.id}`).expect(200);
    expect((fresh.body as { life: LifeView }).life.location.settlementId).toBe(life.location.settlementId);
    expect((fresh.body as { life: LifeView }).life.character.wealth).toBe(life.character.wealth);
  });
});
