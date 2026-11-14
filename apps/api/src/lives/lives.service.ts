import { randomUUID } from "node:crypto";
import { Prisma, type PrismaClient } from "@endemion/database";
import { applyAction, GameRuleError, newGame, parseSave, prepareImport, presentLineage, restoreState, SAVE_SCHEMA_VERSION, succeed, type GameState, type HistoryEntry, type InsightFact, type LineageView } from "@endemion/game-core";
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
import { InsightsService } from "../insights/insights.service.js";
import { MarketService } from "../market/market.service.js";
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

/**
 * JSON с ключами по алфавиту. PostgreSQL хранит jsonb с переупорядоченными ключами (короче — раньше),
 * поэтому сохранённое действие сравнивается с повтором без учёта порядка ключей
 */
function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value !== null && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
    return `{${entries.map(([key, item]) => `${JSON.stringify(key)}:${canonical(item)}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

/** Состояние из базы проверяется так же строго, как сохранение извне: битые данные не попадут в игру */
function stateOf(row: Pick<LifeRow, "state">): GameState {
  return parseSave(row.state);
}

/** Факты успешного хода. Сравнение до и после, без текста хроники. Ключ — actionId */
function factsOf(actionId: string, before: GameState, state: GameState): InsightFact[] {
  const base = { world: state.character.universeId, age: state.life.age, level: state.character.level, amount: 0, ref: actionId };
  const facts: InsightFact[] = [];
  if (before.life.alive && !state.life.alive) facts.push({ ...base, name: "life.died" });
  if (state.character.track.rank > before.character.track.rank) facts.push({ ...base, name: "track.rank", amount: state.character.track.rank });
  if (state.character.level > before.character.level) facts.push({ ...base, name: "level.up", amount: state.character.level });
  if (state.questsDone.length > before.questsDone.length) facts.push({ ...base, name: "quest.done" });
  else if (before.quest && !state.quest) facts.push({ ...base, name: "quest.failed" });
  if (state.adventure.done.length > before.adventure.done.length) facts.push({ ...base, name: "adventure.done" });
  if (state.adventure.failed.length > before.adventure.failed.length) facts.push({ ...base, name: "adventure.failed" });
  if (JSON.stringify(state.economy.goods) !== JSON.stringify(before.economy.goods)) facts.push({ ...base, name: "market.trade" });
  return facts;
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

  constructor(
    @Inject(PrismaService) prisma: PrismaService,
    @Inject(InsightsService) private readonly insights: InsightsService,
    @Inject(MarketService) private readonly market: MarketService
  ) {
    this.db = prisma.client;
  }

  /**
   * Живые награды необратимы: откат сохранения не возвращает уже полученное золото
   * и не позволяет получить его второй раз. Возвращаем в состояние флаги всех
   * когда-либо полученных наград, даже если снимок был сделан до выдачи
   */
  private async preserveClaims(tx: Tx, lifeId: string, state: GameState): Promise<void> {
    const parts = await tx.livePart.findMany({ where: { lifeId, claimedAt: { not: null } }, include: { window: { select: { flag: true } } } });
    for (const part of parts) {
      if (!state.flags.includes(part.window.flag)) state.flags.push(part.window.flag);
    }
  }

  private async writeEntries(tx: Tx, lifeId: string, entries: HistoryEntry[]): Promise<void> {
    if (entries.length === 0) return;
    await tx.historyEntry.createMany({
      data: entries.map((entry) => ({ lifeId, seq: entry.seq, age: entry.age, kind: entry.kind, data: json(entry) }))
    });
  }

  /** Не даёт действию писать историю поверх уже сохранённой: nextSeq из старого снимка может отставать. */
  private async alignHistoryHead(tx: Tx, lifeId: string, state: GameState): Promise<void> {
    const head = await tx.historyEntry.aggregate({ where: { lifeId }, _max: { seq: true } });
    const next = (head._max.seq ?? 0) + 1;
    if (state.nextSeq < next) state.nextSeq = next;
  }

  private async writeSnapshot(tx: Tx, lifeId: string, state: GameState, reason: SaveReason): Promise<void> {
    await tx.lifeSnapshot.create({ data: { lifeId, version: state.version, age: state.life.age, reason, state: json(state) } });
    await tx.lifeSnapshot.deleteMany({ where: { lifeId, version: { lte: state.version - MAX_SNAPSHOTS } } });
  }

  /** Сериализует создание жизней одного игрока: лимит проверяется и занимается в одной транзакции */
  private async lockPlayer(tx: Tx, playerId: string): Promise<void> {
    await tx.$queryRaw`SELECT id FROM players WHERE id = ${playerId}::uuid FOR UPDATE`;
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
    const { seed, ...character } = input;
    const { state, entries } = newGame({ ...character, seed: seed ?? randomUUID() });
    const row = await this.db.$transaction(async (tx) => {
      // Лимит и вставка — под одной блокировкой игрока: параллельные создания не обойдут предел
      await this.lockPlayer(tx, playerId);
      const alive = await tx.life.count({ where: { playerId, status: "alive" } });
      if (alive >= MAX_ALIVE_LIVES) throw new ApiError(409, "LIMIT_REACHED", `Одновременно можно вести не больше ${MAX_ALIVE_LIVES} жизней`);
      const life = await tx.life.create({
        data: { playerId, universeId: state.character.universeId, seed: state.seed, ...lifeColumns(state) }
      });
      await this.writeEntries(tx, life.id, entries);
      await this.writeSnapshot(tx, life.id, state, "create");
      return life;
    });
    const created = { life: toLifeView(meta(row), state), entries };
    await this.insights.note({ name: "life.created", world: state.character.universeId, age: 0, level: 1, amount: 0, ref: row.id });
    return created;
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
    try {
      const outcome = await this.db.$transaction(async (tx) => {
        const row = await this.lockLife(tx, playerId, lifeId);

        // Повтор уже принятого действия (двойной клик, повтор после обрыва связи): вернуть прежний итог
        const previous = await tx.gameAction.findUnique({ where: { lifeId_actionId: { lifeId, actionId: request.actionId } } });
        if (previous) {
          const sameRequest = previous.fromVersion === request.expectedVersion && canonical(previous.payload) === canonical(request.action);
          if (!sameRequest) throw new ApiError(409, "ACTION_ID_REUSED", "Этот actionId уже использован для другого действия");
          return { response: { life: toLifeView(meta(row), stateOf(row)), entries: previous.entries as unknown as HistoryEntry[], replayed: true }, facts: [] as InsightFact[] };
        }

        this.checkVersion(row, request.expectedVersion);
        const before = stateOf(row);
        // Старые/восстановленные сохранения могли хранить nextSeq позади фактической истории.
        // Выравниваем по базе до применения действия, иначе вставка истории упадёт на уникальном (lifeId, seq).
        await this.alignHistoryHead(tx, lifeId, before);
        const { state, entries } = applyAction(before, request.action);
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
        return { response: { life: toLifeView(meta(updated), state), entries, replayed: false }, facts: factsOf(request.actionId, before, state) };
      });
      await this.insights.noteMany(outcome.facts);
      return outcome.response;
    } catch (error) {
      if (error instanceof GameRuleError) {
        await this.insights.note({ name: "action.rejected", world: "", age: 0, level: 0, amount: 0, ref: request.actionId });
      }
      throw error;
    }
  }

  /**
   * Продолжить род за наследника. Клиент называет только наследника; кто может наследовать, наследство и новая жизнь
   * считаются здесь. В одной транзакции: жизнь умершего отмечается продолженной (новая версия и снимок),
   * создаётся жизнь наследника, записывается действие. Повтор с тем же actionId возвращает ту же новую жизнь;
   * второго наследника не будет: род отмечен в состоянии, а predecessor_id уникален
   */
  async succeed(playerId: string, lifeId: string, request: SuccessionRequest): Promise<SuccessionResponse> {
    return this.db.$transaction(async (tx) => {
      await this.lockPlayer(tx, playerId);
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

      await this.market.cancelOffersForLife(tx, lifeId);
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
  /** Границы внешнего сохранения: форма проверена zod, содержимое — здесь до parseSave */
  private checkImportBounds(request: ImportLifeRequest): void {
    let size = 0;
    try {
      size = Buffer.byteLength(JSON.stringify(request.state), "utf8");
    } catch {
      throw new ApiError(400, "INVALID_SAVE", "Сохранение не сериализуется");
    }
    if (size > 512 * 1024) throw new ApiError(400, "INVALID_SAVE", "Сохранение больше 512 КБ");
    const state = request.state as { character?: { name?: unknown }; life?: { age?: unknown }; schemaVersion?: unknown };
    const name = state.character?.name;
    if (typeof name !== "string" || name.trim().length < 1 || name.length > 64) {
      throw new ApiError(400, "INVALID_SAVE", "Имя персонажа: от 1 до 64 символов");
    }
    const age = state.life?.age;
    if (!Number.isInteger(age) || (age as number) < 0 || (age as number) > 200) {
      throw new ApiError(400, "INVALID_SAVE", "Возраст персонажа: целое число от 0 до 200");
    }
    const version = state.schemaVersion;
    if (!Number.isInteger(version) || (version as number) < 1 || (version as number) > SAVE_SCHEMA_VERSION) {
      throw new ApiError(400, "INVALID_SAVE", "Неподдерживаемая версия сохранения");
    }
    if (request.history.length > 2000) throw new ApiError(400, "INVALID_SAVE", "История больше 2000 записей");
    const changes = request.history.reduce((sum, entry) => sum + entry.changes.length, 0);
    if (changes > 20_000 || size + changes * 200 > 2 * 1024 * 1024) {
      throw new ApiError(400, "INVALID_SAVE", "Слишком большой объём истории");
    }
  }

  async importLife(playerId: string, request: ImportLifeRequest): Promise<ImportResponse> {
    const existing = await this.findImported(playerId, request.importId);
    if (existing) return existing;
    this.checkImportBounds(request);

    // Соль сервера: будущие броски нельзя вычислить ни из присланного seed, ни из состояния генератора.
    // Повреждённое сохранение здесь — ошибка запроса (400), а не сбой сервера, как для строки из базы
    let prepared: ReturnType<typeof prepareImport>;
    try {
      prepared = prepareImport(request.state, randomUUID());
    } catch (error) {
      if (error instanceof ApiError) throw error;
      if (error instanceof GameRuleError) {
        if (error.code === "LINEAGE_CONTINUED") throw new ApiError(409, "LINEAGE_CONTINUED", error.message);
        throw new ApiError(400, "INVALID_SAVE", error.message);
      }
      throw new ApiError(400, "INVALID_SAVE", "Сохранение повреждено");
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
          await this.lockPlayer(tx, playerId);
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
   * версии из отменённой ветки тоже, а номер версии продолжает расти.
   * С actionId повтор (вторая вкладка, обрыв связи) возвращает уже сделанный откат и не стирает новую ветку
   */
  async restore(playerId: string, lifeId: string, request: RestoreRequest): Promise<ActionResponse> {
    return this.db.$transaction(async (tx) => {
      const row = await this.lockLife(tx, playerId, lifeId);
      const actionId = request.actionId;
      if (actionId) {
        const previous = await tx.gameAction.findUnique({ where: { lifeId_actionId: { lifeId, actionId } } });
        if (previous) {
          const same = previous.type === "restore" && canonical(previous.payload) === canonical({ version: request.version });
          if (!same) throw new ApiError(409, "ACTION_ID_REUSED", "Этот actionId уже использован для другого действия");
          return { life: toLifeView(meta(row), stateOf(row)), entries: previous.entries as unknown as HistoryEntry[], replayed: true };
        }
      }
      this.checkVersion(row, request.expectedVersion);
      if (request.version >= row.version) throw new ApiError(400, "VALIDATION", "Вернуться можно только к прошлой версии");
      // Род уже продолжен наследником: откат этой жизни дал бы второй вариант истории и второго наследника
      if (row.predecessorOf !== null || stateOf(row).lineage.continuedBy !== null) {
        throw new ApiError(409, "LINEAGE_CONTINUED", "Род уже продолжен наследником: эту жизнь нельзя вернуть назад");
      }
      const snapshot = await tx.lifeSnapshot.findUnique({ where: { lifeId_version: { lifeId, version: request.version } } });
      if (!snapshot) throw new ApiError(404, "NOT_FOUND", "Такой версии сохранения нет");

      await this.market.assertRestorable(tx, lifeId, request.version);
      const target = parseSave(snapshot.state);
      const { state, entries } = restoreState(target, row.version);
      await this.preserveClaims(tx, lifeId, state);
      await tx.historyEntry.deleteMany({ where: { lifeId, seq: { gte: target.nextSeq } } });
      await tx.lifeSnapshot.deleteMany({ where: { lifeId, version: { gt: request.version } } });
      const updated = await tx.life.update({ where: { id: lifeId }, data: lifeColumns(state) });
      await this.writeEntries(tx, lifeId, entries);
      await this.writeSnapshot(tx, lifeId, state, "restore");
      if (actionId) {
        await tx.gameAction.create({
          data: {
            lifeId,
            playerId,
            actionId,
            type: "restore",
            payload: json({ version: request.version }),
            fromVersion: row.version,
            toVersion: state.version,
            entries: json(entries)
          }
        });
      }
      return { life: toLifeView(meta(updated), state), entries, replayed: false };
    });
  }
}
