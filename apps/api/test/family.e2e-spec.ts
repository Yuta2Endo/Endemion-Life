import { randomUUID } from "node:crypto";
import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { createTestApp, ORIGIN, resetDatabase, type TestApp } from "./helpers.js";

let t: TestApp;
const PASSWORD = "correct-horse-battery";

const agent = () => request.agent(t.app.getHttpServer());
type Agent = ReturnType<typeof agent>;

const post = (client: Agent, path: string, body: unknown = {}) =>
  client.post(path).set("Origin", ORIGIN).send(body as object);

const patch = (client: Agent, path: string, body: unknown) =>
  client.patch(path).set("Origin", ORIGIN).send(body as object);

beforeAll(async () => {
  t = await createTestApp();
});

beforeEach(async () => {
  await resetDatabase(t.prisma);
  t.mail.outbox.length = 0;
});

afterAll(async () => {
  await t?.app.close();
});

async function account(name: string): Promise<{ client: Agent; playerId: string; name: string }> {
  const client = agent();
  const registered = await post(client, "/api/auth/register", {
    email: `family-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.com`,
    password: PASSWORD
  }).expect(201);
  const playerId = registered.body.player.id as string;
  await t.prisma.client.player.update({
    where: { id: playerId },
    data: { idDisplayName: name, idUsername: name.toLowerCase() }
  });
  return { client, playerId, name };
}

async function createFamily(client: Agent, name = "Дом Пепельной Ветви") {
  const res = await post(client, "/api/families", {
    universeId: "dark-fantasy",
    name,
    motto: "Помним тех, кто шёл до нас",
    description: "Семья хранителей пути.",
    visibility: "invite"
  }).expect(201);
  return res.body as {
    id: string;
    name: string;
    universeId: string;
    memberCount: number;
    myRole: string;
    members: Array<{ playerId: string; name: string; role: string }>;
    invites: Array<{ id: string; playerId: string; name: string }>;
  };
}

