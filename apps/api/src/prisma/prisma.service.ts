import { createPrismaClient, type PrismaClient } from "@endemion/database";
import { Inject, Injectable, type OnApplicationShutdown } from "@nestjs/common";
import { APP_CONFIG, type AppConfig } from "../config.js";

@Injectable()
export class PrismaService implements OnApplicationShutdown {
  readonly client: PrismaClient;

  constructor(@Inject(APP_CONFIG) config: AppConfig) {
    this.client = createPrismaClient({ url: config.databaseUrl });
  }

  async isUp(): Promise<boolean> {
    try {
      await this.client.$queryRaw`SELECT 1`;
      return true;
    } catch {
      return false;
    }
  }

  /** После закрытия HTTP-сервера (onModuleDestroy вызывается раньше): запросы, пришедшие во время остановки, не получат закрытый пул */
  async onApplicationShutdown(): Promise<void> {
    await this.client.$disconnect();
  }
}
