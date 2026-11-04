import type { LocalizedText } from "./i18n.js";
import type { Resources, Stats } from "./stats.js";

export const UNIVERSE_IDS = ["dark-fantasy", "isekai", "murim", "xianxia", "hunter", "academy"] as const;
export type UniverseId = (typeof UNIVERSE_IDS)[number];

export const GENDERS = ["female", "male"] as const;
export type Gender = (typeof GENDERS)[number];

export const LIFE_STAGES = ["infant", "child", "teen", "adult", "middle", "elder"] as const;
export type LifeStage = (typeof LIFE_STAGES)[number];

/**
 * Роли NPC в жизни персонажа. Роли родни (родители, дети, братья, внуки…) вычисляются из связей родства
 * (family/kin.ts), остальные (друг, соперник, наставник…) — отношение к персонажу, его хранит сама роль
 */
export const NPC_ROLES = [
  "father",
  "mother",
  "sibling",
  "grandparent",
  "friend",
  "rival",
  "mentor",
  "teacher",
  "partner",
  "spouse",
  "ex-partner",
  "child",
  // Stage 03: родня, которую приносят семьи NPC и смена поколений, и люди без связи с персонажем
  "grandchild",
  "nibling",
  "pibling",
  "cousin",
  "in-law",
  "relative",
  "acquaintance"
] as const;
export type NpcRole = (typeof NPC_ROLES)[number];

/** Статус жизни NPC. retired — жив, но больше не работает; missing — пропал, может вернуться */
export const NPC_STATUSES = ["alive", "deceased", "missing", "retired"] as const;
export type NpcStatus = (typeof NPC_STATUSES)[number];

/** Причина смерти NPC. life — сыгранный персонаж рода: подробности в LineageState.lives */
export const NPC_DEATH_CAUSES = ["old-age", "illness", "accident", "battle", "world", "event", "unknown", "life"] as const;
export type DeathCauseId = (typeof NPC_DEATH_CAUSES)[number];

/** Цель жизни NPC: от неё зависит, что он делает чаще */
export const NPC_GOALS = ["family", "mastery", "rise", "knowledge", "wealth"] as const;
export type NpcGoal = (typeof NPC_GOALS)[number];

/** Что случилось в жизни NPC: короткий журнал для карточки человека */
export const NPC_LOG_KINDS = [
  "education",
  "job",
  "promotion",
  "job-change",
  "job-loss",
  "mentor",
  "class-up",
  "class-down",
  "married",
  "divorced",
  "widowed",
  "child",
  "adopted",
  "ill",
  "missing",
  "returned",
  "retired",
  "goal",
  "estate"
] as const;
export type NpcLogKind = (typeof NPC_LOG_KINDS)[number];

export interface NpcLogEntry {
  /** Возраст персонажа, когда это случилось */
  at: number;
  kind: NpcLogKind;
  /** id профессии, сословия, NPC, цели или сумма — по виду записи */
  value?: string;
}

/** Текущий персонаж в связях родства: в parents и spouseId NPC */
export const SELF_ID = "self";

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

  // Stage 03: собственная жизнь NPC и родство по id
  /** Фамилия отдельно от имени: её получают дети. Пустая — у мира нет фамилий */
  familyName: string;
  status: NpcStatus;
  /** Причина смерти. null — жив или пропал */
  cause: DeathCauseId | null;
  raceId: string;
  /** Родители: id NPC или SELF_ID. Не больше двух */
  parents: string[];
  /** Супруг: id NPC или SELF_ID */
  spouseId: string | null;
  formerSpouses: string[];
  /** Усыновлён: родители в parents приёмные */
  adopted: boolean;
  socialClassId: string;
  /** Профессия из системы профессий мира (rpg/skills.ts). Занятие occupation — то, как NPC видят люди */
  professionId: string | null;
  /** Ступень в профессии: 0 — новичок, 3 — признанный мастер */
  careerRank: number;
  /** Ступень образования 0–3 (universe.education) */
  educationTier: number;
  factionId: string | null;
  goal: NpcGoal | null;
  /** Здоровье 0–100: болезни и раны его отнимают */
  health: number;
  wealth: number;
  talentId: string | null;
  weaknessId: string | null;
  log: NpcLogEntry[];
  /** Поколение рода, если этим человеком играли. null — обычный NPC */
  lifeGen: number | null;
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

