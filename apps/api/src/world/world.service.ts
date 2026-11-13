// Stage 04 — Living Worlds: общий мир сервера. Чтение — всем, изменение — только с WORLD_OPS_TOKEN.
// Состояние хранится в worlds.state; Settlement/Faction/WorldEvent — нормализованные проекции.
// Жизни сюда не пишут: POST /api/lives/:id/actions не трогает таблицы мира.
import { Prisma, type PrismaClient } from "@endemion/database";
import {
  applySharedWorldCommand,
  getUniverse,
  isUniverseId,
  newSharedWorld,
  normalizeWorldState,
  parseSave,
  parseSharedWorldState,
  RECONCILIATION_TOLERANCE,
  reconcileSharedWorld,
  replaySharedWorld,
  SHARED_WORLD_VERSION,
  sharedWorldChecksum,
  UNIVERSE_IDS,
  type SharedWorldCommand,
  type SharedWorldEvent,
  type SharedWorldFactionComparison,
  type SharedWorldReconciliation,
  type SharedWorldSettlementComparison,
  type SharedWorldState,
  type UniverseId
} from "@endemion/game-core";
import { Inject, Injectable, Logger } from "@nestjs/common";
import { ApiError } from "../common/api-error.js";
import { PrismaService } from "../prisma/prisma.service.js";

type Tx = Prisma.TransactionClient;

interface WorldRow {
  id: string;
  universeId: string;
  seed: string;
  version: number;
  season: number;
  checksum: string;
  state: unknown;
  lastTickDurationMs: number;
  lastTickAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface WorldSummary {
  universeId: UniverseId;
  name: { ru: string; en: string };
  version: number;
  season: number;
  checksum: string;
  settlements: number;
  factions: number;
  events: number;
  latestEvent: SharedWorldEvent | null;
  updatedAt: string;
}

export interface WorldCurrent {
  world: SharedWorldState;
  checksum: string;
  updatedAt: string;
}

export interface WorldSeasonView {
  season: number;
  checksum: string;
  world: SharedWorldState;
  durationMs: number;
  tickedAt: string;
  updatedAt: string;
}

export interface WorldReplayView {
  universeId: UniverseId;
  season: number;
  requestedSeason: number | null;
  commands: number;
  checksum: string;
  expectedChecksum: string;
  valid: boolean;
}

export interface WorldMetricsView {
  generatedAt: string;
  worlds: Array<{
    universeId: UniverseId;
    season: number;
    seasons: number;
    events: number;
    commands: number;
    lastTickDurationMs: number;
    lastTickAt: string | null;
    projectionLagMs: number;
    checksum: { stored: string; current: string; valid: boolean; snapshotValid: boolean };
  }>;
}

export interface WorldReconciliationView {
  universeId: UniverseId;
  season: number;
  generatedAt: string;
  lives: { total: number; scanned: number; aligned: number; drifted: number; unreadable: number };
  settlements: { compared: number; aligned: number; drifted: number; missing: number };
  factions: { compared: number; aligned: number; drifted: number; missing: number };
  tolerance: typeof RECONCILIATION_TOLERANCE;
  examples: {
    settlements: SharedWorldSettlementComparison[];
    factions: SharedWorldFactionComparison[];
  };
}

function json(value: unknown): Prisma.InputJsonValue {
  return value as Prisma.InputJsonValue;
}

function iso(value: Date | null): string | null {
  return value ? value.toISOString() : null;
}

@Injectable()
export class WorldService {
  private readonly db: PrismaClient;
  private readonly logger = new Logger("World");

  constructor(@Inject(PrismaService) prisma: PrismaService) {
    this.db = prisma.client;
  }

  /** Все шесть миров. Ленивое создание идемпотентно: уникальный universe_id и advisory lock */
  async list(): Promise<{ worlds: WorldSummary[] }> {
    await this.ensureAllWorlds();
    // Один запрос на шесть строк: сводка не смешивает миры, прочитанные до и после чужого tick
    const rows = await this.db.world.findMany({ where: { universeId: { in: [...UNIVERSE_IDS] } } });
    const byUniverse = new Map(rows.map((row) => [row.universeId, row]));
    const worlds: WorldSummary[] = [];
    for (const universeId of UNIVERSE_IDS) {
      const row = byUniverse.get(universeId);
      if (!row) continue;
      const state = parseSharedWorldState(row.state);
      worlds.push({
        universeId,
        name: getUniverse(universeId).name,
        version: state.version,
        season: state.season,
        checksum: row.checksum,
        settlements: state.settlements.length,
        factions: state.factions.length,
        events: state.events.length,
        latestEvent: state.events[0] ?? null,
        updatedAt: row.updatedAt.toISOString()
      });
    }
    return { worlds };
  }

