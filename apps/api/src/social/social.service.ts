// Stage 07: связи игроков. Живут отдельно от сохранения жизни: дружба не двигает чужую игру.
// Пара хранится один раз — меньший id всегда первый. Повтор запроса возвращает ту же связь.
import { Prisma } from "@endemion/database";
import { Inject, Injectable } from "@nestjs/common";
import { ApiError } from "../common/api-error.js";
import { PrismaService } from "../prisma/prisma.service.js";

type TieStatus = "pending" | "accepted" | "blocked";

/** Друзей у одного игрока не больше */
const MAX_FRIENDS = 50;
/** Входящих запросов не больше: защита от завала чужими заявками */
const MAX_INCOMING = 20;

export interface SocialPlayer {
  id: string;
  name: string;
}

export interface TieView {
  id: string;
  status: TieStatus;
  /** Кто отправил запрос или поставил блок */
  askedBy: string;
  player: SocialPlayer;
  createdAt: string;
}

export interface SocialBoard {
  friends: TieView[];
  incoming: TieView[];
  outgoing: TieView[];
  blocked: TieView[];
}

interface TieRow {
  id: string;
  playerAId: string;
  playerBId: string;
  status: string;
  askedById: string;
  createdAt: Date;
  playerA: { id: string; idUsername: string | null; idDisplayName: string | null };
  playerB: { id: string; idUsername: string | null; idDisplayName: string | null };
}

function ordered(one: string, two: string): [string, string] {
  return one < two ? [one, two] : [two, one];
}

function nameOf(player: { idUsername: string | null; idDisplayName: string | null }): string | null {
  const name = player.idDisplayName?.trim() || player.idUsername?.trim() || "";
  return name.length > 0 ? name : null;
}

