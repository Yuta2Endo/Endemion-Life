import type { LocalizedText } from "../i18n.js";
import type { ResourceKey, StatKey } from "../stats.js";
import type { HiddenKey, LifeStage, NpcRole } from "../types.js";

/** Роль NPC, любой из родителей или вся семья (родители, бабушки и дедушки, братья и сёстры, супруг, дети) */
export type NpcRef = NpcRole | "parent" | "family";

/** Условие события или варианта выбора. Проверяется только на сервере, по состоянию персонажа */
export type Condition =
  | { type: "stat"; stat: StatKey; min?: number; max?: number }
  | { type: "flag"; flag: string; has: boolean }
  | { type: "karma"; min?: number; max?: number }
  | { type: "reputation"; min?: number; max?: number }
  | { type: "wealth"; min: number }
  | { type: "level"; min: number }
  | { type: "rank"; min?: number; max?: number }
  /** Путь требует прорыва: очки упёрлись в порог следующего ранга */
  | { type: "trackReady" }
  | { type: "origin"; ids: string[] }
  | { type: "race"; ids: string[] }
  | { type: "temperament"; ids: string[] }
  | { type: "ability"; id: string; has: boolean }
  | { type: "skill"; id: string; min: number }
  /** Есть (или нет) один из талантов. Пустой список — любой талант */
  | { type: "talent"; ids: string[]; has: boolean }
  /** Есть (или нет) одна из слабостей. Пустой список — любая слабость */
  | { type: "weakness"; ids: string[]; has: boolean }
  /** Есть живой NPC этой роли */
  | { type: "npc"; role: NpcRef; has: boolean }
  /** Отношение самого близкого живого NPC этой роли */
  | { type: "affinity"; role: NpcRef; min?: number; max?: number }
  | { type: "meter"; id: string; min?: number; max?: number }
  | { type: "faction"; id: string; min?: number; max?: number }
  | { type: "socialClass"; ids: string[] }
  /** Знатность сословия: 0 — низы, 5 — высшая знать */
  | { type: "standing"; min?: number; max?: number }
  /** Есть (или нет) одно из ремёсел. Пустой список — любое ремесло */
  | { type: "profession"; ids: string[]; has: boolean }
  /** Ступень полученного образования: 0 — никакого */
  | { type: "education"; min?: number; max?: number }
  | { type: "specialization"; has: boolean }
  /** Есть ли таланты, которые ещё не проявились */
  | { type: "dormantTalent"; has: boolean }
  /** Скрытые характеристики: игрок их не видит, но они решают, придёт ли событие */
  | { type: "hidden"; key: "potential" | "destiny"; min?: number; max?: number }
  /** У семьи есть тайна, и она раскрыта (revealed: true) или ещё нет (false) */
  | { type: "secret"; revealed: boolean }
  /** Идёт задание Системы */
  | { type: "quest"; active: boolean }
  /** До конца отпущенного срока осталось не больше max лет */
  | { type: "yearsLeft"; max: number };

/** Последствие выбора */
export type Effect =
  | { type: "stat"; stat: StatKey; delta: number }
  | { type: "resource"; resource: ResourceKey; delta: number }
  | { type: "reputation"; delta: number }
  | { type: "karma"; delta: number }
  | { type: "wealth"; delta: number }
  | { type: "xp"; amount: number }
  | { type: "track"; delta: number }
  | { type: "breakthrough" }
  | { type: "flag"; flag: string; set: boolean }
  | { type: "ability"; id: string }
  /** Продолжение сюжетной цепочки через inYears лет */
  | { type: "schedule"; eventId: string; inYears: number }
  | { type: "death"; cause: LocalizedText }
  | { type: "skill"; id: string; delta: number }
  /** Талант проявляется: из спящих, а если его там нет — появляется заново */
  | { type: "talent"; id: string }
  /** Проявляется первый из спящих талантов */
  | { type: "awakenTalent" }
  | { type: "weakness"; id: string; add: boolean }
  /** Побороть первую из слабостей */
  | { type: "overcomeWeakness" }
  /** Новый человек в жизни персонажа */
  | { type: "npc"; role: NpcRole }
  | { type: "affinity"; role: NpcRef; delta: number }
  /** Роль NPC меняется: возлюбленный становится супругом, друг — соперником */
  | { type: "npcRole"; from: NpcRole; to: NpcRole }
  /** Умирает самый близкий живой NPC роли (для "parent" — один из родителей) */
  | { type: "npcDies"; role: NpcRef }
  /** Навык, которому учит NPC этой роли, растёт */
  | { type: "npcSkill"; role: NpcRole; delta: number }
  | { type: "meter"; id: string; delta: number }
  | { type: "faction"; id: string; delta: number }
  | { type: "socialClass"; id: string }
  | { type: "profession"; id: string }
  | { type: "education"; id: string }
  /** Первое образование этой ступени в мире персонажа: у каждой вселенной своя школа */
  | { type: "educationTier"; tier: number }
  | { type: "specialization"; id: string }
  /** Отложенное последствие: наступит само через inYears лет */
  | { type: "later"; id: string; inYears: number }
  /** Игрок узнаёт скрытую характеристику */
  | { type: "reveal"; key: HiddenKey };

export interface StatCheck {
  /** Берётся среднее по этим характеристикам (с бонусом ранга) */
  stats: StatKey[];
  difficulty: number;
  /** Сложность растёт с каждым рангом пути: прорывы даются всё труднее */
  perRank?: number;
  /** Навык добавляет до +25% к шансу */
  skill?: string;
  /** Шкалы мира сдвигают шанс: (значение − base) × per */
  meters?: { id: string; per: number; base: number }[];
  /** Противник: его сила повышает сложность */
  versus?: NpcRole;
}

export interface OutcomeDefinition {
  text: LocalizedText;
  effects: Effect[];
}

export interface ChoiceDefinition {
  id: string;
  text: LocalizedText;
  /** Без этих условий вариант виден, но недоступен */
  requires?: Condition[];
  check?: StatCheck;
  success: OutcomeDefinition;
  /** Исход при провале проверки. Нет — провал без последствий */
  failure?: OutcomeDefinition;
}

/** Вид события: по нему видно, откуда оно взялось, и проверяется разнообразие контента */
export type EventKind = "life" | "personal" | "family" | "age" | "stat" | "world" | "npc" | "chain" | "path";

export interface EventDefinition {
  id: string;
  kind?: EventKind;
  title: LocalizedText;
  text: LocalizedText;
  minAge?: number;
  maxAge?: number;
  stages?: LifeStage[];
  conditions?: Condition[];
  /** Вес при случайном выборе. По умолчанию 1 у общих событий и 2 у событий вселенной */
  weight?: number;
  /** Не чаще, чем раз в cooldown лет. Без cooldown и maxOccurrences — не чаще раза в DEFAULT_COOLDOWN лет */
  cooldown?: number;
  maxOccurrences?: number;
  /** Событие приходит только как продолжение цепочки (Effect schedule) */
  scheduledOnly?: boolean;
  choices: ChoiceDefinition[];
}

/** Отложенное последствие: приходит само, без выбора, и записывается в хронику */
export interface ConsequenceDefinition {
  id: string;
  title: LocalizedText;
  text: LocalizedText;
  /** Если условия не выполнены, когда срок настал, последствие тихо отменяется */
  conditions?: Condition[];
  /** Вероятность, что последствие всё-таки наступит. По умолчанию 1 */
  chance?: number;
  effects: Effect[];
}
