import { randomUUID } from "node:crypto";
import type { ActionResponse, LifeView } from "@endemion/shared";
import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { createTestApp, lastCode, lastResetToken, ORIGIN, resetDatabase, sessionCookieLine, sessionCookieOf, type TestApp } from "./helpers.js";

let t: TestApp;
const PASSWORD = "correct-horse-battery";

function agent() {
  return request.agent(t.app.getHttpServer());
}
type Agent = ReturnType<typeof agent>;

const post = (client: Agent, path: string, body: unknown = {}) => client.post(path).set("Origin", ORIGIN).send(body as object);

/** Запрос с явно заданной cookie сессии (без памяти агента): так проверяется, что старый токен больше не работает */
const withCookie = (token: string) => ({
  get: (path: string) => request(t.app.getHttpServer()).get(path).set("Cookie", `el_session=${token}`),
  post: (path: string, body: unknown = {}) =>
    request(t.app.getHttpServer()).post(path).set("Origin", ORIGIN).set("Cookie", `el_session=${token}`).send(body as object)
});

async function createLife(client: Agent, universeId = "hunter"): Promise<LifeView> {
  const res = await post(client, "/api/lives", { universeId, seed: `auth-${randomUUID()}` }).expect(201);
  return (res.body as { life: LifeView }).life;
}

async function advance(client: Agent, life: LifeView, times: number): Promise<LifeView> {
  let current = life;
  for (let i = 0; i < times; i++) {
    const action = current.pendingEvent
      ? { type: "choose", choiceId: current.pendingEvent.choices.find((c) => c.available)!.id }
      : { type: "advance" };
    const res = await post(client, `/api/lives/${current.id}/actions`, { actionId: randomUUID(), expectedVersion: current.version, action }).expect(200);
    current = (res.body as ActionResponse).life;
  }
  return current;
}

/** Возвращает сам запрос supertest (не Promise): к нему можно дописать .expect(статус) */
function register(client: Agent, email: string, password = PASSWORD) {
  return post(client, "/api/auth/register", { email, password });
}

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

describe("регистрация", () => {
  it("создаёт аккаунт, ставит HttpOnly cookie и отправляет код; пароль не хранится в открытом виде", async () => {
    const client = agent();
    const res = await register(client, "Hero@Example.com").expect(201);
    expect(res.body.account).toMatchObject({ email: "hero@example.com", emailVerified: false });
    expect(res.body.verificationSent).toBe(true);
    const cookie = sessionCookieLine(res)!;
    expect(cookie).toContain("HttpOnly");
    expect(cookie).toContain("SameSite=Lax");
    expect(lastCode(t.mail, "hero@example.com")).toMatch(/^\d{6}$/);

    const stored = await t.prisma.client.account.findUniqueOrThrow({ where: { email: "hero@example.com" } });
    expect(stored.passwordHash).toMatch(/^scrypt\$/);
    expect(stored.passwordHash).not.toContain(PASSWORD);
    // Код в базе — только хеш
    const tokens = await t.prisma.client.authToken.findMany({ where: { accountId: stored.id } });
    expect(tokens.every((token) => !token.tokenHash.includes(lastCode(t.mail, "hero@example.com")))).toBe(true);

    const me = await client.get("/api/auth/me").expect(200);
    expect(me.body.account.email).toBe("hero@example.com");
  });

  it("гость регистрируется: жизни остаются, а старый токен гостя перестаёт действовать", async () => {
    const client = agent();
    const created = await post(client, "/api/lives", { universeId: "hunter", seed: "guest-register" }).expect(201);
    const guestToken = sessionCookieOf(created)!;
    expect(guestToken).toBeTruthy();
    const life = await advance(client, (created.body as { life: LifeView }).life, 3);

    const res = await register(client, "guest@example.com").expect(201);
    const accountToken = sessionCookieOf(res)!;
    expect(accountToken).toBeTruthy();
    expect(accountToken).not.toBe(guestToken);

    const lives = await client.get("/api/lives").expect(200);
    expect(lives.body.lives.map((l: { id: string }) => l.id)).toEqual([life.id]);
    const restored = await client.get(`/api/lives/${life.id}`).expect(200);
    expect(restored.body.life.version).toBe(life.version);
    await withCookie(guestToken).get(`/api/lives/${life.id}`).expect(401);
  });

  it("адрес занят (без учёта регистра) — 409; повторная регистрация из аккаунта — 409", async () => {
    await register(agent(), "taken@example.com").expect(201);
    const res = await register(agent(), "TAKEN@example.com").expect(409);
    expect(res.body.error.code).toBe("EMAIL_TAKEN");

    const signedIn = agent();
    await register(signedIn, "first@example.com").expect(201);
    const again = await register(signedIn, "second@example.com").expect(409);
    expect(again.body.error.code).toBe("ALREADY_SIGNED_IN");
  });

  it("слабый пароль и лишние поля отклоняются", async () => {
    await register(agent(), "weak@example.com", "short").expect(400);
    await post(agent(), "/api/auth/register", { email: "x@example.com", password: PASSWORD, emailVerified: true }).expect(400);
  });
});

