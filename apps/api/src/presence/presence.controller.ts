import { Controller, Get, Inject, Post, Query, Req, Res, Body } from "@nestjs/common";
import type { Request, Response } from "express";
import { z } from "zod";
import { ApiError, parseOrThrow } from "../common/api-error.js";
import { SessionService } from "../session/session.service.js";
import { assertUniverseId } from "../world/world.service.js";
import { PresenceService, type WorldNotification } from "./presence.service.js";

const heartbeatSchema = z.strictObject({
  universeId: z.string().trim().min(1).max(32)
});

const HEARTBEAT_MS = 20_000;

@Controller("presence")
export class PresenceController {
  constructor(
    @Inject(SessionService) private readonly sessions: SessionService,
    @Inject(PresenceService) private readonly presence: PresenceService
  ) {}

  /** Account-only: heartbeat keeps the player visible in the world. */
  @Post("heartbeat")
  async heartbeat(@Req() request: Request, @Body() body: unknown) {
    const { player } = await this.sessions.requireAccount(request);
    const input = parseOrThrow(heartbeatSchema, body);
    const universeId = assertUniverseId(input.universeId);
    await this.presence.touch(universeId, player.id);
    return this.presence.online(universeId);
  }

  /** Account-only: who is currently present in a world. */
  @Get("online")
  async online(@Req() request: Request, @Query("universeId") universeId: string | undefined) {
    await this.sessions.requireAccount(request);
    if (!universeId) throw new ApiError(400, "VALIDATION", "universeId обязателен");
    return this.presence.online(assertUniverseId(universeId));
  }

  /**
   * Account-only SSE stream. Sends an initial presence snapshot, keeps the
   * connection alive with a heartbeat, and forwards world notifications.
   */
  @Get("stream")
  async stream(
    @Req() request: Request,
    @Res() response: Response,
    @Query("universeId") universeIdValue: string | undefined
  ): Promise<void> {
    const { player } = await this.sessions.requireAccount(request);
    if (!universeIdValue) throw new ApiError(400, "VALIDATION", "universeId обязателен");
    const universeId = assertUniverseId(universeIdValue);

    response.status(200);
    response.setHeader("Content-Type", "text/event-stream; charset=utf-8");
    response.setHeader("Cache-Control", "no-store, no-transform");
    response.setHeader("Connection", "keep-alive");
    response.setHeader("X-Accel-Buffering", "no");
    response.flushHeaders();

    const send = (event: string, data: unknown): void => {
      response.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
    };

    let closed = false;
    const unsubscribe = this.presence.subscribe((notification: WorldNotification) => {
      if (notification.universeId === universeId) send("world", notification);
    });

    const presenceSnapshot = async (): Promise<void> => {
      await this.presence.touch(universeId, player.id);
      send("presence", await this.presence.online(universeId));
    };

    const timer = setInterval(() => {
      void presenceSnapshot().catch(() => undefined);
    }, HEARTBEAT_MS);
    const cleanup = (): void => {
      if (closed) return;
      closed = true;
      clearInterval(timer);
      unsubscribe();
      response.end();
    };
    request.on("close", cleanup);
    await presenceSnapshot();
    send("hello", { universeId, playerId: player.id, at: new Date().toISOString() });
  }
}
