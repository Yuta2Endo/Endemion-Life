import { t, type LocalizedText } from "../i18n.js";
import type { StatKey, StatMods } from "../stats.js";

export interface TemperamentDefinition {
  id: string;
  name: LocalizedText;
  description: LocalizedText;
  statMods: StatMods;
  /** В детстве и юности эти характеристики растут чаще остальных */
  growth: StatKey[];
  karma?: number;
}

/** Характер общий для всех вселенных: он влияет на рост в детстве и на исходы проверок через характеристики */
export const TEMPERAMENTS: readonly TemperamentDefinition[] = [
  {
    id: "brave",
    name: t("Отважный", "Brave"),
    description: t("Идёт навстречу опасности первым.", "Walks toward danger first."),
    statMods: { strength: 2, willpower: 2, wisdom: -1 },
    growth: ["strength", "vitality", "willpower"]
  },
  {
    id: "cunning",
    name: t("Хитрый", "Cunning"),
    description: t("Видит выгоду там, где другие видят преграду.", "Sees profit where others see obstacles."),
    statMods: { intelligence: 2, agility: 1, charisma: 1, willpower: -1 },
    growth: ["intelligence", "agility", "charisma"],
    karma: -5
  },
  {
    id: "kind",
    name: t("Добрый", "Kind"),
    description: t("Помогает, даже когда это дорого обходится.", "Helps even when it costs dearly."),
    statMods: { charisma: 2, wisdom: 2, strength: -1 },
    growth: ["charisma", "wisdom", "vitality"],
    karma: 10
  },
  {
    id: "ambitious",
    name: t("Честолюбивый", "Ambitious"),
    description: t("Хочет большего, чем дала судьба.", "Wants more than fate has granted."),
    statMods: { willpower: 2, charisma: 1, intelligence: 1, luck: -1 },
    growth: ["willpower", "intelligence", "strength"]
  },
  {
    id: "calm",
    name: t("Спокойный", "Calm"),
    description: t("Не спешит и редко ошибается.", "Never hurries and rarely errs."),
    statMods: { wisdom: 2, vitality: 1, willpower: 1, agility: -1 },
    growth: ["wisdom", "vitality", "willpower"]
  },
  {
    id: "curious",
    name: t("Любопытный", "Curious"),
    description: t("Не может пройти мимо тайны.", "Cannot walk past a mystery."),
    statMods: { intelligence: 2, luck: 2, vitality: -1 },
    growth: ["intelligence", "agility", "luck"]
  }
];
