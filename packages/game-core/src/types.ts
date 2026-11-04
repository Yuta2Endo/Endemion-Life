import type { LocalizedText } from "./i18n.js";
import type { Resources, Stats } from "./stats.js";

export const UNIVERSE_IDS = ["dark-fantasy", "isekai", "murim", "xianxia", "hunter", "academy"] as const;
export type UniverseId = (typeof UNIVERSE_IDS)[number];

export const GENDERS = ["female", "male"] as const;
export type Gender = (typeof GENDERS)[number];

export const LIFE_STAGES = ["infant", "child", "teen", "adult", "middle", "elder"] as const;
export type LifeStage = (typeof LIFE_STAGES)[number];

/** Роли NPC в жизни персонажа */
export const NPC_ROLES = ["father", "mother", "sibling", "grandparent", "friend", "rival", "mentor", "teacher", "partner", "spouse", "ex-partner", "child"] as const;
export type NpcRole = (typeof NPC_ROLES)[number];

/** Скрытые характеристики, которые игрок может узнать по ходу жизни */
export const HIDDEN_KEYS = ["potential", "destiny", "familySecret"] as const;
export type HiddenKey = (typeof HIDDEN_KEYS)[number];

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
  /** Сословие или социальный слой мира (universe.socialClasses) */
  socialClassId: string;
  /** Известные игроку таланты. Спящие таланты лежат в GameState.hidden */
  talents: string[];
  weaknesses: string[];
  /** Уровни навыков 0–100 */
  skills: Record<string, number>;
  professionId: string | null;
  /** Высшая ступень образования */
  educationId: string | null;
  specializationId: string | null;
  /** Отношение фракций мира: от -100 до 100 */
  factions: Record<string, number>;
}

/** Человек в жизни персонажа. Возрасты считаются от возраста персонажа: так NPC стареет вместе с ним */
export interface NpcState {
  id: string;
  role: NpcRole;
  name: string;
  gender: Gender;
  /** Возраст персонажа, в котором NPC родился. Меньше нуля — NPC старше персонажа */
  bornAt: number;
  temperamentId: string;
  traitId: string;
  occupation: LocalizedText;
  bio: LocalizedText;
  /** Отношение к персонажу: от -100 (враг) до 100 (самый близкий человек) */
  affinity: number;
  alive: boolean;
  /** Возраст персонажа, когда NPC умер */
  diedAt: number | null;
  /** Возраст персонажа при знакомстве */
  metAt: number;
  /** Сила NPC от 1 до 100: с ней сравнивается персонаж в поединках и спорах */
  power: number;
  /** Навык, которому NPC может научить */
  skillId: string | null;
  /** Возраст персонажа при последнем личном общении: не чаще раза в год */
  interactedAt: number | null;
}

export interface BackgroundState {
  /** Фамилия или имя рода: её носят родители и братья с сёстрами */
  familyName: string;
  birthplace: LocalizedText;
  omen: LocalizedText;
  familyHistory: LocalizedText;
  /** Биография рождения, по абзацам */
  biography: LocalizedText[];
}

export interface HiddenState {
  /** Врождённый потенциал 1–10: скорость роста и пути силы */
  potential: number;
  /** Судьба 1–10: редкие события и спасение на краю смерти */
  destiny: number;
  /** Таланты, которые ещё не проявились */
  dormantTalents: string[];
  /** Тайна семьи (id из familySecrets мира или общих) */
  familySecret: string | null;
  /** Что из скрытого игрок уже узнал */
  revealed: HiddenKey[];
}

/** Отложенное последствие: наступит само, без выбора, когда персонаж доживёт до age */
export interface ConsequenceState {
  id: string;
  age: number;
  /** Событие, из-за которого последствие появилось */
  source: string;
}

export interface QuestState {
  id: string;
  /** Возраст, в котором задание выдано */
  since: number;
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
  | "ability"
  | "skill"
  | "talent"
  | "weakness"
  | "relation"
  | "npc"
  | "meter"
  | "faction"
  | "class"
  | "profession"
  | "education"
  | "specialization"
  | "hidden";

/** Одно изменение персонажа в записи истории: «Сила +2», «Новый ранг: Закалка Ци» */
export interface HistoryChange {
  kind: ChangeKind;
  key?: string;
  delta?: number;
  value?: number | string;
}

export type HistoryKind = "birth" | "event" | "year" | "death" | "restore" | "consequence" | "quest" | "people";

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
  background: BackgroundState;
  /** Скрытое от игрока. В представление жизни попадает только раскрытое */
  hidden: HiddenState;
  npcs: NpcState[];
  nextNpcId: number;
  /** Шкалы механик мира: скверна, влияние при дворе, угроза Врат... */
  meters: Record<string, number>;
  consequences: ConsequenceState[];
  /** Задание Системы (Арденвейл) */
  quest: QuestState | null;
  questsDone: string[];
  /** Последние события: не повторяются подряд */
  recentEvents: string[];
}

export const INTERACTIONS = ["talk", "gift", "learn", "spar", "confront", "ask-help"] as const;
export type InteractionId = (typeof INTERACTIONS)[number];

/** advance: прожить до years лет подряд, остановка на первом событии. choose: ответ на событие. interact: личное общение с NPC */
export type GameAction =
  | { type: "advance"; years?: number }
  | { type: "choose"; choiceId: string }
  | { type: "interact"; npcId: string; interaction: InteractionId };
export type GameActionType = GameAction["type"];

export const MAX_ADVANCE_YEARS = 10;

/** Результат действия: новое состояние и записи истории, которые оно добавило */
export interface ActionResult {
  state: GameState;
  entries: HistoryEntry[];
}
