// Каталог для интерфейса: вселенные, расы, происхождения и характеры без игровых событий
import { TEMPERAMENTS } from "./character/temperaments.js";
import type { LocalizedText } from "./i18n.js";
import type { StatMods } from "./stats.js";
import type { UniverseId } from "./types.js";
import { listUniverses } from "./universes/registry.js";
import type { UniverseDefinition } from "./universes/types.js";

export interface OptionView {
  id: string;
  name: LocalizedText;
  description: LocalizedText;
  statMods: StatMods;
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
  abilities: { id: string; name: LocalizedText; description: LocalizedText }[];
  eventCount: number;
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
    abilities: u.abilities.map((a) => ({ id: a.id, name: a.name, description: a.description })),
    eventCount: u.events.length
  };
}

export function universeCatalog(): UniverseSummary[] {
  return listUniverses().map(summarizeUniverse);
}

export function temperamentCatalog(): OptionView[] {
  return TEMPERAMENTS.map((x) => ({ id: x.id, name: x.name, description: x.description, statMods: x.statMods }));
}