  async current(universeId: UniverseId): Promise<WorldCurrent> {
    const row = await this.ensureWorld(universeId);
    return {
      world: parseSharedWorldState(row.state),
      checksum: row.checksum,
      updatedAt: row.updatedAt.toISOString()
    };
  }

  async season(universeId: UniverseId, season: number): Promise<WorldSeasonView> {
    const row = await this.ensureWorld(universeId);
    const snapshot = await this.db.worldSeason.findUnique({
      where: { worldId_season: { worldId: row.id, season } }
    });
    if (!snapshot) throw new ApiError(404, "NOT_FOUND", "Такого сезона нет");
    return {
      season: snapshot.season,
      checksum: snapshot.checksum,
      world: parseSharedWorldState(snapshot.state),
      durationMs: snapshot.durationMs,
      tickedAt: snapshot.createdAt.toISOString(),
      updatedAt: snapshot.updatedAt.toISOString()
    };
  }

  /**
   * Один сезонный шаг. Вся работа — в транзакции под advisory lock на вселенную:
   * либо мир, снимок, проекции, команда и аудит меняются вместе, либо не меняется ничего
   */
  async tick(universeId: UniverseId): Promise<{ world: SharedWorldState; checksum: string; season: number; durationMs: number; latestEvent: SharedWorldEvent | null }> {
    await this.ensureWorld(universeId);
    const started = Date.now();
    try {
      const result = await this.db.$transaction(async (tx) => {
        const row = await this.lockWorld(tx, universeId);
        const before = parseSharedWorldState(row.state);
        const seasonBefore = before.season;
        const next = applySharedWorldCommand(before, { type: "tick" });
        const checksum = sharedWorldChecksum(next);
        const durationMs = Math.max(0, Date.now() - started);
        const seq = await this.nextCommandSeq(tx, row.id);

        await tx.world.update({
          where: { id: row.id },
          data: {
            season: next.season,
            checksum,
            state: json(next),
            lastTickDurationMs: durationMs,
            lastTickAt: new Date()
          }
        });
        await this.writeSeason(tx, row.id, next, checksum, durationMs);
        await this.writeProjections(tx, row.id, next);
        await tx.worldCommand.create({
          data: {
            worldId: row.id,
            seq,
            type: "tick",
            payload: json({ type: "tick" }),
            seasonBefore,
            seasonAfter: next.season,
            checksum,
            actor: "ops"
          }
        });
        await tx.worldAudit.create({
          data: {
            worldId: row.id,
            action: "tick",
            actor: "ops",
            detail: json({ seasonBefore, seasonAfter: next.season, durationMs, checksum })
          }
        });
        return { world: next, checksum, season: next.season, durationMs, latestEvent: next.events[0] ?? null };
      });
      this.logger.log({
        msg: "Сезон общего мира продвинут",
        universeId,
        season: result.season,
        durationMs: result.durationMs
      });
      return result;
    } catch (error) {
      // Ошибки клиента (404/400) не шумят в журнале: это не сбой мира
      if (error instanceof ApiError && error.status < 500) throw error;
      this.logger.error({ msg: "Ход общего мира не выполнен", universeId, error });
      if (error instanceof ApiError) throw error;
      throw new ApiError(500, "INTERNAL", "Не удалось продвинуть сезон общего мира");
    }
  }