describe("семьи игроков", () => {
  it("гость не может создавать или читать семьи", async () => {
    const guest = agent();
    await post(guest, "/api/lives", { universeId: "hunter", seed: "family-guest" }).expect(201);
    await guest.get("/api/families").expect(403);
    await post(guest, "/api/families", { universeId: "hunter", name: "Гости" }).expect(403);
  });

  it("создаёт семью, запрещает дубликат имени и вторую семью в том же мире", async () => {
    const founder = await account("Илэн");
    const family = await createFamily(founder.client);
    expect(family.name).toBe("Дом Пепельной Ветви");
    expect(family.memberCount).toBe(1);
    expect(family.myRole).toBe("leader");

    const list = await founder.client.get("/api/families?universeId=dark-fantasy").expect(200);
    expect(list.body.families[0]).toMatchObject({ id: family.id, myRole: "leader", memberCount: 1 });

    const other = await account("Рэйна");
    const taken = await post(other.client, "/api/families", {
      universeId: "dark-fantasy",
      name: "дом пепельной ветви"
    }).expect(409);
    expect(taken.body.error.code).toBe("FAMILY_NAME_TAKEN");

    const again = await post(founder.client, "/api/families", {
      universeId: "dark-fantasy",
      name: "Вторая семья"
    }).expect(409);
    expect(again.body.error.code).toBe("FAMILY_ALREADY_MEMBER");
  });

  it("приглашает только с согласия, проверяет лимит и запрещает повторное вступление", async () => {
    const founder = await account("Илэн");
    const friend = await account("Рэйна");
    const family = await createFamily(founder.client);

    const invited = await post(founder.client, `/api/families/${family.id}/invites`, { playerId: friend.playerId }).expect(201);
    expect(invited.body.invites[0]).toMatchObject({ playerId: friend.playerId, name: "Рэйна" });

    const incoming = await friend.client.get("/api/families/invites").expect(200);
    expect(incoming.body.invites[0]).toMatchObject({ familyId: family.id, familyName: family.name, inviterName: "Илэн" });
    const inviteId = incoming.body.invites[0].id as string;

    const accepted = await post(friend.client, `/api/families/invites/${inviteId}/accept`).expect(200);
    expect(accepted.body.memberCount).toBe(2);
    expect(accepted.body.myRole).toBe("member");

    const again = await post(friend.client, `/api/families/invites/${inviteId}/accept`).expect(409);
    expect(again.body.error.code).toBe("FAMILY_INVITE_INVALID");

    const inviteAgain = await post(founder.client, `/api/families/${family.id}/invites`, { playerId: friend.playerId }).expect(409);
    expect(inviteAgain.body.error.code).toBe("FAMILY_ALREADY_MEMBER");
  });

  it("участник не может управлять семьёй; глава передаёт главенство", async () => {
    const founder = await account("Илэн");
    const friend = await account("Рэйна");
    const family = await createFamily(founder.client);
    await post(founder.client, `/api/families/${family.id}/invites`, { playerId: friend.playerId }).expect(201);
    const inviteId = (await friend.client.get("/api/families/invites").expect(200)).body.invites[0].id as string;
    await post(friend.client, `/api/families/invites/${inviteId}/accept`).expect(200);

    const forbidden = await patch(friend.client, `/api/families/${family.id}`, {
      name: "Захват",
      motto: "",
      description: "",
      visibility: "public"
    }).expect(403);
    expect(forbidden.body.error.code).toBe("FORBIDDEN");

    const transferred = await post(founder.client, `/api/families/${family.id}/transfer`, { playerId: friend.playerId }).expect(200);
    expect(transferred.body.leaderId).toBe(friend.playerId);
    expect(transferred.body.members.find((m: { playerId: string }) => m.playerId === founder.playerId).role).toBe("elder");
    expect(transferred.body.members.find((m: { playerId: string }) => m.playerId === friend.playerId).role).toBe("leader");

    const updated = await patch(friend.client, `/api/families/${family.id}`, {
      name: "Дом Рэйны",
      motto: "Новый путь",
      description: "Обновлённая семья.",
      visibility: "public"
    }).expect(200);
    expect(updated.body.name).toBe("Дом Рэйны");
  });

  it("глава не может уйти один; участник выходит; глава распускает семью", async () => {
    const founder = await account("Илэн");
    const friend = await account("Рэйна");
    const family = await createFamily(founder.client);
    await post(founder.client, `/api/families/${family.id}/invites`, { playerId: friend.playerId }).expect(201);
    const inviteId = (await friend.client.get("/api/families/invites").expect(200)).body.invites[0].id as string;
    await post(friend.client, `/api/families/invites/${inviteId}/accept`).expect(200);

    const blocked = await post(founder.client, `/api/families/${family.id}/leave`).expect(409);
    expect(blocked.body.error.code).toBe("FAMILY_LEADER_TRANSFER");

    await post(friend.client, `/api/families/${family.id}/leave`).expect(200);
    await post(founder.client, `/api/families/${family.id}/disband`).expect(200);
    await founder.client.get(`/api/families/${family.id}`).expect(404);
  });

  it("аудит доступен главе и отражает приглашение и вступление", async () => {
    const founder = await account("Илэн");
    const friend = await account("Рэйна");
    const family = await createFamily(founder.client);
    await post(founder.client, `/api/families/${family.id}/invites`, { playerId: friend.playerId }).expect(201);
    const inviteId = (await friend.client.get("/api/families/invites").expect(200)).body.invites[0].id as string;
    await post(friend.client, `/api/families/invites/${inviteId}/accept`).expect(200);

    const audit = await founder.client.get(`/api/families/${family.id}/audit`).expect(200);
    const actions = audit.body.entries.map((entry: { action: string }) => entry.action);
    expect(actions).toContain("family.create");
    expect(actions).toContain("invite.send");
    expect(actions).toContain("invite.accept");

    const chronicle = await founder.client.get(`/api/families/${family.id}/chronicle`).expect(200);
    expect(chronicle.body.entries.some((entry: { kind: string }) => entry.kind === "family.create")).toBe(true);
    expect(chronicle.body.entries.some((entry: { kind: string }) => entry.kind === "invite.accept")).toBe(true);
  });

  it("член семьи даёт согласие на наследование и пополняет общую казну из жизни", async () => {
    const founder = await account("Основатель");
    const friend = await account("Наследник");
    const family = await createFamily(founder.client);
    await post(founder.client, `/api/families/${family.id}/invites`, { playerId: friend.playerId }).expect(201);
    const inviteId = (await friend.client.get("/api/families/invites").expect(200)).body.invites[0].id as string;
    await post(friend.client, `/api/families/invites/${inviteId}/accept`).expect(200);

    const consent = await post(friend.client, `/api/families/${family.id}/consent`, { accepts: true }).expect(200);
    expect(consent.body.members.find((m: { playerId: string }) => m.playerId === friend.playerId).acceptsInheritance).toBe(true);

    const life = (await post(friend.client, "/api/lives", { universeId: "dark-fantasy", seed: "family-treasury-life" }).expect(201)).body.life;
    const stored = await t.prisma.client.life.findUniqueOrThrow({ where: { id: life.id } });
    const state = stored.state as { character: { wealth: number } };
    state.character.wealth = 100;
    await t.prisma.client.life.update({ where: { id: life.id }, data: { state } });
    const before = 100;
    const deposited = await post(friend.client, `/api/families/${family.id}/treasury`, {
      actionId: randomUUID(),
      lifeId: life.id,
      direction: "deposit",
      amount: 10,
      note: "Вклад в дом"
    }).expect(200);
    expect(deposited.body.treasury).toBe(10);
    expect(deposited.body.treasuryEntries[0]).toMatchObject({ direction: "deposit", amount: 10, balanceAfter: 10 });

    const updatedLife = await friend.client.get(`/api/lives/${life.id}`).expect(200);
    expect(updatedLife.body.life.character.wealth).toBe(before - 10);
  });

  it("передаёт наследника другому аккаунту только с согласием семьи", async () => {
    const founder = await account("Основатель");
    const friend = await account("Наследник");
    const family = (await post(founder.client, "/api/families", {
      universeId: "hunter",
      name: "Дом Наследников",
      visibility: "invite"
    }).expect(201)).body as { id: string };
    await post(founder.client, `/api/families/${family.id}/invites`, { playerId: friend.playerId }).expect(201);
    const inviteId = (await friend.client.get("/api/families/invites").expect(200)).body.invites[0].id as string;
    await post(friend.client, `/api/families/invites/${inviteId}/accept`).expect(200);
    await post(friend.client, `/api/families/${family.id}/consent`, { accepts: true }).expect(200);

    let dead = (await post(founder.client, "/api/lives", { universeId: "hunter", seed: "e2e-legacy-hunter-244" }).expect(201)).body.life;
    for (let i = 0; i < 200 && dead.status === "alive"; i++) {
      const action = dead.pendingEvent
        ? { type: "choose", choiceId: dead.pendingEvent.choices.find((choice: { available: boolean }) => choice.available).id }
        : { type: "advance", years: 10 };
      dead = (await post(founder.client, `/api/lives/${dead.id}/actions`, {
        actionId: randomUUID(),
        expectedVersion: dead.version,
        action
      }).expect(200)).body.life;
    }
    expect(dead.status).toBe("dead");
    const heir = dead.legacy.summary.heirs.find((candidate: { available: boolean }) => candidate.available);
    expect(heir).toBeTruthy();

    const result = await post(founder.client, `/api/lives/${dead.id}/succession`, {
      actionId: randomUUID(),
      expectedVersion: dead.version,
      heirId: heir.id,
      recipientPlayerId: friend.playerId
    }).expect(200);
    expect(result.body.life.id).toBeTruthy();

    const successor = await t.prisma.client.life.findUniqueOrThrow({ where: { predecessorId: dead.id } });
    expect(successor.playerId).toBe(friend.playerId);
    const friendLives = await friend.client.get("/api/lives").expect(200);
    expect(friendLives.body.lives.map((life: { id: string }) => life.id)).toContain(successor.id);
  });
});
