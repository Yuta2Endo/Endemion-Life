import { Prisma } from "@endemion/database";
import { isUniverseId, type UniverseId } from "@endemion/game-core";
import { Inject, Injectable } from "@nestjs/common";
import { ApiError } from "../common/api-error.js";
import { PrismaService } from "../prisma/prisma.service.js";

const MAX_MEMBERS = 30;
const MAX_ACTIVE_PROJECTS = 2;
const NAME_MIN = 3;
const NAME_MAX = 40;
const DESC_MAX = 500;
const PROJECT_TITLE_MAX = 80;
const PROJECT_TARGET_MIN = 100;
const PROJECT_TARGET_MAX = 10_000;
const CONTRIBUTION_MAX = 100;

type Db = Prisma.TransactionClient;
type Role = "leader" | "officer" | "member";

const nameOf = (player: { idUsername: string | null; idDisplayName: string | null }): string =>
  player.idDisplayName?.trim() || player.idUsername?.trim() || "Безымянный";

export interface GuildMemberView {
  playerId: string;
  name: string;
  role: Role;
  contributed: number;
  joinedAt: string;
}

export interface GuildProjectView {
  id: string;
  title: string;
  description: string;
  target: number;
  progress: number;
  status: "active" | "completed";
  createdAt: string;
  completedAt: string | null;
}

export interface GuildRequestView {
  id: string;
  playerId: string;
  name: string;
  status: string;
  createdAt: string;
}

export interface GuildView {
  id: string;
  universeId: UniverseId;
  name: string;
  description: string;
  visibility: "public" | "request";
  reputation: number;
  leaderId: string;
  leaderName: string;
  memberCount: number;
  myRole: Role | null;
  createdAt: string;
  members: GuildMemberView[];
  projects: GuildProjectView[];
  requests: GuildRequestView[];
}

interface GuildRow {
  id: string;
  universeId: string;
  name: string;
  description: string;
  visibility: string;
  reputation: number;
  leaderId: string;
  createdAt: Date;
  leader: { idUsername: string | null; idDisplayName: string | null };
  members: Array<{ playerId: string; role: string; contributed: number; joinedAt: Date; player: { idUsername: string | null; idDisplayName: string | null } }>;
  projects: Array<{ id: string; title: string; description: string; target: number; progress: number; status: string; createdAt: Date; completedAt: Date | null }>;
  requests: Array<{ id: string; playerId: string; status: string; createdAt: Date; player: { idUsername: string | null; idDisplayName: string | null } }>;
}

