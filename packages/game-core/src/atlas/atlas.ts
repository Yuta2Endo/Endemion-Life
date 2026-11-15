// R5.1: Атлас мира. Читаемая сводка законов, сил и открытых дорог.
// Модуль чистый: не читает сохранение и не меняет состояние, только собирает представление.
import type { AdventureBoard, AdventureView, RewardView } from "../adventure/adventure.js";
import { adventuresOf, findAdventure, placesOf } from "../adventure/content.js";
import type { MeterView } from "../engine/profile.js";
import type { LocalizedText } from "../i18n.js";
import { RELICS } from "../legacy/stories.js";
import type { TrackState, UniverseId } from "../types.js";
import { getUniverse } from "../universes/registry.js";

export type AtlasAdventureStatus = "completed" | "failed" | "active" | "available" | "locked";
export type AtlasOathStatus = "completed" | "active" | "available" | "locked";

export interface AtlasSnapshot {
  universeId: UniverseId;
  age: number;
  track: TrackState;
  factions: Record<string, number>;
  socialClassId: string;
  meters: readonly MeterView[];
  adventure: AdventureBoard;
  /** R5.6: id реликвий, уже принадлежащих роду. */
  relics: readonly string[];
  /** R5.7: активный обет или задание Системы. */
  quest: { id: string } | null;
  /** R5.7: id завершённых обетов и заданий. */
  questsDone: readonly string[];
}

export interface AtlasTrackView {
  name: LocalizedText;
  description: LocalizedText;
  pointsName: LocalizedText;
  points: number;
  rank: number;
  rankName: LocalizedText;
  nextRankName: LocalizedText | null;
  nextThreshold: number | null;
  currentThreshold: number;
  /** Доля пути до следующего ранга, 0..1. На высшем ранге — 1 */
  progress: number;
}

export interface AtlasSocialClassView {
  id: string;
  name: LocalizedText;
  description: LocalizedText;
  standing: number;
  income: number;
  occupations: LocalizedText[];
  current: boolean;
}

export interface AtlasFactionView {
  id: string;
  name: LocalizedText;
  description: LocalizedText;
  standing: number;
  known: boolean;
}

export interface AtlasRelicView {
  id: string;
  name: LocalizedText;
  description: LocalizedText;
  owned: boolean;
}

export interface AtlasOathView {
  id: string;
  title: LocalizedText;
  text: LocalizedText;
  issuer: LocalizedText | null;
  arc: LocalizedText | null;
  minAge: number;
  years: number;
  status: AtlasOathStatus;
  blocked: "age" | "requires" | "active" | null;
  requires: LocalizedText[];
}

export interface AtlasAdventureView {
  id: string;
  name: LocalizedText;
  text: LocalizedText;
  placeId: string;
  minAge: number;
  ageLocked: boolean;
  status: AtlasAdventureStatus;
  blocked: AdventureView["blocked"];
  requires: LocalizedText[];
  rewards: RewardView[];
}

export interface AtlasPlaceView {
  id: string;
  discovered: boolean;
  name: LocalizedText | null;
  text: LocalizedText | null;
  minAge: number;
  ageLocked: boolean;
  adventures: AtlasAdventureView[];
}

export interface AtlasProgressView {
  placesFound: number;
  placesTotal: number;
  adventuresDone: number;
  adventuresTotal: number;
  factionsKnown: number;
  factionsTotal: number;
  mechanicCount: number;
  socialClassCount: number;
  relicsOwned: number;
  relicsTotal: number;
  oathsDone: number;
  oathsTotal: number;
}

