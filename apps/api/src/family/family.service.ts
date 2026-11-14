import { Prisma } from "@endemion/database";
import { isUniverseId, parseSave } from "@endemion/game-core";
import { Inject, Injectable } from "@nestjs/common";
import { ApiError } from "../common/api-error.js";
import { PrismaService } from "../prisma/prisma.service.js";

type Tx = Prisma.TransactionClient;
type FamilyRole = "leader" | "elder" | "member";

export const MAX_FAMILY_MEMBERS = 30;
const NAME_MIN = 3;
const NAME_MAX = 40;
const MOTTO_MAX = 80;
const DESCRIPTION_MAX = 500;

const nameOf = (player: { idUsername: string | null; idDisplayName: string | null }): string =>
  player.idDisplayName?.trim() || player.idUsername?.trim() || "Безымянный";

export interface FamilyMemberView {
  playerId: string;
  name: string;
  role: FamilyRole;
  contribution: number;
  acceptsInheritance: boolean;
  joinedAt: string;
}

export interface FamilyTreasuryEntryView {
  id: string;
  direction: "deposit" | "withdraw";
  amount: number;
  balanceAfter: number;
  note: string;
  actorName: string;
  createdAt: string;
}

export interface FamilyInviteView {
  id: string;
  playerId: string;
  name: string;
  status: "pending" | "accepted" | "declined" | "cancelled";
  createdAt: string;
}

export interface IncomingFamilyInviteView {
  id: string;
  familyId: string;
  familyName: string;
  universeId: string;
  inviterName: string;
  createdAt: string;
}

export interface FamilySummaryView {
  id: string;
  universeId: string;
  name: string;
  motto: string;
  description: string;
  visibility: "public" | "invite";
  leaderId: string;
  leaderName: string;
  memberCount: number;
  reputation: number;
  treasury: number;
  myRole: FamilyRole | null;
  createdAt: string;
}

export interface FamilyDetailView extends FamilySummaryView {
  members: FamilyMemberView[];
  invites: FamilyInviteView[];
  treasuryEntries: FamilyTreasuryEntryView[];
}

const memberSelect = {
  playerId: true,
  role: true,
  contribution: true,
  acceptsInheritance: true,
  joinedAt: true,
  player: { select: { idUsername: true, idDisplayName: true } }
} as const;

