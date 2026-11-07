import type { LocalizedText } from "../i18n.js";
import type { Condition, ConsequenceDefinition, Effect, EventDefinition } from "../narrative/types.js";
import type { StatKey, StatMods } from "../stats.js";
import type { NpcRole, UniverseId } from "../types.js";

export interface RaceDefinition {
  id: string;
  name: LocalizedText;
  description: LocalizedText;
  statMods: StatMods;
  /** Прибавка к продолжительности жизни, лет */
  lifespanBonus?: number;
}

/** Семья при рождении: orphan — родители погибли, foundling — родители неизвестны, single — растит одна мать, bastard — отец знатен и не признаёт */
export type FamilyKind = "full" | "orphan" | "foundling" | "single" | "bastard";

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

/** Что происхождение даёт в Stage 02: сословие, семья, навыки и история рода. Хранится отдельно от OriginDefinition */
export interface OriginProfile {
  /** Сословие при рождении (universe.socialClasses) */
  socialClassId: string;
  family?: FamilyKind;
  /** Начальные навыки */
  skills?: Record<string, number>;
  /** Начальные значения шкал мира поверх meter.initial */
  meters?: Record<string, number>;
  factions?: Record<string, number>;
  /** Как сложилась история семьи до рождения персонажа */
  history: LocalizedText;
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

export type AbilityCategory = "combat" | "magic" | "cultivation" | "social" | "utility";

export interface AbilityDefinition {
  id: string;
  name: LocalizedText;
  description: LocalizedText;
  category?: AbilityCategory;
}

export type SkillCategory = "combat" | "magic" | "cultivation" | "social" | "craft" | "knowledge" | "survival";

export interface SkillDefinition {
  id: string;
  name: LocalizedText;
  description: LocalizedText;
  category: SkillCategory;
  /** Характеристики, от которых зависит рост навыка */
  stats: StatKey[];
}

export interface TalentDefinition {
  id: string;
  name: LocalizedText;
  description: LocalizedText;
  /** Эти характеристики растут чаще */
  growth?: StatKey[];
  /** Эти навыки растут каждый год */
  skills?: string[];
  /** Множитель прироста пути силы */
  trackFactor?: number;
  /** Проверки с этими характеристиками получают +5% */
  checks?: StatKey[];
  /** Вес при случайном выборе: редкие таланты меньше 1 */
  weight?: number;
}

export interface WeaknessDefinition {
  id: string;
  name: LocalizedText;
  description: LocalizedText;
  /** Проверки с этими характеристиками получают −6% */
  checks?: StatKey[];
  /** Множитель ежегодного восстановления здоровья */
  healing?: number;
  /** Множитель дохода */
  income?: number;
  /** Множитель прироста пути силы */
  trackFactor?: number;
  /** С этими талантами слабость не выпадает */
  conflicts?: string[];
  weight?: number;
}

/** Сословие или слой общества. standing: 0 — изгои и низы, 5 — высшая знать */
export interface SocialClassDefinition {
  id: string;
  name: LocalizedText;
  description: LocalizedText;
  standing: number;
  /** Ежегодный доход сословия (рента, жалованье, подаяние) */
  income: number;
  /** Кем бывают родители этого сословия */
  occupations: LocalizedText[];
}

/** Шкала механики мира: скверна, милость двора, угроза Врат, искажение ци... */
export interface MeterDefinition {
  id: string;
  name: LocalizedText;
  description: LocalizedText;
  min: number;
  max: number;
  initial: number;
  /** Шкала опасна: чем выше, тем хуже (для цвета в интерфейсе) */
  danger?: boolean;
}

export interface FactionDefinition {
  id: string;
  name: LocalizedText;
  description: LocalizedText;
}

export interface ProfessionDefinition {
  id: string;
  name: LocalizedText;
  description: LocalizedText;
  /** Навык, который растёт на этой работе */
  skill: string;
  /** От этих характеристик зависит доход */
  stats: StatKey[];
  base: number;
}

export interface EducationDefinition {
  id: string;
  name: LocalizedText;
  description: LocalizedText;
  /** 1 — грамота, 2 — школа пути, 3 — высшая ступень */
  tier: number;
  /** Навыки, которые даёт обучение (+10 каждому) */
  skills: string[];
}

export interface SpecializationDefinition {
  id: string;
  name: LocalizedText;
  description: LocalizedText;
  statBonus: StatMods;
  skill: string;
}

export interface FamilySecretDefinition {
  id: string;
  name: LocalizedText;
  /** Намёк в биографии рождения */
  hint: LocalizedText;
  /** Что узнаёт персонаж, когда тайна раскрывается */
  reveal: LocalizedText;
  effects: Effect[];
  /** Только для этих происхождений */
  origins?: string[];
}

export interface OmenDefinition {
  text: LocalizedText;
  /** Знамение приходит только при судьбе не ниже этой */
  minDestiny?: number;
}

/** Задание Системы (Арденвейл): цель, срок, награда и наказание */
export interface QuestDefinition {
  id: string;
  title: LocalizedText;
  text: LocalizedText;
  goal: Condition[];
  years: number;
  reward: Effect[];
  penalty: Effect[];
  minAge?: number;
}

export interface WorldMechanic {
  name: LocalizedText;
  description: LocalizedText;
}

/** Мир в том виде, как его описал Stage 01: расы, происхождения, путь силы и события */
export interface UniverseBase {
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
  /** Возрастные рубежи мира. Если не задано, используется базовая конфигурация life/milestones.ts */
  milestoneAges?: readonly number[];
}

/** Что мир получает в Stage 02: общество, механики, RPG-система, люди и последствия. Лежит в universes/<id>.world.ts */
export interface WorldDefinition {
  /** Механики мира (их считает world/rules.ts): описание для игрока */
  mechanics: WorldMechanic[];
  /** Профиль каждого происхождения, по id */
  originProfiles: Record<string, OriginProfile>;
  /** Таланты, которые у расы встречаются втрое чаще */
  raceTalents: Record<string, string[]>;
  socialClasses: SocialClassDefinition[];
  meters: MeterDefinition[];
  factions: FactionDefinition[];
  /** Навыки мира. Общие навыки (COMMON_SKILLS) доступны везде */
  skills: SkillDefinition[];
  talents: TalentDefinition[];
  weaknesses: WeaknessDefinition[];
  professions: ProfessionDefinition[];
  education: EducationDefinition[];
  specializations: SpecializationDefinition[];
  familySecrets: FamilySecretDefinition[];
  birthplaces: LocalizedText[];
  omens: OmenDefinition[];
  /** Кем бывают наставники, учителя, друзья и соперники */
  npcTitles: Partial<Record<NpcRole, LocalizedText[]>>;
  consequences: ConsequenceDefinition[];
  quests?: QuestDefinition[];
  /** Вид силы для способностей Stage 01, по id */
  abilityCategories: Record<string, AbilityCategory>;
  /** Новые способности мира */
  abilities: AbilityDefinition[];
  /** Новые события мира: добавляются к событиям Stage 01 */
  events: EventDefinition[];
}

/** Мир целиком: Stage 01 и Stage 02 вместе. Собирается в registry.ts */
export type UniverseDefinition = UniverseBase & Omit<WorldDefinition, "abilityCategories" | "abilities" | "events">;