  /** Правка администратора: event, settlement или faction. Сезон не двигается */
  async command(
    universeId: UniverseId,
    command: Exclude<SharedWorldCommand, { type: "tick" }>
  ): Promise<{ world: SharedWorldState; checksum: string; applied: SharedWorldCommand; event: SharedWorldEvent | null }> {
    await this.ensureWorld(universeId);
    try {
      return await this.db.$transaction(async (tx) => {
        const row = await this.lockWorld(tx, universeId);
        const before = parseSharedWorldState(row.state);
        this.checkCommandTargets(before, command);
        const next = applySharedWorldCommand(before, command);
        const checksum = sharedWorldChecksum(next);
        const seq = await this.nextCommandSeq(tx, row.id);

        await tx.world.update({
          where: { id: row.id },
          data: { season: next.season, checksum, state: json(next) }
        });
        // Текущий сезон мог уже иметь снимок: правка администратора обновляет его, длительность tick сохраняется
        await this.writeSeason(tx, row.id, next, checksum, 0);
        await this.writeProjections(tx, row.id, next);
        await tx.worldCommand.create({
          data: {
            worldId: row.id,
            seq,
            type: command.type,
            payload: json(command),
            seasonBefore: before.season,
            seasonAfter: next.season,
            checksum,
            actor: "ops"
          }
        });
        await tx.worldAudit.create({
          data: {
            worldId: row.id,
            action: `command.${command.type}`,
            actor: "ops",
            detail: json({
              command,
              seasonBefore: before.season,
              seasonAfter: next.season,
              checksum
            })
          }
        });
        return {
          world: next,
          checksum,
          applied: command,
          event: command.type === "event" ? next.events[0] ?? null : null
        };
      });
    } catch (error) {
      if (error instanceof ApiError && error.status < 500) throw error;
      this.logger.error({ msg: "Команда общего мира не выполнена", universeId, error });
      if (error instanceof ApiError) throw error;
      throw new ApiError(500, "INTERNAL", "Не удалось применить команду общего мира");
    }
  }

  /**
   * Replay от seed по журналу команд. Без сезона сверяется текущее состояние,
   * с сезоном — снимок этого сезона. Расхождение не 500: это результат проверки
   */
  async replay(universeId: UniverseId, requestedSeason: number | null): Promise<WorldReplayView> {
    await this.ensureWorld(universeId);
    try {
      return await this.db.$transaction(async (tx) => {
        // Replay сверяется с миром под тем же lock, что tick и команды: не ловим промежуточное состояние
        const row = await this.lockWorld(tx, universeId);
        let expectedChecksum = row.checksum;
        if (requestedSeason !== null) {
          const snapshot = await tx.worldSeason.findUnique({
            where: { worldId_season: { worldId: row.id, season: requestedSeason } }
          });
          if (!snapshot) throw new ApiError(404, "NOT_FOUND", "Такого сезона нет");
          expectedChecksum = snapshot.checksum;
        }
        const commands = await tx.worldCommand.findMany({
          where: {
            worldId: row.id,
            ...(requestedSeason === null ? {} : { seasonAfter: { lte: requestedSeason } })
          },
          orderBy: { seq: "asc" }
        });
        const replayed = replaySharedWorld(
          universeId,
          row.seed,
          commands.map((command) => command.payload as unknown as SharedWorldCommand)
        );
        const checksum = sharedWorldChecksum(replayed);
        return {
          universeId,
          season: replayed.season,
          requestedSeason,
          commands: commands.length,
          checksum,
          expectedChecksum,
          valid: checksum === expectedChecksum
        };
      });
    } catch (error) {
      if (error instanceof ApiError) throw error;
      this.logger.error({ msg: "Replay общего мира не выполнен", universeId, requestedSeason, error });
      throw new ApiError(500, "INTERNAL", "Не удалось воспроизвести общий мир");
    }
  }

  /** Наблюдаемость: длительность последнего tick, отставание проекции, число сезонов, checksum */
  async metrics(): Promise<WorldMetricsView> {
    const rows = await this.ensureAllWorlds();
    const now = Date.now();
    const worlds: WorldMetricsView["worlds"] = [];
    for (const row of rows) {
      const state = parseSharedWorldState(row.state);
      const current = sharedWorldChecksum(state);
      const seasons = await this.db.worldSeason.count({ where: { worldId: row.id } });
      const latest = await this.db.worldSeason.findFirst({ where: { worldId: row.id }, orderBy: { season: "desc" } });
      const [events, commands] = await Promise.all([
        this.db.worldEvent.count({ where: { worldId: row.id } }),
        this.db.worldCommand.count({ where: { worldId: row.id } })
      ]);
      worlds.push({
        universeId: state.universeId,
        season: state.season,
        seasons,
        events,
        commands,
        lastTickDurationMs: row.lastTickDurationMs,
        lastTickAt: iso(row.lastTickAt),
        projectionLagMs: Math.max(0, now - row.updatedAt.getTime()),
        checksum: {
          stored: row.checksum,
          current,
          valid: row.checksum === current,
          snapshotValid: latest !== null && latest.checksum === row.checksum
        }
      });
    }
    worlds.sort((a, b) => a.universeId.localeCompare(b.universeId));
    return { generatedAt: new Date().toISOString(), worlds };
  }

