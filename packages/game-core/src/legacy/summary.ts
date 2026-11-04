// Итоговая оценка жизни. Деньги и характеристики в ней не главное: годы, семья, близкие люди, дела,
// след в роду и путь силы весят примерно одинаково
import { lifespanOf } from "../character/derived.js";
import { isPresent } from "../family/kin.js";
import { t, type LocalizedText } from "../i18n.js";
import { educationTier, findProfession } from "../rpg/skills.js";
import { clamp } from "../stats.js";
import { SELF_ID, type GameState } from "../types.js";
import { getUniverse } from "../universes/registry.js";

export const SCORE_PARTS = ["years", "family", "bonds", "deeds", "legacy", "path"] as const;
export type ScorePart = (typeof SCORE_PARTS)[number];

export interface LifeScore {
  total: number;
  parts: Record<ScorePart, number>;
  titleId: string;
}

export const SCORE_PART_NAMES: Readonly<Record<ScorePart, LocalizedText>> = {
  years: t("Прожитые годы", "Years lived"),
  family: t("Семья", "Family"),
  bonds: t("Близкие люди", "Bonds"),
  deeds: t("Дела и достижения", "Deeds and achievements"),
  legacy: t("След в роду", "Mark on the family"),
  path: t("Ремесло и путь силы", "Craft and path of power")
};

export const LIFE_TITLES: Readonly<Record<string, { name: LocalizedText; description: LocalizedText }>> = {
  legend: { name: t("Легенда рода", "Legend of the line"), description: t("О такой жизни потомки рассказывают своим детям.", "Descendants tell their children about a life like this.") },
  patriarch: { name: t("Опора большой семьи", "Pillar of a large family"), description: t("Главное, что останется после, — люди за общим столом.", "What remains is the people around the family table.") },
  beloved: { name: t("Любимый многими", "Beloved by many"), description: t("Эту жизнь измеряют теми, кто её помнит.", "This life is measured by those who remember it.") },
  accomplished: { name: t("Человек дела", "A person of deeds"), description: t("Сделанное говорит громче слов.", "What was done speaks louder than words.") },
  keeper: { name: t("Хранитель рода", "Keeper of the house"), description: t("Имя рода стало весомее, чем было при рождении.", "The family name weighs more than it did at birth.") },
  master: { name: t("Мастер пути", "Master of the path"), description: t("Ремесло и сила доведены до того, чего достигают немногие.", "Craft and power brought to where few ever reach.") },
  "long-lived": { name: t("Долгожитель", "Long-lived"), description: t("Долгая жизнь — тоже дар.", "A long life is a gift too.") },
  "short-candle": { name: t("Короткая свеча", "A short candle"), description: t("Жизнь оборвалась, не успев начаться.", "A life cut short before it truly began.") },
  quiet: { name: t("Тихая жизнь", "A quiet life"), description: t("Не всякая жизнь оставляет громкий след.", "Not every life leaves a loud trace.") }
};

const TITLE_BY_PART: Readonly<Record<ScorePart, string>> = {
  years: "long-lived",
  family: "patriarch",
  bonds: "beloved",
  deeds: "accomplished",
  legacy: "keeper",
  path: "master"
};

export function scoreLife(state: GameState): LifeScore {
  const c = state.character;
  const universe = getUniverse(c.universeId);
  const lineage = state.lineage;
  const children = state.npcs.filter((npc) => npc.parents.includes(SELF_ID));
  const childIds = new Set(children.map((npc) => npc.id));
  const grandchildren = state.npcs.filter((npc) => npc.parents.some((id) => childIds.has(id)));
  const married = state.npcs.some((npc) => npc.spouseId === SELF_ID || npc.formerSpouses.includes(SELF_ID));
  const close = state.npcs.filter((npc) => (isPresent(npc) || npc.diedAt === state.life.age) && npc.affinity >= 40).length;
  const enemies = state.npcs.filter((npc) => npc.alive && npc.affinity <= -60).length;
  const earned = lineage.achievements.filter((a) => a.gen === lineage.generation).length;
  const profession = c.professionId ? findProfession(universe, c.professionId) : undefined;
  const maxRank = Math.max(1, universe.track.ranks.length - 1);

  const parts: Record<ScorePart, number> = {
    years: Math.round(Math.min(1, state.life.age / lifespanOf(c)) * 16),
    family: Math.min(18, (married ? 4 : 0) + Math.min(12, children.length * 3) + Math.min(4, grandchildren.length * 2)),
    bonds: clamp(Math.min(16, close * 2) - enemies, 0, 16),
    deeds: Math.min(16, earned * 3 + educationTier(universe, c)),
    legacy: clamp(Math.round((lineage.renown - lineage.startRenown) / 2 + c.karma / 10 + c.reputation / 10), 0, 16),
    path: Math.min(18, Math.round((c.track.rank / maxRank) * 10) + Math.min(8, Math.floor((profession ? (c.skills[profession.skill] ?? 0) : 0) / 10)))
  };
  const total = clamp(SCORE_PARTS.reduce((sum, key) => sum + parts[key], 0), 0, 100);
  let titleId: string;
  if (state.life.age < 18) titleId = "short-candle";
  else if (total >= 70) titleId = "legend";
  else if (total < 25) titleId = "quiet";
  else {
    // Звание — по самой весомой части оценки относительно её предела
    const limits: Record<ScorePart, number> = { years: 16, family: 18, bonds: 16, deeds: 16, legacy: 16, path: 18 };
    const best = [...SCORE_PARTS].sort((a, b) => parts[b] / limits[b] - parts[a] / limits[a])[0]!;
    titleId = TITLE_BY_PART[best];
  }
  return { total, parts, titleId };
}
