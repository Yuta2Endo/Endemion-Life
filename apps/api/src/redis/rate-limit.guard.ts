import { Inject, Injectable, type CanActivate, type ExecutionContext } from "@nestjs/common";
import type { Request } from "express";
import { ApiError } from "../common/api-error.js";
import { APP_CONFIG, type AppConfig } from "../config.js";
import { RedisService } from "./redis.service.js";

const WINDOW_SECONDS = 60;

/** Не больше RATE_LIMIT_PER_MINUTE запросов в минуту с одного адреса. Проверка здоровья в лимит не входит */
@Injectable()
export class RateLimitGuard implements CanActivate {
  constructor(
    @Inject(APP_CONFIG) private readonly config: AppConfig,
    @Inject(RedisService) private readonly redis: RedisService
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const limit = this.config.rateLimitPerMinute;
    const request = context.switchToHttp().getRequest<Request>();
    if (limit === 0 || request.path === "/api/health" || !this.redis.ready) return true;

    const window = Math.floor(Date.now() / (WINDOW_SECONDS * 1000));
    const key = `rl:${request.ip ?? "unknown"}:${window}`;
    let count: number;
    try {
      const result = await this.redis.client.multi().incr(key).expire(key, WINDOW_SECONDS + 1).exec();
      count = Number(result?.[0]?.[1] ?? 0);
    } catch {
      return true;
    }
    if (count > limit) throw new ApiError(429, "RATE_LIMITED", "Слишком много запросов. Подождите минуту");
    return true;
  }
}
