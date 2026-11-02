import { createHash, randomBytes } from "node:crypto";
import { SESSION_COOKIE } from "@endemion/shared";
import { Inject, Injectable } from "@nestjs/common";
import type { CookieOptions, Request, Response } from "express";
import { ApiError } from "../common/api-error.js";
import { APP_CONFIG, type AppConfig } from "../config.js";
import { PrismaService } from "../prisma/prisma.service.js";

const SESSION_DAYS = 365;
const TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/;
/** last_seen_at обновляется не чаще раза в час, чтобы не писать в базу на каждый запрос */
const TOUCH_INTERVAL_MS = 60 * 60 * 1000;

export interface Player {
  id: string;
  createdAt: Date;
}

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/**
 * Гостевая сессия: случайный токен в HttpOnly-cookie, в базе — только его SHA-256.
 * Украденная база не даёт войти чужим аккаунтом. Вход по почте появится на Stage 02
 */
@Injectable()
export class SessionService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(APP_CONFIG) private readonly config: AppConfig
  ) {}

  private cookieOptions(): CookieOptions {
    return {
      httpOnly: true,
      sameSite: "lax",
      secure: this.config.secureCookies,
      path: "/",
      maxAge: SESSION_DAYS * 24 * 60 * 60 * 1000
    };
  }

  private tokenFrom(request: Request): string | null {
    const cookies = request.cookies as Record<string, unknown> | undefined;
    const token = cookies?.[SESSION_COOKIE];
    return typeof token === "string" && TOKEN_PATTERN.test(token) ? token : null;
  }

  /** Игрок по cookie или null */
  async find(request: Request): Promise<Player | null> {
    const token = this.tokenFrom(request);
    if (!token) return null;
    const player = await this.prisma.client.player.findUnique({ where: { sessionHash: hashToken(token) } });
    if (!player) return null;
    if (Date.now() - player.lastSeenAt.getTime() > TOUCH_INTERVAL_MS) {
      await this.prisma.client.player.update({ where: { id: player.id }, data: { lastSeenAt: new Date() } });
    }
    return { id: player.id, createdAt: player.createdAt };
  }

  async require(request: Request): Promise<Player> {
    const player = await this.find(request);
    if (!player) throw new ApiError(401, "UNAUTHORIZED", "Нет сессии игрока");
    return player;
  }

  /** Игрок по cookie, а если его нет — новый гость с новой cookie */
  async ensure(request: Request, response: Response): Promise<{ player: Player; created: boolean }> {
    const existing = await this.find(request);
    if (existing) return { player: existing, created: false };
    const token = randomBytes(32).toString("base64url");
    const player = await this.prisma.client.player.create({ data: { sessionHash: hashToken(token) } });
    response.cookie(SESSION_COOKIE, token, this.cookieOptions());
    return { player: { id: player.id, createdAt: player.createdAt }, created: true };
  }
}
