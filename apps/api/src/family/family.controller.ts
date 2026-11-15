import { Body, Controller, Get, HttpCode, Inject, Param, Patch, Post, Query, Req } from "@nestjs/common";
import type { Request } from "express";
import { z } from "zod";
import { ApiError, parseOrThrow } from "../common/api-error.js";
import { SessionService } from "../session/session.service.js";
import { FamilyService } from "./family.service.js";

const uuid = z.uuid();
const idOf = (value: string): string => {
  if (!uuid.safeParse(value).success) throw new ApiError(404, "NOT_FOUND", "Семья не найдена.");
  return value;
};

const createSchema = z.strictObject({
  universeId: z.string().trim().min(1).max(32),
  name: z.string().trim().min(3).max(40),
  motto: z.string().trim().max(80).optional(),
  description: z.string().trim().max(500).optional(),
  visibility: z.enum(["public", "invite"]).optional()
});
const updateSchema = z.strictObject({
  name: z.string().trim().min(3).max(40),
  motto: z.string().trim().max(80),
  description: z.string().trim().max(500),
  visibility: z.enum(["public", "invite"])
});
const targetSchema = z.strictObject({ playerId: z.uuid() });
const enterpriseCreateSchema = z.strictObject({ actionId: z.uuid(), name: z.string().trim().min(3).max(40) });
const enterpriseInvestSchema = z.strictObject({ actionId: z.uuid(), amount: z.int().min(10).max(10_000) });
const enterpriseCollectSchema = z.strictObject({ actionId: z.uuid() });
const listSchema = z.object({ universeId: z.string().trim().min(1).max(32).optional() });
const consentSchema = z.strictObject({ accepts: z.boolean() });
const treasurySchema = z.strictObject({
  actionId: z.uuid(),
  lifeId: z.uuid(),
  direction: z.enum(["deposit", "withdraw"]),
  amount: z.int().min(1).max(1_000_000_000),
  note: z.string().trim().max(120).optional()
});

@Controller("families")
export class FamilyController {
  constructor(
    @Inject(FamilyService) private readonly families: FamilyService,
    @Inject(SessionService) private readonly sessions: SessionService
  ) {}

  @Get()
  async list(@Req() request: Request, @Query() query: unknown) {
    const { player } = await this.sessions.requireAccount(request);
    const input = parseOrThrow(listSchema, query);
    return { families: await this.families.list(player.id, input.universeId) };
  }

  @Get("invites")
  async incoming(@Req() request: Request) {
    const { player } = await this.sessions.requireAccount(request);
    return { invites: await this.families.incoming(player.id) };
  }

  @Get("mine")
  async mine(@Req() request: Request, @Query() query: unknown) {
    const { player } = await this.sessions.requireAccount(request);
    const input = parseOrThrow(listSchema, query);
    if (!input.universeId) throw new ApiError(400, "VALIDATION", "Укажите мир.");
    return { family: await this.families.mine(player.id, input.universeId) };
  }

  @Get(":id/enterprise")
  async enterprise(@Req() request: Request, @Param("id") id: string) {
    const { player } = await this.sessions.requireAccount(request);
    return { enterprise: await this.families.enterprise(player.id, idOf(id)) };
  }

  @Post(":id/enterprise")
  @HttpCode(200)
  async createEnterprise(@Req() request: Request, @Param("id") id: string, @Body() body: unknown) {
    const { player } = await this.sessions.requireAccount(request);
    return this.families.createEnterprise(player.id, idOf(id), parseOrThrow(enterpriseCreateSchema, body));
  }

  @Post(":id/enterprise/invest")
  @HttpCode(200)
  async investEnterprise(@Req() request: Request, @Param("id") id: string, @Body() body: unknown) {
    const { player } = await this.sessions.requireAccount(request);
    return this.families.investEnterprise(player.id, idOf(id), parseOrThrow(enterpriseInvestSchema, body));
  }

