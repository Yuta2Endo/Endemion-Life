import { randomBytes, randomUUID } from "node:crypto";
import type { LifeView, MeResponse } from "@endemion/shared";
import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { CLIENT_ID, CLIENT_SECRET, idBrowser, newAccount, startIdProvider } from "./endemion-id-provider.js";
import { createTestApp, ORIGIN, resetDatabase, sessionCookieOf, type TestApp } from "./helpers.js";

let t: TestApp;
let id: Awaited<ReturnType<typeof startIdProvider>>;

function agent() {
  return request.agent(t.app.getHttpServer());
}
type Agent = ReturnType<typeof agent>;

const post = (client: Agent, path: string, body: unknown = {}) => client.post(path).set("Origin", ORIGIN).send(body as object);

async function me(client: Agent): Promise<MeResponse> {
  return (await client.get("/api/auth/me").expect(200)).body as MeResponse;
}

async function createLife(client: Agent): Promise<LifeView> {
  const res = await post(client, "/api/lives", { universeId: "hunter", seed: `id-${randomUUID()}` }).expect(201);
  return (res.body as { life: LifeView }).life;
}

/**
 * Вход через Endemion ID глазами браузера: /api/auth/oidc/login → провайдер → /api/auth/oidc/callback.
 * Возвращает ответ на callback (302 на страницу Life)
 */
async function signIn(client: Agent, browser: ReturnType<typeof idBrowser>, sub: string, returnTo = "/worlds") {
  id.state.loginAs = sub;
  const start = await client.get(`/api/auth/oidc/login?returnTo=${encodeURIComponent(returnTo)}`).expect(302);
  const authorize = new URL(start.headers.location as string);
  expect(authorize.origin).toBe(id.issuer);
  expect(authorize.searchParams.get("code_challenge_method")).toBe("S256");
  expect(authorize.searchParams.has("code_verifier")).toBe(false);
  const callback = await browser(authorize.href);
  expect(callback.pathname).toBe("/api/auth/oidc/callback");
  const res = await client.get(callback.pathname + callback.search).expect(302);
  return { res, callbackPath: callback.pathname + callback.search };
}

/** Сверка с Endemion ID идёт раз в 5 минут. В тесте время не ждём: помечаем, что сверки давно не было */
async function forceRefresh() {
  await t.prisma.client.session.updateMany({ where: { refreshToken: { not: null } }, data: { refreshedAt: new Date(0) } });
}

beforeAll(async () => {
  id = await startIdProvider(ORIGIN);
  t = await createTestApp({
    ENDEMION_ID: "true",
    ENDEMION_ID_ISSUER: id.issuer,
    ENDEMION_ID_CLIENT_ID: CLIENT_ID,
    ENDEMION_ID_CLIENT_SECRET: CLIENT_SECRET,
    ENDEMION_ID_TOKEN_KEY: randomBytes(32).toString("base64")
  });
});

beforeEach(async () => {
  await resetDatabase(t.prisma);
  id.accounts.clear();
});

afterAll(async () => {
  await t.app.close();
  await id.stop();
});