@Injectable()
export class SocialService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  /** Без имени (гость) в социальном мире делать нечего */
  private async requireNamed(playerId: string): Promise<void> {
    const player = await this.prisma.client.player.findUnique({ where: { id: playerId }, select: { idUsername: true, idDisplayName: true } });
    if (!player || !nameOf(player)) throw new ApiError(403, "FORBIDDEN", "Сначала нужно имя: войдите через Endemion ID");
  }

  private view(row: TieRow, me: string): TieView {
    const other = row.playerAId === me ? row.playerB : row.playerA;
    return {
      id: row.id,
      status: row.status as TieStatus,
      askedBy: row.askedById,
      player: { id: other.id, name: nameOf(other) ?? "" },
      createdAt: row.createdAt.toISOString()
    };
  }

  async board(playerId: string): Promise<SocialBoard> {
    const rows = await this.prisma.client.tie.findMany({
      where: { OR: [{ playerAId: playerId }, { playerBId: playerId }] },
      include: { playerA: { select: { id: true, idUsername: true, idDisplayName: true } }, playerB: { select: { id: true, idUsername: true, idDisplayName: true } } },
      orderBy: { createdAt: "desc" },
      take: 200
    });
    const board: SocialBoard = { friends: [], incoming: [], outgoing: [], blocked: [] };
    for (const row of rows) {
      const view = this.view(row, playerId);
      if (row.status === "accepted") board.friends.push(view);
      else if (row.status === "blocked") board.blocked.push(view);
      else if (row.askedById === playerId) board.outgoing.push(view);
      else board.incoming.push(view);
    }
    return board;
  }

  /** Запрос в друзья. Встречный ожидающий запрос сразу становится дружбой */
  async request(playerId: string, otherId: string): Promise<TieView> {
    if (playerId === otherId) throw new ApiError(400, "VALIDATION", "Нельзя добавить себя");
    await this.requireNamed(playerId);
    const other = await this.prisma.client.player.findUnique({ where: { id: otherId }, select: { id: true, idUsername: true, idDisplayName: true } });
    if (!other || !nameOf(other)) throw new ApiError(404, "NOT_FOUND", "Игрок не найден");
    const [playerAId, playerBId] = ordered(playerId, otherId);

    const existing = await this.prisma.client.tie.findUnique({ where: { playerAId_playerBId: { playerAId, playerBId } } });
    if (existing?.status === "blocked") throw new ApiError(403, "FORBIDDEN", "Связь закрыта");
    if (existing?.status === "accepted") return this.one(playerId, existing.id);
    if (existing?.status === "pending") {
      if (existing.askedById === playerId) return this.one(playerId, existing.id);
      // Встречный запрос: согласие, а не вторая заявка
      return this.accept(playerId, existing.id);
    }

    const friends = await this.prisma.client.tie.count({ where: { status: "accepted", OR: [{ playerAId: playerId }, { playerBId: playerId }] } });
    if (friends >= MAX_FRIENDS) throw new ApiError(409, "LIMIT_REACHED", "Слишком много друзей");
    const incoming = await this.prisma.client.tie.count({ where: { status: "pending", askedById: { not: otherId }, OR: [{ playerAId: otherId }, { playerBId: otherId }] } });
    if (incoming >= MAX_INCOMING) throw new ApiError(409, "LIMIT_REACHED", "У игрока уже много запросов");

    try {
      const created = await this.prisma.client.tie.create({ data: { playerAId, playerBId, status: "pending", askedById: playerId } });
      return this.one(playerId, created.id);
    } catch (error) {
      // Гонка двух встречных запросов: уникальный ключ оставляет одну строку
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") return this.request(playerId, otherId);
      throw error;
    }
  }

  async accept(playerId: string, tieId: string): Promise<TieView> {
    const row = await this.mine(playerId, tieId);
    if (row.status !== "pending") throw new ApiError(409, "FORBIDDEN", "Запрос уже закрыт");
    if (row.askedById === playerId) throw new ApiError(403, "FORBIDDEN", "Своё согласие не нужно: ждите ответа");
    await this.prisma.client.tie.update({ where: { id: tieId }, data: { status: "accepted" } });
    return this.one(playerId, tieId);
  }

  /** Отказ, снятие друга или снятие своего блока */
  async remove(playerId: string, tieId: string): Promise<void> {
    const row = await this.mine(playerId, tieId);
    if (row.status === "blocked" && row.askedById !== playerId) throw new ApiError(403, "FORBIDDEN", "Блок поставил другой игрок");
    await this.prisma.client.tie.delete({ where: { id: tieId } });
  }

  async block(playerId: string, otherId: string): Promise<TieView> {
    if (playerId === otherId) throw new ApiError(400, "VALIDATION", "Нельзя заблокировать себя");
    await this.requireNamed(playerId);
    const other = await this.prisma.client.player.findUnique({ where: { id: otherId }, select: { id: true } });
    if (!other) throw new ApiError(404, "NOT_FOUND", "Игрок не найден");
    const [playerAId, playerBId] = ordered(playerId, otherId);
    const tieId = await this.prisma.client.$transaction(async (tx) => {
      // Обе строки игроков блокируются в одном порядке: встречные запросы
      // не могут одновременно переписать автора блока
      await tx.$queryRaw`SELECT id FROM players WHERE id = ${playerAId}::uuid OR id = ${playerBId}::uuid ORDER BY id FOR UPDATE`;
      const existing = await tx.tie.findUnique({ where: { playerAId_playerBId: { playerAId, playerBId } } });
      if (existing?.status === "blocked" && existing.askedById !== playerId) {
        throw new ApiError(403, "FORBIDDEN", "Блок уже поставил другой игрок");
      }
      if (existing) {
        const row = await tx.tie.update({ where: { id: existing.id }, data: { status: "blocked", askedById: playerId } });
        return row.id;
      }
      const row = await tx.tie.create({ data: { playerAId, playerBId, status: "blocked", askedById: playerId } });
      return row.id;
    });
    return this.one(playerId, tieId);
  }

  /** Поиск по точному имени. Кусок имени не ищет — так не перебрать всех */
  async search(playerId: string, name: string): Promise<SocialPlayer[]> {
    const query = name.trim();
    const rows = await this.prisma.client.player.findMany({
      where: { id: { not: playerId }, OR: [{ idDisplayName: { equals: query, mode: "insensitive" } }, { idUsername: { equals: query, mode: "insensitive" } }] },
      select: { id: true, idUsername: true, idDisplayName: true },
      take: 20
    });
    return rows.flatMap((row) => {
      const called = nameOf(row);
      return called ? [{ id: row.id, name: called }] : [];
    });
  }

  /** Визит: имя и число жизней. Сохранение, почта и аватар не отдаются */
  async profile(playerId: string, otherId: string): Promise<{ player: SocialPlayer; lives: number; tie: TieStatus | null }> {
    const other = await this.prisma.client.player.findUnique({ where: { id: otherId }, select: { id: true, idUsername: true, idDisplayName: true } });
    const called = other ? nameOf(other) : null;
    if (!other || !called) throw new ApiError(404, "NOT_FOUND", "Игрок не найден");
    const [playerAId, playerBId] = ordered(playerId, otherId);
    const tie = await this.prisma.client.tie.findUnique({ where: { playerAId_playerBId: { playerAId, playerBId } } });
    if (tie?.status === "blocked" && tie.askedById !== playerId) throw new ApiError(404, "NOT_FOUND", "Игрок не найден");
    const lives = await this.prisma.client.life.count({ where: { playerId: otherId } });
    return { player: { id: other.id, name: called }, lives, tie: tie ? (tie.status as TieStatus) : null };
  }

  /** Stage 05: moderation report. Blocking remains a separate, reversible action. */
  async report(playerId: string, otherId: string, reason: string, details: string | null): Promise<{ reported: true }> {
    if (playerId === otherId) throw new ApiError(400, "VALIDATION", "Нельзя пожаловаться на себя");
    const other = await this.prisma.client.player.findUnique({ where: { id: otherId }, select: { id: true } });
    if (!other) throw new ApiError(404, "NOT_FOUND", "Игрок не найден");
    await this.prisma.client.playerReport.create({ data: { reporterId: playerId, targetId: otherId, reason, details } });
    return { reported: true };
  }

  private async mine(playerId: string, tieId: string): Promise<TieRow> {
    const row = await this.prisma.client.tie.findUnique({
      where: { id: tieId },
      include: { playerA: { select: { id: true, idUsername: true, idDisplayName: true } }, playerB: { select: { id: true, idUsername: true, idDisplayName: true } } }
    });
    if (!row || (row.playerAId !== playerId && row.playerBId !== playerId)) throw new ApiError(404, "NOT_FOUND", "Связь не найдена");
    return row;
  }

  private async one(playerId: string, tieId: string): Promise<TieView> {
    return this.view(await this.mine(playerId, tieId), playerId);
  }
}
