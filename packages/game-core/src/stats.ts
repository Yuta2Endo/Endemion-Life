import { t, type LocalizedText } from "./i18n.js";

export const STAT_KEYS = ["strength", "intelligence", "agility", "vitality", "wisdom", "charisma", "luck", "willpower"] as const;
export type StatKey = (typeof STAT_KEYS)[number];
export type Stats = Record<StatKey, number>;
export type StatMods = Partial<Stats>;

export const STAT_MIN = 1;
export const STAT_MAX = 100;
/** Потолок характеристики при рождении */
export const BIRTH_STAT_MAX = 30;

interface StatInfo {
  name: LocalizedText;
  short: LocalizedText;
  description: LocalizedText;
}

export const STAT_INFO: Readonly<Record<StatKey, StatInfo>> = {
  strength: {
    name: t("Сила", "Strength"),
    short: t("СИЛ", "STR"),
    description: t("Физическая мощь, ближний бой и тяжёлый труд.", "Physical power, melee combat and hard labour.")
  },
  intelligence: {
    name: t("Интеллект", "Intelligence"),
    short: t("ИНТ", "INT"),
    description: t("Учёба, магические знания и расчёт.", "Learning, arcane knowledge and reasoning.")
  },
  agility: {
    name: t("Ловкость", "Agility"),
    short: t("ЛОВ", "AGI"),
    description: t("Скорость, точность и уклонение.", "Speed, precision and evasion.")
  },
  vitality: {
    name: t("Живучесть", "Vitality"),
    short: t("ЖИВ", "VIT"),
    description: t("Здоровье, выносливость и долголетие.", "Health, endurance and longevity.")
  },
  wisdom: {
    name: t("Мудрость", "Wisdom"),
    short: t("МДР", "WIS"),
    description: t("Интуиция, чутьё и духовная сила.", "Intuition, insight and spiritual power.")
  },
  charisma: {
    name: t("Харизма", "Charisma"),
    short: t("ХАР", "CHA"),
    description: t("Обаяние, убеждение и лидерство.", "Charm, persuasion and leadership.")
  },
  luck: {
    name: t("Удача", "Luck"),
    short: t("УДЧ", "LCK"),
    description: t("Случай на вашей стороне: удача помогает в любой проверке.", "Fortune is on your side: luck helps in every check.")
  },
  willpower: {
    name: t("Воля", "Willpower"),
    short: t("ВОЛ", "WIL"),
    description: t("Стойкость духа перед соблазном, страхом и болью.", "Strength of spirit against temptation, fear and pain.")
  }
};

export const RESOURCE_KEYS = ["health", "energy", "mana", "stamina"] as const;
export type ResourceKey = (typeof RESOURCE_KEYS)[number];
export type Resources = Record<ResourceKey, number>;
export type ResourceMods = Partial<Resources>;

export const RESOURCE_INFO: Readonly<Record<ResourceKey, { name: LocalizedText }>> = {
  health: { name: t("Здоровье", "Health") },
  energy: { name: t("Энергия", "Energy") },
  mana: { name: t("Мана", "Mana") },
  stamina: { name: t("Выносливость", "Stamina") }
};

export const REPUTATION_LIMIT = 100;
export const KARMA_LIMIT = 100;
/** Stage 04: предел золота персонажа. Никакой источник не поднимет его выше: число не переполнится и не потеряет точность */
export const WEALTH_MAX = 1_000_000_000;

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function statsOf(value: number): Stats {
  return Object.fromEntries(STAT_KEYS.map((key) => [key, value])) as Stats;
}

export function resourcesOf(value: number): Resources {
  return Object.fromEntries(RESOURCE_KEYS.map((key) => [key, value])) as Resources;
}

/** Пары ключ–значение из частичной записи с правильными типами (без undefined) */
export function entriesOf<K extends string, V>(record: Partial<Record<K, V>> | undefined): [K, V][] {
  if (!record) return [];
  return (Object.entries(record) as [K, V | undefined][]).filter((entry): entry is [K, V] => entry[1] !== undefined);
}