describe("подтверждение почты", () => {
  it("верный код подтверждает адрес; неверный — нет", async () => {
    const client = agent();
    await register(client, "verify@example.com").expect(201);
    const wrong = await post(client, "/api/auth/verify-email", { code: "000000" === lastCode(t.mail, "verify@example.com") ? "111111" : "000000" }).expect(400);
    expect(wrong.body.error.code).toBe("INVALID_CODE");
    const ok = await post(client, "/api/auth/verify-email", { code: lastCode(t.mail, "verify@example.com") }).expect(200);
    expect(ok.body.account.emailVerified).toBe(true);
  });

  it("перебор кода: после 5 попыток даже верный код не принимается", async () => {
    const client = agent();
    await register(client, "brute@example.com").expect(201);
    const code = lastCode(t.mail, "brute@example.com");
    const wrongCode = code === "999999" ? "999998" : "999999";
    for (let i = 0; i < 5; i++) await post(client, "/api/auth/verify-email", { code: wrongCode }).expect(400);
    const res = await post(client, "/api/auth/verify-email", { code }).expect(400);
    expect(res.body.error.code).toBe("INVALID_CODE");
    const account = await t.prisma.client.account.findUniqueOrThrow({ where: { email: "brute@example.com" } });
    expect(account.emailVerifiedAt).toBeNull();
  });

  it("параллельный перебор не обходит лимит попыток", async () => {
    const client = agent();
    await register(client, "parallel@example.com").expect(201);
    const code = lastCode(t.mail, "parallel@example.com");
    const guesses = Array.from({ length: 20 }, (_, i) => String((Number(code) + 1 + i) % 1_000_000).padStart(6, "0"));
    await Promise.all(guesses.map((guess) => post(client, "/api/auth/verify-email", { code: guess })));
    const token = await t.prisma.client.authToken.findFirstOrThrow({ where: { purpose: "verify_email" }, orderBy: { createdAt: "desc" } });
    expect(token.attempts).toBeLessThanOrEqual(5);
  });

  it("новый код аннулирует старый; чаще раза в минуту код не отправляется", async () => {
    const client = agent();
    await register(client, "resend@example.com").expect(201);
    const first = lastCode(t.mail, "resend@example.com");
    const tooSoon = await post(client, "/api/auth/resend-verification").expect(429);
    expect(tooSoon.body.error.code).toBe("RATE_LIMITED");

    // Сдвигаем время выдачи первого кода, чтобы не ждать минуту
    await t.prisma.client.authToken.updateMany({ data: { createdAt: new Date(Date.now() - 2 * 60 * 1000) } });
    await post(client, "/api/auth/resend-verification").expect(200);
    const second = lastCode(t.mail, "resend@example.com");
    if (first !== second) await post(client, "/api/auth/verify-email", { code: first }).expect(400);
    await post(client, "/api/auth/verify-email", { code: second }).expect(200);
  });

  it("без входа подтверждать нечего — 401", async () => {
    await post(agent(), "/api/auth/verify-email", { code: "123456" }).expect(401);
  });
});

