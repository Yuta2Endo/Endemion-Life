import type { PortalProfileView } from "@endemion/shared";
import { Inject, Injectable } from "@nestjs/common";
import { ApiError } from "../common/api-error.js";
import { PrismaService } from "../prisma/prisma.service.js";
import { PortalAuditService } from "./portal-audit.service.js";
import { isPortalSubject, type PortalIdentity } from "./portal.constants.js";

interface ResolvedPlayer {
  id: string;
  displayName: string | null;
}

/**
 * Разрешение идентичности портала в игрока Life.
 *
 * Единственный ключ — players.endemion_sub = JWT.sub. Почта, username и playerId
 * из запроса не используются. Внутренний id игрока не покидает сервер.
 */
@Injectable()
export class PortalService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(PortalAuditService) private readonly audit: PortalAuditService
  ) {}

  /** Игрок по проверенному sub или null. Используется и будущими read-only маршрутами. */
  async resolvePlayer(sub: string): Promise<ResolvedPlayer | null> {
    if (!isPortalSubject(sub)) return null;
    const player = await this.prisma.client.player.findUnique({
      where: { endemionSub: sub },
      select: { id: true, idDisplayName: true }
    });
    return player ? { id: player.id, displayName: player.idDisplayName } : null;
  }

  /** Минимальный профиль: есть ли привязка, имя и число жизней. Без GameState и playerId. */
  async profile(identity: PortalIdentity, endpoint: string): Promise<PortalProfileView> {
    const player = await this.resolvePlayer(identity.sub);
    if (!player) {
      this.audit.noProfile({ subHash: identity.subHash, jti: identity.jti, endpoint });
      throw new ApiError(404, "NO_LIFE_PROFILE", "Профиль Endemion Life не найден");
    }
    const [total, alive] = await Promise.all([
      this.prisma.client.life.count({ where: { playerId: player.id } }),
      this.prisma.client.life.count({ where: { playerId: player.id, status: "alive" } })
    ]);
    this.audit.dataAccess({ subHash: identity.subHash, jti: identity.jti, endpoint, result: "ok" });
    return { exists: true, displayName: player.displayName, lives: { total, alive } };
  }

  /**
   * Stage 11.2/11.3: проверка владения ресурсом. Чужой lifeId неотличим от несуществующего — 404.
   * Будущие маршруты обязаны вызывать этот метод с playerId, полученным из проверенного sub,
   * и никогда не принимать playerId от клиента.
   */
  async requireOwnedLife(playerId: string, lifeId: string): Promise<void> {
    if (!isPortalSubject(lifeId)) throw new ApiError(404, "NOT_FOUND", "Не найдено");
    const life = await this.prisma.client.life.findFirst({ where: { id: lifeId, playerId }, select: { id: true } });
    if (!life) throw new ApiError(404, "NOT_FOUND", "Не найдено");
  }
}