  /**
   * Публичная сверка: миры живых жизней этой вселенной против общего мира.
   * Возвращаются только счётчики и примеры поселений/фракций; ни id игрока, ни id жизни
   */
  async reconciliation(universeId: UniverseId): Promise<WorldReconciliationView> {
    const row = await this.ensureWorld(universeId);
    const shared = parseSharedWorldState(row.state);
    const where = { universeId, status: "alive" as const };
    const [total, lives] = await Promise.all([
      this.db.life.count({ where }),
      this.db.life.findMany({
        where,
        orderBy: { updatedAt: "desc" },
        // Сверка дешёвая, но не безграничная: считаем все жизни, разбираем тысячу последних
        take: 1000,
        select: { state: true }
      })
    ]);

    let aligned = 0;
    let drifted = 0;
    let unreadable = 0;
    let settlementCompared = 0;
    let settlementAligned = 0;
    let settlementDrifted = 0;
    let settlementMissing = 0;
    let factionCompared = 0;
    let factionAligned = 0;
    let factionDrifted = 0;
    let factionMissing = 0;
    const settlementExamples: SharedWorldSettlementComparison[] = [];
    const factionExamples: SharedWorldFactionComparison[] = [];
    const universe = getUniverse(universeId);

    for (const life of lives) {
      let comparison: SharedWorldReconciliation;
      try {
        const state = parseSave(life.state);
        comparison = reconcileSharedWorld(shared, normalizeWorldState(state.world, universe));
      } catch {
        unreadable += 1;
        continue;
      }
      if (comparison.aligned) aligned += 1;
      else drifted += 1;
      settlementCompared += comparison.settlements.total;
      settlementAligned += comparison.settlements.aligned;
      settlementDrifted += comparison.settlements.drifted;
      settlementMissing += comparison.settlements.missing;
      factionCompared += comparison.factions.total;
      factionAligned += comparison.factions.aligned;
      factionDrifted += comparison.factions.drifted;
      factionMissing += comparison.factions.missing;
      if (settlementExamples.length < 5) settlementExamples.push(...comparison.settlements.examples.slice(0, 5 - settlementExamples.length));
      if (factionExamples.length < 5) factionExamples.push(...comparison.factions.examples.slice(0, 5 - factionExamples.length));
    }

    return {
      universeId,
      season: shared.season,
      generatedAt: new Date().toISOString(),
      lives: { total, scanned: lives.length, aligned, drifted, unreadable },
      settlements: {
        compared: settlementCompared,
        aligned: settlementAligned,
        drifted: settlementDrifted,
        missing: settlementMissing
      },
      factions: {
        compared: factionCompared,
        aligned: factionAligned,
        drifted: factionDrifted,
        missing: factionMissing
      },
      tolerance: RECONCILIATION_TOLERANCE,
      examples: { settlements: settlementExamples, factions: factionExamples }
    };
  }

  // ——— Ленивое создание мира и транзакционные помощники ———

  private async ensureAllWorlds(): Promise<WorldRow[]> {
    return Promise.all(UNIVERSE_IDS.map((universeId) => this.ensureWorld(universeId)));
  }