describe("вход и перенос гостевых жизней", () => {
  it("неверный пароль и неизвестный адрес дают одинаковый ответ", async () => {
    await register(agent(), "login@example.com").expect(201);
    const badPassword = await post(agent(), "/api/auth/login", { email: "login@example.com", password: "wrong-password-1" }).expect(401);
    const unknown = await post(agent(), "/api/auth/login", { email: "nobody@example.com", password: "wrong-password-1" }).expect(401);
    expect(badPassword.body).toEqual(unknown.body);
  });

  it("вход переносит жизни гостя вместе с историей и сохранениями; старый токен гостя отзывается", async () => {
    await register(agent(), "owner@example.com").expect(201);
    await post(agent(), "/api/auth/logout").expect(200);

    const guest = agent();
    const life = await advance(guest, await createLife(guest), 4);
    const guestSession = await t.prisma.client.session.findFirstOrThrow({ where: { player: { lives: { some: { id: life.id } } } } });
    const historyBefore = await t.prisma.client.historyEntry.count({ where: { lifeId: life.id } });
    const snapshotsBefore = await t.prisma.client.lifeSnapshot.count({ where: { lifeId: life.id } });
    const actionsBefore = await t.prisma.client.gameAction.count({ where: { lifeId: life.id } });

    const res = await post(guest, "/api/auth/login", { email: "owner@example.com", password: PASSWORD }).expect(200);
    expect(res.body.transferredLives).toBe(1);

    const account = await t.prisma.client.account.findUniqueOrThrow({ where: { email: "owner@example.com" } });
    const moved = await t.prisma.client.life.findUniqueOrThrow({ where: { id: life.id } });
    expect(moved.playerId).toBe(account.playerId);
    expect(moved.version).toBe(life.version);
    expect(await t.prisma.client.historyEntry.count({ where: { lifeId: life.id } })).toBe(historyBefore);
    expect(await t.prisma.client.lifeSnapshot.count({ where: { lifeId: life.id } })).toBe(snapshotsBefore);
    expect(await t.prisma.client.gameAction.count({ where: { lifeId: life.id, playerId: account.playerId } })).toBe(actionsBefore);
    // Сессия гостя удалена вместе с пустым игроком-гостем
    expect(await t.prisma.client.session.findUnique({ where: { id: guestSession.id } })).toBeNull();

    // Игра продолжается в аккаунте, в том числе с другого устройства
    await advance(guest, life, 1);
    const device = agent();
    await post(device, "/api/auth/login", { email: "owner@example.com", password: PASSWORD }).expect(200);
    const list = await device.get("/api/lives").expect(200);
    expect(list.body.lives.map((l: { id: string }) => l.id)).toContain(life.id);
  });

  it("два одновременных входа с одной гостевой cookie переносят жизни один раз", async () => {
    await register(agent(), "race@example.com").expect(201);
    const guest = agent();
    await createLife(guest);
    await createLife(guest, "murim");
    expect(await t.prisma.client.session.count({ where: { player: { account: null } } })).toBe(1);
    const results = await Promise.all([
      post(guest, "/api/auth/login", { email: "race@example.com", password: PASSWORD }),
      post(guest, "/api/auth/login", { email: "race@example.com", password: PASSWORD })
    ]);
    expect(results.every((r) => r.status === 200)).toBe(true);
    const transferred = results.map((r) => r.body.transferredLives as number).reduce((a, b) => a + b, 0);
    expect(transferred).toBe(2);
    const account = await t.prisma.client.account.findUniqueOrThrow({ where: { email: "race@example.com" } });
    expect(await t.prisma.client.life.count({ where: { playerId: account.playerId } })).toBe(2);
    expect(await t.prisma.client.life.count()).toBe(2);
  });

  it("жизни другого аккаунта при входе не переносятся", async () => {
    const alice = agent();
    await register(alice, "alice@example.com").expect(201);
    const aliceLife = await createLife(alice);
    await register(agent(), "bob@example.com").expect(201);

    // В браузере Алисы входят в аккаунт Боба: жизнь Алисы остаётся у Алисы
    const res = await post(alice, "/api/auth/login", { email: "bob@example.com", password: PASSWORD }).expect(200);
    expect(res.body.transferredLives).toBe(0);
    const aliceAccount = await t.prisma.client.account.findUniqueOrThrow({ where: { email: "alice@example.com" } });
    expect((await t.prisma.client.life.findUniqueOrThrow({ where: { id: aliceLife.id } })).playerId).toBe(aliceAccount.playerId);
    await alice.get(`/api/lives/${aliceLife.id}`).expect(404);
  });

  it("чужие жизни недоступны для чтения, действий, истории, сохранений и отката", async () => {
    const owner = agent();
    await register(owner, "private@example.com").expect(201);
    const life = await advance(owner, await createLife(owner), 2);
    const stranger = agent();
    await register(stranger, "stranger@example.com").expect(201);
    await stranger.get(`/api/lives/${life.id}`).expect(404);
    await stranger.get(`/api/lives/${life.id}/history`).expect(404);
    await stranger.get(`/api/lives/${life.id}/saves`).expect(404);
    await post(stranger, `/api/lives/${life.id}/actions`, { actionId: randomUUID(), expectedVersion: life.version, action: { type: "advance" } }).expect(404);
    await post(stranger, `/api/lives/${life.id}/restore`, { version: 1, expectedVersion: life.version }).expect(404);
    expect((await stranger.get("/api/lives").expect(200)).body.lives).toEqual([]);
  });

  it("после 5 неудачных попыток вход блокируется даже с верным паролем", async () => {
    await register(agent(), "lock@example.com").expect(201);
    for (let i = 0; i < 5; i++) await post(agent(), "/api/auth/login", { email: "lock@example.com", password: "wrong-password-x" }).expect(401);
    const res = await post(agent(), "/api/auth/login", { email: "lock@example.com", password: PASSWORD }).expect(429);
    expect(res.body.error.code).toBe("RATE_LIMITED");
  });
});

