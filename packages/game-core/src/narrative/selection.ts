// Narrative Engine: какое событие случится в этом году
import { checkAll } from "../engine/conditions.js";
import type { EngineContext } from "../engine/context.js";
import { TEMPERAMENTS } from "../character/temperaments.js";
import { ACHIEVEMENTS } from "../legacy/achievements.js";
import { LINEAGE_CONSEQUENCES, THREADS } from "../legacy/stories.js";
import { findHealthCondition } from "../life/health.js";
import { findProfession, findSkill } from "../rpg/skills.js";
import { findCareerTrack } from "../life/careers.js";
import { findProperty } from "../life/household.js";
import { findBusiness } from "../life/business.js";
import { allTalents, allWeaknesses } from "../rpg/talents.js";
import { STAT_KEYS } from "../stats.js";
import { NPC_ROLES, UNIVERSE_IDS, type GameState, type LifeStage, type UniverseId } from "../types.js";
import { settlementSeeds } from "../world/state.js";
import { getUniverse, listUniverses } from "../universes/registry.js";
import type { UniverseDefinition } from "../universes/types.js";
import { COMMON_EVENTS } from "./common.js";
import { milestoneEvents, isMilestoneEvent } from "../life/milestones.js";
import type { Condition, Effect, EventDefinition } from "./types.js";

/** Вероятность, что год принесёт событие */
const EVENT_CHANCE: Readonly<Record<LifeStage, number>> = {
  infant: 0.4,
  child: 0.7,
  teen: 0.75,
  adult: 0.7,
  middle: 0.6,
  elder: 0.5
};
/** Сколько лет продолжение цепочки ждёт, если его условия пока не выполнены */
const SCHEDULE_GRACE_YEARS = 5;
/** Событие без cooldown и maxOccurrences приходит не чаще раза в столько лет */
export const DEFAULT_COOLDOWN = 3;
/** Столько последних событий не повторяются, даже если их cooldown уже прошёл */
export const RECENT_LIMIT = 4;

const byUniverse = new Map<string, Map<string, EventDefinition>>();

/** Все события вселенной вместе с общими, по id. Строится один раз */
export function eventIndex(universe: UniverseDefinition): Map<string, EventDefinition> {
  let index = byUniverse.get(universe.id);
  if (!index) {
    index = new Map([...COMMON_EVENTS, ...milestoneEvents(), ...universe.events].map((event) => [event.id, event]));
    byUniverse.set(universe.id, index);
  }
  return index;
}

export function findEvent(universe: UniverseDefinition, eventId: string): EventDefinition | undefined {
  return eventIndex(universe).get(eventId);
}

/** Хотя бы один вариант выбора доступен: игрок никогда не застрянет в событии */
function hasAvailableChoice(state: GameState, event: EventDefinition): boolean {
  return event.choices.some((choice) => checkAll(state, choice.requires));
}

/** Подходит ли событие персонажу прямо сейчас (без учёта scheduledOnly) */
export function isEligible(state: GameState, event: EventDefinition): boolean {
  const { age, stage } = state.life;
  if (event.minAge !== undefined && age < event.minAge) return false;
  if (event.maxAge !== undefined && age > event.maxAge) return false;
  if (event.stages && !event.stages.includes(stage)) return false;
  const seen = state.occurrences[event.id] ?? 0;
  if (event.maxOccurrences !== undefined && seen >= event.maxOccurrences) return false;
  if (event.lineageMax !== undefined && (state.lineage.stories[event.id] ?? 0) >= event.lineageMax) return false;
  const last = state.lastSeen[event.id];
  const cooldown = event.cooldown ?? (event.maxOccurrences === undefined ? DEFAULT_COOLDOWN : undefined);
  if (cooldown !== undefined && last !== undefined && age - last < cooldown) return false;
  return checkAll(state, event.conditions) && hasAvailableChoice(state, event);
}

/** Запоминает событие в списке недавних: следующие RECENT_LIMIT событий будут другими */
export function rememberEvent(state: GameState, eventId: string): void {
  state.recentEvents = [eventId, ...(state.recentEvents ?? []).filter((id) => id !== eventId)].slice(0, RECENT_LIMIT);
}

/** Продолжение сюжетной цепочки, чей срок настал. Просроченные продолжения отбрасываются */
function takeScheduled(ctx: EngineContext): EventDefinition | undefined {
  const state = ctx.state;
  const age = state.life.age;
  state.scheduled.sort((a, b) => a.age - b.age || a.eventId.localeCompare(b.eventId));
  for (const item of [...state.scheduled]) {
    if (item.age > age) continue;
    const event = findEvent(ctx.universe, item.eventId);
    const ready = event !== undefined && checkAll(state, event.conditions) && hasAvailableChoice(state, event);
    if (ready || !event || age - item.age >= SCHEDULE_GRACE_YEARS) {
      state.scheduled.splice(state.scheduled.indexOf(item), 1);
    }
    if (ready) return event;
  }
  return undefined;
}