  @Post(":id/enterprise/collect")
  @HttpCode(200)
  async collectEnterprise(@Req() request: Request, @Param("id") id: string, @Body() body: unknown) {
    const { player } = await this.sessions.requireAccount(request);
    return this.families.collectEnterprise(player.id, idOf(id), parseOrThrow(enterpriseCollectSchema, body));
  }

  @Post()
  @HttpCode(201)
  async create(@Req() request: Request, @Body() body: unknown) {
    const { player } = await this.sessions.requireAccount(request);
    return this.families.create(player.id, parseOrThrow(createSchema, body));
  }

  @Post(":id/consent")
  @HttpCode(200)
  async consent(@Req() request: Request, @Param("id") id: string, @Body() body: unknown) {
    const { player } = await this.sessions.requireAccount(request);
    const input = parseOrThrow(consentSchema, body);
    return this.families.consent(player.id, idOf(id), input.accepts);
  }

  @Post(":id/treasury")
  @HttpCode(200)
  async treasury(@Req() request: Request, @Param("id") id: string, @Body() body: unknown) {
    const { player } = await this.sessions.requireAccount(request);
    const input = parseOrThrow(treasurySchema, body);
    return this.families.treasury(player.id, idOf(id), input);
  }

  @Get(":id")
  async detail(@Req() request: Request, @Param("id") id: string) {
    const { player } = await this.sessions.requireAccount(request);
    return this.families.detail(player.id, idOf(id));
  }

  @Patch(":id")
  async update(@Req() request: Request, @Param("id") id: string, @Body() body: unknown) {
    const { player } = await this.sessions.requireAccount(request);
    return this.families.update(player.id, idOf(id), parseOrThrow(updateSchema, body));
  }

  @Post(":id/invites")
  @HttpCode(201)
  async invite(@Req() request: Request, @Param("id") id: string, @Body() body: unknown) {
    const { player } = await this.sessions.requireAccount(request);
    const input = parseOrThrow(targetSchema, body);
    return this.families.invite(player.id, idOf(id), input.playerId);
  }

  @Post("invites/:inviteId/accept")
  @HttpCode(200)
  async accept(@Req() request: Request, @Param("inviteId") inviteId: string) {
    const { player } = await this.sessions.requireAccount(request);
    return this.families.accept(player.id, idOf(inviteId));
  }

  @Post("invites/:inviteId/decline")
  @HttpCode(200)
  async decline(@Req() request: Request, @Param("inviteId") inviteId: string) {
    const { player } = await this.sessions.requireAccount(request);
    return this.families.decline(player.id, idOf(inviteId));
  }

  @Post(":id/leave")
  @HttpCode(200)
  async leave(@Req() request: Request, @Param("id") id: string) {
    const { player } = await this.sessions.requireAccount(request);
    return this.families.leave(player.id, idOf(id));
  }

  @Post(":id/kick")
  @HttpCode(200)
  async kick(@Req() request: Request, @Param("id") id: string, @Body() body: unknown) {
    const { player } = await this.sessions.requireAccount(request);
    const input = parseOrThrow(targetSchema, body);
    return this.families.kick(player.id, idOf(id), input.playerId);
  }

  @Post(":id/transfer")
  @HttpCode(200)
  async transfer(@Req() request: Request, @Param("id") id: string, @Body() body: unknown) {
    const { player } = await this.sessions.requireAccount(request);
    const input = parseOrThrow(targetSchema, body);
    return this.families.transfer(player.id, idOf(id), input.playerId);
  }

  @Post(":id/disband")
  @HttpCode(200)
  async disband(@Req() request: Request, @Param("id") id: string) {
    const { player } = await this.sessions.requireAccount(request);
    return this.families.disband(player.id, idOf(id));
  }

  @Get(":id/audit")
  async audit(@Req() request: Request, @Param("id") id: string) {
    const { player } = await this.sessions.requireAccount(request);
    return { entries: await this.families.auditLog(player.id, idOf(id)) };
  }

  @Get(":id/chronicle")
  async chronicle(@Req() request: Request, @Param("id") id: string) {
    const { player } = await this.sessions.requireAccount(request);
    return { entries: await this.families.chronicle(player.id, idOf(id)) };
  }
}