describe("выход и сессии", () => {
  it("выход отзывает сессию и удаляет cookie; старый токен больше не действует", async () => {
    const client = agent();
    const reg = await register(client, "logout@example.com").expect(201);
    const token = sessionCookieOf(reg)!;
    await withCookie(token).get("/api/auth/sessions").expect(200);
    const res = await post(client, "/api/auth/logout").expect(200);
    expect(sessionCookieLine(res)).toMatch(/el_session=;|Expires=Thu, 01 Jan 1970/);
    await withCookie(token).get("/api/auth/sessions").expect(401);
    const me = await withCookie(token).get("/api/auth/me").expect(200);
    expect(me.body).toEqual({ player: null, account: null });
  });

  it("список устройств, отзыв одного и всех остальных; чужую сессию отозвать нельзя", async () => {
    const laptop = agent();
    await register(laptop, "devices@example.com").expect(201);
    const phone = agent();
    await phone.post("/api/auth/login").set("Origin", ORIGIN).set("User-Agent", "Phone/1.0").send({ email: "devices@example.com", password: PASSWORD }).expect(200);
    const tablet = agent();
    await post(tablet, "/api/auth/login", { email: "devices@example.com", password: PASSWORD }).expect(200);

    const list = await laptop.get("/api/auth/sessions").expect(200);
    expect(list.body.sessions).toHaveLength(3);
    expect(list.body.sessions.filter((s: { current: boolean }) => s.current)).toHaveLength(1);
    expect(list.body.sessions.some((s: { userAgent: string | null }) => s.userAgent === "Phone/1.0")).toBe(true);
    expect(JSON.stringify(list.body)).not.toMatch(/token/i);

    const phoneSession = list.body.sessions.find((s: { userAgent: string | null }) => s.userAgent === "Phone/1.0");
    const outsider = agent();
    await register(outsider, "outsider@example.com").expect(201);
    await post(outsider, "/api/auth/sessions/revoke", { sessionId: phoneSession.id }).expect(404);

    await post(laptop, "/api/auth/sessions/revoke", { sessionId: phoneSession.id }).expect(200);
    await phone.get("/api/auth/sessions").expect(401);

    const others = await post(laptop, "/api/auth/sessions/revoke-others").expect(200);
    expect(others.body.revoked).toBe(1);
    await tablet.get("/api/auth/sessions").expect(401);
    await laptop.get("/api/auth/sessions").expect(200);
  });

  it("гостевая сессия Stage 01 продолжает работать", async () => {
    const guest = agent();
    const life = await createLife(guest);
    await guest.get(`/api/lives/${life.id}`).expect(200);
    const me = await guest.get("/api/auth/me").expect(200);
    expect(me.body.account).toBeNull();
    expect(me.body.player).not.toBeNull();
  });

  it("просроченная сессия не даёт доступа", async () => {
    const client = agent();
    const life = await createLife(client);
    await t.prisma.client.session.updateMany({ data: { expiresAt: new Date(Date.now() - 1000) } });
    await client.get(`/api/lives/${life.id}`).expect(401);
  });
});

