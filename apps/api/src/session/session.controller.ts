import type { PlayerView } from "@endemion/shared";
import { Controller, Get, HttpCode, Inject, Post, Req, Res } from "@nestjs/common";
import type { Request, Response } from "express";
import { SessionService, type Player } from "./session.service.js";

function toView(player: Player): PlayerView {
  return { id: player.id, createdAt: player.createdAt.toISOString() };
}

@Controller("session")
export class SessionController {
  constructor(@Inject(SessionService) private readonly sessions: SessionService) {}

  /** Текущий игрок. null — сессии ещё нет */
  @Get()
  async current(@Req() request: Request): Promise<{ player: PlayerView | null }> {
    const player = await this.sessions.find(request);
    return { player: player ? toView(player) : null };
  }

  /** Начать гостевую сессию или продолжить существующую */
  @Post()
  @HttpCode(200)
  async start(@Req() request: Request, @Res({ passthrough: true }) response: Response): Promise<{ player: PlayerView; created: boolean }> {
    const { player, created } = await this.sessions.ensure(request, response);
    return { player: toView(player), created };
  }
}
