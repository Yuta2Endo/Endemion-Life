// Каталог для интерфейса: вселенные, расы, происхождения и характеры без игровых событий
import { TEMPERAMENTS } from "./character/temperaments.js";
import type { LocalizedText } from "./i18n.js";
import type { StatMods } from "./stats.js";
import type { UniverseId } from "./types.js";
import { allProfessions, allSkills, findSkill } from "./rpg/skills.js";
import { allTalents, allWeaknesses, findTalent } from "./rpg/talents.js";
import { listUniverses } from "./universes/registry.js";
import { POINT_BUY_PER_STAT, POINT_BUY_TOTAL, upbringingsFor } from "./character/upbringing.js";
import type { AbilityCategory, SkillCategory, UniverseDefinition } from "./universes/types.js";

export interface NamedView {
  id: string;
  name: LocalizedText;
  description: LocalizedText;
}

export interface OptionView {
  id: string;
  name: LocalizedText;
  description: LocalizedText;
  statMods: StatMods;
}

export interface UpbringingSkillView {
  id: string;
  name: LocalizedText;
  amount: number;
}

export interface UpbringingTalentView {
  id: string;
  name: LocalizedText;
  description: LocalizedText;
}

/** Stage 02.5: уклад детства в том виде, в каком его видит форма создания */
export interface UpbringingView extends OptionView {
  skills: UpbringingSkillView[];
  talent: UpbringingTalentView | null;
}

export interface PointBuyView {
  total: number;
  perStat: number;
}

export interface UniverseSummary {
  id: UniverseId;
  name: LocalizedText;
  tagline: LocalizedText;
  description: LocalizedText;
  rules: LocalizedText[];
  theme: { accent: string; glow: string };
  lifespan: number;
  manaName: LocalizedText;
  track: { name: LocalizedText; description: LocalizedText; pointsName: LocalizedText; ranks: { name: LocalizedText; threshold: number }[] };
  races: OptionView[];
  origins: (OptionView & { wealth: number })[];
  abilities: (NamedView & { category: AbilityCategory })[];
  eventCount: number;
  /** Stage 02: механики, общество, RPG-система мира */
  mechanics: { name: LocalizedText; description: LocalizedText }[];
  socialClasses: (NamedView & { standing: number })[];
  meters: (NamedView & { min: number; max: number; danger: boolean })[];
  factions: NamedView[];
  skills: (NamedView & { category: SkillCategory })[];
  talents: NamedView[];
  weaknesses: NamedView[];
  professions: NamedView[];
  education: (NamedView & { tier: number })[];
  specializations: NamedView[];
  /** Сословие при рождении для каждого происхождения */
  originClasses: Record<string, string>;
  /** Stage 02.5: доступные в этом мире уклады детства */
  upbringings: UpbringingView[];
  /** Stage 02.5: бюджет очков характеристик при рождении */
  pointBuy: PointBuyView;
}

function named(item: { id: string; name: LocalizedText; description: LocalizedText }): NamedView {
  return { id: item.id, name: item.name, description: item.description };
}

/** Уклады мира с уже разрешёнными названиями навыков и таланта: клиенту не нужно знать каталог целиком */
function upbringingViews(universe: UniverseDefinition): UpbringingView[] {
  return upbringingsFor(universe).flatMap((item) => {
    const talent = findTalent(universe, item.talentId);
    if (!talent) return [];
    const skills = Object.entries(item.skills).flatMap(([id, amount]) => {
      const skill = findSkill(universe, id);
      return skill ? [{ id, name: skill.name, amount }] : [];
    });
    return [{ id: item.id, name: item.name, description: item.description, statMods: item.statMods, skills, talent: { id: talent.id, name: talent.name, description: talent.description } }];
  });
}

export function summarizeUniverse(u: UniverseDefinition): UniverseSummary {
  return {
    id: u.id,
    name: u.name,
    tagline: u.tagline,
    description: u.description,
    rules: u.rules,
    theme: u.theme,
    lifespan: u.lifespan,
    manaName: u.manaName,
    track: {
      name: u.track.name,
      description: u.track.description,
      pointsName: u.track.pointsName,
      ranks: u.track.ranks.map((r) => ({ name: r.name, threshold: r.threshold }))
    },
    races: u.races.map((r) => ({ id: r.id, name: r.name, description: r.description, statMods: r.statMods })),
    origins: u.origins.map((o) => ({ id: o.id, name: o.name, description: o.description, statMods: o.statMods, wealth: o.wealth })),
    abilities: u.abilities.map((a) => ({ id: a.id, name: a.name, description: a.description, category: a.category ?? "utility" })),
    eventCount: u.events.length,
    mechanics: u.mechanics,
    socialClasses: u.socialClasses.map((s) => ({ id: s.id, name: s.name, description: s.description, standing: s.standing })),
    meters: u.meters.map((m) => ({ id: m.id, name: m.name, description: m.description, min: m.min, max: m.max, danger: m.danger ?? false })),
    factions: u.factions.map(named),
    skills: allSkills(u).map((s) => ({ ...named(s), category: s.category })),
    talents: allTalents(u).map(named),
    weaknesses: allWeaknesses(u).map(named),
    professions: allProfessions(u).map(named),
    education: u.education.map((e) => ({ ...named(e), tier: e.tier })),
    specializations: u.specializations.map(named),
    originClasses: Object.fromEntries(Object.entries(u.originProfiles).map(([id, profile]) => [id, profile.socialClassId])),
    upbringings: upbringingViews(u),
    pointBuy: { total: POINT_BUY_TOTAL, perStat: POINT_BUY_PER_STAT }
  };
}

/** Уклад текущей жизни: null — случайное рождение без выбранного уклада */
export function creationUpbringing(universe: UniverseDefinition, character: { creation?: { upbringingId?: string } }): UpbringingView | null {
  const id = character.creation?.upbringingId;
  if (!id) return null;
  return upbringingViews(universe).find((view) => view.id === id) ?? null;
}

export function universeCatalog(): UniverseSummary[] {
  return listUniverses().map(summarizeUniverse);
}

export function temperamentCatalog(): OptionView[] {
  return TEMPERAMENTS.map((x) => ({ id: x.id, name: x.name, description: x.description, statMods: x.statMods }));
}