@Injectable()
export class FamilyService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  private get db() {
    return this.prisma.client;
  }

  private async lockFamily(tx: Tx, familyId: string): Promise<void> {
    await tx.$queryRaw`SELECT id FROM families WHERE id = ${familyId}::uuid FOR UPDATE`;
  }

  private async lockPlayer(tx: Tx, playerId: string): Promise<void> {
    await tx.$queryRaw`SELECT id FROM players WHERE id = ${playerId}::uuid FOR UPDATE`;
  }

  private async lockInvite(tx: Tx, inviteId: string): Promise<void> {
    await tx.$queryRaw`SELECT id FROM family_invites WHERE id = ${inviteId}::uuid FOR UPDATE`;
  }

  private async audit(tx: Tx, familyId: string, actorId: string, action: string, detail: Prisma.InputJsonValue = {}): Promise<void> {
    await tx.familyAudit.create({ data: { familyId, actorId, action, detail } });
  }

  private memberView(member: {
    playerId: string;
    role: string;
    contribution: number;
    acceptsInheritance: boolean;
    joinedAt: Date;
    player: { idUsername: string | null; idDisplayName: string | null };
  }): FamilyMemberView {
    return {
      playerId: member.playerId,
      name: nameOf(member.player),
      role: member.role as FamilyRole,
      contribution: member.contribution,
      acceptsInheritance: member.acceptsInheritance,
      joinedAt: member.joinedAt.toISOString()
    };
  }

  private summary(
    family: {
      id: string;
      universeId: string;
      name: string;
      motto: string;
      description: string;
      visibility: string;
      leaderId: string;
      reputation: number;
      treasury: number;
      createdAt: Date;
      leader: { idUsername: string | null; idDisplayName: string | null };
      _count: { members: number };
    },
    myRole: FamilyRole | null
  ): FamilySummaryView {
    return {
      id: family.id,
      universeId: family.universeId,
      name: family.name,
      motto: family.motto,
      description: family.description,
      visibility: family.visibility as "public" | "invite",
      leaderId: family.leaderId,
      leaderName: nameOf(family.leader),
      memberCount: family._count.members,
      reputation: family.reputation,
      treasury: family.treasury,
      myRole,
      createdAt: family.createdAt.toISOString()
    };
  }

  private async requireRole(tx: Tx, familyId: string, playerId: string, allowed: FamilyRole[]): Promise<FamilyRole> {
    const member = await tx.familyMember.findUnique({
      where: { familyId_playerId: { familyId, playerId } },
      select: { role: true }
    });
    const role = (member?.role as FamilyRole | undefined) ?? null;
    if (!role || !allowed.includes(role)) throw new ApiError(403, "FORBIDDEN", "Недостаточно прав в семье.");
    return role;
  }

  async list(playerId: string, universeId?: string): Promise<FamilySummaryView[]> {
    if (universeId && !isUniverseId(universeId)) throw new ApiError(400, "VALIDATION", "Неизвестный мир.");
    const rows = await this.db.family.findMany({
      where: universeId ? { universeId } : {},
      include: {
        leader: { select: { idUsername: true, idDisplayName: true } },
        _count: { select: { members: true } }
      },
      orderBy: [{ reputation: "desc" }, { createdAt: "asc" }],
      take: 100
    });
    const mine = await this.db.familyMember.findMany({
      where: { playerId, ...(universeId ? { universeId } : {}) },
      select: { familyId: true, role: true }
    });
    const roles = new Map(mine.map((row) => [row.familyId, row.role as FamilyRole]));
    return rows.map((row) => this.summary(row, roles.get(row.id) ?? null));
  }

  async detail(playerId: string, familyId: string): Promise<FamilyDetailView> {
    const family = await this.db.family.findUnique({
      where: { id: familyId },
      include: {
        leader: { select: { id: true, idUsername: true, idDisplayName: true } },
        _count: { select: { members: true } },
        members: { select: memberSelect, orderBy: [{ role: "asc" }, { joinedAt: "asc" }] },
        invites: {
          where: { status: "pending" },
          select: {
            id: true,
            inviteeId: true,
            status: true,
            createdAt: true,
            invitee: { select: { idUsername: true, idDisplayName: true } }
          },
          orderBy: { createdAt: "asc" }
        },
        treasuryEntries: {
          select: {
            id: true,
            direction: true,
            amount: true,
            balanceAfter: true,
            note: true,
            createdAt: true,
            actor: { select: { idUsername: true, idDisplayName: true } }
          },
          orderBy: { createdAt: "desc" },
          take: 20
        }
      }
    });
    if (!family) throw new ApiError(404, "NOT_FOUND", "Семья не найдена.");
    const myRole = family.members.find((member) => member.playerId === playerId)?.role as FamilyRole | undefined;
    const canSeeInvites = myRole === "leader" || myRole === "elder";
    return {
      ...this.summary(family, myRole ?? null),
      members: family.members.map((member) => this.memberView(member)),
      invites: canSeeInvites
        ? family.invites.map((invite) => ({
            id: invite.id,
            playerId: invite.inviteeId,
            name: nameOf(invite.invitee),
            status: invite.status as FamilyInviteView["status"],
            createdAt: invite.createdAt.toISOString()
          }))
        : [],
      treasuryEntries: family.treasuryEntries.map((entry) => ({
        id: entry.id,
        direction: entry.direction as "deposit" | "withdraw",
        amount: entry.amount,
        balanceAfter: entry.balanceAfter,
        note: entry.note,
        actorName: nameOf(entry.actor),
        createdAt: entry.createdAt.toISOString()
      }))
    };
  }

  async create(
    playerId: string,
    input: { universeId: string; name: string; motto?: string; description?: string; visibility?: "public" | "invite" }
  ): Promise<FamilyDetailView> {
    if (!isUniverseId(input.universeId)) throw new ApiError(400, "VALIDATION", "Неизвестный мир.");
    const name = input.name.trim();
    if (name.length < NAME_MIN || name.length > NAME_MAX) throw new ApiError(400, "VALIDATION", "Название семьи: 3-40 символов.");
    const motto = (input.motto ?? "").trim();
    if (motto.length > MOTTO_MAX) throw new ApiError(400, "VALIDATION", "Девиз семьи слишком длинный.");
    const description = (input.description ?? "").trim();
    if (description.length > DESCRIPTION_MAX) throw new ApiError(400, "VALIDATION", "Описание семьи слишком длинное.");
    const visibility = input.visibility ?? "public";
    if (visibility !== "public" && visibility !== "invite") throw new ApiError(400, "VALIDATION", "Неверный режим видимости.");

    try {
      const familyId = await this.db.$transaction(async (tx) => {
        await this.lockPlayer(tx, playerId);
        const existing = await tx.familyMember.findUnique({
          where: { playerId_universeId: { playerId, universeId: input.universeId } }
        });
        if (existing) throw new ApiError(409, "FAMILY_ALREADY_MEMBER", "Вы уже состоите в семье этого мира.");
        const family = await tx.family.create({
          data: {
            universeId: input.universeId,
            name,
            nameKey: name.toLocaleLowerCase("ru"),
            motto,
            description,
            visibility,
            leaderId: playerId
          }
        });
        await tx.familyMember.create({ data: { familyId: family.id, playerId, universeId: input.universeId, role: "leader" } });
        await this.audit(tx, family.id, playerId, "family.create", { name });
        return family.id;
      });
      return this.detail(playerId, familyId);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        throw new ApiError(409, "FAMILY_NAME_TAKEN", "Семья с таким названием уже есть в этом мире.");
      }
      throw error;
    }
  }

  async update(
    playerId: string,
    familyId: string,
    input: { name: string; motto: string; description: string; visibility: "public" | "invite" }
  ): Promise<FamilyDetailView> {
    const name = input.name.trim();
    if (name.length < NAME_MIN || name.length > NAME_MAX) throw new ApiError(400, "VALIDATION", "Название семьи: 3-40 символов.");
    const motto = input.motto.trim();
    if (motto.length > MOTTO_MAX) throw new ApiError(400, "VALIDATION", "Девиз семьи слишком длинный.");
    const description = input.description.trim();
    if (description.length > DESCRIPTION_MAX) throw new ApiError(400, "VALIDATION", "Описание семьи слишком длинное.");
    try {
      await this.db.$transaction(async (tx) => {
        await this.lockFamily(tx, familyId);
        await this.requireRole(tx, familyId, playerId, ["leader", "elder"]);
        await tx.family.update({
          where: { id: familyId },
          data: { name, nameKey: name.toLocaleLowerCase("ru"), motto, description, visibility: input.visibility }
        });
        await this.audit(tx, familyId, playerId, "family.update", { name });
      });
      return this.detail(playerId, familyId);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        throw new ApiError(409, "FAMILY_NAME_TAKEN", "Семья с таким названием уже есть в этом мире.");
      }
      throw error;
    }
  }

  async invite(playerId: string, familyId: string, inviteeId: string): Promise<FamilyDetailView> {
    if (playerId === inviteeId) throw new ApiError(400, "VALIDATION", "Нельзя пригласить себя.");
    await this.db.$transaction(async (tx) => {
      await this.lockFamily(tx, familyId);
      await this.requireRole(tx, familyId, playerId, ["leader", "elder"]);
      const family = await tx.family.findUnique({ where: { id: familyId }, select: { universeId: true } });
      if (!family) throw new ApiError(404, "NOT_FOUND", "Семья не найдена.");
      const target = await tx.player.findUnique({ where: { id: inviteeId }, select: { id: true } });
      if (!target) throw new ApiError(404, "NOT_FOUND", "Игрок не найден.");
      const existingMember = await tx.familyMember.findUnique({
        where: { playerId_universeId: { playerId: inviteeId, universeId: family.universeId } }
      });
      if (existingMember) throw new ApiError(409, "FAMILY_ALREADY_MEMBER", "Игрок уже состоит в семье этого мира.");
      await this.lockPlayer(tx, inviteeId);
      const current = await tx.familyInvite.findUnique({ where: { familyId_inviteeId: { familyId, inviteeId } } });
      if (current?.status === "pending") throw new ApiError(409, "FAMILY_INVITE_EXISTS", "Приглашение уже отправлено.");
      await tx.familyInvite.upsert({
        where: { familyId_inviteeId: { familyId, inviteeId } },
        create: { familyId, inviterId: playerId, inviteeId },
        update: { inviterId: playerId, status: "pending", decidedAt: null, createdAt: new Date() }
      });
      await this.audit(tx, familyId, playerId, "invite.send", { inviteeId });
    });
    return this.detail(playerId, familyId);
  }

  async incoming(playerId: string): Promise<IncomingFamilyInviteView[]> {
    const rows = await this.db.familyInvite.findMany({
      where: { inviteeId: playerId, status: "pending" },
      include: {
        family: { select: { id: true, name: true, universeId: true } },
        inviter: { select: { idUsername: true, idDisplayName: true } }
      },
      orderBy: { createdAt: "asc" },
      take: 50
    });
    return rows.map((row) => ({
      id: row.id,
      familyId: row.family.id,
      familyName: row.family.name,
      universeId: row.family.universeId,
      inviterName: nameOf(row.inviter),
      createdAt: row.createdAt.toISOString()
    }));
  }

  async accept(playerId: string, inviteId: string): Promise<FamilyDetailView> {
    const familyId = await this.db.$transaction(async (tx) => {
      const initial = await tx.familyInvite.findUnique({ where: { id: inviteId } });
      if (!initial || initial.inviteeId !== playerId || initial.status !== "pending") {
        throw new ApiError(409, "FAMILY_INVITE_INVALID", "Приглашение недействительно.");
      }
      await this.lockFamily(tx, initial.familyId);
      await this.lockInvite(tx, inviteId);
      await this.lockPlayer(tx, playerId);
      const invite = await tx.familyInvite.findUnique({ where: { id: inviteId } });
      if (!invite || invite.inviteeId !== playerId || invite.status !== "pending") {
        throw new ApiError(409, "FAMILY_INVITE_INVALID", "Приглашение недействительно.");
      }
      const family = await tx.family.findUnique({ where: { id: invite.familyId }, select: { universeId: true } });
      if (!family) throw new ApiError(404, "NOT_FOUND", "Семья не найдена.");
      const existing = await tx.familyMember.findUnique({
        where: { playerId_universeId: { playerId, universeId: family.universeId } }
      });
      if (existing) throw new ApiError(409, "FAMILY_ALREADY_MEMBER", "Вы уже состоите в семье этого мира.");
      const count = await tx.familyMember.count({ where: { familyId: invite.familyId } });
      if (count >= MAX_FAMILY_MEMBERS) throw new ApiError(409, "FAMILY_FULL", "В семье уже максимум участников.");
      await tx.familyMember.create({ data: { familyId: invite.familyId, playerId, universeId: family.universeId, role: "member" } });
      await tx.familyInvite.update({ where: { id: inviteId }, data: { status: "accepted", decidedAt: new Date() } });
      await this.audit(tx, invite.familyId, playerId, "invite.accept");
      return invite.familyId;
    });
    return this.detail(playerId, familyId);
  }

  async decline(playerId: string, inviteId: string): Promise<{ declined: true }> {
    const updated = await this.db.familyInvite.updateMany({
      where: { id: inviteId, inviteeId: playerId, status: "pending" },
      data: { status: "declined", decidedAt: new Date() }
    });
    if (updated.count === 0) throw new ApiError(409, "FAMILY_INVITE_INVALID", "Приглашение недействительно.");
    return { declined: true };
  }

  async leave(playerId: string, familyId: string): Promise<{ left: true }> {
    await this.db.$transaction(async (tx) => {
      await this.lockFamily(tx, familyId);
      const member = await tx.familyMember.findUnique({ where: { familyId_playerId: { familyId, playerId } } });
      if (!member) throw new ApiError(404, "NOT_FOUND", "Вы не состоите в этой семье.");
      if (member.role === "leader") {
        const count = await tx.familyMember.count({ where: { familyId } });
        if (count > 1) throw new ApiError(409, "FAMILY_LEADER_TRANSFER", "Сначала передайте главенство другому участнику.");
        await tx.family.delete({ where: { id: familyId } });
        return;
      }
      await tx.familyMember.delete({ where: { id: member.id } });
      await this.audit(tx, familyId, playerId, "member.leave");
    });
    return { left: true };
  }

  async kick(playerId: string, familyId: string, targetId: string): Promise<FamilyDetailView> {
    await this.db.$transaction(async (tx) => {
      await this.lockFamily(tx, familyId);
      await this.requireRole(tx, familyId, playerId, ["leader"]);
      if (playerId === targetId) throw new ApiError(400, "VALIDATION", "Нельзя исключить себя.");
      const target = await tx.familyMember.findUnique({ where: { familyId_playerId: { familyId, playerId: targetId } } });
      if (!target) throw new ApiError(404, "NOT_FOUND", "Участник не найден.");
      await tx.familyMember.delete({ where: { id: target.id } });
      await this.audit(tx, familyId, playerId, "member.kick", { targetId });
    });
    return this.detail(playerId, familyId);
  }

  async transfer(playerId: string, familyId: string, targetId: string): Promise<FamilyDetailView> {
    await this.db.$transaction(async (tx) => {
      await this.lockFamily(tx, familyId);
      await this.requireRole(tx, familyId, playerId, ["leader"]);
      if (playerId === targetId) throw new ApiError(400, "VALIDATION", "Вы уже глава семьи.");
      const target = await tx.familyMember.findUnique({ where: { familyId_playerId: { familyId, playerId: targetId } } });
      if (!target) throw new ApiError(404, "NOT_FOUND", "Участник не найден.");
      await tx.familyMember.update({ where: { familyId_playerId: { familyId, playerId } }, data: { role: "elder" } });
      await tx.familyMember.update({ where: { id: target.id }, data: { role: "leader" } });
      await tx.family.update({ where: { id: familyId }, data: { leaderId: targetId } });
      await this.audit(tx, familyId, playerId, "leader.transfer", { targetId });
    });
    return this.detail(playerId, familyId);
  }

  async disband(playerId: string, familyId: string): Promise<{ disbanded: true }> {
    await this.db.$transaction(async (tx) => {
      await this.lockFamily(tx, familyId);
      await this.requireRole(tx, familyId, playerId, ["leader"]);
      await this.audit(tx, familyId, playerId, "family.disband");
      await tx.family.delete({ where: { id: familyId } });
    });
    return { disbanded: true };
  }

  /** Family of the player in one universe, or null. */
  async mine(playerId: string, universeId: string): Promise<FamilyDetailView | null> {
    if (!isUniverseId(universeId)) throw new ApiError(400, "VALIDATION", "Неизвестный мир.");
    const member = await this.db.familyMember.findUnique({
      where: { playerId_universeId: { playerId, universeId } },
      select: { familyId: true }
    });
    return member ? this.detail(playerId, member.familyId) : null;
  }

  /** Explicit consent for cross-account inheritance. */
  async consent(playerId: string, familyId: string, accepts: boolean): Promise<FamilyDetailView> {
    await this.db.$transaction(async (tx) => {
      await this.lockFamily(tx, familyId);
      const member = await tx.familyMember.findUnique({
        where: { familyId_playerId: { familyId, playerId } }
      });
      if (!member) throw new ApiError(404, "NOT_FOUND", "Вы не состоите в этой семье.");
      await tx.familyMember.update({ where: { id: member.id }, data: { acceptsInheritance: accepts } });
      await this.audit(tx, familyId, playerId, "member.consent", { accepts });
    });
    return this.detail(playerId, familyId);
  }

  /**
   * Move gold between one life and the family treasury. The life state is
   * authoritative and every move is an immutable ledger row.
   */
  async treasury(
    playerId: string,
    familyId: string,
    input: { actionId: string; lifeId: string; direction: "deposit" | "withdraw"; amount: number; note?: string }
  ): Promise<FamilyDetailView & { replayed: boolean }> {
    if (!Number.isInteger(input.amount) || input.amount < 1 || input.amount > 1_000_000_000) {
      throw new ApiError(400, "VALIDATION", "Сумма должна быть от 1 до 1 000 000 000.");
    }
    const note = (input.note ?? "").trim();
    if (note.length > 120) throw new ApiError(400, "VALIDATION", "Заметка слишком длинная.");

    const outcome = await this.db.$transaction(async (tx) => {
      await this.lockFamily(tx, familyId);
      const family = await tx.family.findUniqueOrThrow({ where: { id: familyId } });
      const member = await tx.familyMember.findUnique({
        where: { familyId_playerId: { familyId, playerId } }
      });
      if (!member) throw new ApiError(403, "FORBIDDEN", "Вы не состоите в этой семье.");
      if (input.direction === "withdraw" && member.role !== "leader" && member.role !== "elder") {
        throw new ApiError(403, "FORBIDDEN", "Выводить средства может только глава или старейшина.");
      }
      const existing = await tx.familyTreasuryEntry.findUnique({
        where: { familyId_actionId: { familyId, actionId: input.actionId } }
      });
      if (existing) return { replayed: true, familyId };

      const life = await tx.life.findFirst({ where: { id: input.lifeId, playerId } });
      if (!life) throw new ApiError(404, "NOT_FOUND", "Жизнь не найдена.");
      const state = parseSave(life.state);
      if (state.character.universeId !== family.universeId) {
        throw new ApiError(409, "VALIDATION", "Жизнь принадлежит другому миру.");
      }
      if (!state.life.alive) throw new ApiError(409, "LIFE_ENDED", "Завершённая жизнь не может двигать казну.");

      const delta = input.direction === "deposit" ? -input.amount : input.amount;
      if (input.direction === "deposit" && state.character.wealth < input.amount) {
        throw new ApiError(409, "INSUFFICIENT_WEALTH", "Недостаточно золота у персонажа.");
      }
      if (input.direction === "withdraw" && family.treasury < input.amount) {
        throw new ApiError(409, "VALIDATION", "В казне недостаточно золота.");
      }

      state.character.wealth = Math.max(0, Math.min(1_000_000_000, state.character.wealth + delta));
      state.version += 1;
      const maxSeq = await tx.historyEntry.aggregate({ where: { lifeId: life.id }, _max: { seq: true } });
      const seq = Math.max(state.nextSeq, (maxSeq._max.seq ?? 0) + 1);
      state.nextSeq = seq + 1;
      const treasuryAfter = family.treasury - delta;
      const entry = {
        seq,
        age: state.life.age,
        kind: "legacy" as const,
        title: { ru: "Семейная казна", en: "Family treasury" },
        text:
          input.direction === "deposit"
            ? { ru: `Внесено в казну: ${input.amount}.`, en: `Deposited to the treasury: ${input.amount}.` }
            : { ru: `Получено из казны: ${input.amount}.`, en: `Withdrawn from the treasury: ${input.amount}.` },
        changes: [{ kind: "wealth" as const, delta }]
      };
      await tx.life.update({
        where: { id: life.id },
        data: { version: state.version, state: state as unknown as Prisma.InputJsonValue }
      });
      await tx.historyEntry.create({
        data: { lifeId: life.id, seq, age: state.life.age, kind: "legacy", data: entry as unknown as Prisma.InputJsonValue }
      });
      await tx.lifeSnapshot.create({
        data: { lifeId: life.id, version: state.version, age: state.life.age, reason: "action", state: state as unknown as Prisma.InputJsonValue }
      });
      await tx.lifeSnapshot.deleteMany({ where: { lifeId: life.id, version: { lte: state.version - 50 } } });
      await tx.family.update({ where: { id: familyId }, data: { treasury: treasuryAfter } });
      await tx.familyTreasuryEntry.create({
        data: {
          familyId,
          actorId: playerId,
          actionId: input.actionId,
          direction: input.direction,
          amount: input.amount,
          balanceAfter: treasuryAfter,
          note
        }
      });
      await this.audit(tx, familyId, playerId, `treasury.${input.direction}`, {
        lifeId: life.id,
        amount: input.amount
      });
      return { replayed: false, familyId };
    });

    return { ...(await this.detail(playerId, outcome.familyId)), replayed: outcome.replayed };
  }

  /** Used by succession before moving a new life to another account. */
  async assertInheritanceRecipient(tx: Tx, ownerId: string, recipientId: string, universeId: string): Promise<void> {
    if (ownerId === recipientId) return;
    const [owner, recipient] = await Promise.all([
      tx.familyMember.findUnique({ where: { playerId_universeId: { playerId: ownerId, universeId } } }),
      tx.familyMember.findUnique({ where: { playerId_universeId: { playerId: recipientId, universeId } } })
    ]);
    if (!owner || !recipient || owner.familyId !== recipient.familyId) {
      throw new ApiError(403, "FORBIDDEN", "Наследник должен быть членом той же семьи.");
    }
    if (!recipient.acceptsInheritance) {
      throw new ApiError(403, "FORBIDDEN", "Наследник не дал согласие на наследование.");
    }
    await this.lockPlayer(tx, recipientId);
    await this.audit(tx, owner.familyId, ownerId, "inheritance.recipient", { recipientId });
  }

  async auditLog(playerId: string, familyId: string) {
    await this.db.$transaction(async (tx) => {
      await this.lockFamily(tx, familyId);
      await this.requireRole(tx, familyId, playerId, ["leader", "elder"]);
    });
    const rows = await this.db.familyAudit.findMany({
      where: { familyId },
      orderBy: { createdAt: "desc" },
      take: 50,
      include: { actor: { select: { idUsername: true, idDisplayName: true } } }
    });
    return rows.map((row) => ({
      id: row.id,
      action: row.action,
      actor: nameOf(row.actor),
      detail: row.detail,
      createdAt: row.createdAt.toISOString()
    }));
  }
}
