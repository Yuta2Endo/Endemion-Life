// Stage 15: доска окон и управление. Управление отвечает 404, если токен не задан или не совпал.
import { timingSafeEqual } from "node:crypto";
import { isLiveStatus, UNIVERSE_IDS } from "@endemion/game-core";
import { Body, Controller, Get, Headers, HttpCode, Inject, Param, Post, Req } from "@nestjs/common";
import type { Request } from "express";
import { z } from "zod";
import { ApiError, parseOrThrow } from "../common/api-error.js";
import { APP_CONFIG, type AppConfig } from "../config.js";
import { SessionService } from "../session/session.service.js";
import { LiveService, type LiveInput } from "./live.service.js";

const idSchema = z.uuid();
const lifeSchema = z.strictObject({ lifeId: idSchema });
const moveSchema = z.strictObject({ to: z.string() });
const createSchema = z.strictObject({
  titleRu: z.string().trim().min(1).max(80),
  titleEn: z.string().trim().min(1).max(80),
  textRu: z.string().trim().max(400),
  textEn: z.string().trim().max(400),
  worlds: z.array(z.enum(UNIVERSE_IDS)).max(6),
  minAge: z.int().min(0).max(200),
  goal: z.int().min(1).max(100_000),
  perLife: z.int().min(1).max(20),
  gold: z.int().min(0).max(500),
  startsAt: z.string().datetime(),
  endsAt: z.string().datetime()
});

function sameToken(given: string | undefined, expected: string): boolean {
  if (!given) return false;
  const left = Buffer.from(given);
  const right = Buffer.from(expected);
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

@Controller("live")
export class LiveController {
  constructor(
    @Inject(LiveService) private readonly live: LiveService,
    @Inject(SessionService) private readonly sessions: SessionService,
    @Inject(APP_CONFIG) private readonly config: AppConfig
  ) {}

  @Get()
  async board(@Req() request: Request) {
    const player = await this.sessions.require(request);
    return this.live.board(player.id);
  }

  @Post(":id/contribute")
  @HttpCode(200)
  async contribute(@Req() request: Request, @Param("id") id: string, @Body() body: unknown) {
    const player = await this.sessions.require(request);
    const windowId = this.windowId(id);
    const input = parseOrThrow(lifeSchema, body);
    return this.live.contribute(player.id, windowId, input.lifeId);
  }

  @Post(":id/claim")
  @HttpCode(200)
  async claim(@Req() request: Request, @Param("id") id: string, @Body() body: unknown) {
    const player = await this.sessions.require(request);
    const windowId = this.windowId(id);
    const input = parseOrThrow(lifeSchema, body);
    return this.live.claim(player.id, windowId, input.lifeId);
  }

  @Post("manage")
  @HttpCode(201)
  async create(@Req() request: Request, @Headers("x-live-ops") token: string | undefined, @Body() body: unknown) {
    this.ops(token);
    const input = parseOrThrow(createSchema, body) as LiveInput;
    return this.live.create(input);
  }

  @Post("manage/:id")
  @HttpCode(200)
  async move(@Req() request: Request, @Headers("x-live-ops") token: string | undefined, @Param("id") id: string, @Body() body: unknown) {
    this.ops(token);
    const windowId = this.windowId(id);
    const input = parseOrThrow(moveSchema, body);
    if (!isLiveStatus(input.to)) throw new ApiError(400, "VALIDATION", "Неизвестное состояние");
    return this.live.move(windowId, input.to);
  }

  @Get("manage/:id/log")
  async log(@Req() request: Request, @Headers("x-live-ops") token: string | undefined, @Param("id") id: string) {
    this.ops(token);
    return { log: await this.live.history(this.windowId(id)) };
  }

  private windowId(value: string): string {
    if (!idSchema.safeParse(value).success) throw new ApiError(404, "NOT_FOUND", "Окно не найдено");
    return value;
  }

  /** Нет токена в окружении или заголовок не совпал — маршрута как будто нет */
  private ops(token: string | undefined): void {
    const expected = this.config.liveOpsToken ?? "";
    if (expected.length < 16 || !sameToken(token, expected)) {
      throw new ApiError(404, "NOT_FOUND", "Не найдено");
    }
  }
}
