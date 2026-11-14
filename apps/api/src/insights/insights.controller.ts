// Stage 16: сводка для разработчика. Без токена маршрута как будто нет. Клиент факты не пишет.
import { timingSafeEqual } from "node:crypto";
import { guideTelemetrySchema } from "@endemion/shared";
import { Body, Controller, Get, Headers, HttpCode, Inject, Post, Query, Req } from "@nestjs/common";
import type { Request } from "express";
import { z } from "zod";
import { ApiError, parseOrThrow } from "../common/api-error.js";
import { APP_CONFIG, type AppConfig } from "../config.js";
import { SessionService } from "../session/session.service.js";
import { InsightsService } from "./insights.service.js";

const daysSchema = z.object({ days: z.coerce.number().int().min(1).max(90).default(30) });

function sameToken(given: string | undefined, expected: string): boolean {
  if (!given) return false;
  const left = Buffer.from(given);
  const right = Buffer.from(expected);
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

@Controller("insights")
export class InsightsController {
  constructor(
    @Inject(InsightsService) private readonly insights: InsightsService,
    @Inject(APP_CONFIG) private readonly config: AppConfig,
    @Inject(SessionService) private readonly sessions: SessionService
  ) {}

  @Get()
  async summary(@Req() request: Request, @Headers("x-live-ops") token: string | undefined, @Query() query: unknown) {
    this.ops(request, token);
    const input = parseOrThrow(daysSchema, query);
    return this.insights.summary(input.days);
  }

  @Get("funnel")
  async funnel(@Req() request: Request, @Headers("x-live-ops") token: string | undefined, @Query() query: unknown) {
    this.ops(request, token);
    const input = parseOrThrow(daysSchema, query);
    return this.insights.funnel(input.days);
  }

  /** R1.2: light client signal, scoped to a life owned by the current player. */
  @Post("guide")
  @HttpCode(200)
  async guide(@Req() request: Request, @Body() body: unknown) {
    const player = await this.sessions.require(request);
    const input = parseOrThrow(guideTelemetrySchema, body);
    return this.insights.guide(player.id, input);
  }

  private ops(_request: Request, token: string | undefined): void {
    const expected = this.config.liveOpsToken ?? "";
    if (expected.length < 16 || !sameToken(token, expected)) throw new ApiError(404, "NOT_FOUND", "Не найдено");
  }
}
