import { randomUUID } from "node:crypto";
import { Prisma, type PrismaClient } from "@endemion/database";
import { applyAction, GameRuleError, newGame, parseSave, prepareImport, presentLineage, restoreState, succeed, type GameState, type HistoryEntry, type LineageView } from "@endemion/game-core";
import {
  MAX_ALIVE_LIVES,
  lifeStatus,
  toLifeListItem,
  toLifeView,
  type ActionRequest,
  type ActionResponse,
  type CreateLifeRequest,
  type HistoryPage,
  type HistoryQuery,
  type ImportLifeRequest,
  type ImportResponse,
  type LifeListItem,
  type LifeMeta,
  type LifeView,
  type RestoreRequest,
  type SaveReason,
  type SaveView,
  type SuccessionRequest,
  type SuccessionResponse
} from "@endemion/shared";
import { Inject, Injectable } from "@nestjs/common";
import { ApiError } from "../common/api-error.js";
import { PrismaService } from "../prisma/prisma.service.js";

/** Сколько последних версий сохранения хранится у жизни */
export const MAX_SNAPSHOTS = 50;
const LIST_LIMIT = 50;

type Tx = Prisma.TransactionClient;

interface LifeRow {
  id: string;
  version: number;
  state: unknown;
  lineageId: string | null;
  createdAt: Date;
  updatedAt: Date;
  /** id жизни наследника, если род продолжен (обратная связь predecessor_id) */
  predecessorOf: string | null;
}

function meta(row: Pick<LifeRow, "id" | "createdAt" | "updatedAt">): LifeMeta {
  return { id: row.id, createdAt: row.createdAt.toISOString(), updatedAt: row.updatedAt.toISOString() };
}

function json(value: unknown): Prisma.InputJsonValue {
  return value as Prisma.InputJsonValue;
}

/** Состояние из базы проверяется так же строго, как сохранение извне: битые данные не попадут в игру */
function stateOf(row: Pick<LifeRow, "state">): GameState {
  return parseSave(row.state);
}

function lifeColumns(state: GameState) {
  return {
    name: state.character.name,
    status: lifeStatus(state),
    version: state.version,
    age: state.life.age,
    schemaVersion: state.schemaVersion,
    state: json(state)
  };
}

/**
 * Жизни игрока. Сервер — источник истины: клиент присылает только намерение (прожить год, выбрать вариант),
 * а характеристики, награды и исходы вычисляет game-core здесь. Каждое изменение — одна транзакция
 * с блокировкой строки жизни: состояние, история, версия сохранения и журнал действий пишутся вместе или никак
 */
@Injectable()
export class LivesService {
  private readonly db: PrismaClient;

  constructor(@Inject(PrismaService) prisma: PrismaService) {
    this.db = prisma.client;
  }

  private async writeEntries(tx: Tx, lifeId: string, entries: HistoryEntry[]): Promise<void> {
    if (entries.length === 0) return;
    await tx.historyEntry.createMany({
      data: entries.map((entry) => ({ lifeId, seq: entry.seq, age: entry.age, kind: entry.kind, data: json(entry) }))
    });
  }

  private async writeSnapshot(tx: Tx, lifeId: string, state: GameState, reason: SaveReason): Promise<void> {
    await tx.lifeSnapshot.create({ data: { lifeId, version: state.version, age: state.life.age, reason, state: json(state) } });
    await tx.lifeSnapshot.deleteMany({ where: { lifeId, version: { lte: state.version - MAX_SNAPSHOTS } } });
  }

  /** Блокирует строку жизни до конца транзакции. Второе действие той же жизни ждёт, пока первое не запишется */
  private async lockLife(tx: Tx, playerId: string, lifeId: string): Promise<LifeRow> {
    const locked = await tx.$queryRaw<{ id: string }[]>`
      SELECT id FROM lives WHERE id = ${lifeId}::uuid AND player_id = ${playerId}::uuid FOR UPDATE`;
    if (locked.length === 0) throw new ApiError(404, "NOT_FOUND", "Жизнь не найдена");
    const row = await tx.life.findUniqueOrThrow({ where: { id: lifeId }, include: { successor: { select: { id: true } } } });
    return { ...row, predecessorOf: row.successor?.id ?? null };
  }

