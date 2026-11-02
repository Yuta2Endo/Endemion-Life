import type { LocalizedText } from "../i18n.js";
import type { EventDefinition } from "../narrative/types.js";
import type { StatKey, StatMods } from "../stats.js";
import type { UniverseId } from "../types.js";

export interface RaceDefinition {
  id: string;
  name: LocalizedText;
  description: LocalizedText;
  statMods: StatMods;
  /** Прибавка к продолжительности жизни, лет */
  lifespanBonus?: number;
}

export interface OriginDefinition {
  id: string;
  name: LocalizedText;
  description: LocalizedText;
  statMods: StatMods;
  wealth: number;
  reputation?: number;
  karma?: number;
  flags?: string[];
  abilities?: string[];
  /** Вес при случайном выборе происхождения */
  weight?: number;
}

export interface TrackRank {
  name: LocalizedText;
  /** Очки пути, нужные для прорыва на этот ранг */
  threshold: number;
  /** Прибавка к характеристикам на этом ранге (не суммируется с прошлыми рангами) */
  statBonus: StatMods;
  lifespanBonus?: number;
  /** Способности, которые даёт прорыв на этот ранг */
  abilities?: string[];
}

/** Путь силы вселенной: скверна, культивация, ранг охотника, круги маны */
export interface TrackDefinition {
  name: LocalizedText;
  description: LocalizedText;
  pointsName: LocalizedText;
  /** От этих характеристик зависит прирост очков каждый год */
  stats: StatKey[];
  minAge: number;
  yearlyFactor: number;
  /** Путь открыт только с этим флагом (клятва, корень духа, пробуждение) */
  requiresFlag?: string;
  ranks: TrackRank[];
}

export interface AbilityDefinition {
  id: string;
  name: LocalizedText;
  description: LocalizedText;
}

export interface UniverseDefinition {
  id: UniverseId;
  name: LocalizedText;
  tagline: LocalizedText;
  description: LocalizedText;
  /** Особые правила мира, их видит игрок при выборе */
  rules: LocalizedText[];
  /** Цвета вселенной для интерфейса */
  theme: { accent: string; glow: string };
  /** Базовая продолжительность жизни, лет */
  lifespan: number;
  /** Как в этом мире называется мана */
  manaName: LocalizedText;
  races: RaceDefinition[];
  origins: OriginDefinition[];
  track: TrackDefinition;
  abilities: AbilityDefinition[];
  events: EventDefinition[];
}
