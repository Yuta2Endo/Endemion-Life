import { UNIVERSE_IDS, type UniverseId } from "@endemion/game-core";
import { Inject, Injectable, Logger, type OnModuleDestroy, type OnModuleInit } from "@nestjs/common";
import { APP_CONFIG, type AppConfig } from "../config.js";
import { WorldService } from "./world.service.js";

/**
 * R3.1: the shared world advances without an operator request.
 * Disabled in tests; enabled by default in production.
 */
@Injectable()
export class WorldSchedulerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger("WorldScheduler");
  private timer: NodeJS.Timeout | null = null;
  private running = false;

  constructor(
    @Inject(WorldService) private readonly worlds: WorldService,
    @Inject(APP_CONFIG) private readonly config: AppConfig
  ) {}

  onModuleInit(): void {
    if (!this.config.worldTickEnabled) {
      this.logger.log("Автоматический ход общего мира выключен");
      return;
    }
    this.timer = setInterval(() => void this.tickAll(), this.config.worldTickIntervalMs);
    this.timer.unref?.();
    this.logger.log(`Автоматический ход общего мира: каждые ${Math.round(this.config.worldTickIntervalMs / 1000)} с`);
  }

  onModuleDestroy(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }

  private async tickAll(): Promise<void> {
    if (this.running) return;
    this.running = true;
    try {
      for (const universeId of UNIVERSE_IDS) {
        try {
          await this.worlds.tick(universeId as UniverseId);
        } catch (error) {
          this.logger.error(`Не удалось продвинуть мир ${universeId}`, error instanceof Error ? error.stack : String(error));
        }
      }
    } finally {
      this.running = false;
    }
  }
}
