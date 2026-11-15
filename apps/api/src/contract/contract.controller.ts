import { isUniverseId } from "@endemion/game-core";
import { Body, Controller, Delete, Get, HttpCode, Inject, Param, Post, Query, Req } from "@nestjs/common";
import type { Request } from "express";
import { z } from "zod";
import { ApiError, parseOrThrow } from "../common/api-error.js";
import { SessionService } from "../session/session.service.js";
import { MarketService } from "../market/market.service.js";

const uuid = z.uuid();
const createSchema = z.strictObject({
  actionId: uuid,
  lifeId: uuid,
  goodId: z.string().trim().min(1).max(48),
  qty: z.int().min(1).max(5),
  price: z.int().min(1).max(1_000_000_000),
  expectedVersion: z.int().min(1)
});
const acceptSchema = z.strictObject({ actionId: uuid, buyerLifeId: uuid, expectedVersion: z.int().min(1) });

@Controller("contracts")
export class ContractController {
  constructor(
    @Inject(MarketService) private readonly market: MarketService,
    @Inject(SessionService) private readonly sessions: SessionService
  ) {}

  @Get()
  async list(@Req() request: Request, @Query("universeId") universeId: string) {
    if (!universeId || !isUniverseId(universeId)) throw new ApiError(400, "VALIDATION", "Нужен мир.");
    const player = await this.sessions.find(request);
    return this.market.contracts(player?.id ?? null, universeId);
  }

  private idOf(value: string): string {
    if (!uuid.safeParse(value).success) throw new ApiError(404, "NOT_FOUND", "Контракт не найден.");
    return value;
  }

  @Post()
  @HttpCode(201)
  async create(@Req() request: Request, @Body() body: unknown) {
    const { player } = await this.sessions.requireAccount(request);
    return this.market.createContract(player.id, parseOrThrow(createSchema, body));
  }

  @Post(":id/accept")
  @HttpCode(200)
  async accept(@Req() request: Request, @Param("id") id: string, @Body() body: unknown) {
    const { player } = await this.sessions.requireAccount(request);
    return this.market.acceptContract(player.id, this.idOf(id), parseOrThrow(acceptSchema, body));
  }

  @Delete(":id")
  @HttpCode(200)
  async cancel(@Req() request: Request, @Param("id") id: string) {
    const { player } = await this.sessions.requireAccount(request);
    return this.market.cancelContract(player.id, this.idOf(id));
  }
}
