// Локальное сохранение прототипа: вся жизнь в localStorage, правила — тот же game-core, что и на сервере.
// Это запасной режим без сервера: браузеру можно не доверять, поэтому рейтинги и награды на нём строить нельзя
import { applyAction, GameRuleError, newGame, parseSave, restoreState, type GameAction, type GameState, type HistoryEntry } from "@endemion/game-core";
import { createLifeSchema, toLifeListItem, toLifeView, type LifeMeta, type SaveReason, type SaveView } from "@endemion/shared";
import { ClientError } from "../api";
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
}

function storage(): Storage {
  if (typeof window === "undefined") throw new ClientError(0, "NETWORK", "Локальное хранилище доступно только в браузере");
  return window.localStorage;
}

const lifeKey = (id: string) => `${PREFIX}:life:${id}`;

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
    for (const id of readIndex()) {
      try {
        const record = read(id);
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
    if (record.state.version !== expectedVersion) throw new ClientError(409, "VERSION_CONFLICT", "Состояние жизни изменилось");
    const target = record.snapshots.find((s) => s.version === version);
    if (!target || version >= record.state.version) throw new ClientError(404, "NOT_FOUND", "Такой версии сохранения нет");
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
  }
};
