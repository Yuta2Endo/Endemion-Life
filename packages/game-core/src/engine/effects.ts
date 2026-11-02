import { isTrackReady, maxResources, MAX_LEVEL, nextRankThreshold, xpForLevel } from "../character/derived.js";
import type { LocalizedText } from "../i18n.js";
import type { Effect } from "../narrative/types.js";
import { clamp, KARMA_LIMIT, REPUTATION_LIMIT, STAT_KEYS, STAT_MAX, STAT_MIN, type ResourceKey, type StatKey } from "../stats.js";
import type { ChangeKind, HistoryChange } from "../types.js";
import type { EngineContext } from "./context.js";

/** Сколько лет события остаются в очереди продолжения сюжета */
const MAX_SCHEDULED = 20;

/** Добавляет изменение в итог действия. Изменения одной величины складываются: «Сила +3», а не «+1, +2» */
export function record(ctx: EngineContext, change: HistoryChange): void {
  if (change.delta !== undefined) {
    if (change.delta === 0) return;
    const same = ctx.changes.find((c) => c.kind === change.kind && c.key === change.key && c.delta !== undefined);
    if (same) {
      same.delta = (same.delta ?? 0) + change.delta;
      if (same.delta === 0) ctx.changes.splice(ctx.changes.indexOf(same), 1);
      return;
    }
  }
  ctx.changes.push({ ...change });
}

function recordDelta(ctx: EngineContext, kind: ChangeKind, before: number, after: number, key?: string): void {
  if (after !== before) record(ctx, key === undefined ? { kind, delta: after - before } : { kind, key, delta: after - before });
}

export function changeStat(ctx: EngineContext, stat: StatKey, delta: number): void {
  const stats = ctx.state.character.stats;
  const before = stats[stat];
  stats[stat] = clamp(before + delta, STAT_MIN, STAT_MAX);
  recordDelta(ctx, "stat", before, stats[stat], stat);
}

export function changeResource(ctx: EngineContext, resource: ResourceKey, delta: number): void {
  const c = ctx.state.character;
  const before = c.resources[resource];
  c.resources[resource] = clamp(before + delta, 0, maxResources(c)[resource]);
  recordDelta(ctx, "resource", before, c.resources[resource], resource);
}

/** Запасы не могут быть больше предела: предел меняется вместе с характеристиками и рангом */
export function clampResources(ctx: EngineContext): void {
  const c = ctx.state.character;
  const max = maxResources(c);
  for (const key of Object.keys(max) as ResourceKey[]) c.resources[key] = clamp(c.resources[key], 0, max[key]);
}

export function gainXp(ctx: EngineContext, amount: number): void {
  const c = ctx.state.character;
  if (amount <= 0 || c.level >= MAX_LEVEL) return;
  c.xp += amount;
  record(ctx, { kind: "xp", delta: amount });
  while (c.level < MAX_LEVEL && c.xp >= xpForLevel(c.level)) {
    c.xp -= xpForLevel(c.level);
    c.level += 1;
    record(ctx, { kind: "level", value: c.level });
    // Новый уровень закаляет: одна случайная характеристика растёт, здоровье восполняется
    changeStat(ctx, ctx.rng.pick(STAT_KEYS), 1);
    c.resources.health = maxResources(c).health;
  }
}

/** Открыт ли путь силы: без клятвы, корня духа или пробуждения очки не копятся */
export function isTrackOpen(ctx: EngineContext): boolean {
  const flag = ctx.universe.track.requiresFlag;
  return flag === undefined || ctx.state.flags.includes(flag);
}

/** Очки пути растут до порога следующего ранга. Дальше — только прорыв */
export function gainTrack(ctx: EngineContext, delta: number): void {
  if (!isTrackOpen(ctx)) return;
  const c = ctx.state.character;
  const before = c.track.points;
  const ranks = ctx.universe.track.ranks;
  const cap = nextRankThreshold(c) ?? ranks[ranks.length - 1]?.threshold ?? 0;
  c.track.points = Math.max(0, Math.min(cap, before + delta));
  recordDelta(ctx, "track", before, c.track.points);
}

/** Прорыв на следующий ранг пути. Ничего не делает, если сила ещё не накоплена */
export function breakthrough(ctx: EngineContext): boolean {
  const c = ctx.state.character;
  if (!isTrackReady(c)) return false;
  c.track.rank += 1;
  const rank = ctx.universe.track.ranks[c.track.rank];
  record(ctx, { kind: "rank", value: c.track.rank });
  for (const ability of rank?.abilities ?? []) addAbility(ctx, ability);
  // Прорыв обновляет тело: запасы восполняются до нового предела
  const max = maxResources(c);
  c.resources = { ...max };
  return true;
}

export function addAbility(ctx: EngineContext, id: string): void {
  const abilities = ctx.state.character.abilities;
  if (abilities.includes(id) || !ctx.universe.abilities.some((a) => a.id === id)) return;
  abilities.push(id);
  record(ctx, { kind: "ability", value: id });
}

export function setFlag(ctx: EngineContext, flag: string, set: boolean): void {
  const flags = ctx.state.flags;
  const has = flags.includes(flag);
  if (set && !has) flags.push(flag);
  if (!set && has) flags.splice(flags.indexOf(flag), 1);
}

export function kill(ctx: EngineContext, cause: LocalizedText): void {
  const life = ctx.state.life;
  if (!life.alive) return;
  life.alive = false;
  life.deathAge = life.age;
  life.deathCause = cause;
  ctx.state.character.resources.health = 0;
  ctx.state.pending = null;
  ctx.state.scheduled = [];
}

export function applyEffect(ctx: EngineContext, effect: Effect): void {
  const c = ctx.state.character;
  switch (effect.type) {
    case "stat":
      return changeStat(ctx, effect.stat, effect.delta);
    case "resource":
      return changeResource(ctx, effect.resource, effect.delta);
    case "reputation": {
      const before = c.reputation;
      c.reputation = clamp(before + effect.delta, -REPUTATION_LIMIT, REPUTATION_LIMIT);
      return recordDelta(ctx, "reputation", before, c.reputation);
    }
    case "karma": {
      const before = c.karma;
      c.karma = clamp(before + effect.delta, -KARMA_LIMIT, KARMA_LIMIT);
      return recordDelta(ctx, "karma", before, c.karma);
    }
    case "wealth": {
      const before = c.wealth;
      c.wealth = Math.max(0, before + effect.delta);
      return recordDelta(ctx, "wealth", before, c.wealth);
    }
    case "xp":
      return gainXp(ctx, effect.amount);
    case "track":
      return gainTrack(ctx, effect.delta);
    case "breakthrough":
      breakthrough(ctx);
      return;
    case "flag":
      return setFlag(ctx, effect.flag, effect.set);
    case "ability":
      return addAbility(ctx, effect.id);
    case "schedule": {
      const scheduled = ctx.state.scheduled;
      if (scheduled.length >= MAX_SCHEDULED || scheduled.some((s) => s.eventId === effect.eventId)) return;
      scheduled.push({ eventId: effect.eventId, age: ctx.state.life.age + Math.max(1, effect.inYears) });
      return;
    }
    case "death":
      return kill(ctx, effect.cause);
  }
}

export function applyEffects(ctx: EngineContext, effects: readonly Effect[]): void {
  for (const effect of effects) {
    if (!ctx.state.life.alive) return;
    applyEffect(ctx, effect);
  }
  clampResources(ctx);
}

/** Умер ли персонаж от ран после действия */
export function isFatal(ctx: EngineContext): boolean {
  return ctx.state.life.alive && ctx.state.character.resources.health <= 0;
}
