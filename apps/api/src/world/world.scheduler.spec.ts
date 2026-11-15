import { UNIVERSE_IDS } from "@endemion/game-core";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { AppConfig } from "../config.js";
import { WorldSchedulerService } from "./world.scheduler.service.js";
import type { WorldService } from "./world.service.js";

const config = (enabled: boolean): AppConfig =>
  ({ worldTickEnabled: enabled, worldTickIntervalMs: 60_000 }) as AppConfig;

describe("WorldSchedulerService", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("не запускает ход мира, когда автоматический режим выключен", async () => {
    vi.useFakeTimers();
    const tick = vi.fn().mockResolvedValue(undefined);
    const scheduler = new WorldSchedulerService({ tick } as unknown as WorldService, config(false));
    scheduler.onModuleInit();
    await vi.advanceTimersByTimeAsync(120_000);
    expect(tick).not.toHaveBeenCalled();
    scheduler.onModuleDestroy();
  });

  it("продвигает все шесть миров по интервалу", async () => {
    vi.useFakeTimers();
    const tick = vi.fn().mockResolvedValue(undefined);
    const scheduler = new WorldSchedulerService({ tick } as unknown as WorldService, config(true));
    scheduler.onModuleInit();
    await vi.advanceTimersByTimeAsync(60_000);
    expect(tick).toHaveBeenCalledTimes(UNIVERSE_IDS.length);
    expect(tick.mock.calls.map((call) => call[0])).toEqual([...UNIVERSE_IDS]);
    scheduler.onModuleDestroy();
  });

  it("не запускает второй проход, пока первый ещё идёт", async () => {
    vi.useFakeTimers();
    let release!: () => void;
    const tick = vi.fn().mockImplementation(() => new Promise<void>((resolve) => {
      release = resolve;
    }));
    const scheduler = new WorldSchedulerService({ tick } as unknown as WorldService, config(true));
    scheduler.onModuleInit();
    await vi.advanceTimersByTimeAsync(60_000);
    await vi.advanceTimersByTimeAsync(60_000);
    expect(tick).toHaveBeenCalledTimes(1);
    release();
    scheduler.onModuleDestroy();
  });
});