@Injectable()
export class GuildService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  private guildView(row: GuildRow, playerId: string): GuildView {
    const mine = row.members.find((member) => member.playerId === playerId);
    const officer = mine?.role === "leader" || mine?.role === "officer";
    return {
      id: row.id,
      universeId: row.universeId as UniverseId,
      name: row.name,
      description: row.description,
      visibility: row.visibility as "public" | "request",
      reputation: row.reputation,
      leaderId: row.leaderId,
      leaderName: nameOf(row.leader),
      memberCount: row.members.length,
      myRole: mine ? (mine.role as Role) : null,
      createdAt: row.createdAt.toISOString(),
      members: row.members
        .sort((a, b) => (a.role === "leader" ? -1 : b.role === "leader" ? 1 : a.joinedAt.getTime() - b.joinedAt.getTime()))
        .map((member) => ({
          playerId: member.playerId,
          name: nameOf(member.player),
          role: member.role as Role,
          contributed: member.contributed,
          joinedAt: member.joinedAt.toISOString()
        })),
      projects: row.projects.map((project) => ({
        id: project.id,
        title: project.title,
        description: project.description,
        target: project.target,
        progress: project.progress,
        status: project.status as "active" | "completed",
        createdAt: project.createdAt.toISOString(),
        completedAt: project.completedAt?.toISOString() ?? null
      })),
      requests: officer
        ? row.requests
            .filter((request) => request.status === "pending")
            .map((request) => ({
              id: request.id,
              playerId: request.playerId,
              name: nameOf(request.player),
              status: request.status,
              createdAt: request.createdAt.toISOString()
            }))
        : []
    };
  }

  private include = {
    leader: { select: { idUsername: true, idDisplayName: true } },
    members: {
      include: { player: { select: { idUsername: true, idDisplayName: true } } },
      orderBy: { joinedAt: "asc" as const }
    },
    projects: { orderBy: { createdAt: "desc" as const }, take: 20 },
    requests: {
      include: { player: { select: { idUsername: true, idDisplayName: true } } },
      orderBy: { createdAt: "asc" as const },
      take: 50
    }
  };

  private async lockGuild(tx: Db, guildId: string): Promise<void> {
    await tx.$queryRaw`SELECT id FROM guilds WHERE id = ${guildId}::uuid FOR UPDATE`;
  }

  private async lockPlayer(tx: Db, playerId: string): Promise<void> {
    await tx.$queryRaw`SELECT id FROM players WHERE id = ${playerId}::uuid FOR UPDATE`;
  }

  private requireRole(role: Role | null, allowed: Role[]): Role {
    if (!role || !allowed.includes(role)) throw new ApiError(403, "FORBIDDEN", "Недостаточно прав в гильдии");
    return role;
  }

  private async audit(tx: Db, guildId: string, actorId: string, action: string, detail: Prisma.InputJsonValue = {}): Promise<void> {
    await tx.guildAudit.create({ data: { guildId, actorId, action, detail } });
  }

  async list(playerId: string, universeId?: string): Promise<GuildView[]> {
    if (universeId && !isUniverseId(universeId)) throw new ApiError(400, "VALIDATION", "Неизвестный мир");
    const rows = await this.prisma.client.guild.findMany({
      where: universeId ? { universeId } : {},
      include: this.include,
      orderBy: [{ reputation: "desc" }, { createdAt: "asc" }],
      take: 100
    });
    const mine = await this.prisma.client.guildMember.findMany({ where: { playerId }, select: { guildId: true } });
    const myIds = new Set(mine.map((row) => row.guildId));
    return rows.map((row) => this.guildView(row as GuildRow, myIds.has(row.id) ? playerId : ""));
  }

  async detail(playerId: string, guildId: string): Promise<GuildView> {
    const row = await this.prisma.client.guild.findUnique({ where: { id: guildId }, include: this.include });
    if (!row) throw new ApiError(404, "NOT_FOUND", "Гильдия не найдена");
    return this.guildView(row, playerId);
  }

  async create(playerId: string, input: { universeId: string; name: string; description?: string; visibility?: "public" | "request" }): Promise<GuildView> {
    if (!isUniverseId(input.universeId)) throw new ApiError(400, "VALIDATION", "Неизвестный мир");
    const name = input.name.trim();
    if (name.length < NAME_MIN || name.length > NAME_MAX) throw new ApiError(400, "VALIDATION", "Название: 3–40 символов");
    const description = (input.description ?? "").trim();
    if (description.length > DESC_MAX) throw new ApiError(400, "VALIDATION", "Слишком длинное описание");
    const visibility = input.visibility ?? "public";
    if (visibility !== "public" && visibility !== "request") throw new ApiError(400, "VALIDATION", "Неверный режим вступления");

    try {
      const guildId = await this.prisma.client.$transaction(async (tx) => {
        await this.lockPlayer(tx, playerId);
        const existing = await tx.guildMember.findUnique({ where: { playerId_universeId: { playerId, universeId: input.universeId } } });
        if (existing) throw new ApiError(409, "ALREADY_IN_GUILD", "Вы уже состоите в гильдии этого мира");
        const guild = await tx.guild.create({
          data: {
            universeId: input.universeId,
            name,
            nameKey: name.toLocaleLowerCase("ru"),
            description,
            visibility,
            leaderId: playerId
          }
        });
        await tx.guildMember.create({ data: { guildId: guild.id, playerId, universeId: input.universeId, role: "leader" } });
        await this.audit(tx, guild.id, playerId, "guild.create", { name });
        return guild.id;
      });
      return this.detail(playerId, guildId);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        throw new ApiError(409, "GUILD_NAME_TAKEN", "Гильдия с таким названием уже существует в этом мире");
      }
      throw error;
    }
  }

  async join(playerId: string, guildId: string): Promise<GuildView> {
    await this.prisma.client.$transaction(async (tx) => {
      await this.lockGuild(tx, guildId);
      const guild = await tx.guild.findUnique({ where: { id: guildId } });
      if (!guild) throw new ApiError(404, "NOT_FOUND", "Гильдия не найдена");
      const existing = await tx.guildMember.findUnique({ where: { playerId_universeId: { playerId, universeId: guild.universeId } } });
      if (existing) throw new ApiError(409, "ALREADY_IN_GUILD", "Вы уже состоите в гильдии этого мира");
      const count = await tx.guildMember.count({ where: { guildId } });
      if (count >= MAX_MEMBERS) throw new ApiError(409, "GUILD_FULL", "В гильдии нет свободных мест");
      if (guild.visibility === "request") {
        await tx.guildJoinRequest.upsert({
          where: { guildId_playerId: { guildId, playerId } },
          create: { guildId, playerId },
          update: { status: "pending", decidedAt: null, createdAt: new Date() }
        });
        await this.audit(tx, guildId, playerId, "join.request");
        return;
      }
      await tx.guildMember.create({ data: { guildId, playerId, universeId: guild.universeId, role: "member" } });
      await this.audit(tx, guildId, playerId, "member.join");
    });
    return this.detail(playerId, guildId);
  }

  async decide(playerId: string, guildId: string, requestId: string, accept: boolean): Promise<GuildView> {
    await this.prisma.client.$transaction(async (tx) => {
      await this.lockGuild(tx, guildId);
      const actor = await tx.guildMember.findFirst({ where: { guildId, playerId } });
      this.requireRole(actor?.role as Role | null, ["leader", "officer"]);
      const request = await tx.guildJoinRequest.findUnique({ where: { id: requestId } });
      if (!request || request.guildId !== guildId || request.status !== "pending") throw new ApiError(404, "NOT_FOUND", "Заявка не найдена");
      if (accept) {
        const guild = await tx.guild.findUniqueOrThrow({ where: { id: guildId } });
        const existing = await tx.guildMember.findUnique({ where: { playerId_universeId: { playerId: request.playerId, universeId: guild.universeId } } });
        if (existing) throw new ApiError(409, "ALREADY_IN_GUILD", "Игрок уже состоит в гильдии этого мира");
        const count = await tx.guildMember.count({ where: { guildId } });
        if (count >= MAX_MEMBERS) throw new ApiError(409, "GUILD_FULL", "В гильдии нет свободных мест");
        await tx.guildMember.create({ data: { guildId, playerId: request.playerId, universeId: guild.universeId, role: "member" } });
        await tx.guildJoinRequest.update({ where: { id: requestId }, data: { status: "accepted", decidedAt: new Date() } });
        await this.audit(tx, guildId, playerId, "member.accept", { playerId: request.playerId });
      } else {
        await tx.guildJoinRequest.update({ where: { id: requestId }, data: { status: "rejected", decidedAt: new Date() } });
        await this.audit(tx, guildId, playerId, "member.reject", { playerId: request.playerId });
      }
    });
    return this.detail(playerId, guildId);
  }

  async leave(playerId: string, guildId: string): Promise<{ left: true }> {
    await this.prisma.client.$transaction(async (tx) => {
      await this.lockGuild(tx, guildId);
      const member = await tx.guildMember.findFirst({ where: { guildId, playerId } });
      if (!member) throw new ApiError(404, "NOT_FOUND", "Вы не состоите в этой гильдии");
      if (member.role === "leader") {
        const count = await tx.guildMember.count({ where: { guildId } });
        if (count > 1) throw new ApiError(400, "VALIDATION", "Передайте лидерство или распустите гильдию");
        await tx.guild.delete({ where: { id: guildId } });
        return;
      }
      await tx.guildMember.delete({ where: { id: member.id } });
      await this.audit(tx, guildId, playerId, "member.leave");
    });
    return { left: true };
  }

  async kick(playerId: string, guildId: string, targetId: string): Promise<GuildView> {
    if (playerId === targetId) throw new ApiError(400, "VALIDATION", "Используйте выход из гильдии");
    await this.prisma.client.$transaction(async (tx) => {
      await this.lockGuild(tx, guildId);
      const actor = await tx.guildMember.findFirst({ where: { guildId, playerId } });
      const role = this.requireRole(actor?.role as Role | null, ["leader", "officer"]);
      const target = await tx.guildMember.findFirst({ where: { guildId, playerId: targetId } });
      if (!target) throw new ApiError(404, "NOT_FOUND", "Участник не найден");
      if (target.role === "leader") throw new ApiError(403, "FORBIDDEN", "Нельзя исключить лидера");
      if (role === "officer" && target.role === "officer") throw new ApiError(403, "FORBIDDEN", "Офицер не может исключить офицера");
      await tx.guildMember.delete({ where: { id: target.id } });
      await this.audit(tx, guildId, playerId, "member.kick", { playerId: targetId });
    });
    return this.detail(playerId, guildId);
  }

  async transfer(playerId: string, guildId: string, targetId: string): Promise<GuildView> {
    if (playerId === targetId) throw new ApiError(400, "VALIDATION", "Вы уже лидер");
    await this.prisma.client.$transaction(async (tx) => {
      await this.lockGuild(tx, guildId);
      const actor = await tx.guildMember.findFirst({ where: { guildId, playerId } });
      this.requireRole(actor?.role as Role | null, ["leader"]);
      const target = await tx.guildMember.findFirst({ where: { guildId, playerId: targetId } });
      if (!target) throw new ApiError(404, "NOT_FOUND", "Участник не найден");
      await tx.guildMember.update({ where: { id: actor!.id }, data: { role: "officer" } });
      await tx.guildMember.update({ where: { id: target.id }, data: { role: "leader" } });
      await tx.guild.update({ where: { id: guildId }, data: { leaderId: targetId } });
      await this.audit(tx, guildId, playerId, "leader.transfer", { playerId: targetId });
    });
    return this.detail(playerId, guildId);
  }

  async disband(playerId: string, guildId: string): Promise<{ disbanded: true }> {
    await this.prisma.client.$transaction(async (tx) => {
      await this.lockGuild(tx, guildId);
      const actor = await tx.guildMember.findFirst({ where: { guildId, playerId } });
      this.requireRole(actor?.role as Role | null, ["leader"]);
      await this.audit(tx, guildId, playerId, "guild.disband");
      await tx.guild.delete({ where: { id: guildId } });
    });
    return { disbanded: true };
  }

  async createProject(playerId: string, guildId: string, input: { title: string; description?: string; target: number }): Promise<GuildView> {
    const title = input.title.trim();
    if (title.length < 3 || title.length > PROJECT_TITLE_MAX) throw new ApiError(400, "VALIDATION", "Название проекта: 3–80 символов");
    if (!Number.isInteger(input.target) || input.target < PROJECT_TARGET_MIN || input.target > PROJECT_TARGET_MAX) {
      throw new ApiError(400, "VALIDATION", "Цель проекта: 100–10000");
    }
    const description = (input.description ?? "").trim();
    if (description.length > DESC_MAX) throw new ApiError(400, "VALIDATION", "Слишком длинное описание");
    await this.prisma.client.$transaction(async (tx) => {
      await this.lockGuild(tx, guildId);
      const actor = await tx.guildMember.findFirst({ where: { guildId, playerId } });
      this.requireRole(actor?.role as Role | null, ["leader", "officer"]);
      const active = await tx.guildProject.count({ where: { guildId, status: "active" } });
      if (active >= MAX_ACTIVE_PROJECTS) throw new ApiError(409, "GUILD_PROJECT_LIMIT", "Слишком много активных проектов");
      const project = await tx.guildProject.create({ data: { guildId, title, description, target: input.target } });
      await this.audit(tx, guildId, playerId, "project.create", { projectId: project.id, target: input.target });
    });
    return this.detail(playerId, guildId);
  }

  async contribute(playerId: string, guildId: string, projectId: string, amount: number, actionId: string): Promise<GuildView & { replayed: boolean }> {
    if (!Number.isInteger(amount) || amount < 1 || amount > CONTRIBUTION_MAX) throw new ApiError(400, "VALIDATION", "Вклад: 1–100");
    let replayed = false;
    await this.prisma.client.$transaction(async (tx) => {
      await this.lockGuild(tx, guildId);
      const member = await tx.guildMember.findFirst({ where: { guildId, playerId } });
      if (!member) throw new ApiError(403, "FORBIDDEN", "Только участники гильдии могут вносить вклад");
      const project = await tx.guildProject.findUnique({ where: { id: projectId } });
      if (!project || project.guildId !== guildId) throw new ApiError(404, "NOT_FOUND", "Проект не найден");
      const existing = await tx.guildContribution.findUnique({ where: { playerId_actionId: { playerId, actionId } } });
      if (existing) {
        if (existing.projectId !== projectId) throw new ApiError(409, "ACTION_ID_REUSED", "Этот actionId уже использован");
        replayed = true;
        return;
      }
      if (project.status !== "active") throw new ApiError(409, "VALIDATION", "Проект уже завершён");
      const next = Math.min(project.target, project.progress + amount);
      const completed = next >= project.target;
      await tx.guildContribution.create({ data: { projectId, playerId, actionId, amount } });
      await tx.guildProject.update({ where: { id: projectId }, data: { progress: next, status: completed ? "completed" : "active", completedAt: completed ? new Date() : null } });
      await tx.guildMember.update({ where: { id: member.id }, data: { contributed: { increment: amount } } });
      if (completed) await tx.guild.update({ where: { id: guildId }, data: { reputation: { increment: 10 } } });
      await this.audit(tx, guildId, playerId, "project.contribute", { projectId, amount, completed });
    });
    return { ...(await this.detail(playerId, guildId)), replayed };
  }

  async auditLog(playerId: string, guildId: string): Promise<Array<{ id: string; actorId: string; action: string; detail: unknown; createdAt: string }>> {
    const member = await this.prisma.client.guildMember.findFirst({ where: { guildId, playerId } });
    if (!member) throw new ApiError(403, "FORBIDDEN", "Журнал доступен участникам гильдии");
    const rows = await this.prisma.client.guildAudit.findMany({ where: { guildId }, orderBy: { createdAt: "desc" }, take: 100 });
    return rows.map((row) => ({ id: row.id, actorId: row.actorId, action: row.action, detail: row.detail, createdAt: row.createdAt.toISOString() }));
  }
}
