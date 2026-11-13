import { EventEmitter } from "node:events";
import { Inject, Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service.js";
import { RedisService } from "../redis/redis.service.js";

export const PRESENCE_TTL_SECONDS = 90;
const ONLINE_LIMIT = 50;

export interface PresencePlayer {
  id: string;
  displayName: string;
}

export interface PresenceSnapshot {
  universeId: string;
  available: boolean;
  count: number;
  players: PresencePlayer[];
  serverTime: string;
}

export interface WorldNotification {
  universeId: string;
  kind: "contribution" | "tick" | "event";
  title: { ru: string; en: string };
  text: { ru: string; en: string };
  at: string;
}

/**
 * Stage 05: presence is intentionally ephemeral. Redis holds only player ids
 * with a short score window; names are joined from PostgreSQL when requested.
 * A Redis outage must not break solo play or shared-world reads.
 */
@Injectable()
export class PresenceService {
  private readonly events = new EventEmitter();

  constructor(
    @Inject(RedisService) private readonly redis: RedisService,
    @Inject(PrismaService) private readonly prisma: PrismaService
  ) {
    this.events.setMaxListeners(200);
  }

  private key(universeId: string): string {
    return `presence:world:${universeId}`;
  }

  async touch(universeId: string, playerId: string): Promise<void> {
    if (!this.redis.ready) return;
    const now = Date.now();
    const key = this.key(universeId);
    try {
      await this.redis.client
        .multi()
        .zadd(key, now, playerId)
        .zremrangebyscore(key, 0, now - PRESENCE_TTL_SECONDS * 1000)
        .expire(key, PRESENCE_TTL_SECONDS + 30)
        .exec();
    } catch {
      // Presence is best-effort: a Redis failure must not fail a heartbeat or a solo life.
    }
  }

  async online(universeId: string): Promise<PresenceSnapshot> {
    if (!this.redis.ready) {
      return { universeId, available: false, count: 0, players: [], serverTime: new Date().toISOString() };
    }
    const now = Date.now();
    const key = this.key(universeId);
    try {
      const ids = await this.redis.client.zrangebyscore(key, now - PRESENCE_TTL_SECONDS * 1000, "+inf", "LIMIT", 0, ONLINE_LIMIT);
      if (ids.length === 0) {
        return { universeId, available: true, count: 0, players: [], serverTime: new Date().toISOString() };
      }
      const players = await this.prisma.client.player.findMany({
        where: { id: { in: ids } },
        select: { id: true, idDisplayName: true, idUsername: true }
      });
      const names = new Map(players.map((player) => [player.id, player.idDisplayName ?? player.idUsername ?? player.id.slice(0, 8)]));
      return {
        universeId,
        available: true,
        count: ids.length,
        players: ids.map((id) => ({ id, displayName: names.get(id) ?? id.slice(0, 8) })),
        serverTime: new Date().toISOString()
      };
    } catch {
      return { universeId, available: false, count: 0, players: [], serverTime: new Date().toISOString() };
    }
  }

  publish(notification: WorldNotification): void {
    this.events.emit("notification", notification);
  }

  subscribe(listener: (notification: WorldNotification) => void): () => void {
    this.events.on("notification", listener);
    return () => this.events.off("notification", listener);
  }
}
