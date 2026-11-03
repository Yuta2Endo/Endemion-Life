import { generateKeyPairSync, randomUUID } from "node:crypto";
import type { Server } from "node:http";
import { createServer, type AddressInfo } from "node:net";
import Provider, { type ProviderContext } from "oidc-provider";

export const CLIENT_ID = "endemion-life-web";
export const CLIENT_SECRET = "life-test-secret-0123456789-0123456789";

export interface IdAccount {
  sub: string;
  email: string;
  emailVerified: boolean;
  username: string;
  name: string;
  /** Заблокированный в Endemion ID: провайдер больше не выдаёт ему токены */
  blocked?: boolean;
}

/**
 * Тестовый Endemion ID: настоящий oidc-provider (тот же, что на auth.endemion.online) с памятью вместо базы.
 * Форму входа заменяет loginAs: кто «вводит пароль» при следующем входе
 */
export async function startIdProvider(lifeOrigin: string) {
  const accounts = new Map<string, IdAccount>();
  const state: { loginAs: string | null } = { loginAs: null };
  const { privateKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
  const port = await freePort();
  const issuer = `http://127.0.0.1:${port}`;

  const provider = new Provider(issuer, {
    clients: [{
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      redirect_uris: [`${lifeOrigin}/api/auth/oidc/callback`],
      post_logout_redirect_uris: [`${lifeOrigin}/`],
      grant_types: ["authorization_code", "refresh_token"],
      response_types: ["code"]
    }],
    jwks: { keys: [{ ...privateKey.export({ format: "jwk" }), kid: "test", use: "sig", alg: "RS256" }] },
    cookies: { keys: ["test-cookie-key-0123456789-0123456789"] },
    claims: { openid: ["sub"], email: ["email", "email_verified"], profile: ["name", "preferred_username", "picture"] },
    scopes: ["openid", "email", "profile"],
    conformIdTokenClaims: false,
    responseTypes: ["code"],
    pkce: { required: () => true },
    issueRefreshToken: () => Promise.resolve(true),
    rotateRefreshToken: true,
    features: { devInteractions: { enabled: false } },
    interactions: { url: (_ctx: unknown, interaction: { uid: string }) => `/interaction/${interaction.uid}` },
    findAccount: (_ctx: unknown, sub: string) => {
      const account = accounts.get(sub);
      if (!account || account.blocked) return Promise.resolve(undefined);
      return Promise.resolve({
        accountId: sub,
        claims: () => ({
          sub,
          email: account.email,
          email_verified: account.emailVerified,
          preferred_username: account.username,
          name: account.name
        })
      });
    }
  });

  // Вместо формы входа: вход сразу за loginAs, согласие выдаётся автоматически, как в Endemion ID
  provider.use(async (ctx: ProviderContext, next) => {
    const match = /^\/interaction\/([^/]+)$/.exec(ctx.path);
    if (!match || ctx.method !== "GET") return next();
    const details = await provider.interactionDetails(ctx.req, ctx.res);
    let result: Record<string, unknown>;
    if (details.prompt.name === "login") {
      if (!state.loginAs) throw new Error("тест не задал loginAs");
      result = { login: { accountId: state.loginAs } };
    } else {
      const grant = details.grantId
        ? await provider.Grant.find(details.grantId)
        : new provider.Grant({ accountId: details.session?.accountId, clientId: details.params.client_id! });
      const missing = details.prompt.details;
      if (missing.missingOIDCScope) grant.addOIDCScope(missing.missingOIDCScope.join(" "));
      if (missing.missingOIDCClaims) grant.addOIDCClaims(missing.missingOIDCClaims);
      const grantId = await grant.save();
      result = { consent: details.grantId ? {} : { grantId } };
    }
    const returnTo = await provider.interactionResult(ctx.req, ctx.res, result, { mergeWithLastSubmission: true });
    ctx.status = 303;
    ctx.redirect(returnTo);
  });

  const server: Server = await new Promise((resolve) => {
    const listening = provider.listen(port, "127.0.0.1", () => resolve(listening));
  });

  return {
    issuer,
    accounts,
    state,
    stop: () => new Promise<void>((resolve) => server.close(() => resolve()))
  };
}

/** Свободный порт: адрес провайдера (issuer) должен быть известен до его создания */
function freePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const server = createServer();
    server.listen(0, "127.0.0.1", () => {
      const { port } = server.address() as AddressInfo;
      server.close(() => resolve(port));
    });
    server.on("error", reject);
  });
}

/**
 * Браузер на стороне провайдера: хранит его cookie и идёт по перенаправлениям,
 * пока адрес не уйдёт на сайт Life. Возвращает этот адрес (ответ провайдера с кодом)
 */
export function idBrowser(issuer: string) {
  const jar = new Map<string, string>();
  return async function follow(url: string): Promise<URL> {
    let next = new URL(url);
    for (let hop = 0; hop < 15; hop++) {
      if (next.origin !== issuer) return next;
      const headers: Record<string, string> = {};
      if (jar.size) headers.cookie = [...jar].map(([k, v]) => `${k}=${v}`).join("; ");
      const response = await fetch(next, { headers, redirect: "manual" });
      for (const line of response.headers.getSetCookie()) {
        const [pair] = line.split(";");
        const index = pair!.indexOf("=");
        const value = pair!.slice(index + 1);
        if (!value || /expires=Thu, 01 Jan 1970/i.test(line)) jar.delete(pair!.slice(0, index));
        else jar.set(pair!.slice(0, index), value);
      }
      const location = response.headers.get("location");
      if (!location) throw new Error(`Endemion ID ответил ${response.status} без перенаправления: ${(await response.text()).slice(0, 200)}`);
      next = new URL(location, next);
    }
    throw new Error("Слишком много перенаправлений");
  };
}

export function newAccount(overrides: Partial<IdAccount> = {}): IdAccount {
  const n = randomUUID().slice(0, 8);
  return { sub: randomUUID(), email: `id-${n}@example.com`, emailVerified: true, username: `player_${n}`, name: `Игрок ${n}`, ...overrides };
}