  private checkVersion(row: LifeRow, expectedVersion: number): void {
    if (row.version !== expectedVersion) {
      throw new ApiError(409, "VERSION_CONFLICT", "Состояние жизни изменилось. Обновите страницу", { currentVersion: row.version });
    }
  }

  async create(playerId: string, input: CreateLifeRequest): Promise<{ life: LifeView; entries: HistoryEntry[] }> {
    const alive = await this.db.life.count({ where: { playerId, status: "alive" } });
    if (alive >= MAX_ALIVE_LIVES) throw new ApiError(409, "LIMIT_REACHED", `Одновременно можно вести не больше ${MAX_ALIVE_LIVES} жизней`);

    const { seed, ...character } = input;
    const { state, entries } = newGame({ ...character, seed: seed ?? randomUUID() });
    const row = await this.db.$transaction(async (tx) => {
      const life = await tx.life.create({
        data: { playerId, universeId: state.character.universeId, seed: state.seed, ...lifeColumns(state) }
      });
      await this.writeEntries(tx, life.id, entries);
      await this.writeSnapshot(tx, life.id, state, "create");
      return life;
    });
    return { life: toLifeView(meta(row), state), entries };
  }

  async list(playerId: string): Promise<LifeListItem[]> {
    const rows = await this.db.life.findMany({ where: { playerId }, orderBy: { updatedAt: "desc" }, take: LIST_LIMIT });
    return rows.map((row) => toLifeListItem(meta(row), stateOf(row)));
  }

  async get(playerId: string, lifeId: string): Promise<LifeView> {
    const row = await this.db.life.findFirst({ where: { id: lifeId, playerId } });
    if (!row) throw new ApiError(404, "NOT_FOUND", "Жизнь не найдена");
    return toLifeView(meta(row), stateOf(row));
  }

  async act(playerId: string, lifeId: string, request: ActionRequest): Promise<ActionResponse> {
    return this.db.$transaction(async (tx) => {
      const row = await this.lockLife(tx, playerId, lifeId);

      // Повтор уже принятого действия (двойной клик, повтор после обрыва связи): вернуть прежний итог
      const previous = await tx.gameAction.findUnique({ where: { lifeId_actionId: { lifeId, actionId: request.actionId } } });
      if (previous) {
        const sameRequest = previous.fromVersion === request.expectedVersion && JSON.stringify(previous.payload) === JSON.stringify(request.action);
        if (!sameRequest) throw new ApiError(409, "ACTION_ID_REUSED", "Этот actionId уже использован для другого действия");
        return { life: toLifeView(meta(row), stateOf(row)), entries: previous.entries as unknown as HistoryEntry[], replayed: true };
      }

      this.checkVersion(row, request.expectedVersion);
      const { state, entries } = applyAction(stateOf(row), request.action);
      const updated = await tx.life.update({ where: { id: lifeId }, data: lifeColumns(state) });
      await this.writeEntries(tx, lifeId, entries);
      await this.writeSnapshot(tx, lifeId, state, "action");
      await tx.gameAction.create({
        data: {
          lifeId,
          playerId,
          actionId: request.actionId,
          type: request.action.type,
          payload: json(request.action),
          fromVersion: row.version,
          toVersion: state.version,
          entries: json(entries)
        }
      });
      return { life: toLifeView(meta(updated), state), entries, replayed: false };
    });
  }

