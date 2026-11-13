import {
  actionRequestSchema,
  createLifeSchema,
  historyQuerySchema,
  importLifeSchema,
  restoreSchema,
  successionSchema,
  uuidSchema,
  type ActionResponse,
  type HistoryPage,
  type ImportResponse,
  type LifeListItem,
  type LifeView,
  type LineageResponse,
  type SaveView,
  type SuccessionResponse
} from "@endemion/shared";
import type { HistoryEntry } from "@endemion/game-core";
import { Body, Controller, Get, HttpCode, Inject, Param, Post, Query, Req, Res } from "@nestjs/common";
import type { Request, Response } from "express";
import { ApiError, parseOrThrow } from "../common/api-error.js";
import { SessionService } from "../session/session.service.js";
import { LivesService } from "./lives.service.js";

function lifeIdOf(value: string): string {
  if (!uuidSchema.safeParse(value).success) throw new ApiError(404, "NOT_FOUND", "Жизнь не найдена");
  return value;
}

@Controller("lives")
export class LivesController {
  constructor(
    @Inject(LivesService) private readonly lives: LivesService,
    @Inject(SessionService) private readonly sessions: SessionService
  ) {}

  /** Новая жизнь. Сессия гостя создаётся сама, если её ещё нет */
  @Post()
  @HttpCode(201)
  async create(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
    @Body() body: unknown
  ): Promise<{ life: LifeView; entries: HistoryEntry[] }> {
    const input = parseOrThrow(createLifeSchema, body);
    const { player } = await this.sessions.ensure(request, response);
    return this.lives.create(player.id, input);
  }

  /**
   * Stage 04: перенос жизни из браузера. { importId, state, history }. Сервер проверяет сохранение, выдаёт новый seed
   * и исправляет невозможные значения; жизнь помечается как перенесённая. Сессия гостя создаётся сама, как при создании
   */
  @Post("import")
  @HttpCode(201)
  async import(@Req() request: Request, @Res({ passthrough: true }) response: Response, @Body() body: unknown): Promise<ImportResponse> {
    const input = parseOrThrow(importLifeSchema, body);
    const { player } = await this.sessions.ensure(request, response);
    return this.lives.importLife(player.id, input);
  }

  @Get()
  async list(@Req() request: Request): Promise<{ lives: LifeListItem[] }> {
    const player = await this.sessions.find(request);
    return { lives: player ? await this.lives.list(player.id) : [] };
  }

  @Get(":id")
  async get(@Req() request: Request, @Param("id") id: string): Promise<{ life: LifeView }> {
    const player = await this.sessions.require(request);
    return { life: await this.lives.get(player.id, lifeIdOf(id)) };
  }

  /** Действие игрока: { actionId, expectedVersion, action: { type: "advance" } | { type: "choose", choiceId } | { type: "travel", settlementId } } */
  @Post(":id/actions")
  @HttpCode(200)
  async act(@Req() request: Request, @Param("id") id: string, @Body() body: unknown): Promise<ActionResponse> {
    const input = parseOrThrow(actionRequestSchema, body);
    const player = await this.sessions.require(request);
    return this.lives.act(player.id, lifeIdOf(id), input);
  }

  @Get(":id/history")
  async history(@Req() request: Request, @Param("id") id: string, @Query() query: unknown): Promise<HistoryPage> {
    const input = parseOrThrow(historyQuerySchema, query);
    const player = await this.sessions.require(request);
    return this.lives.history(player.id, lifeIdOf(id), input);
  }

  @Get(":id/saves")
  async saves(@Req() request: Request, @Param("id") id: string): Promise<{ saves: SaveView[] }> {
    const player = await this.sessions.require(request);
    return { saves: await this.lives.saves(player.id, lifeIdOf(id)) };
  }

  @Post(":id/restore")
  @HttpCode(200)
  async restore(@Req() request: Request, @Param("id") id: string, @Body() body: unknown): Promise<ActionResponse> {
    const input = parseOrThrow(restoreSchema, body);
    const player = await this.sessions.require(request);
    return this.lives.restore(player.id, lifeIdOf(id), input);
  }

  /** Stage 03: продолжить род за наследника. { actionId, expectedVersion, heirId }. Ответ — закрытая жизнь и новая */
  @Post(":id/succession")
  @HttpCode(200)
  async succeed(@Req() request: Request, @Param("id") id: string, @Body() body: unknown): Promise<SuccessionResponse> {
    const input = parseOrThrow(successionSchema, body);
    const player = await this.sessions.require(request);
    return this.lives.succeed(player.id, lifeIdOf(id), input);
  }

  /** Stage 03: род — хроника, семейное древо, достижения, фамильные черты */
  @Get(":id/lineage")
  async lineage(@Req() request: Request, @Param("id") id: string): Promise<LineageResponse> {
    const player = await this.sessions.require(request);
    return { lineage: await this.lives.lineage(player.id, lifeIdOf(id)) };
  }
}
