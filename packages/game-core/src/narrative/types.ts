import type { LocalizedText } from "../i18n.js";
import type { ResourceKey, StatKey } from "../stats.js";
import type { LifeStage } from "../types.js";

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
  | { type: "ability"; id: string; has: boolean };

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
  | { type: "death"; cause: LocalizedText };

export interface StatCheck {
  /** Берётся среднее по этим характеристикам (с бонусом ранга) */
  stats: StatKey[];
  difficulty: number;
  /** Сложность растёт с каждым рангом пути: прорывы даются всё труднее */
  perRank?: number;
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

export interface EventDefinition {
  id: string;
  title: LocalizedText;
  text: LocalizedText;
  minAge?: number;
  maxAge?: number;
  stages?: LifeStage[];
  conditions?: Condition[];
  /** Вес при случайном выборе. По умолчанию 1 у общих событий и 2 у событий вселенной */
  weight?: number;
  /** Не чаще, чем раз в cooldown лет */
  cooldown?: number;
  maxOccurrences?: number;
  /** Событие приходит только как продолжение цепочки (Effect schedule) */
  scheduledOnly?: boolean;
  choices: ChoiceDefinition[];
}
