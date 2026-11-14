import {
  PROFILE_VISIBILITIES,
  type ProfileAccess,
  type ProfileBadgeView,
  type ProfileGuildView,
  type ProfileLifeView,
  type ProfileStatsView,
  type ProfileUpdateRequest,
  type ProfileView
} from "@endemion/shared";
import { isUniverseId } from "@endemion/game-core";
import { Inject, Injectable } from "@nestjs/common";
import { ApiError } from "../common/api-error.js";
import { PrismaService } from "../prisma/prisma.service.js";

const RECENT_LIVES = 8;
const MAX_GUILDS = 12;

type Visibility = (typeof PROFILE_VISIBILITIES)[number];

interface PlayerRow {
  id: string;
  createdAt: Date;
  lastSeenAt: Date;
  idUsername: string | null;
  idDisplayName: string | null;
  idAvatarUrl: string | null;
  idEmail: string | null;
  headline: string;
  bio: string;
  favoriteUniverseId: string | null;
  profileVisibility: string;
}

const nameOf = (player: PlayerRow): string =>
  player.idDisplayName?.trim() || player.idUsername?.trim() || "Endemion";

const badge = (
  id: string,
  ru: string,
  en: string,
  descriptionRu: string,
  descriptionEn: string,
  progress: number,
  target: number
): ProfileBadgeView => ({
  id,
  name: { ru, en },
  description: { ru: descriptionRu, en: descriptionEn },
  earned: progress >= target,
  progress: Math.min(progress, target),
  target
});