  /**
   * Продолжить род за наследника. Клиент называет только наследника; кто может наследовать, наследство и новая жизнь
   * считаются здесь. В одной транзакции: жизнь умершего отмечается продолженной (новая версия и снимок),
   * создаётся жизнь наследника, записывается действие. Повтор с тем же actionId возвращает ту же новую жизнь;
   * второго наследника не будет: род отмечен в состоянии, а predecessor_id уникален
   */
  async succeed(playerId: string, lifeId: string, request: SuccessionRequest): Promise<SuccessionResponse> {
    return this.db.$transaction(async (tx) => {
      const row = await this.lockLife(tx, playerId, lifeId);

      const previous = await tx.gameAction.findUnique({ where: { lifeId_actionId: { lifeId, actionId: request.actionId } } });
      if (previous) {
        const payload = previous.payload as { type?: string; heirId?: string };
        if (previous.type !== "succeed" || previous.fromVersion !== request.expectedVersion || payload.heirId !== request.heirId) {
          throw new ApiError(409, "ACTION_ID_REUSED", "Этот actionId уже использован для другого действия");
        }
        const successor = await tx.life.findUnique({ where: { predecessorId: lifeId } });
        if (!successor) throw new ApiError(409, "LINEAGE_CONTINUED", "Род уже продолжен");
        return {
          previous: toLifeView(meta(row), stateOf(row)),
          life: toLifeView(meta(successor), stateOf(successor)),
          entries: previous.entries as unknown as HistoryEntry[],
          replayed: true
        };
      }

      this.checkVersion(row, request.expectedVersion);
      const alive = await tx.life.count({ where: { playerId, status: "alive" } });
      if (alive >= MAX_ALIVE_LIVES) throw new ApiError(409, "LIMIT_REACHED", `Одновременно можно вести не больше ${MAX_ALIVE_LIVES} жизней`);
      // Случайная соль сервера: seed наследника нельзя вычислить из сохранения предка
      const result = succeed(stateOf(row), request.heirId, randomUUID());

      const updated = await tx.life.update({ where: { id: lifeId }, data: lifeColumns(result.previous) });
      await this.writeSnapshot(tx, lifeId, result.previous, "action");
      const created = await tx.life.create({
        data: {
          playerId,
          universeId: result.state.character.universeId,
          seed: result.state.seed,
          lineageId: row.lineageId ?? row.id,
          generation: result.state.lineage.generation,
          predecessorId: lifeId,
          ...lifeColumns(result.state)
        }
      });
      await this.writeEntries(tx, created.id, result.entries);
      await this.writeSnapshot(tx, created.id, result.state, "create");
      await tx.gameAction.create({
        data: {
          lifeId,
          playerId,
          actionId: request.actionId,
          type: "succeed",
          payload: json({ type: "succeed", heirId: request.heirId }),
          fromVersion: row.version,
          toVersion: result.previous.version,
          entries: json(result.entries)
        }
      });
      return { previous: toLifeView(meta(updated), result.previous), life: toLifeView(meta(created), result.state), entries: result.entries, replayed: false };
    });
  }