describe("Вход через Endemion ID", () => {
  it("сайт узнаёт, что вход через Endemion ID", async () => {
    const res = await agent().get("/api/auth/config").expect(200);
    expect(res.body).toEqual({ endemionId: { enabled: true, accountUrl: `${id.issuer}/account` } });
  });

  it("гость входит через Endemion ID: жизни остаются, профиль виден в игре", async () => {
    const account = newAccount();
    id.accounts.set(account.sub, account);
    const client = agent();
    const life = await createLife(client);
    const guest = await me(client);
    const guestCookie = sessionCookieOf(await client.get("/api/auth/me"));

    const { res } = await signIn(client, idBrowser(id.issuer), account.sub);
    expect(res.headers.location).toBe(`${ORIGIN}/worlds`);
    expect(sessionCookieOf(res)).not.toBe(guestCookie);

    const after = await me(client);
    expect(after.player!.id).toBe(guest.player!.id);
    expect(after.endemionId).toEqual({ id: account.sub, username: account.username, displayName: account.name, avatarUrl: null, email: account.email });
    const lives = (await client.get("/api/lives").expect(200)).body as { lives: { id: string }[] };
    expect(lives.lives.map((item) => item.id)).toContain(life.id);
  });

  it("второе устройство с тем же Endemion ID попадает к тому же игроку и прогрессу", async () => {
    const account = newAccount();
    id.accounts.set(account.sub, account);
    const phone = agent();
    await signIn(phone, idBrowser(id.issuer), account.sub);
    const life = await createLife(phone);

    const laptop = agent();
    await signIn(laptop, idBrowser(id.issuer), account.sub);
    expect((await me(laptop)).player!.id).toBe((await me(phone)).player!.id);
    await laptop.get(`/api/lives/${life.id}`).expect(200);
  });

  it("старый аккаунт Life связывается только по подтверждённой почте и забирает гостевые жизни", async () => {
    const owner = await t.prisma.client.player.create({ data: {} });
    await t.prisma.client.account.create({ data: { playerId: owner.id, email: "old@example.com", passwordHash: "scrypt$1$1$1$AA$AA" } });
    const account = newAccount({ email: "old@example.com", emailVerified: false });
    id.accounts.set(account.sub, account);

    const client = agent();
    const guestLife = await createLife(client);
    const browser = idBrowser(id.issuer);
    const first = await signIn(client, browser, account.sub);
    expect(first.res.headers.location).toBe(`${ORIGIN}/account?idError=unverified`);
    expect((await t.prisma.client.player.findUniqueOrThrow({ where: { id: owner.id } })).endemionSub).toBeNull();

    account.emailVerified = true;
    await signIn(client, browser, account.sub);
    const after = await me(client);
    expect(after.player!.id).toBe(owner.id);
    expect(after.account!.email).toBe("old@example.com");
    // Жизнь гостя этого браузера перешла к старому аккаунту, а не потерялась
    await client.get(`/api/lives/${guestLife.id}`).expect(200);
  });

  it("по username ничего не связывается", async () => {
    const other = agent();
    const otherAccount = newAccount({ username: "same_name" });
    id.accounts.set(otherAccount.sub, otherAccount);
    await signIn(other, idBrowser(id.issuer), otherAccount.sub);

    const account = newAccount({ username: "same_name" });
    id.accounts.set(account.sub, account);
    const client = agent();
    await signIn(client, idBrowser(id.issuer), account.sub);
    expect((await me(client)).player!.id).not.toBe((await me(other)).player!.id);
  });

  it("смена имени и username в Endemion ID появляется в игре, игрок и прогресс те же", async () => {
    const account = newAccount();
    id.accounts.set(account.sub, account);
    const client = agent();
    await signIn(client, idBrowser(id.issuer), account.sub);
    const life = await createLife(client);
    const before = await me(client);

    account.username = "renamed_player";
    account.name = "Новое имя";
    await forceRefresh();
    await client.get("/api/auth/me").expect(200);
    const after = await me(client);
    expect(after.player!.id).toBe(before.player!.id);
    expect(after.endemionId!.id).toBe(account.sub);
    expect(after.endemionId!.username).toBe("renamed_player");
    expect(after.endemionId!.displayName).toBe("Новое имя");
    await client.get(`/api/lives/${life.id}`).expect(200);
  });

  it("блокировка в Endemion ID завершает сессию в Life", async () => {
    const account = newAccount();
    id.accounts.set(account.sub, account);
    const client = agent();
    await signIn(client, idBrowser(id.issuer), account.sub);
    expect((await me(client)).endemionId).not.toBeNull();

    account.blocked = true;
    await forceRefresh();
    expect((await me(client)).player).toBeNull();
    const sessions = await t.prisma.client.session.findMany({ where: { refreshToken: { not: null } } });
    expect(sessions.every((session) => session.revokedAt !== null)).toBe(true);
  });

  it("ответ провайдера нельзя использовать второй раз и в другом браузере", async () => {
    const account = newAccount();
    id.accounts.set(account.sub, account);
    const { callbackPath } = await signIn(agent(), idBrowser(id.issuer), account.sub);
    const replay = await agent().get(callbackPath).expect(302);
    expect(replay.headers.location).toBe(`${ORIGIN}/account?idError=expired`);
    expect(sessionCookieOf(replay)).toBeNull();
  });

  it("returnTo на чужой сайт после входа не уводит", async () => {
    const account = newAccount();
    id.accounts.set(account.sub, account);
    const { res } = await signIn(agent(), idBrowser(id.issuer), account.sub, "https://evil.example/x");
    expect(res.headers.location).toBe(`${ORIGIN}/`);
  });

  it("старые вход, регистрация и восстановление закрыты", async () => {
    const client = agent();
    await post(client, "/api/auth/login", { email: "a@example.com", password: "correct-horse-battery" }).expect(410);
    await post(client, "/api/auth/register", { email: "a@example.com", password: "correct-horse-battery" }).expect(410);
    await post(client, "/api/auth/forgot-password", { email: "a@example.com" }).expect(410);
  });

  it("выход возвращает адрес выхода в Endemion ID", async () => {
    const account = newAccount();
    id.accounts.set(account.sub, account);
    const client = agent();
    await signIn(client, idBrowser(id.issuer), account.sub);
    const res = await post(client, "/api/auth/logout").expect(200);
    const redirect = new URL((res.body as { redirect: string }).redirect);
    expect(redirect.origin + redirect.pathname).toBe(`${id.issuer}/session/end`);
    expect(redirect.searchParams.get("post_logout_redirect_uri")).toBe(`${ORIGIN}/`);
    expect((await me(client)).player).toBeNull();
  });
});
