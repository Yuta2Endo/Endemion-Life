// Stage 07: связи игроков. Все маршруты под сессией, чужое — 404
import { Controller, Delete, Get, HttpCode, Inject, Param, Post, Body, Query, Req } from "@nestjs/common";
import type { Request } from "express";
import { z } from "zod";
import { ApiError, parseOrThrow } from "../common/api-error.js";
import { SessionService } from "../session/session.service.js";
import { SocialService } from "./social.service.js";

const playerSchema = z.strictObject({ playerId: z.uuid() });
const nameSchema = z.object({ name: z.string().trim().min(3).max(24) });

function tieIdOf(value: string): string {
  if (!z.uuid().safeParse(value).success) throw new ApiError(404, "NOT_FOUND", "Связь не найдена");
  return value;
}

@Controller("social")
export class SocialController {
  constructor(
    @Inject(SocialService) private readonly social: SocialService,
    @Inject(SessionService) private readonly sessions: SessionService
  ) {}

  @Get()
  async board(@Req() request: Request) {
    const player = await this.sessions.require(request);
    return this.social.board(player.id);
  }

  @Post("requests")
  @HttpCode(201)
  async request(@Req() request: Request, @Body() body: unknown) {
    const player = await this.sessions.require(request);
    const input = parseOrThrow(playerSchema, body);
    return this.social.request(player.id, input.playerId);
  }

  @Post("requests/:id/accept")
  @HttpCode(200)
  async accept(@Req() request: Request, @Param("id") id: string) {
    const player = await this.sessions.require(request);
    return this.social.accept(player.id, tieIdOf(id));
  }

  @Delete("ties/:id")
  @HttpCode(200)
  async remove(@Req() request: Request, @Param("id") id: string): Promise<{ removed: true }> {
    const player = await this.sessions.require(request);
    await this.social.remove(player.id, tieIdOf(id));
    return { removed: true };
  }

  @Post("block")
  @HttpCode(200)
  async block(@Req() request: Request, @Body() body: unknown) {
    const player = await this.sessions.require(request);
    const input = parseOrThrow(playerSchema, body);
    return this.social.block(player.id, input.playerId);
  }

  @Get("players")
  async search(@Req() request: Request, @Query() query: unknown) {
    const player = await this.sessions.require(request);
    const input = parseOrThrow(nameSchema, query);
    return { players: await this.social.search(player.id, input.name) };
  }

  @Get("players/:id")
  async profile(@Req() request: Request, @Param("id") id: string) {
    const player = await this.sessions.require(request);
    if (!z.uuid().safeParse(id).success) throw new ApiError(404, "NOT_FOUND", "Игрок не найден");
    return this.social.profile(player.id, id);
  }
}
