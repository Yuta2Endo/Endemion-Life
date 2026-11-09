// Локальное сохранение прототипа: вся жизнь в localStorage, правила — тот же game-core, что и на сервере.
// Это запасной режим без сервера: браузеру можно не доверять, поэтому рейтинги и награды на нём строить нельзя
import { applyAction, GameRuleError, newGame, parseSave, presentLineage, restoreState, succeed, type GameAction, type GameState, type HistoryEntry } from "@endemion/game-core";
import { createLifeSchema, toLifeListItem, toLifeView, type LifeMeta, type SaveReason, type SaveView, type SuccessionResponse } from "@endemion/shared";
import { ClientError } from "../api";
import { newUuid } from "../uuid";
import { LOCAL_ID_PREFIX, type GameStore } from "./types";

const PREFIX = "endemion-life:v1";
const INDEX_KEY = `${PREFIX}:index`;
const MAX_SNAPSHOTS = 50;
const MAX_HISTORY = 2000;

interface Snapshot {
  version: number;
  age: number;
  reason: SaveReason;
  createdAt: string;
  state: GameState;
}

interface LocalRecord {
  id: string;
  createdAt: string;
  updatedAt: string;
  state: GameState;
  history: HistoryEntry[];
  snapshots: Snapshot[];
  /** Stage 04: ключ переноса на сервер. Создаётся один раз: повтор после обрыва связи не создаст вторую жизнь */
  importId?: string;
  /** Stage 04: id жизни на сервере после переноса. Копия в браузере остаётся, но ходов больше не принимает */
  movedTo?: string;
  /** Stage 04: последний завершённый переход к наследнику на этой жизни. Повтор с тем же actionId возвращает тот же результат, а не создаёт вторую жизнь */
  succeedActionId?: string;
  /** Результат последнего succeed для повтора (только ключевые представления, без полного состояния) */
  succeedResult?: SuccessionResponse;
}

/** Stage 04: что отправляется на сервер при переносе */
export interface ImportPayload {
  importId: string;
  state: GameState;
  history: HistoryEntry[];
}

function storage(): Storage {
  if (typeof window === "undefined") throw new ClientError(0, "NETWORK", "Локальное хранилище доступно только в браузере");
  return window.localStorage;
}

const LIFE_PREFIX = `${PREFIX}:life:`;
const lifeKey = (id: string) => `${LIFE_PREFIX}${id}`;

/**
 * Все жизни в браузере: из индекса и по ключам. Две вкладки могут перезаписать индекс друг друга,
 * но запись жизни остаётся — поиск по ключам не даёт ей пропасть из списка
 */
function allIds(): string[] {
  const ids = readIndex();
  const s = storage();
  for (let i = 0; i < s.length; i++) {
    const key = s.key(i);
    if (key?.startsWith(LIFE_PREFIX)) {
      const id = key.slice(LIFE_PREFIX.length);
      if (!ids.includes(id)) ids.push(id);
    }
  }
  return ids;
}

/** Перенесённая жизнь закрыта для ходов: иначе у неё было бы два продолжения — в браузере и на сервере */
function writable(record: LocalRecord): void {
  if (record.movedTo) throw new ClientError(409, "MOVED", "Эта жизнь перенесена на сервер");
}

function readIndex(): string[] {
  try {
    const value: unknown = JSON.parse(storage().getItem(INDEX_KEY) ?? "[]");
    return Array.isArray(value) ? value.filter((id): id is string => typeof id === "string") : [];
  } catch {
    return [];
  }
}

function read(id: string): LocalRecord {
  const raw = storage().getItem(lifeKey(id));
  if (!raw) throw new ClientError(404, "NOT_FOUND", "Жизнь не найдена");
  try {
    const record = JSON.parse(raw) as LocalRecord;
    // Данные из localStorage мог изменить кто угодно: состояние проверяется так же, как на сервере
    return { ...record, state: parseSave(record.state) };
  } catch {
    throw new ClientError(500, "INVALID_SAVE", "Локальное сохранение повреждено");
  }
}

function write(record: LocalRecord): void {
  try {
    storage().setItem(lifeKey(record.id), JSON.stringify(record));
    const index = readIndex().filter((id) => id !== record.id);
    storage().setItem(INDEX_KEY, JSON.stringify([record.id, ...index]));
  } catch {
    throw new ClientError(507, "STORAGE_FULL", "В браузере закончилось место для сохранений");
  }
}

function meta(record: LocalRecord): LifeMeta {
  return { id: record.id, createdAt: record.createdAt, updatedAt: record.updatedAt };
}

function snapshot(state: GameState, reason: SaveReason): Snapshot {
  return { version: state.version, age: state.life.age, reason, createdAt: new Date().toISOString(), state };
}

function keepSnapshots(snapshots: Snapshot[]): Snapshot[] {
  return snapshots.slice(-MAX_SNAPSHOTS);
}

/** Нарушение правил игры превращается в ту же ошибку, что вернул бы сервер */
function rules<T>(run: () => T): T {
  try {
    return run();
  } catch (error) {
    if (error instanceof GameRuleError) throw new ClientError(error.code === "INVALID_INPUT" || error.code === "UNKNOWN_CHOICE" ? 400 : 409, error.code, error.message);
    throw error;
  }
}

