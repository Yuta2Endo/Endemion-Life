import { createHash } from "node:crypto";
import { Inject, Injectable } from "@nestjs/common";
import { ApiError } from "../common/api-error.js";
import { APP_CONFIG, type AppConfig } from "../config.js";
import { RedisService } from "../redis/redis.service.js";

const WINDOW_SECONDS = 60;
const MEMORY_LIMIT = 10_000;

/** Ключ для адреса почты: в Redis и в памяти хранится хеш, а не сам адрес */
export function emailKey(email: string): string {
  return `email:${createHash("sha256").update(email).digest("hex").slice(0, 32)}`;
}

/**
 * Лимит на вход, регистрацию, ввод кодов и восстановление доступа.
 * Считает отдельно по адресу клиента и по адресу почты: перебор с разных IP по одному аккаунту тоже упирается в лимит.
 * В отличие от общего лимита запросов не отключается без Redis: тогда счётчики живут в памяти процесса.
 * Это защита первого уровня; второй — блокировка аккаунта и лимит попыток кода в базе
 */
@Injectable()
export class AuthThrottle {
  private readonly memory = new Map<string, { count: number; resetAt: number }>();

  constructor(
    @Inject(APP_CONFIG) private readonly config: AppConfig,
    @Inject(RedisService) private readonly redis: RedisService
  ) {}

  /** Учитывает попытку по каждому ключу. 429, если хотя бы по одному лимит превышен */
  async hit(keys: string[]): Promise<void> {
    const limit = this.config.authRateLimitPerMinute;
    if (limit === 0) return;
    for (const key of keys) {
      const count = await this.increment(`auth:${key}`);
      if (count > limit) throw new ApiError(429, "RATE_LIMITED", "Слишком много попыток. Подождите минуту");
    }
  }

  private async increment(key: string): Promise<number> {
    if (this.redis.ready) {
      try {
        const window = Math.floor(Date.now() / (WINDOW_SECONDS * 1000));
        const redisKey = `${key}:${window}`;
        const result = await this.redis.client.multi().incr(redisKey).expire(redisKey, WINDOW_SECONDS + 1).exec();
        return Number(result?.[0]?.[1] ?? 0);
      } catch {
        // Redis отказал посреди запроса — считаем в памяти
      }
    }
    return this.incrementInMemory(key);
  }

  private incrementInMemory(key: string): number {
    const now = Date.now();
    if (this.memory.size > MEMORY_LIMIT) {
      for (const [k, v] of this.memory) if (v.resetAt <= now) this.memory.delete(k);
    }
    const entry = this.memory.get(key);
    if (!entry || entry.resetAt <= now) {
      this.memory.set(key, { count: 1, resetAt: now + WINDOW_SECONDS * 1000 });
      return 1;
    }
    entry.count += 1;
    return entry.count;
  }
}