/** Выбирает событие года. undefined — год прошёл без событий */
export function selectEvent(ctx: EngineContext): EventDefinition | undefined {
  const scheduled = takeScheduled(ctx);
  if (scheduled) return scheduled;
  if (!ctx.rng.chance(EVENT_CHANCE[ctx.state.life.stage])) return undefined;
  const universeEvents = new Set(ctx.universe.events.map((event) => event.id));
  const recent = new Set(ctx.state.recentEvents ?? []);
  const eligible = [...eventIndex(ctx.universe).values()].filter((event) => !isMilestoneEvent(event.id) && !event.scheduledOnly && isEligible(ctx.state, event));
  // Недавние события не повторяются подряд. Если подходят только они — год проходит без события
  const candidates = eligible.filter((event) => !recent.has(event.id));
  // Чем чаще событие уже было, тем реже оно приходит снова: вес делится на 1 + число повторов
  return ctx.rng.weighted(candidates, (event) => (event.weight ?? (universeEvents.has(event.id) ? 2 : 1)) / (1 + (ctx.state.occurrences[event.id] ?? 0)));
}

const ROLES = new Set<string>([...NPC_ROLES, "parent", "family"]);

function knownIds(universe: UniverseDefinition, kind: string): ReadonlySet<string> | undefined {
  switch (kind) {
    case "origin":
      return new Set(universe.origins.map((item) => item.id));
    case "race":
      return new Set(universe.races.map((item) => item.id));
    case "ability":
      return new Set(universe.abilities.map((item) => item.id));
    case "meter":
      return new Set(universe.meters.map((item) => item.id));
    case "faction":
      return new Set(universe.factions.map((item) => item.id));
    case "socialClass":
      return new Set(universe.socialClasses.map((item) => item.id));
    default:
      return undefined;
  }
}

function skillKnown(universe: UniverseDefinition, id: string): boolean {
  return findSkill(universe, id) !== undefined;
}

/** Ссылка условия, которой в этом мире нет. Пустая строка — ссылка верна или её тут нет */
function brokenCondition(universe: UniverseDefinition, condition: Condition, events: ReadonlyMap<string, EventDefinition>): string {
  const ids = "ids" in condition ? condition.ids : [];
  const table = condition.type === "skill" ? undefined : knownIds(universe, condition.type);
  if (table) {
    const missing = ids.filter((id) => !table.has(id));
    if (missing.length > 0) return `${condition.type} ${missing.join(",")}`;
  }
  switch (condition.type) {
    case "skill":
      return skillKnown(universe, condition.id) ? "" : `навык ${condition.id}`;
    case "talent":
      return ids.every((id) => allTalents(universe).some((item) => item.id === id)) ? "" : `талант ${ids.join(",")}`;
    case "weakness":
      return ids.every((id) => allWeaknesses(universe).some((item) => item.id === id)) ? "" : `слабость ${ids.join(",")}`;
    case "profession":
      return ids.every((id) => findProfession(universe, id)) ? "" : `ремесло ${ids.join(",")}`;
    case "achievement":
      return ACHIEVEMENTS.some((item) => item.id === condition.id) ? "" : `достижение ${condition.id}`;
    case "thread":
      return condition.id in THREADS ? "" : `нить ${condition.id}`;
    case "story":
      return events.has(condition.id) ? "" : `сюжет ${condition.id}`;
    case "deed":
      return "";
    case "world":
      return ids.every((id) => (UNIVERSE_IDS as readonly string[]).includes(id)) ? "" : `мир ${ids.join(",")}`;
    case "temperament":
      return ids.every((id) => TEMPERAMENTS.some((item) => item.id === id)) ? "" : `характер ${ids.join(",")}`;
    case "npc":
    case "affinity":
      return ROLES.has(condition.role) ? "" : `роль ${condition.role}`;
    case "condition":
      return findHealthCondition(condition.id) ? "" : `состояние ${condition.id}`;
    case "home":
      return findProperty(universe.id, condition.id) ? "" : `дом ${condition.id}`;
    case "business":
      return condition.id === undefined || findBusiness(universe.id, condition.id) ? "" : `дело ${condition.id}`;
    case "businessLosses":
      return condition.id === undefined || findBusiness(universe.id, condition.id) ? "" : `дело ${condition.id}`;
    default:
      return "";
  }
}