@Injectable()
export class ProfileService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  private get db() {
    return this.prisma.client;
  }

  async me(playerId: string): Promise<ProfileView> {
    return this.get(playerId, playerId);
  }

  async get(viewerId: string | null, targetId: string): Promise<ProfileView> {
    const player = await this.db.player.findUnique({
      where: { id: targetId },
      select: {
        id: true,
        createdAt: true,
        lastSeenAt: true,
        idUsername: true,
        idDisplayName: true,
        idAvatarUrl: true,
        idEmail: true,
        headline: true,
        bio: true,
        favoriteUniverseId: true,
        profileVisibility: true
      }
    });
    if (!player) throw new ApiError(404, "NOT_FOUND", "Профиль не найден.");

    const visibility = (PROFILE_VISIBILITIES as readonly string[]).includes(player.profileVisibility)
      ? (player.profileVisibility as Visibility)
      : "public";

    const [tie, account] = await Promise.all([
      viewerId && viewerId !== player.id
        ? this.db.tie.findFirst({
            where: {
              OR: [
                { playerAId: viewerId, playerBId: player.id },
                { playerAId: player.id, playerBId: viewerId }
              ]
            },
            select: { status: true }
          })
        : Promise.resolve(null),
      viewerId === player.id
        ? this.db.account.findUnique({
            where: { playerId: player.id },
            select: { email: true, emailVerifiedAt: true }
          })
        : Promise.resolve(null)
    ]);

    const blocked = tie?.status === "blocked";
    let access: ProfileAccess = "private";
    if (viewerId === player.id) access = "owner";
    else if (blocked) access = "private";
    else if (visibility === "public") access = "public";
    else if (visibility === "friends" && tie?.status === "accepted") access = "friends";

    const full = access === "owner" || access === "public" || access === "friends";
    const [stats, lives, guilds] = full
      ? await Promise.all([this.stats(player.id), this.lives(player.id), this.guilds(player.id)])
      : [null, [], []];

    return {
      identity: {
        playerId: player.id,
        name: nameOf(player),
        username: player.idUsername,
        avatarUrl: player.idAvatarUrl,
        headline: full ? player.headline : "",
        bio: full ? player.bio : "",
        favoriteUniverseId: full ? player.favoriteUniverseId : null,
        visibility,
        createdAt: player.createdAt.toISOString(),
        lastSeenAt: player.lastSeenAt.toISOString()
      },
      access,
      isOwner: viewerId === player.id,
      canEdit: viewerId === player.id,
      stats,
      badges: stats ? this.badges(stats, guilds) : [],
      lives,
      guilds,
      account:
        viewerId === player.id
          ? {
              email: account?.email ?? player.idEmail ?? "",
              emailVerified: account?.emailVerifiedAt !== null || (account === null && player.idEmail !== null)
            }
          : null
    };
  }

  async update(playerId: string, input: ProfileUpdateRequest): Promise<ProfileView> {
    if (input.favoriteUniverseId !== null && !isUniverseId(input.favoriteUniverseId)) {
      throw new ApiError(400, "VALIDATION", "Неизвестный мир.");
    }
    await this.db.player.update({
      where: { id: playerId },
      data: {
        headline: input.headline,
        bio: input.bio,
        favoriteUniverseId: input.favoriteUniverseId,
        profileVisibility: input.visibility,
        profileUpdatedAt: new Date()
      }
    });
    return this.me(playerId);
  }

  private async stats(playerId: string): Promise<ProfileStatsView> {
    const [total, alive, aggregate, universes, guilds, friends, trades, contributions, history] =
      await Promise.all([
        this.db.life.count({ where: { playerId } }),
        this.db.life.count({ where: { playerId, status: "alive" } }),
        this.db.life.aggregate({ where: { playerId }, _max: { generation: true, age: true } }),
        this.db.life.groupBy({ by: ["universeId"], where: { playerId } }),
        this.db.guildMember.count({ where: { playerId } }),
        this.db.tie.count({
          where: {
            status: "accepted",
            OR: [{ playerAId: playerId }, { playerBId: playerId }]
          }
        }),
        this.db.marketTrade.count({
          where: { OR: [{ sellerPlayerId: playerId }, { buyerPlayerId: playerId }] }
        }),
        this.db.worldContribution.count({ where: { playerId } }),
        this.db.historyEntry.count({ where: { life: { is: { playerId } } } })
      ]);

    return {
      lives: total,
      alive,
      dead: total - alive,
      generations: aggregate._max.generation ?? 0,
      bestAge: aggregate._max.age ?? 0,
      universes: universes.length,
      guilds,
      friends,
      trades,
      contributions,
      history
    };
  }

  private async lives(playerId: string): Promise<ProfileLifeView[]> {
    const rows = await this.db.life.findMany({
      where: { playerId },
      orderBy: { updatedAt: "desc" },
      take: RECENT_LIVES,
      select: {
        id: true,
        name: true,
        universeId: true,
        status: true,
        age: true,
        generation: true,
        updatedAt: true
      }
    });
    return rows.map((row) => ({
      id: row.id,
      name: row.name,
      universeId: row.universeId,
      status: row.status,
      age: row.age,
      generation: row.generation,
      updatedAt: row.updatedAt.toISOString()
    }));
  }

  private async guilds(playerId: string): Promise<ProfileGuildView[]> {
    const rows = await this.db.guildMember.findMany({
      where: { playerId },
      orderBy: { joinedAt: "asc" },
      take: MAX_GUILDS,
      include: {
        guild: { select: { id: true, name: true, universeId: true, reputation: true } }
      }
    });
    return rows.map((row) => ({
      id: row.guild.id,
      name: row.guild.name,
      universeId: row.guild.universeId,
      role: row.role as ProfileGuildView["role"],
      reputation: row.guild.reputation
    }));
  }

  private badges(stats: ProfileStatsView, guilds: ProfileGuildView[]): ProfileBadgeView[] {
    const leader = guilds.some((guild) => guild.role === "leader") ? 1 : 0;
    return [
      badge(
        "first-life",
        "Первая жизнь",
        "First life",
        "Создайте первого персонажа.",
        "Create your first character.",
        stats.lives,
        1
      ),
      badge(
        "dynasty",
        "Династия",
        "Dynasty",
        "Проведите род ко второму поколению.",
        "Carry a lineage into its second generation.",
        stats.generations,
        2
      ),
      badge(
        "elder",
        "Долгожитель",
        "Elder",
        "Проживите жизнь до 70 лет.",
        "Live to the age of 70.",
        stats.bestAge,
        70
      ),
      badge(
        "worldwalker",
        "Мироходец",
        "Worldwalker",
        "Начните жизни в трёх разных мирах.",
        "Begin lives in three different worlds.",
        stats.universes,
        3
      ),
      badge(
        "merchant",
        "Торговец",
        "Merchant",
        "Завершите первую сделку с другим игроком.",
        "Complete your first trade with another player.",
        stats.trades,
        1
      ),
      badge(
        "guild-founder",
        "Основатель дома",
        "House founder",
        "Возглавьте гильдию или союз.",
        "Lead a guild or association.",
        leader,
        1
      ),
      badge(
        "social",
        "Не один",
        "Not alone",
        "Примите первую дружескую связь.",
        "Accept your first friendship.",
        stats.friends,
        1
      ),
      badge(
        "world-shaker",
        "Сотрясатель мира",
        "World-shaker",
        "Повлияйте на общий мир.",
        "Contribute to the shared world.",
        stats.contributions,
        1
      ),
      badge(
        "chronicler",
        "Хроникёр",
        "Chronicler",
        "Соберите сто записей в хрониках своих жизней.",
        "Collect one hundred entries across your life chronicles.",
        stats.history,
        100
      ),
      badge(
        "lineage-keeper",
        "Хранитель рода",
        "Lineage keeper",
        "Доведите род до пятого поколения.",
        "Reach the fifth generation of a lineage.",
        stats.generations,
        5
      )
    ];
  }
}
