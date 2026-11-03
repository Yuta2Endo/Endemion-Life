import { createHash, randomBytes } from "node:crypto";
import type { Prisma, PrismaClient } from "@endemion/database";
import { SESSION_COOKIE, type SessionView } from "@endemion/shared";
import { Inject, Injectable } from "@nestjs/common";
import type { CookieOptions, Request, Response } from "express";
import { ApiError } from "../common/api-error.js";
import { APP_CONFIG, type AppConfig } from "../config.js";
import { PrismaService } from "../prisma/prisma.service.js";

const SESSION_DAYS = 365;
const SESSION_MS = SESSION_DAYS * 24 * 60 * 60 * 1000;
const TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/;
/** last_seen_at обновляется не чаще раза в час, чтобы не писать в базу на каждый запрос */
const TOUCH_INTERVAL_MS = 60 * 60 * 1000;
const USER_AGENT_MAX = 256;

export interface Player {
  id: string;
  createdAt: Date;
}

export interface CurrentSession {
  sessionId: string;
  player: Player;
}

type Db = PrismaClient | Prisma.TransactionClient;

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/**
 * Сессии (устройства). Случайный токен 256 бит в HttpOnly-cookie, в базе — только его SHA-256:
 * украденная база не даёт войти. Сессию можно отозвать; отозванная или просроченная не даёт доступа.
 * Гость — игрок без аккаунта: его сессия работает так же, как сессия аккаунта
 */
@Injectable()
export class SessionService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(APP_CONFIG) private readonly config: AppConfig
  ) {}

  private cookieOptions(): CookieOptions {
    return { httpOnly: true, sameSite: "lax", secure: this.config.secureCookies, path: "/" };
  }

  private tokenFrom(request: Request): string | null {
    const cookies = request.cookies as Record<string, unknown> | undefined;
    const token = cookies?.[SESSION_COOKIE];
    return typeof token === "string" && TOKEN_PATTERN.test(token) ? token : null;
  }

  /** Текущая действующая сессия этого браузера или null */
  async current(request: Request): Promise<CurrentSession | null> {
    const token = this.tokenFrom(request);
    if (!token) return null;
    const session = await this.prisma.client.session.findUnique({ where: { tokenHash: hashToken(token) }, include: { player: true } });
    const now = Date.now();
    if (!session || session.revokedAt || session.expiresAt.getTime() <= now) return null;
    if (now - session.lastSeenAt.getTime() > TOUCH_INTERVAL_MS) {
      await this.prisma.client.session.update({ where: { id: session.id }, data: { lastSeenAt: new Date(now) } });
    }
    return { sessionId: session.id, player: { id: session.player.id, createdAt: session.player.createdAt } };
  }

  /** Игрок по cookie или null */
  async find(request: Request): Promise<Player | null> {
    return (await this.current(request))?.player ?? null;
  }

  async require(request: Request): Promise<Player> {
    return (await this.requireSession(request)).player;
  }

  async requireSession(request: Request): Promise<CurrentSession> {
    const current = await this.current(request);
    if (!current) throw new ApiError(401, "UNAUTHORIZED", "Нет сессии игрока");
    return current;
  }

  /** Новая сессия для игрока. Возвращает токен для cookie; в базу пишется только его хеш */
  async create(db: Db, playerId: string, request: Request): Promise<{ sessionId: string; token: string }> {
    const token = randomBytes(32).toString("base64url");
    const userAgent = request.get("user-agent")?.slice(0, USER_AGENT_MAX) ?? null;
    const session = await db.session.create({
      data: { tokenHash: hashToken(token), playerId, userAgent, expiresAt: new Date(Date.now() + SESSION_MS) }
    });
    return { sessionId: session.id, token };
  }

  setCookie(response: Response, token: string): void {
    response.cookie(SESSION_COOKIE, token, { ...this.cookieOptions(), maxAge: SESSION_MS });
  }

  clearCookie(response: Response): void {
    response.clearCookie(SESSION_COOKIE, this.cookieOptions());
  }

  /** Игрок по cookie, а если его нет — новый гость с новой cookie */
  async ensure(request: Request, response: Response): Promise<{ player: Player; created: boolean }> {
    const existing = await this.find(request);
    if (existing) return { player: existing, created: false };
    const { player, token } = await this.prisma.client.$transaction(async (tx) => {
      const created = await tx.player.create({ data: {} });
      const session = await this.create(tx, created.id, request);
      return { player: created, token: session.token };
    });
    this.setCookie(response, token);
    return { player: { id: player.id, createdAt: player.createdAt }, created: true };
  }

  async revoke(db: Db, sessionId: string): Promise<void> {
    await db.session.updateMany({ where: { id: sessionId, revokedAt: null }, data: { revokedAt: new Date() } });
  }

  /** Отзывает все сессии игрока, кроме keep. Возвращает число отозванных */
  async revokeAll(db: Db, playerId: string, keep?: string): Promise<number> {
    const result = await db.session.updateMany({
      where: { playerId, revokedAt: null, ...(keep ? { id: { not: keep } } : {}) },
      data: { revokedAt: new Date() }
    });
    return result.count;
  }

  async list(playerId: string, currentSessionId: string): Promise<SessionView[]> {
    const rows = await this.prisma.client.session.findMany({
      where: { playerId, revokedAt: null, expiresAt: { gt: new Date() } },
      orderBy: { lastSeenAt: "desc" },
      take: 100
    });
    return rows.map((row) => ({
      id: row.id,
      createdAt: row.createdAt.toISOString(),
      lastSeenAt: row.lastSeenAt.toISOString(),
      expiresAt: row.expiresAt.toISOString(),
      userAgent: row.userAgent,
      current: row.id === currentSessionId
    }));
  }
}
