import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import type { Prisma, PrismaClient } from "@endemion/database";
import { Inject, Injectable, Logger } from "@nestjs/common";
import * as oidc from "openid-client";
import { APP_CONFIG, type AppConfig, type EndemionIdConfig } from "../config.js";
import { PrismaService } from "../prisma/prisma.service.js";

type Db = PrismaClient | Prisma.TransactionClient;

/** Cookie начатого входа: только state, verifier и nonce остаются на сервере */
export const OIDC_COOKIE = "el_oidc";
export const OIDC_COOKIE_PATH = "/api/auth/oidc/callback";
const LOGIN_TTL_MS = 10 * 60 * 1000;
/** Как часто сессия сверяется с Endemion ID: столько же, не больше, проходит от выхода там до выхода здесь */
export const REFRESH_MS = 5 * 60 * 1000;
/** Если Endemion ID недоступен, сессия живёт без сверки не дольше часа после последней удачной */
const OFFLINE_GRACE_MS = 60 * 60 * 1000;
const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1"]);
const USERNAME = /^[A-Za-z0-9_]{3,24}$/;

const sha256 = (value: string): string => createHash("sha256").update(value).digest("hex");

export interface IdClaims {
  sub: string;
  email: string | null;
  emailVerified: boolean;
  username: string | null;
  displayName: string | null;
  avatarUrl: string | null;
}

export interface PendingLogin {
  verifier: string;
  nonce: string;
  state: string;
  returnTo: string;
}

/** Состояние сессии после сверки: работает, данные профиля обновились, или закончилась */
export type RefreshResult = "ok" | "updated" | "ended";

export interface SessionTokens {
  id: string;
  playerId: string;
  refreshToken: string;
  refreshedAt: Date | null;
  lastOkAt: Date | null;
  createdAt: Date;
}

/** Только свои пути: ?returnTo=https://evil.example после входа не уводит на чужой сайт */
export function safeReturnTo(value: unknown): string {
  return typeof value === "string" && value.startsWith("/") && !value.startsWith("//") && !value.startsWith("/\\") ? value.slice(0, 500) : "/";
}

/**
 * Вход через Endemion ID (auth.endemion.online) по OpenID Connect: Authorization Code + PKCE S256.
 * Life остаётся со своей сессией в cookie el_session. С ней связан refresh token Endemion ID: раз в REFRESH_MS
 * сессия сверяется с провайдером — так Life узнаёт о выходе, отзыве, блокировке и новом имени или аватаре
 */
@Injectable()
export class EndemionIdService {
  private readonly logger = new Logger("EndemionId");
  private configPromise: Promise<oidc.Configuration> | null = null;
  private readonly db: PrismaClient;

  constructor(
    @Inject(PrismaService) prisma: PrismaService,
    @Inject(APP_CONFIG) private readonly config: AppConfig
  ) {
    this.db = prisma.client;
  }

  get enabled(): boolean {
    return this.config.endemionId !== null;
  }

  get settings(): EndemionIdConfig {
    if (!this.config.endemionId) throw new Error("Endemion ID выключен");
    return this.config.endemionId;
  }

  /** Настройки провайдера из /.well-known/openid-configuration. Запрос один раз на процесс, при ошибке — повтор */
  private client(): Promise<oidc.Configuration> {
    if (!this.configPromise) {
      const { issuer, clientId, clientSecret } = this.settings;
      const url = new URL(issuer);
      // http разрешён только для провайдера на этом же компьютере (разработка и тесты)
      const execute = url.protocol === "http:" && LOCAL_HOSTS.has(url.hostname) ? [oidc.allowInsecureRequests] : [];
      this.configPromise = oidc.discovery(url, clientId, undefined, oidc.ClientSecretBasic(clientSecret), { execute, timeout: 10 });
      this.configPromise.catch(() => (this.configPromise = null));
    }
    return this.configPromise;
  }

  // ---------- refresh token в базе зашифрован: копия базы без ключа не даёт входа ----------

  private encrypt(text: string): string {
    const iv = randomBytes(12);
    const cipher = createCipheriv("aes-256-gcm", this.settings.tokenKey, iv);
    const data = Buffer.concat([cipher.update(text, "utf8"), cipher.final()]);
    return [iv, cipher.getAuthTag(), data].map((part) => part.toString("base64url")).join(".");
  }

  private decrypt(value: string): string {
    const [iv, tag, data] = value.split(".").map((part) => Buffer.from(part, "base64url"));
    const decipher = createDecipheriv("aes-256-gcm", this.settings.tokenKey, iv!);
    decipher.setAuthTag(tag!);
    return Buffer.concat([decipher.update(data!), decipher.final()]).toString("utf8");
  }

  // ---------- вход ----------

  /** Начать вход. В адрес уходят только code_challenge, state и nonce; state вернётся в cookie браузера */
  async startLogin(returnTo: string, options: { register?: boolean } = {}): Promise<{ url: string; state: string }> {
    const config = await this.client();
    const state = randomBytes(32).toString("hex");
    const verifier = oidc.randomPKCECodeVerifier();
    const nonce = oidc.randomNonce();
    const now = Date.now();
    await this.db.$transaction([
      this.db.oidcLogin.deleteMany({ where: { expiresAt: { lt: new Date(now) } } }),
      this.db.oidcLogin.create({
        data: { stateHash: sha256(state), codeVerifier: verifier, nonce, returnTo: safeReturnTo(returnTo), expiresAt: new Date(now + LOGIN_TTL_MS) }
      })
    ]);
    const url = oidc.buildAuthorizationUrl(config, {
      redirect_uri: this.settings.redirectUri,
      // Без offline_access: refresh token живёт не дольше центральной сессии и умирает при выходе там
      scope: "openid email profile",
      code_challenge: await oidc.calculatePKCECodeChallenge(verifier),
      code_challenge_method: "S256",
      state,
      nonce,
      ...(options.register ? { screen: "register" } : {})
    });
    return { url: url.href, state };
  }