function brokenEffect(universe: UniverseDefinition, effect: Effect, events: ReadonlyMap<string, EventDefinition>, consequences: ReadonlySet<string>): string {
  switch (effect.type) {
    case "ability":
      return universe.abilities.some((item) => item.id === effect.id) ? "" : `способность ${effect.id}`;
    case "skill":
      return skillKnown(universe, effect.id) ? "" : `навык ${effect.id}`;
    case "faction":
      return universe.factions.some((item) => item.id === effect.id) ? "" : `фракция ${effect.id}`;
    case "meter":
      return universe.meters.some((item) => item.id === effect.id) ? "" : `шкала ${effect.id}`;
    case "socialClass":
      return universe.socialClasses.some((item) => item.id === effect.id) ? "" : `сословие ${effect.id}`;
    case "profession":
      return findProfession(universe, effect.id) ? "" : `ремесло ${effect.id}`;
    case "startCareer":
      return findProfession(universe, effect.id) && findCareerTrack(universe.id, effect.id) ? "" : `карьера ${effect.id}`;
    case "enrollEducation":
      return universe.education.some((item) => item.id === effect.id) ? "" : `образование ${effect.id}`;
    case "education":
      return universe.education.some((item) => item.id === effect.id) ? "" : `образование ${effect.id}`;
    case "talent":
      return allTalents(universe).some((item) => item.id === effect.id) ? "" : `талант ${effect.id}`;
    case "weakness":
      return allWeaknesses(universe).some((item) => item.id === effect.id) ? "" : `слабость ${effect.id}`;
    case "schedule":
      return events.has(effect.eventId) ? "" : `событие ${effect.eventId}`;
    case "later":
      return consequences.has(effect.id) ? "" : `последствие ${effect.id}`;
    case "thread":
      return effect.id in THREADS ? "" : `нить ${effect.id}`;
    case "settlement":
      return settlementSeeds(universe).some((item) => item.id === effect.id) ? "" : `поселение ${effect.id}`;
    case "influence": {
      const known = effect.kind === "settlement"
        ? settlementSeeds(universe).some((item) => item.id === effect.id)
        : universe.factions.some((item) => item.id === effect.id);
      return known ? "" : `${effect.kind === "settlement" ? "поселение" : "фракция"} ${effect.id}`;
    }
    case "stat":
      return (STAT_KEYS as readonly string[]).includes(effect.stat) ? "" : `характеристика ${effect.stat}`;
    case "condition":
    case "cure":
      return findHealthCondition(effect.id) ? "" : `состояние ${effect.id}`;
    case "rentHome":
    case "buyProperty":
      return findProperty(universe.id, effect.id) ? "" : `дом ${effect.id}`;
    case "sellProperty":
      return effect.id === undefined || findProperty(universe.id, effect.id) ? "" : `дом ${effect.id}`;
    case "repairProperty":
    case "neglectHome":
      return "";
    case "startBusiness":
    case "investBusiness":
      return findBusiness(universe.id, effect.id) ? "" : `дело ${effect.id}`;
    case "sellBusiness":
    case "closeBusiness":
      return effect.id === undefined || findBusiness(universe.id, effect.id) ? "" : `дело ${effect.id}`;
    default:
      return "";
  }
}

/**
 * Проверка событий года. Ничего не меняет.
 * Ловит повтор id, пустой список вариантов, продолжение и последствие в никуда, награду не из этого мира
 */
export function eventProblems(universeId?: UniverseId): string[] {
  const problems: string[] = [];
  const worlds = universeId ? [getUniverse(universeId)] : listUniverses();
  for (const universe of worlds) {
    const events = eventIndex(universe);
    const consequences = new Set([...universe.consequences.map((item) => item.id), ...LINEAGE_CONSEQUENCES.map((item) => item.id)]);
    const ids = [...events.keys()];
    if (new Set(ids).size !== ids.length) problems.push(`${universe.id}: повтор id события`);
    for (const event of events.values()) {
      const where = `${universe.id} ${event.id}`;
      if (event.choices.length === 0) problems.push(`${where}: нет вариантов`);
      const choiceIds = event.choices.map((choice) => choice.id);
      if (new Set(choiceIds).size !== choiceIds.length) problems.push(`${where}: повтор варианта`);
      const texts = [event.title, event.text, ...event.choices.flatMap((choice) => [choice.text, choice.success.text])];
      if (texts.some((text) => text.ru.trim().length === 0 || text.en.trim().length === 0)) problems.push(`${where}: пустой текст`);
      for (const condition of event.conditions ?? []) {
        const broken = brokenCondition(universe, condition, events);
        if (broken) problems.push(`${where}: ${broken}`);
      }
      for (const choice of event.choices) {
        for (const condition of choice.requires ?? []) {
          const broken = brokenCondition(universe, condition, events);
          if (broken) problems.push(`${where}: ${broken}`);
        }
        for (const effect of [...choice.success.effects, ...(choice.failure?.effects ?? [])]) {
          const broken = brokenEffect(universe, effect, events, consequences);
          if (broken) problems.push(`${where}: ${broken}`);
        }
      }
    }
    for (const consequence of [...universe.consequences, ...LINEAGE_CONSEQUENCES]) {
      for (const effect of consequence.effects) {
        const broken = brokenEffect(universe, effect, events, consequences);
        if (broken) problems.push(`${universe.id} ${consequence.id}: ${broken}`);
      }
    }
  }
  return problems;
}