/** Записи хроники рода. Текст строится из вида записи и значений v (legacy/chronicle.ts): в сохранении нет готовых текстов */
export const CHRONICLE_KINDS = [
  "origin",
  "birth",
  "adoption",
  "marriage",
  "divorce",
  "death",
  "tragedy",
  "missing",
  "return",
  "career",
  "class",
  "succession",
  "inheritance",
  "achievement",
  "talent",
  "secret",
  "story"
] as const;
export type ChronicleKind = (typeof CHRONICLE_KINDS)[number];

export interface ChronicleEntry {
  id: number;
  /** Год рода: 0 — год рождения основателя */
  year: number;
  /** Поколение, при котором это случилось */
  gen: number;
  kind: ChronicleKind;
  /** Участники: id NPC. Текущий персонаж — SELF_ID; при передаче рода заменяется на id его записи NPC */
  who: string[];
  /** Имена (n0, n1…) и значения для текста на момент записи: имя не теряется, даже если человека уже нет в списке */
  v: Record<string, string | number>;
  /** Источник: id события, последствия или закона; "npc" — собственная жизнь NPC; "world" — законы мира */
  src: string;
  /** Связь с более ранней записью хроники (id) */
  link: number | null;
}

/** Сыгранная жизнь рода: для хроники, итогов и древа */
export interface LifeRecord {
  gen: number;
  name: string;
  gender: Gender;
  raceId: string;
  originId: string;
  /** Год рода, когда персонаж родился */
  born: number;
  age: number;
  cause: LocalizedText | null;
  professionId: string | null;
  socialClassId: string;
  /** Итоговая оценка жизни 0–100 */
  score: number;
  /** Звание по итогам жизни (legacy/summary.ts) */
  titleId: string;
  /** id записи NPC этого персонажа после передачи рода. null — род ещё не передан */
  npcId: string | null;
  /** Кому передан род (имя на момент передачи) */
  heirName: string | null;
}

/** Нить рода: долг, враг, тайна, позор или знание, которые переходят к потомкам */
export interface LineageThread {
  id: string;
  /** Год рода, когда нить появилась */
  year: number;
  gen: number;
  src: string;
}

/** Последствие для рода: наступит в год year, даже если персонаж, который его вызвал, уже умер */
export interface LineagePending {
  id: string;
  year: number;
  src: string;
  /** Запись хроники, из-за которой последствие появилось */
  entry: number | null;
}

export interface AchievementRecord {
  id: string;
  gen: number;
  age: number;
}

/** Что получил текущий персонаж от предшественника. null у основателя рода */
export interface InheritanceRecord {
  fromGen: number;
  fromName: string;
  /** id записи NPC предшественника */
  fromNpcId: string;
  /** Кем наследник приходился предшественнику (family/kin.ts KinRelation) */
  relation: string;
  /** Закон наследования мира (legacy/laws.ts) */
  law: string;
  /** Золото из наследства и собственное золото наследника */
  wealth: number;
  ownWealth: number;
  /** Что ушло другим наследникам */
  shares: { npcId: string; name: string; amount: number }[];
  socialClassId: string;
  /** Сословие перешло от предшественника (а не своё) */
  classInherited: boolean;
  reputation: number;
  /** Проявившиеся фамильные таланты и слабости. Спящие — только числом */
  talents: string[];
  weaknesses: string[];
  dormant: number;
  /** Унаследованные флаги пути силы: корень духа, кровь клана… */
  flags: string[];
  /** Нити рода, перешедшие к наследнику (только открытые игроку) */
  threads: string[];
  /** Опека: наследник младше возраста, с которого закон мира отдаёт имущество в его руки */
  controlAge: number;
  guardianName: string | null;
  /** Золото у опекуна: перейдёт к наследнику в controlAge */
  held: number;
}