  /** Начатый вход по state из cookie. Запись удаляется сразу: тот же ответ провайдера второй раз не примется */
  async takeLogin(state: unknown): Promise<PendingLogin | null> {
    if (typeof state !== "string" || !/^[0-9a-f]{64}$/.test(state)) return null;
    const rows = await this.db.oidcLogin.findMany({ where: { stateHash: sha256(state) } });
    const row = rows[0];
    if (!row) return null;
    const deleted = await this.db.oidcLogin.deleteMany({ where: { stateHash: row.stateHash } });
    // Два одновременных ответа с одним state: принимается только тот, кто удалил запись
    if (deleted.count === 0 || row.expiresAt.getTime() < Date.now()) return null;
    return { verifier: row.codeVerifier, nonce: row.nonce, state, returnTo: row.returnTo };
  }

  /** Обмен кода. openid-client проверяет подпись ID token, iss, aud, exp, nonce, state и PKCE */
  async exchange(callbackUrl: URL, login: PendingLogin): Promise<{ claims: IdClaims; refreshToken: string }> {
    const config = await this.client();
    const tokens = await oidc.authorizationCodeGrant(config, callbackUrl, {
      pkceCodeVerifier: login.verifier,
      expectedState: login.state,
      expectedNonce: login.nonce,
      idTokenExpected: true
    });
    if (!tokens.refresh_token) throw new Error("Endemion ID не выдал refresh token");
    return { claims: this.readClaims(tokens.claims()!), refreshToken: this.encrypt(tokens.refresh_token) };
  }

  private readClaims(claims: oidc.IDToken): IdClaims {
    const text = (value: unknown, max: number): string | null => (typeof value === "string" && value.trim() ? value.trim().slice(0, max) : null);
    const username = text(claims.preferred_username, 24);
    const picture = text(claims.picture, 512);
    return {
      sub: claims.sub,
      email: text(claims.email, 254)?.toLowerCase() ?? null,
      emailVerified: claims.email_verified === true,
      username: username && USERNAME.test(username) ? username : null,
      displayName: text(claims.name, 40),
      // Аватар только с адреса Endemion ID: в игре он показывается как <img>, чужие адреса не подставляются
      avatarUrl: picture && picture.startsWith(`${this.settings.issuer}/avatars/`) ? picture : null
    };
  }

  /** Имя, username, почта и аватар из Endemion ID для показа в игре */
  async applyClaims(db: Db, playerId: string, claims: IdClaims): Promise<void> {
    await db.player.update({
      where: { id: playerId },
      data: { idUsername: claims.username, idDisplayName: claims.displayName, idAvatarUrl: claims.avatarUrl, idEmail: claims.email }
    });
  }

  /**
   * Сверить сессию с Endemion ID, если с прошлой сверки прошло REFRESH_MS.
   * Сверяет только один запрос: остальные одновременные запросы этой сессии идут со старыми данными.
   * Иначе два запроса потратили бы один refresh token, и Endemion ID отозвал бы вход как украденный
   */
  async refresh(session: SessionTokens, endemionSub: string | null): Promise<RefreshResult> {
    const now = Date.now();
    if (session.refreshedAt && now - session.refreshedAt.getTime() < REFRESH_MS) return "ok";
    const claimed = await this.db.session.updateMany({
      where: { id: session.id, refreshedAt: session.refreshedAt, revokedAt: null },
      data: { refreshedAt: new Date(now) }
    });
    if (claimed.count === 0) return "ok";

    try {
      const config = await this.client();
      const tokens = await oidc.refreshTokenGrant(config, this.decrypt(session.refreshToken));
      const raw = tokens.claims();
      if (raw && raw.sub !== endemionSub) throw new SubjectMismatch();
      await this.db.session.update({
        where: { id: session.id },
        data: { refreshToken: this.encrypt(tokens.refresh_token!), lastOkAt: new Date(now) }
      });
      if (!raw) return "ok";
      await this.applyClaims(this.db, session.playerId, this.readClaims(raw));
      return "updated";
    } catch (error) {
      // Отказ провайдера (выход, отзыв, блокировка, повтор токена) — сессия заканчивается сразу
      if (error instanceof oidc.ResponseBodyError || error instanceof SubjectMismatch) {
        await this.db.session.updateMany({ where: { id: session.id, revokedAt: null }, data: { revokedAt: new Date(now) } });
        this.logger.log({ msg: "Сессия Endemion ID завершена провайдером", sessionId: session.id });
        return "ended";
      }
      // Провайдер недоступен: сессия работает, пока не кончится запас OFFLINE_GRACE_MS
      this.logger.warn({ msg: "Сверка с Endemion ID не удалась", error: error instanceof Error ? error.message : String(error) });
      const lastOk = (session.lastOkAt ?? session.createdAt).getTime();
      return now - lastOk < OFFLINE_GRACE_MS ? "ok" : "ended";
    }
  }

  /** Адрес выхода в Endemion ID: там можно выйти и с endemion.online */
  async endSessionUrl(): Promise<string | null> {
    try {
      const config = await this.client();
      return oidc.buildEndSessionUrl(config, {
        client_id: this.settings.clientId,
        post_logout_redirect_uri: this.settings.postLogoutRedirectUri
      }).href;
    } catch (error) {
      this.logger.warn({ msg: "Адрес выхода Endemion ID недоступен", error: error instanceof Error ? error.message : String(error) });
      return null;
    }
  }
}

class SubjectMismatch extends Error {
  constructor() {
    super("Endemion ID вернул другого пользователя");
  }
}
