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

async function setup() {
  const client = agent();
  const registered = await post(client, "/api/auth/register", {
    email: `profile-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.com`,
    password: PASSWORD
  }).expect(201);
  const playerId = registered.body.player.id as string;
  await post(client, "/api/lives", { universeId: "hunter", seed: "profile-life" }).expect(201);
  return { client, playerId };
}

describe("player profile", () => {
  it("гость не получает личный профиль, но публичный профиль не раскрывает email", async () => {
    const guest = agent();
    await post(guest, "/api/lives", { universeId: "hunter", seed: "guest-profile" }).expect(201);
    const denied = await guest.get("/api/profile/me").expect(403);
    expect(denied.body.error.code).toBe("ACCOUNT_REQUIRED");

    const { playerId } = await setup();
    const anonymous = request(t.app.getHttpServer());
    const publicProfile = await anonymous.get(`/api/profile/${playerId}`).expect(200);
    expect(publicProfile.body.profile.access).toBe("public");
    expect(publicProfile.body.profile.account).toBeNull();
    expect(publicProfile.body.profile.identity.name).toBeTruthy();
    expect(publicProfile.body.profile.stats.lives).toBe(1);
    expect(publicProfile.body.profile.badges.some((badge: { id: string; earned: boolean }) => badge.id === "first-life" && badge.earned)).toBe(true);
  });

  it("владелец редактирует профиль и сохраняет приватность", async () => {
    const { client, playerId } = await setup();
    const me = await client.get("/api/profile/me").expect(200);
    expect(me.body.profile.isOwner).toBe(true);
    expect(me.body.profile.account.email).toContain("@example.com");

    const updated = await patch(client, "/api/profile/me", {
      headline: "Хранитель Пепельного пути",
      bio: "Веду род через туман и пламя.",
      favoriteUniverseId: "dark-fantasy",
      visibility: "private"
    }).expect(200);
    expect(updated.body.profile.identity.headline).toBe("Хранитель Пепельного пути");
    expect(updated.body.profile.identity.visibility).toBe("private");

    const anonymous = request(t.app.getHttpServer());
    const hidden = await anonymous.get(`/api/profile/${playerId}`).expect(200);
    expect(hidden.body.profile.access).toBe("private");
    expect(hidden.body.profile.stats).toBeNull();
    expect(hidden.body.profile.account).toBeNull();
    expect(hidden.body.profile.identity.bio).toBe("");

    await patch(client, "/api/profile/me", {
      headline: "",
      bio: "",
      favoriteUniverseId: "xianxia",
      visibility: "public"
    }).expect(200);
    const visible = await anonymous.get(`/api/profile/${playerId}`).expect(200);
    expect(visible.body.profile.access).toBe("public");
    expect(visible.body.profile.identity.favoriteUniverseId).toBe("xianxia");
  });

  it("отклоняет неизвестный мир и слишком длинную строку", async () => {
    const { client } = await setup();
    const badWorld = await patch(client, "/api/profile/me", {
      headline: "",
      bio: "",
      favoriteUniverseId: "not-a-world",
      visibility: "public"
    }).expect(400);
    expect(badWorld.body.error.code).toBe("VALIDATION");

    const badBio = await patch(client, "/api/profile/me", {
      headline: "",
      bio: "x".repeat(281),
      favoriteUniverseId: null,
      visibility: "public"
    }).expect(400);
    expect(badBio.body.error.code).toBe("VALIDATION");
  });

  it("доступ «только друзья» открывается принятой связью и закрывается блокировкой", async () => {
    const { client, playerId } = await setup();
    const friend = agent();
    const registered = await post(friend, "/api/auth/register", {
      email: `profile-friend-${Date.now()}@example.com`,
      password: PASSWORD
    }).expect(201);
    const friendId = registered.body.player.id as string;
    const playerAId = playerId < friendId ? playerId : friendId;
    const playerBId = playerId < friendId ? friendId : playerId;

    await t.prisma.client.tie.create({
      data: { playerAId, playerBId, status: "accepted", askedById: playerId }
    });
    await patch(client, "/api/profile/me", {
      headline: "",
      bio: "",
      favoriteUniverseId: null,
      visibility: "friends"
    }).expect(200);

    const asFriend = await friend.get(`/api/profile/${playerId}`).expect(200);
    expect(asFriend.body.profile.access).toBe("friends");
    expect(asFriend.body.profile.stats.lives).toBe(1);

    const anonymous = request(t.app.getHttpServer());
    const asStranger = await anonymous.get(`/api/profile/${playerId}`).expect(200);
    expect(asStranger.body.profile.access).toBe("private");
    expect(asStranger.body.profile.stats).toBeNull();

    await t.prisma.client.tie.update({
      where: { playerAId_playerBId: { playerAId, playerBId } },
      data: { status: "blocked", askedById: playerId }
    });
    const blocked = await friend.get(`/api/profile/${playerId}`).expect(200);
    expect(blocked.body.profile.access).toBe("private");
  });

  it("несуществующий профиль возвращает 404", async () => {
    await request(t.app.getHttpServer()).get("/api/profile/00000000-0000-4000-8000-000000000000").expect(404);
  });
});