describe("восстановление доступа", () => {
  it("ответ одинаковый для любого адреса; письмо уходит только владельцу", async () => {
    await register(agent(), "reset@example.com").expect(201);
    t.mail.outbox.length = 0;
    const known = await post(agent(), "/api/auth/forgot-password", { email: "reset@example.com" }).expect(200);
    const unknown = await post(agent(), "/api/auth/forgot-password", { email: "ghost@example.com" }).expect(200);
    expect(known.body).toEqual(unknown.body);
    expect(t.mail.outbox.map((m) => m.to)).toEqual(["reset@example.com"]);
  });

  it("новый пароль по ссылке: ссылка одноразовая, все сессии завершаются, почта считается подтверждённой", async () => {
    const device = agent();
    await register(device, "reset2@example.com").expect(201);
    await post(agent(), "/api/auth/forgot-password", { email: "reset2@example.com" }).expect(200);
    const token = lastResetToken(t.mail, "reset2@example.com");

    await post(agent(), "/api/auth/reset-password", { token, password: "brand-new-password" }).expect(200);
    const reuse = await post(agent(), "/api/auth/reset-password", { token, password: "another-new-password" }).expect(400);
    expect(reuse.body.error.code).toBe("INVALID_TOKEN");

    await device.get("/api/auth/sessions").expect(401);
    await post(agent(), "/api/auth/login", { email: "reset2@example.com", password: PASSWORD }).expect(401);
    const login = await post(agent(), "/api/auth/login", { email: "reset2@example.com", password: "brand-new-password" }).expect(200);
    expect(login.body.account.emailVerified).toBe(true);
  });

  it("устаревшая и поддельная ссылки не работают", async () => {
    await register(agent(), "reset3@example.com").expect(201);
    await post(agent(), "/api/auth/forgot-password", { email: "reset3@example.com" }).expect(200);
    const token = lastResetToken(t.mail, "reset3@example.com");
    await t.prisma.client.authToken.updateMany({ where: { purpose: "reset_password" }, data: { expiresAt: new Date(Date.now() - 1000) } });
    await post(agent(), "/api/auth/reset-password", { token, password: "brand-new-password" }).expect(400);
    await post(agent(), "/api/auth/reset-password", { token: "A".repeat(43), password: "brand-new-password" }).expect(400);
  });
});

describe("защита запросов", () => {
  it("вход с чужого сайта и не-JSON отклоняются", async () => {
    await agent().post("/api/auth/login").set("Origin", "https://evil.example").send({ email: "a@b.co", password: PASSWORD }).expect(403);
    await agent().post("/api/auth/logout").set("Origin", ORIGIN).set("Content-Type", "text/plain").send("x").expect(415);
  });

  it("ответы API содержат X-Request-Id", async () => {
    const res = await request(t.app.getHttpServer()).get("/api/auth/me").expect(200);
    expect(res.headers["x-request-id"]).toMatch(/^[0-9a-f-]{36}$/);
    const echoed = await request(t.app.getHttpServer()).get("/api/auth/me").set("X-Request-Id", "edge-abc12345").expect(200);
    expect(echoed.headers["x-request-id"]).toBe("edge-abc12345");
    // Произвольный текст от клиента в лог не попадает: вместо него сервер выдаёт свой идентификатор
    const injected = await request(t.app.getHttpServer()).get("/api/auth/me").set("X-Request-Id", "bad id <script>").expect(200);
    expect(injected.headers["x-request-id"]).toMatch(/^[0-9a-f-]{36}$/);
  });
});
