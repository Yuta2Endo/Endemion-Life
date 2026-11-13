// Stage 04 — Living Worlds. Чтение общего мира открыто; tick, replay и metrics —
// только с заголовком x-world-ops и WORLD_OPS_TOKEN из окружения (не из config.ts).
// Нет токена или он короче 16 символов — маршрута как будто нет (404).
import { timingSafeEqual } from "node:crypto";
import { SHARED_WORLD_EVENT_KINDS } from "@endemion/game-core";
import { Body, Controller, Get, Headers, HttpCode, Inject, Param, Post } from "@nestjs/common";
import { z } from "zod";
import { ApiError, parseOrThrow } from "../common/api-error.js";
import { assertUniverseId, WorldService } from "./world.service.js";

const titleSchema = z.strictObject({
  ru: z.string().trim().min(1).max(160),
  en: z.string().trim().min(1).max(160)
});

const textSchema = z.strictObject({
  ru: z.string().trim().min(1).max(500),
  en: z.string().trim().min(1).max(500)
});

const eventCommandSchema = z.strictObject({
  type: z.literal("event"),
  kind: z.enum(SHARED_WORLD_EVENT_KINDS),
  title: titleSchema,
  text: textSchema,
  settlementId: z.string().trim().min(1).max(48).optional(),
  factionId: z.string().trim().min(1).max(48).optional(),
  severity: z.int().min(1).max(5)
});

const settlementCommandSchema = z.strictObject({
  type: z.literal("settlement"),
  settlementId: z.string().trim().min(1).max(48),
  population: z.int().min(100).max(1_000_000).optional(),
  prosperity: z.int().min(0).max(100).optional(),
  stability: z.int().min(0).max(100).optional(),
  dominantFactionId: z.string().trim().min(1).max(48).nullable().optional()
});

const factionCommandSchema = z.strictObject({
  type: z.literal("faction"),
  factionId: z.string().trim().min(1).max(48),
  power: z.int().min(0).max(100).optional(),
  influence: z.int().min(-100).max(100).optional(),
  standing: z.int().min(-100).max(100).optional()
});

const commandSchema = z.discriminatedUnion("type", [eventCommandSchema, settlementCommandSchema, factionCommandSchema]);

const WORLD_OPS_MIN_LENGTH = 16;

function sameToken(given: string | undefined, expected: string): boolean {
  if (!given) return false;
  const left = Buffer.from(given);
  const right = Buffer.from(expected);
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

function worldOpsToken(): string {
  return (process.env.WORLD_OPS_TOKEN ?? "").trim();
}

function seasonOf(value: string): number {
  if (!/^[0-9]{1,7}$/.test(value)) throw new ApiError(404, "NOT_FOUND", "Сезон не найден");
  const season = Number(value);
  if (!Number.isInteger(season) || season < 1) throw new ApiError(404, "NOT_FOUND", "Сезон не найден");
  return season;
}

@Controller("world")
export class WorldController {
  constructor(@Inject(WorldService) private readonly world: WorldService) {}

  /** Все шесть миров и сводка текущего сезона */
  @Get()
  async list() {
    return this.world.list();
  }

  /** Ops: длительность последнего tick, отставание проекции, сезоны, checksum */
  @Get("admin/metrics")
  async metrics(@Headers("x-world-ops") token: string | undefined) {
    this.ops(token);
    return this.world.metrics();
  }

  /** Ops: replay текущего состояния от seed по журналу команд */
  @Get(":universeId/replay")
  async replay(@Headers("x-world-ops") token: string | undefined, @Param("universeId") universeId: string) {
    this.ops(token);
    return this.world.replay(assertUniverseId(universeId), null);
  }

  /** Ops: replay до указанного сезона и сверка со снимком сезона */
  @Get(":universeId/seasons/:season/replay")
  async replaySeason(
    @Headers("x-world-ops") token: string | undefined,
    @Param("universeId") universeId: string,
    @Param("season") season: string
  ) {
    this.ops(token);
    return this.world.replay(assertUniverseId(universeId), seasonOf(season));
  }

  /** Исторический снимок сезона */
  @Get(":universeId/seasons/:season")
  async season(@Param("universeId") universeId: string, @Param("season") season: string) {
    return this.world.season(assertUniverseId(universeId), seasonOf(season));
  }

  /** Публичная агрегированная сверка миров жизней с общим миром. Без PII */
  @Get(":universeId/reconciliation")
  async reconciliation(@Param("universeId") universeId: string) {
    return this.world.reconciliation(assertUniverseId(universeId));
  }

  /** Текущий общий мир: поселения, фракции, события, товары */
  @Get(":universeId")
  async current(@Param("universeId") universeId: string) {
    return this.world.current(assertUniverseId(universeId));
  }

  /** Ops: ровно один сезонный шаг в транзакции под advisory lock */
  @Post(":universeId/tick")
  @HttpCode(200)
  async tick(@Headers("x-world-ops") token: string | undefined, @Param("universeId") universeId: string) {
    this.ops(token);
    return this.world.tick(assertUniverseId(universeId));
  }

  /** Ops: правка администратора — event, settlement или faction. Пишет команду и аудит */
  @Post(":universeId/commands")
  @HttpCode(200)
  async command(
    @Headers("x-world-ops") token: string | undefined,
    @Param("universeId") universeId: string,
    @Body() body: unknown
  ) {
    this.ops(token);
    const id = assertUniverseId(universeId);
    const command = parseOrThrow(commandSchema, body);
    if (command.type === "settlement") {
      const keys = ["population", "prosperity", "stability", "dominantFactionId"] as const;
      if (keys.every((key) => command[key] === undefined)) {
        throw new ApiError(400, "VALIDATION", "Нужно хотя бы одно изменение поселения");
      }
    }
    if (command.type === "faction") {
      const keys = ["power", "influence", "standing"] as const;
      if (keys.every((key) => command[key] === undefined)) {
        throw new ApiError(400, "VALIDATION", "Нужно хотя бы одно изменение фракции");
      }
    }
    return this.world.command(id, command);
  }

  /** Нет токена в окружении, он короткий или заголовок не совпал — маршрута как будто нет */
  private ops(token: string | undefined): void {
    const expected = worldOpsToken();
    if (expected.length < WORLD_OPS_MIN_LENGTH || !sameToken(token, expected)) {
      throw new ApiError(404, "NOT_FOUND", "Не найдено");
    }
  }
}