export interface AtlasView {
  universeId: UniverseId;
  name: LocalizedText;
  tagline: LocalizedText;
  description: LocalizedText;
  rules: LocalizedText[];
  theme: { accent: string; glow: string };
  manaName: LocalizedText;
  lifespan: number;
  mechanics: { name: LocalizedText; description: LocalizedText }[];
  track: AtlasTrackView;
  socialClasses: AtlasSocialClassView[];
  factions: AtlasFactionView[];
  meters: MeterView[];
  relics: AtlasRelicView[];
  oaths: AtlasOathView[];
  places: AtlasPlaceView[];
  progress: AtlasProgressView;
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function statusOf(card: AdventureView | undefined, active: boolean): AtlasAdventureStatus {
  if (active) return "active";
  if (!card) return "locked";
  if (card.blocked === "done") return "completed";
  if (card.blocked === "failed") return "failed";
  if (card.blocked === null) return "available";
  return "locked";
}

/**
 * Собирает Атлас по узкому снимку жизни.
 * Снимок не содержит seed и генератор, поэтому представление можно строить на клиенте.
 */
export function presentAtlas(snapshot: AtlasSnapshot): AtlasView {
  const universe = getUniverse(snapshot.universeId);
  const cardById = new Map(snapshot.adventure.adventures.map((card) => [card.id, card]));
  const placeState = new Map(snapshot.adventure.places.map((place) => [place.id, place]));
  const activeId = snapshot.adventure.current?.id ?? null;

  const places = placesOf(universe.id).map((place): AtlasPlaceView => {
    const discovered = placeState.get(place.id)?.discovered ?? false;
    const adventures = adventuresOf(universe.id)
      .filter((adventure) => adventure.placeId === place.id)
      .map((adventure): AtlasAdventureView => {
        const card = cardById.get(adventure.id);
        return {
          id: adventure.id,
          name: adventure.name,
          text: adventure.text,
          placeId: adventure.placeId,
          minAge: adventure.minAge,
          ageLocked: snapshot.age < adventure.minAge,
          status: statusOf(card, activeId === adventure.id),
          blocked: card?.blocked ?? null,
          requires: (adventure.requires ?? []).flatMap((id) => {
            const required = findAdventure(universe.id, id);
            return required ? [required.name] : [];
          }),
          rewards: card?.rewards ?? []
        };
      });
    return {
      id: place.id,
      discovered,
      name: discovered ? place.name : null,
      text: discovered ? place.text : null,
      minAge: place.minAge,
      ageLocked: snapshot.age < place.minAge,
      adventures
    };
  });

  const ranks = universe.track.ranks;
  const rank = Math.max(0, Math.min(snapshot.track.rank, Math.max(0, ranks.length - 1)));
  const currentRank = ranks[rank] ?? ranks[0];
  const nextRank = ranks[rank + 1] ?? null;
  const currentThreshold = currentRank?.threshold ?? 0;
  const nextThreshold = nextRank?.threshold ?? null;
  const progress =
    nextThreshold === null ? 1 : clamp01((snapshot.track.points - currentThreshold) / Math.max(1, nextThreshold - currentThreshold));

  const factions = universe.factions.map((faction): AtlasFactionView => {
    const known = Object.prototype.hasOwnProperty.call(snapshot.factions, faction.id);
    return {
      id: faction.id,
      name: faction.name,
      description: faction.description,
      standing: snapshot.factions[faction.id] ?? 0,
      known
    };
  });

  const socialClasses = universe.socialClasses.map((socialClass): AtlasSocialClassView => ({
    id: socialClass.id,
    name: socialClass.name,
    description: socialClass.description,
    standing: socialClass.standing,
    income: socialClass.income,
    occupations: socialClass.occupations,
    current: socialClass.id === snapshot.socialClassId
  }));

  const relics = Object.values(RELICS)
    .filter((relic) => relic.universeId === universe.id)
    .map((relic): AtlasRelicView => ({
      id: relic.id,
      name: relic.name,
      description: relic.description,
      owned: snapshot.relics.includes(relic.id)
    }));

  const questById = new Map([...(universe.quests ?? []), ...(universe.oaths ?? [])].map((quest) => [quest.id, quest]));
  const oaths = (universe.oaths ?? []).map((oath): AtlasOathView => {
    const done = snapshot.questsDone.includes(oath.id);
    const active = snapshot.quest?.id === oath.id;
    const missing = (oath.requires ?? []).filter((id) => !snapshot.questsDone.includes(id));
    let blocked: AtlasOathView["blocked"] = null;
    if (!done && !active) {
      if (snapshot.age < (oath.minAge ?? 10)) blocked = "age";
      else if (missing.length > 0) blocked = "requires";
      else if (snapshot.quest !== null) blocked = "active";
    }
    const status: AtlasOathStatus = done ? "completed" : active ? "active" : blocked ? "locked" : "available";
    return {
      id: oath.id,
      title: oath.title,
      text: oath.text,
      issuer: oath.issuer ?? null,
      arc: oath.arc ?? null,
      minAge: oath.minAge ?? 10,
      years: oath.years,
      status,
      blocked,
      requires: (oath.requires ?? []).flatMap((id) => {
        const required = questById.get(id);
        return required ? [required.title] : [];
      })
    };
  });

  const placesFound = snapshot.adventure.discovered;
  const adventuresDone = snapshot.adventure.completed;

  return {
    universeId: universe.id,
    name: universe.name,
    tagline: universe.tagline,
    description: universe.description,
    rules: universe.rules,
    theme: universe.theme,
    manaName: universe.manaName,
    lifespan: universe.lifespan,
    mechanics: universe.mechanics.map((mechanic) => ({ name: mechanic.name, description: mechanic.description })),
    track: {
      name: universe.track.name,
      description: universe.track.description,
      pointsName: universe.track.pointsName,
      points: snapshot.track.points,
      rank,
      rankName: currentRank?.name ?? universe.track.name,
      nextRankName: nextRank?.name ?? null,
      nextThreshold,
      currentThreshold,
      progress
    },
    socialClasses,
    factions,
    meters: [...snapshot.meters],
    relics,
    oaths,
    places,
    progress: {
      placesFound,
      placesTotal: snapshot.adventure.placesTotal,
      adventuresDone,
      adventuresTotal: snapshot.adventure.adventures.length,
      factionsKnown: factions.filter((faction) => faction.known).length,
      factionsTotal: factions.length,
      mechanicCount: universe.mechanics.length,
      socialClassCount: socialClasses.length,
      relicsOwned: relics.filter((relic) => relic.owned).length,
      relicsTotal: relics.length,
      oathsDone: oaths.filter((oath) => oath.status === "completed").length,
      oathsTotal: oaths.length
    }
  };
}
