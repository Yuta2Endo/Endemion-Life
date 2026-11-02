import { Inject, Injectable, Logger, type OnModuleDestroy, type OnModuleInit } from "@nestjs/common";
import { Redis } from "ioredis";
import { APP_CONFIG, type AppConfig } from "../config.js";

const PING_TIMEOUT_MS = 1000;

/**
 * Redis для лимита запросов. Если Redis недоступен, API продолжает работать без лимита,
 * а клиент сам переподключается, когда Redis вернётся
 */
@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  readonly client: Redis;
  private readonly logger = new Logger("Redis");
  private reportedDown = false;

  constructor(@Inject(APP_CONFIG) config: AppConfig) {
    this.client = new Redis(config.redisUrl, {
      lazyConnect: true,
      connectTimeout: 2000,
      maxRetriesPerRequest: 1,
      enableOfflineQueue: false
    });
    this.client.on("ready", () => {
      if (this.reportedDown) this.logger.log("Redis снова доступен");
      this.reportedDown = false;
    });
    // Ошибка пишется в лог один раз, а не при каждой попытке переподключения
    this.client.on("error", (error: Error) => {
      if (this.reportedDown) return;
      this.reportedDown = true;
      this.logger.warn(`Redis недоступен: ${error.message}. Лимит запросов отключён до восстановления связи`);
    });
  }

  get ready(): boolean {
    return this.client.status === "ready";
  }

  async onModuleInit(): Promise<void> {
    try {
      await this.client.connect();
    } catch {
      // Сообщение уже в логе (событие error), переподключение идёт само
    }
  }

  async isUp(): Promise<boolean> {
    if (!this.ready) return false;
    let timer: NodeJS.Timeout | undefined;
    try {
      const timeout = new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error("timeout")), PING_TIMEOUT_MS);
      });
      return (await Promise.race([this.client.ping(), timeout])) === "PONG";
    } catch {
      return false;
    } finally {
      clearTimeout(timer);
    }
  }

  onModuleDestroy(): void {
    this.client.disconnect();
  }
}
