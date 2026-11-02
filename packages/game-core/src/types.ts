import type { LocalizedText } from "./i18n.js";
import type { Resources, Stats } from "./stats.js";

export const UNIVERSE_IDS = ["dark-fantasy", "isekai", "murim", "xianxia", "hunter", "academy"] as const;
export type UniverseId = (typeof UNIVERSE_IDS)[number];

export const GENDERS = ["female", "male"] as const;
export type Gender = (typeof GENDERS)[number];

export const LIFE_STAGES = ["infant", "child", "teen", "adult", "middle", "elder"] as const;
export type LifeStage = (typeof LIFE_STAGES)[number];

export interface TrackState {
  /** Очки прогресса в пути вселенной (скверна, культивация, ранг охотника...) */
  points: number;
  /** Индекс текущего ранга в universe.track.ranks */
  rank: number;
}

export interface CharacterState {
  name: string;
  gender: Gender;
  universeId: UniverseId;
  raceId: string;
  originId: string;
  temperamentId: string;
  /** Базовые характеристики. Бонус ранга добавляется сверху (effectiveStats) */
  stats: Stats;
  resources: Resources;
  level: number;
  xp: number;
  reputation: number;
  karma: number;
  wealth: number;
  abilities: string[];
  track: TrackState;
}

export interface LifeState {
  age: number;
  stage: LifeStage;
  alive: boolean;
  deathAge: number | null;
  deathCause: LocalizedText | null;
}

export interface PendingEvent {
  eventId: string;
  age: number;
}

export interface ScheduledEvent {
  eventId: string;
  /** Возраст, начиная с которого событие ждёт своей очереди */
  age: number;
}

export type ChangeKind =
  | "stat"
  | "resource"
  | "reputation"
  | "karma"
  | "wealth"
  | "xp"
  | "level"
  | "track"
  | "rank"
  | "ability";

/** Одно изменение персонажа в записи истории: «Сила +2», «Новый ранг: Закалка Ци» */
export interface HistoryChange {
  kind: ChangeKind;
  key?: string;
  delta?: number;
  value?: number | string;
}

export type HistoryKind = "birth" | "event" | "year" | "death" | "restore";

export interface HistoryEntry {
  /** Порядковый номер записи в этой жизни */
  seq: number;
  age: number;
  kind: HistoryKind;
  title: LocalizedText;
  text: LocalizedText;
  eventId?: string;
  choiceId?: string;
  choice?: LocalizedText;
  outcome?: LocalizedText;
  check?: { chance: number; success: boolean };
  changes: HistoryChange[];
}

export interface GameState {
  /** Версия формата сохранения: старые сохранения переводятся в новый формат (save.ts) */
  schemaVersion: number;
  seed: string;
  /** Состояние генератора случайных чисел: продолжение жизни воспроизводимо */
  rngState: number;
  /** Номер состояния: растёт на 1 с каждым принятым действием */
  version: number;
  character: CharacterState;
  life: LifeState;
  flags: string[];
  /** Сколько раз произошло событие */
  occurrences: Record<string, number>;
  /** Возраст, в котором событие было последний раз */
  lastSeen: Record<string, number>;
  pending: PendingEvent | null;
  scheduled: ScheduledEvent[];
  /** Номер следующей записи истории. Сами записи хранятся отдельно (сервер пишет их в свою таблицу) */
  nextSeq: number;
}

/** advance: прожить до years лет подряд, остановка на первом событии. choose: ответ на событие */
export type GameAction = { type: "advance"; years?: number } | { type: "choose"; choiceId: string };
export type GameActionType = GameAction["type"];

export const MAX_ADVANCE_YEARS = 10;

/** Результат действия: новое состояние и записи истории, которые оно добавило */
export interface ActionResult {
  state: GameState;
  entries: HistoryEntry[];
}
