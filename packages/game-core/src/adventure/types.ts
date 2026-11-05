// Описания приключения. Правила их применения — в adventure.ts, не здесь.
import type { LocalizedText } from "../i18n.js";
import type { Condition, Effect, StatCheck } from "../narrative/types.js";

export interface PlaceDefinition {
  id: string;
  name: LocalizedText;
  text: LocalizedText;
  /** Раньше этого возраста место не открывается */
  minAge: number;
}

/** Куда ведёт исход шага. Ровно одно из трёх */
export interface StepOutcome {
  text: LocalizedText;
  effects: Effect[];
  /** id следующего шага того же приключения */
  next?: string;
  /** Приключение завершено, награда этого исхода — последняя */
  complete?: boolean;
  /** Приключение провалено. Награды нет, кроме эффектов этого исхода */
  fail?: boolean;
}

export interface VentureChoice {
  id: string;
  text: LocalizedText;
  /** Без этих условий вариант виден, но недоступен */
  requires?: Condition[];
  /** Нет проверки — исход всегда success */
  check?: StatCheck;
  success: StepOutcome;
  failure?: StepOutcome;
}

export interface AdventureStep {
  id: string;
  text: LocalizedText;
  choices: VentureChoice[];
}

export interface AdventureDefinition {
  id: string;
  /** Место, без открытия которого приключение не начать */
  placeId: string;
  name: LocalizedText;
  text: LocalizedText;
  minAge: number;
  /** id приключений, которые нужно завершить раньше */
  requires?: string[];
  steps: AdventureStep[];
}

/** Состояние приключений одной жизни. Пустое у новой жизни и у наследника */
export interface AdventureState {
  /** Открытые места, по id */
  discovered: string[];
  active: { id: string; step: string; since: number } | null;
  /** Завершённые приключения: награду за них больше не получить */
  done: string[];
  /** Проваленные или брошенные */
  failed: string[];
  log: AdventureLogEntry[];
}

export const ADVENTURE_LOG_KINDS = ["discover", "begin", "step", "complete", "fail", "abandon"] as const;
export type AdventureLogKind = (typeof ADVENTURE_LOG_KINDS)[number];

export interface AdventureLogEntry {
  adventureId: string;
  age: number;
  kind: AdventureLogKind;
}