/** Род. Каждое поколение — отдельная жизнь (своё сохранение и откат), род переходит в неё целиком при наследовании */
export interface LineageState {
  name: string;
  /** Поколение текущего персонажа: 1 — основатель */
  generation: number;
  /** Год рода, в который родился текущий персонаж. Возрасты NPC считаются от его рождения */
  epoch: number;
  /** Родители текущего персонажа (id NPC) */
  selfParents: string[];
  selfAdopted: boolean;
  /** Слава рода: от -100 (позор) до 100 */
  renown: number;
  /** Слава рода в начале жизни текущего персонажа: по разнице видно, что он сделал для рода */
  startRenown: number;
  lives: LifeRecord[];
  chronicle: ChronicleEntry[];
  nextEntry: number;
  /** Достижения сохраняются между поколениями: каждое — один раз на род */
  achievements: AchievementRecord[];
  /** В скольких поколениях проявился талант или слабость: с двух поколений это фамильная черта */
  traits: { talents: Record<string, number>; weaknesses: Record<string, number> };
  threads: LineageThread[];
  pending: LineagePending[];
  /** Сколько раз в роду произошёл сюжет поколений: сюжеты не повторяются без причины */
  stories: Record<string, number>;
  /** Род продолжен: id NPC наследника. Такую жизнь нельзя откатить и продолжить второй раз */
  continuedBy: string | null;
  /** Сколько записей хроники ушло в архив по лимиту размера сохранения */
  archived: number;
  inheritance: InheritanceRecord | null;
  /** Имена людей, чьи карточки ушли в архив: записи истории и хроники по-прежнему показывают имя */
  names: Record<string, string>;
}

/** Ключевое решение жизни: для итогов. Хранятся самые значимые */
export interface MemoryEntry {
  age: number;
  eventId: string;
  choiceId: string;
  success: boolean | null;
  /** Значимость: сколько изменений принесло решение */
  weight: number;
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

/** Виды изменений в записи истории. Список нужен и для проверки истории, присланной браузером (Stage 04) */
export const CHANGE_KINDS = [
  "stat",
  "resource",
  "reputation",
  "karma",
  "wealth",
  "xp",
  "level",
  "track",
  "rank",
  "ability",
  "skill",
  "talent",
  "weakness",
  "relation",
  "npc",
  "meter",
  "faction",
  "class",
  "profession",
  "education",
  "specialization",
  "hidden",
  "renown",
  "achievement",
  "thread"
] as const;
export type ChangeKind = (typeof CHANGE_KINDS)[number];

/** Одно изменение персонажа в записи истории: «Сила +2», «Новый ранг: Закалка Ци» */
export interface HistoryChange {
  kind: ChangeKind;
  key?: string;
  delta?: number;
  value?: number | string;
}

/** import — Stage 04: жизнь перенесена из браузера на сервер */
export const HISTORY_KINDS = ["birth", "event", "year", "death", "restore", "consequence", "quest", "people", "legacy", "import"] as const;
export type HistoryKind = (typeof HISTORY_KINDS)[number];

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
  /** Stage 03: род, хроника рода, достижения, наследование */
  lineage: LineageState;
  /** Ключевые решения этой жизни */
  memory: MemoryEntry[];
  /** Stage 04: хозяйство — экономический цикл мира, нехватка денег, доходы и расходы последних лет */
  economy: EconomyState;
}

/** Stage 04: состояние хозяйства мира. Спад и подъём меняют заработок */
export const ECONOMY_CYCLES = ["slump", "normal", "boom"] as const;
export type EconomyCycle = (typeof ECONOMY_CYCLES)[number];

/** Статьи доходов и расходов года */
export const ECONOMY_LINES = ["profession", "guild", "trade", "class", "thrift", "world", "cycle", "tax", "living"] as const;
export type EconomyLineId = (typeof ECONOMY_LINES)[number];

export interface EconomyLine {
  id: EconomyLineId;
  /** Плюс — доход, минус — расход */
  amount: number;
}

export interface EconomyYear {
  age: number;
  income: number;
  expenses: number;
  /** Сколько не хватило, чтобы оплатить расходы года */
  shortfall: number;
}

export interface EconomyState {
  cycle: EconomyCycle;
  /** Возраст персонажа, с которого держится нынешнее состояние хозяйства */
  cycleSince: number;
  /** Сколько лет подряд не хватает денег на расходы */
  hardship: number;
  /** Статьи последнего года */
  last: { age: number; lines: EconomyLine[]; shortfall: number } | null;
  /** Итоги последних лет (не больше MAX_ECONOMY_YEARS) */
  years: EconomyYear[];
}

export const INTERACTIONS = ["talk", "gift", "learn", "spar", "confront", "ask-help"] as const;
export type InteractionId = (typeof INTERACTIONS)[number];

/**
 * advance: прожить до years лет подряд, остановка на первом событии. choose: ответ на событие. interact: личное общение с NPC.
 * Продолжение рода за наследника — отдельная операция (legacy/succession.ts): она создаёт новую жизнь, а не меняет эту
 */
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
