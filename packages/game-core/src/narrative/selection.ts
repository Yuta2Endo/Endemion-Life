// Narrative Engine: какое событие случится в этом году
import { checkAll } from "../engine/conditions.js";
import type { EngineContext } from "../engine/context.js";
import type { GameState, LifeStage } from "../types.js";
import type { UniverseDefinition } from "../universes/types.js";
import { COMMON_EVENTS } from "./common.js";
import type { EventDefinition } from "./types.js";

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

const byUniverse = new Map<string, Map<string, EventDefinition>>();

/** Все события вселенной вместе с общими, по id. Строится один раз */
export function eventIndex(universe: UniverseDefinition): Map<string, EventDefinition> {
  let index = byUniverse.get(universe.id);
  if (!index) {
    index = new Map([...COMMON_EVENTS, ...universe.events].map((event) => [event.id, event]));
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
  const last = state.lastSeen[event.id];
  if (event.cooldown !== undefined && last !== undefined && age - last < event.cooldown) return false;
  return checkAll(state, event.conditions) && hasAvailableChoice(state, event);
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
  const candidates = [...eventIndex(ctx.universe).values()].filter((event) => !event.scheduledOnly && isEligible(ctx.state, event));
  return ctx.rng.weighted(candidates, (event) => event.weight ?? (universeEvents.has(event.id) ? 2 : 1));
}