  /**
   * Stage 04: перенос жизни из браузера. Сохранению из браузера сервер не доверяет: prepareImport проверяет его,
   * выдаёт новый seed и генератор, бросает заново нераскрытое скрытое и срезает невозможные значения.
   * История из браузера — только текст хронологии; номера записей должны идти по порядку и до записи о переносе.
   * Повтор с тем же importId (обрыв связи, вторая вкладка) возвращает ту же жизнь: уникальный (player_id, import_id)
   */
  async importLife(playerId: string, request: ImportLifeRequest): Promise<ImportResponse> {
    const existing = await this.findImported(playerId, request.importId);
    if (existing) return existing;

    // Соль сервера: будущие броски нельзя вычислить ни из присланного seed, ни из состояния генератора.
    // Повреждённое сохранение здесь — ошибка запроса (400), а не сбой сервера, как для строки из базы
    let prepared: ReturnType<typeof prepareImport>;
    try {
      prepared = prepareImport(request.state, randomUUID());
    } catch (error) {
      if (error instanceof GameRuleError && error.code === "INVALID_SAVE") throw new ApiError(400, "INVALID_SAVE", error.message);
      throw error;
    }
    const { state, entry, adjustments } = prepared;
    let last = 0;
    for (const item of request.history) {
      if (item.seq <= last || item.seq >= entry.seq) throw new ApiError(400, "VALIDATION", "История жизни повреждена: номера записей не по порядку");
      last = item.seq;
    }

    try {
      const row = await this.db.$transaction(async (tx) => {
        if (state.life.alive) {
          const alive = await tx.life.count({ where: { playerId, status: "alive" } });
          if (alive >= MAX_ALIVE_LIVES) throw new ApiError(409, "LIMIT_REACHED", `Одновременно можно вести не больше ${MAX_ALIVE_LIVES} жизней`);
        }
        const life = await tx.life.create({
          data: {
            playerId,
            universeId: state.character.universeId,
            seed: state.seed,
            generation: state.lineage.generation,
            origin: "local-import",
            importId: request.importId,
            ...lifeColumns(state)
          }
        });
        await this.writeEntries(tx, life.id, [...(request.history as HistoryEntry[]), entry]);
        await this.writeSnapshot(tx, life.id, state, "create");
        return life;
      });
      return { life: toLifeView(meta(row), state), adjustments, replayed: false };
    } catch (error) {
      // Одновременный повтор того же переноса: вторая транзакция упёрлась в уникальный ключ — жизнь уже создана первой
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        const replay = await this.findImported(playerId, request.importId);
        if (replay) return replay;
      }
      throw error;
    }
  }

  private async findImported(playerId: string, importId: string): Promise<ImportResponse | null> {
    const row = await this.db.life.findUnique({ where: { playerId_importId: { playerId, importId } } });
    return row ? { life: toLifeView(meta(row), stateOf(row)), adjustments: null, replayed: true } : null;
  }

  /** Род целиком: хроника, древо, достижения. Отдельный запрос: в ответы на действия хроника рода не входит */
  async lineage(playerId: string, lifeId: string): Promise<LineageView> {
    const row = await this.db.life.findFirst({ where: { id: lifeId, playerId } });
    if (!row) throw new ApiError(404, "NOT_FOUND", "Жизнь не найдена");
    return presentLineage(stateOf(row));
  }

  async history(playerId: string, lifeId: string, query: HistoryQuery): Promise<HistoryPage> {
    const owned = await this.db.life.count({ where: { id: lifeId, playerId } });
    if (!owned) throw new ApiError(404, "NOT_FOUND", "Жизнь не найдена");
    const rows = await this.db.historyEntry.findMany({
      where: { lifeId, ...(query.before === undefined ? {} : { seq: { lt: query.before } }) },
      orderBy: { seq: "desc" },
      take: query.limit + 1
    });
    const page = rows.slice(0, query.limit);
    const last = page.at(-1);
    return {
      entries: page.map((row) => row.data as unknown as HistoryEntry),
      nextBefore: rows.length > query.limit && last ? last.seq : null
    };
  }

  async saves(playerId: string, lifeId: string): Promise<SaveView[]> {
    const owned = await this.db.life.count({ where: { id: lifeId, playerId } });
    if (!owned) throw new ApiError(404, "NOT_FOUND", "Жизнь не найдена");
    const rows = await this.db.lifeSnapshot.findMany({
      where: { lifeId },
      orderBy: { version: "desc" },
      take: MAX_SNAPSHOTS,
      select: { version: true, age: true, reason: true, createdAt: true }
    });
    return rows.map((row) => ({ version: row.version, age: row.age, reason: row.reason, createdAt: row.createdAt.toISOString() }));
  }

  /**
   * Откат к сохранённой версии. Записи истории после неё удаляются (этих событий не было),
   * версии из отменённой ветки тоже, а номер версии продолжает расти
   */
  async restore(playerId: string, lifeId: string, request: RestoreRequest): Promise<ActionResponse> {
    return this.db.$transaction(async (tx) => {
      const row = await this.lockLife(tx, playerId, lifeId);
      this.checkVersion(row, request.expectedVersion);
      if (request.version >= row.version) throw new ApiError(400, "VALIDATION", "Вернуться можно только к прошлой версии");
      // Род уже продолжен наследником: откат этой жизни дал бы второй вариант истории и второго наследника
      if (row.predecessorOf !== null || stateOf(row).lineage.continuedBy !== null) {
        throw new ApiError(409, "LINEAGE_CONTINUED", "Род уже продолжен наследником: эту жизнь нельзя вернуть назад");
      }
      const snapshot = await tx.lifeSnapshot.findUnique({ where: { lifeId_version: { lifeId, version: request.version } } });
      if (!snapshot) throw new ApiError(404, "NOT_FOUND", "Такой версии сохранения нет");

      const target = parseSave(snapshot.state);
      const { state, entries } = restoreState(target, row.version);
      await tx.historyEntry.deleteMany({ where: { lifeId, seq: { gte: target.nextSeq } } });
      await tx.lifeSnapshot.deleteMany({ where: { lifeId, version: { gt: request.version } } });
      const updated = await tx.life.update({ where: { id: lifeId }, data: lifeColumns(state) });
      await this.writeEntries(tx, lifeId, entries);
      await this.writeSnapshot(tx, lifeId, state, "restore");
      return { life: toLifeView(meta(updated), state), entries, replayed: false };
    });
  }
}
