import { isUniverseId } from "@endemion/game-core";
import { Body, Controller, Delete, Get, HttpCode, Inject, Param, Post, Query, Req } from "@nestjs/common";
import type { Request } from "express";
import { z } from "zod";
import { ApiError, parseOrThrow } from "../common/api-error.js";
import { SessionService } from "../session/session.service.js";
import { MarketService } from "./market.service.js";

const id = z.uuid();

const createSchema = z.strictObject({
  actionId: id,
  lifeId: id,
  goodId: z.string().trim().min(1).max(48),
  qty: z.number().int().min(1).max(5),
  unitPrice: z.number().int().min(1).max(1_000_000_000),
  expectedVersion: z.number().int().min(1)
});

const buySchema = z.strictObject({
  actionId: id,
  buyerLifeId: id,
  expectedVersion: z.number().int().min(1)
});

const cancelSchema = z.strictObject({
  expectedVersion: z.number().int().min(1)
});

const idOf = (value: string): string => {
  if (!id.safeParse(value).success) throw new ApiError(404, "NOT_FOUND", "Предложение не найдено.");
  return value;
};

@Controller("market")
export class MarketController {
  constructor(
    @Inject(MarketService) private readonly market: MarketService,
    @Inject(SessionService) private readonly sessions: SessionService
  ) {}

  @Get()
  async board(@Req() request: Request, @Query("universeId") universeId?: string) {
    if (!universeId || !isUniverseId(universeId)) {
      throw new ApiError(400, "VALIDATION", "Укажите мир.");
    }
    const player = await this.sessions.find(request);
    return this.market.board(universeId, player?.id ?? null);
  }

  @Post("offers")
  @HttpCode(201)
  async create(@Req() request: Request, @Body() body: unknown) {
    const { player } = await this.sessions.requireAccount(request);
    const input = parseOrThrow(createSchema, body);
    return this.market.create(player.id, input);
  }

  @Post("offers/:offerId/buy")
  @HttpCode(200)
  async buy(@Req() request: Request, @Param("offerId") offerId: string, @Body() body: unknown) {
    const { player } = await this.sessions.requireAccount(request);
    const input = parseOrThrow(buySchema, body);
    return this.market.buy(player.id, idOf(offerId), input);
  }

  @Delete("offers/:offerId")
  @HttpCode(200)
  async cancel(@Req() request: Request, @Param("offerId") offerId: string, @Body() body: unknown) {
    const { player } = await this.sessions.requireAccount(request);
    const input = parseOrThrow(cancelSchema, body);
    return this.market.cancel(player.id, idOf(offerId), input);
  }
}