export const localStore: GameStore = {
  kind: "local",

  async list() {
    const items = [];
    for (const id of allIds()) {
      try {
        const record = read(id);
        // Перенесённая жизнь видна в списке сервера: второй раз её не показываем
        if (record.movedTo) continue;
        items.push(toLifeListItem(meta(record), record.state));
      } catch {
        // Повреждённое сохранение не мешает показать остальные
      }
    }
    return items;
  },

  async create(input) {
    const parsed = createLifeSchema.safeParse(input);
    if (!parsed.success) throw new ClientError(400, "VALIDATION", "Некорректные данные персонажа");
    const { seed, ...character } = parsed.data;
    const { state, entries } = rules(() => newGame({ ...character, seed: seed ?? crypto.randomUUID() }));
    const now = new Date().toISOString();
    const record: LocalRecord = {
      id: `${LOCAL_ID_PREFIX}${crypto.randomUUID()}`,
      createdAt: now,
      updatedAt: now,
      state,
      history: entries,
      snapshots: [snapshot(state, "create")]
    };
    write(record);
    return toLifeView(meta(record), state);
  },

  async get(id) {
    const record = read(id);
    return toLifeView(meta(record), record.state);
  },

  async act(id, expectedVersion, action: GameAction) {
    const record = read(id);
    writable(record);
    if (record.state.version !== expectedVersion) {
      throw new ClientError(409, "VERSION_CONFLICT", "Состояние жизни изменилось", { currentVersion: record.state.version });
    }
    const { state, entries } = rules(() => applyAction(record.state, action));
    const updated: LocalRecord = {
      ...record,
      updatedAt: new Date().toISOString(),
      state,
      history: [...record.history, ...entries].slice(-MAX_HISTORY),
      snapshots: keepSnapshots([...record.snapshots, snapshot(state, "action")])
    };
    write(updated);
    return { life: toLifeView(meta(updated), state), entries, replayed: false };
  },

  async history(id, before, limit = 50) {
    const record = read(id);
    const older = record.history.filter((entry) => before === undefined || entry.seq < before).reverse();
    const page = older.slice(0, limit);
    const last = page.at(-1);
    return { entries: page, nextBefore: older.length > limit && last ? last.seq : null };
  },

  async saves(id): Promise<SaveView[]> {
    return read(id)
      .snapshots.map(({ version, age, reason, createdAt }) => ({ version, age, reason, createdAt }))
      .reverse();
  },

  async restore(id, version, expectedVersion) {
    const record = read(id);
    writable(record);
    if (record.state.version !== expectedVersion) throw new ClientError(409, "VERSION_CONFLICT", "Состояние жизни изменилось");
    const target = record.snapshots.find((s) => s.version === version);
    if (!target || version >= record.state.version) throw new ClientError(404, "NOT_FOUND", "Такой версии сохранения нет");
    if (record.state.lineage.continuedBy !== null) throw new ClientError(409, "LINEAGE_CONTINUED", "Род уже продолжен наследником: эту жизнь нельзя вернуть назад");
    const { state, entries } = restoreState(parseSave(target.state), record.state.version);
    const updated: LocalRecord = {
      ...record,
      updatedAt: new Date().toISOString(),
      state,
      history: [...record.history.filter((entry) => entry.seq < target.state.nextSeq), ...entries],
      snapshots: keepSnapshots([...record.snapshots.filter((s) => s.version <= version), snapshot(state, "restore")])
    };
    write(updated);
    return { life: toLifeView(meta(updated), state), entries, replayed: false };
  },

  async succeed(id, expectedVersion, heirId, actionId) {
    const record = read(id);
    writable(record);
    if (record.state.version !== expectedVersion) throw new ClientError(409, "VERSION_CONFLICT", "Состояние жизни изменилось");
    if (actionId && record.succeedActionId === actionId && record.succeedResult) return record.succeedResult;
    const result = rules(() => succeed(record.state, heirId, crypto.randomUUID()));
    const now = new Date().toISOString();
    const previous: LocalRecord = {
      ...record,
      updatedAt: now,
      state: result.previous,
      succeedActionId: actionId ?? null,
      snapshots: keepSnapshots([...record.snapshots, snapshot(result.previous, "action")])
    };
    const created: LocalRecord = {
      id: `${LOCAL_ID_PREFIX}${crypto.randomUUID()}`,
      createdAt: now,
      updatedAt: now,
      state: result.state,
      history: result.entries,
      snapshots: [snapshot(result.state, "create")]
    };
    // Сначала новая жизнь, потом отметка о продолжении: если место кончится посередине, второго наследника не будет,
    // а лишняя запись новой жизни видна в списке и не теряет прошлую
    write(created);
    write(previous);
    const out: SuccessionResponse = {
      previous: toLifeView(meta(previous), result.previous),
      life: toLifeView(meta(created), result.state),
      entries: result.entries,
      replayed: false
    };
    if (actionId) write({ ...previous, succeedResult: out });
    return out;
  },

  async lineage(id) {
    return presentLineage(read(id).state);
  }
};

/**
 * Stage 04: данные для переноса на сервер. Ключ переноса создаётся при первом вызове и сохраняется:
 * повтор после обрыва связи или из другой вкладки пойдёт с тем же ключом, и сервер вернёт ту же жизнь
 */
export function importPayload(id: string): ImportPayload {
  const record = read(id);
  writable(record);
  if (!record.importId) {
    record.importId = newUuid();
    write(record);
  }
  return { importId: record.importId, state: record.state, history: record.history };
}

/** Stage 04: перенос подтверждён сервером. Запись в браузере не удаляется: игрок удалит её сам, когда захочет */
export function markMoved(id: string, serverId: string): void {
  const record = read(id);
  record.movedTo = serverId;
  write(record);
}

/** Stage 04: куда перенесена жизнь (id на сервере) или null */
export function movedTarget(id: string): string | null {
  try {
    return read(id).movedTo ?? null;
  } catch {
    return null;
  }
}
