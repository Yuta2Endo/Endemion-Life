import { Body, Controller, Get, HttpCode, Inject, Param, Post, Query, Req } from "@nestjs/common";
import type { Request } from "express";
import { z } from "zod";
import { ApiError, parseOrThrow } from "../common/api-error.js";
import { SessionService } from "../session/session.service.js";
import { GuildService } from "./guild.service.js";

const createSchema = z.strictObject({
  universeId: z.string().min(1).max(32),
  name: z.string().trim().min(3).max(40),
  description: z.string().trim().max(500).optional(),
  visibility: z.enum(["public", "request"]).optional()
});
const projectSchema = z.strictObject({
  title: z.string().trim().min(3).max(80),
  description: z.string().trim().max(500).optional(),
  target: z.number().int().min(100).max(10_000)
});
const contributeSchema = z.strictObject({
  actionId: z.uuid(),
  amount: z.number().int().min(1).max(100)
});
const targetSchema = z.strictObject({ playerId: z.uuid() });
const listSchema = z.object({ universeId: z.string().min(1).max(32).optional() });

function idOf(value: string): string {
  if (!z.uuid().safeParse(value).success) throw new ApiError(404, "NOT_FOUND", "Не найдено");
  return value;
}

@Controller("guilds")
export class GuildController {
  constructor(
    @Inject(GuildService) private readonly guilds: GuildService,
    @Inject(SessionService) private readonly sessions: SessionService
  ) {}

  @Get()
  async list(@Req() request: Request, @Query() query: unknown) {
    const { player } = await this.sessions.requireAccount(request);
    const input = parseOrThrow(listSchema, query);
    return { guilds: await this.guilds.list(player.id, input.universeId) };
  }

  @Post()
  @HttpCode(201)
  async create(@Req() request: Request, @Body() body: unknown) {
    const { player } = await this.sessions.requireAccount(request);
    return this.guilds.create(player.id, parseOrThrow(createSchema, body));
  }

  @Get(":id")
  async detail(@Req() request: Request, @Param("id") id: string) {
    const { player } = await this.sessions.requireAccount(request);
    return this.guilds.detail(player.id, idOf(id));
  }

  @Post(":id/join")
  @HttpCode(200)
  async join(@Req() request: Request, @Param("id") id: string) {
    const { player } = await this.sessions.requireAccount(request);
    return this.guilds.join(player.id, idOf(id));
  }

  @Post(":id/requests/:requestId/accept")
  @HttpCode(200)
  async accept(@Req() request: Request, @Param("id") id: string, @Param("requestId") requestId: string) {
    const { player } = await this.sessions.requireAccount(request);
    return this.guilds.decide(player.id, idOf(id), idOf(requestId), true);
  }

  @Post(":id/requests/:requestId/reject")
  @HttpCode(200)
  async reject(@Req() request: Request, @Param("id") id: string, @Param("requestId") requestId: string) {
    const { player } = await this.sessions.requireAccount(request);
    return this.guilds.decide(player.id, idOf(id), idOf(requestId), false);
  }

  @Post(":id/leave")
  @HttpCode(200)
  async leave(@Req() request: Request, @Param("id") id: string) {
    const { player } = await this.sessions.requireAccount(request);
    return this.guilds.leave(player.id, idOf(id));
  }

  @Post(":id/kick")
  @HttpCode(200)
  async kick(@Req() request: Request, @Param("id") id: string, @Body() body: unknown) {
    const { player } = await this.sessions.requireAccount(request);
    return this.guilds.kick(player.id, idOf(id), parseOrThrow(targetSchema, body).playerId);
  }

  @Post(":id/transfer")
  @HttpCode(200)
  async transfer(@Req() request: Request, @Param("id") id: string, @Body() body: unknown) {
    const { player } = await this.sessions.requireAccount(request);
    return this.guilds.transfer(player.id, idOf(id), parseOrThrow(targetSchema, body).playerId);
  }

  @Post(":id/disband")
  @HttpCode(200)
  async disband(@Req() request: Request, @Param("id") id: string) {
    const { player } = await this.sessions.requireAccount(request);
    return this.guilds.disband(player.id, idOf(id));
  }

  @Post(":id/projects")
  @HttpCode(201)
  async createProject(@Req() request: Request, @Param("id") id: string, @Body() body: unknown) {
    const { player } = await this.sessions.requireAccount(request);
    return this.guilds.createProject(player.id, idOf(id), parseOrThrow(projectSchema, body));
  }

  @Post(":id/projects/:projectId/contribute")
  @HttpCode(200)
  async contribute(@Req() request: Request, @Param("id") id: string, @Param("projectId") projectId: string, @Body() body: unknown) {
    const { player } = await this.sessions.requireAccount(request);
    const input = parseOrThrow(contributeSchema, body);
    return this.guilds.contribute(player.id, idOf(id), idOf(projectId), input.amount, input.actionId);
  }

  @Get(":id/audit")
  async audit(@Req() request: Request, @Param("id") id: string) {
    const { player } = await this.sessions.requireAccount(request);
    return { entries: await this.guilds.auditLog(player.id, idOf(id)) };
  }
}
