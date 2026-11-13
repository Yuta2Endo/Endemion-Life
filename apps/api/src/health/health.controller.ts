import type { HealthResponse } from "@endemion/shared";
import { Controller, Get, Header, Inject, Res } from "@nestjs/common";
import type { Response } from "express";
import { APP_VERSION } from "../config.js";
import { PrismaService } from "../prisma/prisma.service.js";
import { RedisService } from "../redis/redis.service.js";

/**
 * GET /api/health. 200 — API работает (status: "degraded", если Redis недоступен: игра идёт без лимита запросов).
 * 503 — нет базы данных: играть нельзя
 */
@Controller("health")
export class HealthController {
  private readonly startedAt = Date.now();

  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(RedisService) private readonly redis: RedisService
  ) {}

  @Get()
  @Header("Cache-Control", "no-store")
  async check(@Res({ passthrough: true }) response: Response): Promise<HealthResponse> {
    const [database, redis] = await Promise.all([this.prisma.isUp(), this.redis.isUp()]);
    if (!database || !redis) response.status(503);
    return {
      status: database && redis ? "ok" : "degraded",
      version: APP_VERSION,
      uptimeSeconds: Math.round((Date.now() - this.startedAt) / 1000),
      services: { database: database ? "up" : "down", redis: redis ? "up" : "down" }
    };
  }
}
