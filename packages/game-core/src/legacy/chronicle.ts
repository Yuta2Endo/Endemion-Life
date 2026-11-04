// Хроника рода: что случилось с семьёй за все поколения. Запись хранит вид, участников и значения,
// а текст собирается при показе (legacy/present.ts): сохранение не растёт от готовых текстов на двух языках
import type { ChronicleEntry, ChronicleKind, GameState, LineageState } from "../types.js";

/** Больше стольких записей хроника не хранит: старые рядовые записи уходят в архив (счётчик archived) */
export const MAX_CHRONICLE = 400;
/** Обрезка идёт пачкой, чтобы не двигать массив на каждой записи */
const TRIM_TO = 340;
/** Эти записи не архивируются: без них не восстановить историю поколений */
const KEEP: readonly ChronicleKind[] = ["origin", "succession", "inheritance", "achievement", "secret"];
/** Сколько имён ушедших в архив людей помнит род */
const MAX_NAMES = 600;

/** Год рода: 0 — год рождения основателя. age — возраст текущего персонажа */
export function lineageYear(state: GameState, age = state.life.age): number {
  return state.lineage.epoch + age;
}

export function newLineage(name: string): LineageState {
  return {
    name,
    generation: 1,
    epoch: 0,
    selfParents: [],
    selfAdopted: false,
    renown: 0,
    startRenown: 0,
    lives: [],
    chronicle: [],
    nextEntry: 1,
    achievements: [],
    traits: { talents: {}, weaknesses: {} },
    threads: [],
    pending: [],
    stories: {},
    continuedBy: null,
    archived: 0,
    inheritance: null,
    names: {}
  };
}

function trim(lineage: LineageState): void {
  const removable = lineage.chronicle.filter((entry) => !KEEP.includes(entry.kind)).sort((a, b) => a.year - b.year || a.id - b.id);
  const drop = new Set(removable.slice(0, Math.max(0, lineage.chronicle.length - TRIM_TO)).map((entry) => entry.id));
  if (drop.size === 0) return;
  lineage.chronicle = lineage.chronicle.filter((entry) => !drop.has(entry.id));
  lineage.archived += drop.size;
}

/**
 * Новая запись хроники. who — участники (id NPC или SELF_ID), v — значения для текста: имена кладутся сюда же (n0, n1…),
 * поэтому запись остаётся читаемой, даже если человек ушёл в архив. Возвращает id записи
 */
export function addChronicle(
  state: GameState,
  kind: ChronicleKind,
  who: string[],
  v: Record<string, string | number>,
  src: string,
  options: { link?: number | null; age?: number } = {}
): number {
  const lineage = state.lineage;
  const entry: ChronicleEntry = { id: lineage.nextEntry++, year: lineageYear(state, options.age), gen: lineage.generation, kind, who, v, src, link: options.link ?? null };
  lineage.chronicle.push(entry);
  if (lineage.chronicle.length > MAX_CHRONICLE) trim(lineage);
  return entry.id;
}

/** Запоминает имя человека, чья карточка уходит из сохранения */
export function rememberName(lineage: LineageState, id: string, name: string): void {
  lineage.names[id] = name;
  const keys = Object.keys(lineage.names);
  if (keys.length > MAX_NAMES) for (const key of keys.slice(0, keys.length - MAX_NAMES)) delete lineage.names[key];
}