  /** Идемпотентно создаёт мир вселенной. Advisory lock не даёт двум запросам создать две строки */
  private async ensureWorld(universeId: UniverseId): Promise<WorldRow> {
    const existing = await this.db.world.findUnique({ where: { universeId } });
    if (existing) return existing;
    return this.db.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`world:${universeId}`}))`;
      const raced = await tx.world.findUnique({ where: { universeId } });
      if (raced) return raced;
      const state = newSharedWorld(universeId);
      const checksum = sharedWorldChecksum(state);
      const created = await tx.world.create({
        data: {
          universeId,
          seed: state.seed,
          version: SHARED_WORLD_VERSION,
          season: state.season,
          checksum,
          state: json(state)
        }
      });
      await this.writeSeason(tx, created.id, state, checksum, 0);
      await this.writeProjections(tx, created.id, state);
      await tx.worldAudit.create({
        data: {
          worldId: created.id,
          action: "seed",
          actor: "system",
          detail: json({ universeId, season: state.season, checksum })
        }
      });
      return created;
    });
  }

  /** Один advisory lock на вселенную сериализует tick, replay-изменения и правки администратора */
  private async lockWorld(tx: Tx, universeId: UniverseId): Promise<WorldRow> {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`world:${universeId}`}))`;
    const row = await tx.world.findUnique({ where: { universeId } });
    if (!row) throw new ApiError(404, "NOT_FOUND", "Мир не найден");
    return row;
  }

  private async nextCommandSeq(tx: Tx, worldId: string): Promise<number> {
    const last = await tx.worldCommand.aggregate({ where: { worldId }, _max: { seq: true } });
    return (last._max.seq ?? 0) + 1;
  }

  /** Снимок сезона. Для tick — новая строка; для правки администратора — обновление текущей */
  private async writeSeason(
    tx: Tx,
    worldId: string,
    state: SharedWorldState,
    checksum: string,
    durationMs: number
  ): Promise<void> {
    const existing = await tx.worldSeason.findUnique({
      where: { worldId_season: { worldId, season: state.season } }
    });
    if (existing) {
      await tx.worldSeason.update({
        where: { id: existing.id },
        data: { checksum, state: json(state) }
      });
      return;
    }
    await tx.worldSeason.create({
      data: { worldId, season: state.season, checksum, state: json(state), durationMs }
    });
  }

  private async writeProjections(tx: Tx, worldId: string, state: SharedWorldState): Promise<void> {
    for (const settlement of state.settlements) {
      const data = {
        nameRu: settlement.name.ru,
        nameEn: settlement.name.en,
        kind: settlement.kind,
        tags: settlement.tags,
        wageFactor: settlement.wageFactor,
        costFactor: settlement.costFactor,
        travelCost: settlement.travelCost,
        population: settlement.population,
        prosperity: settlement.prosperity,
        stability: settlement.stability,
        dominantFactionId: settlement.dominantFactionId,
        goods: json(settlement.goods)
      };
      await tx.settlement.upsert({
        where: { worldId_settlementId: { worldId, settlementId: settlement.id } },
        create: { worldId, settlementId: settlement.id, ...data },
        update: data
      });
    }
    for (const faction of state.factions) {
      const data = {
        nameRu: faction.name.ru,
        nameEn: faction.name.en,
        power: faction.power,
        influence: faction.influence,
        standing: faction.standing
      };
      await tx.faction.upsert({
        where: { worldId_factionId: { worldId, factionId: faction.id } },
        create: { worldId, factionId: faction.id, ...data },
        update: data
      });
    }
    if (state.events.length > 0) {
      await tx.worldEvent.createMany({
        data: state.events.map((event) => ({
          id: event.id,
          worldId,
          season: event.season,
          kind: event.kind,
          titleRu: event.title.ru,
          titleEn: event.title.en,
          textRu: event.text.ru,
          textEn: event.text.en,
          settlementId: event.settlementId ?? null,
          factionId: event.factionId ?? null,
          severity: event.severity
        })),
        skipDuplicates: true
      });
    }
  }

  private checkCommandTargets(state: SharedWorldState, command: Exclude<SharedWorldCommand, { type: "tick" }>): void {
    if (command.type === "event") {
      if (command.settlementId && !state.settlements.some((item) => item.id === command.settlementId)) {
        throw new ApiError(404, "NOT_FOUND", "Поселение не найдено");
      }
      if (command.factionId && !state.factions.some((item) => item.id === command.factionId)) {
        throw new ApiError(404, "NOT_FOUND", "Фракция не найдена");
      }
      return;
    }
    if (command.type === "settlement") {
      if (!state.settlements.some((item) => item.id === command.settlementId)) {
        throw new ApiError(404, "NOT_FOUND", "Поселение не найдено");
      }
      if (
        command.dominantFactionId !== undefined &&
        command.dominantFactionId !== null &&
        !state.factions.some((item) => item.id === command.dominantFactionId)
      ) {
        throw new ApiError(404, "NOT_FOUND", "Фракция не найдена");
      }
      return;
    }
    if (!state.factions.some((item) => item.id === command.factionId)) {
      throw new ApiError(404, "NOT_FOUND", "Фракция не найдена");
    }
  }
}

export function assertUniverseId(value: string): UniverseId {
  if (!isUniverseId(value)) throw new ApiError(404, "NOT_FOUND", "Мир не найден");
  return value;
}
