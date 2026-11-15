import { Prisma } from "@endemion/database";
import { Inject, Injectable } from "@nestjs/common";
import { ApiError } from "../common/api-error.js";
import { PrismaService } from "../prisma/prisma.service.js";

export const NOTIFICATION_LIMIT = 50;

export type NotificationKind =
  | "auction_outbid"
  | "auction_won"
  | "auction_sold"
  | "auction_ended"
  | "family_invite"
  | "family_invite_accepted"
  | "family_invite_declined"
  | "guild_request"
  | "guild_request_accepted"
  | "guild_request_rejected"
  | "guild_project_completed";

/** Small localized payload so the client can render without extra lookups. */
export interface NotificationData {
  goodId?: string;
  goodName?: { ru: string; en: string };
  qty?: number;
  amount?: number;
  previousBid?: number;
  returned?: boolean;
  familyId?: string;
  familyName?: string;
  inviteId?: string;
  memberName?: string;
  guildId?: string;
  guildName?: string;
  requestId?: string;
  applicantName?: string;
  projectId?: string;
  projectTitle?: string;
  target?: number;
}

export interface NotificationView {
  id: string;
  kind: NotificationKind;
  contractId: string | null;
  data: NotificationData;
  readAt: string | null;
  createdAt: string;
}

@Injectable()
export class NotificationService {
  private readonly db;

  constructor(@Inject(PrismaService) prisma: PrismaService) {
    this.db = prisma.client;
  }

  /** Writes a notification inside the caller's transaction. */
  async notify(
    tx: Prisma.TransactionClient,
    playerId: string,
    kind: NotificationKind,
    contractId: string | null,
    data: NotificationData
  ): Promise<void> {
    await tx.playerNotification.create({
      data: { playerId, kind, contractId, data: data as Prisma.InputJsonValue }
    });
  }

  async list(playerId: string): Promise<{ notifications: NotificationView[]; unread: number }> {
    const [rows, unread] = await Promise.all([
      this.db.playerNotification.findMany({
        where: { playerId },
        orderBy: { createdAt: "desc" },
        take: NOTIFICATION_LIMIT
      }),
      this.db.playerNotification.count({ where: { playerId, readAt: null } })
    ]);
    return { notifications: rows.map((row) => this.view(row)), unread };
  }

  async markRead(playerId: string, id: string): Promise<{ notification: NotificationView }> {
    const row = await this.db.playerNotification.findFirst({ where: { id, playerId } });
    if (!row) throw new ApiError(404, "NOT_FOUND", "Уведомление не найдено.");
    if (row.readAt) return { notification: this.view(row) };
    const updated = await this.db.playerNotification.update({ where: { id: row.id }, data: { readAt: new Date() } });
    return { notification: this.view(updated) };
  }

  async markAllRead(playerId: string): Promise<{ updated: number }> {
    const result = await this.db.playerNotification.updateMany({
      where: { playerId, readAt: null },
      data: { readAt: new Date() }
    });
    return { updated: result.count };
  }

  private view(row: {
    id: string;
    kind: string;
    contractId: string | null;
    data: Prisma.JsonValue;
    readAt: Date | null;
    createdAt: Date;
  }): NotificationView {
    return {
      id: row.id,
      kind: row.kind as NotificationKind,
      contractId: row.contractId,
      data: (row.data ?? {}) as NotificationData,
      readAt: row.readAt?.toISOString() ?? null,
      createdAt: row.createdAt.toISOString()
    };
  }
}
