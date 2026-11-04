import { isTrackReady, maxResources, MAX_LEVEL, nextRankThreshold, xpForLevel } from "../character/derived.js";
import { AFFINITY_LIMIT, canAddRole, createNpc, livingWith, shiftAffinity } from "../character/npcs.js";
import type { LocalizedText } from "../i18n.js";
import type { Effect, NpcRef } from "../narrative/types.js";
import { findEducation, findProfession, findSkill, SKILL_MAX } from "../rpg/skills.js";
import { findTalent, findWeakness } from "../rpg/talents.js";
import { clamp, KARMA_LIMIT, REPUTATION_LIMIT, STAT_KEYS, STAT_MAX, STAT_MIN, type ResourceKey, type StatKey } from "../stats.js";
import type { HiddenKey, NpcRole } from "../types.js";
import type { EngineContext } from "./context.js";
import { record, recordDelta } from "./record.js";

export { record } from "./record.js";

/** Сколько событий может ждать в очереди продолжения сюжета */
const MAX_SCHEDULED = 20;
/** Сколько отложенных последствий может ждать одновременно */
const MAX_CONSEQUENCES = 12;
const FACTION_LIMIT = 100;

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

export function changeSkill(ctx: EngineContext, id: string, delta: number): void {
  if (!findSkill(ctx.universe, id)) return;
  const skills = ctx.state.character.skills;
  const before = skills[id] ?? 0;
  const after = clamp(before + delta, 0, SKILL_MAX);
  if (after === before) return;
  skills[id] = after;
  recordDelta(ctx, "skill", before, after, id);
}

/** Талант проявляется: спящий становится известным, а если его не было — появляется */
export function gainTalent(ctx: EngineContext, id: string): void {
  const c = ctx.state.character;
  const hidden = ctx.state.hidden;
  if (c.talents.includes(id) || !findTalent(ctx.universe, id)) return;
  hidden.dormantTalents = hidden.dormantTalents.filter((talent) => talent !== id);
  c.talents.push(id);
  record(ctx, { kind: "talent", value: id });
}

export function awakenTalent(ctx: EngineContext): void {
  const id = ctx.state.hidden.dormantTalents[0];
  if (id !== undefined) gainTalent(ctx, id);
}

export function setWeakness(ctx: EngineContext, id: string, add: boolean): void {
  const weaknesses = ctx.state.character.weaknesses;
  const has = weaknesses.includes(id);
  if (add && !has && findWeakness(ctx.universe, id)) {
    weaknesses.push(id);
    record(ctx, { kind: "weakness", key: id, value: "gained" });
  }
  if (!add && has) {
    weaknesses.splice(weaknesses.indexOf(id), 1);
    record(ctx, { kind: "weakness", key: id, value: "overcome" });
  }
}

/** Отношение NPC роли меняется. Для «family» и «parent» — у каждого живого родственника */
export function changeAffinity(ctx: EngineContext, role: NpcRef, delta: number): void {
  const targets = role === "family" || role === "parent" ? livingWith(ctx.state, role) : livingWith(ctx.state, role).slice(0, 1);
  for (const npc of targets) {
    const applied = shiftAffinity(npc, delta);
    if (applied !== 0) record(ctx, { kind: "relation", key: npc.id, delta: applied });
  }
}

export function changeNpcAffinity(ctx: EngineContext, npcId: string, delta: number): void {
  const npc = ctx.state.npcs.find((n) => n.id === npcId);
  if (!npc?.alive) return;
  const applied = shiftAffinity(npc, delta);
  if (applied !== 0) record(ctx, { kind: "relation", key: npc.id, delta: applied });
}

export function meetNpc(ctx: EngineContext, role: NpcRole): void {
  if (!canAddRole(ctx.state, role)) return;
  const npc = createNpc(ctx, role);
  record(ctx, { kind: "npc", key: npc.id, value: "met" });
}

/** Самый близкий живой NPC роли from становится to: возлюбленный — супругом, супруг — бывшим */
function changeRole(ctx: EngineContext, from: NpcRole, to: NpcRole): void {
  const npc = livingWith(ctx.state, from)[0];
  if (!npc || !canAddRole(ctx.state, to)) return;
  npc.role = to;
  record(ctx, { kind: "npc", key: npc.id, value: to });
}

export function npcDies(ctx: EngineContext, npcId: string): void {
  const npc = ctx.state.npcs.find((n) => n.id === npcId);
  if (!npc?.alive) return;
  npc.alive = false;
  npc.diedAt = ctx.state.life.age;
  record(ctx, { kind: "npc", key: npc.id, value: "died" });
}

export function changeMeter(ctx: EngineContext, id: string, delta: number): void {
  const meter = ctx.universe.meters.find((m) => m.id === id);
  if (!meter) return;
  const meters = ctx.state.meters;
  const before = meters[id] ?? meter.initial;
  meters[id] = clamp(before + delta, meter.min, meter.max);
  recordDelta(ctx, "meter", before, meters[id], id);
}

export function changeFaction(ctx: EngineContext, id: string, delta: number): void {
  if (!ctx.universe.factions.some((f) => f.id === id)) return;
  const factions = ctx.state.character.factions;
  const before = factions[id] ?? 0;
  factions[id] = clamp(before + delta, -FACTION_LIMIT, FACTION_LIMIT);
  recordDelta(ctx, "faction", before, factions[id], id);
}

export function setSocialClass(ctx: EngineContext, id: string): void {
  const c = ctx.state.character;
  if (c.socialClassId === id || !ctx.universe.socialClasses.some((s) => s.id === id)) return;
  c.socialClassId = id;
  record(ctx, { kind: "class", value: id });
}

export function setProfession(ctx: EngineContext, id: string): void {
  const c = ctx.state.character;
  const profession = findProfession(ctx.universe, id);
  if (!profession || c.professionId === id) return;
  c.professionId = id;
  setFlag(ctx, "profession", true);
  record(ctx, { kind: "profession", value: id });
  changeSkill(ctx, profession.skill, 5);
}

/** Образование засчитывается, только если оно выше уже полученного */
export function setEducation(ctx: EngineContext, id: string): void {
  const c = ctx.state.character;
  const education = findEducation(ctx.universe, id);
  if (!education) return;
  const current = findEducation(ctx.universe, c.educationId);
  if (current && current.tier >= education.tier) return;
  c.educationId = id;
  record(ctx, { kind: "education", value: id });
  for (const skill of education.skills) changeSkill(ctx, skill, 10);
}

export function setSpecialization(ctx: EngineContext, id: string): void {
  const c = ctx.state.character;
  const specialization = ctx.universe.specializations.find((s) => s.id === id);
  if (!specialization || c.specializationId !== null) return;
  c.specializationId = id;
  record(ctx, { kind: "specialization", value: id });
  changeSkill(ctx, specialization.skill, 10);
}

export function reveal(ctx: EngineContext, key: HiddenKey): void {
  const hidden = ctx.state.hidden;
  if (hidden.revealed.includes(key)) return;
  if (key === "familySecret" && hidden.familySecret === null) return;
  hidden.revealed.push(key);
  record(ctx, { kind: "hidden", value: key });
  // Тайна рода меняет жизнь: её последствия наступают в момент, когда персонаж её узнаёт
  if (key === "familySecret") {
    const secret = ctx.universe.familySecrets.find((s) => s.id === hidden.familySecret);
    for (const effect of secret?.effects ?? []) applyEffect(ctx, effect);
  }
}

/** Отложенное последствие. Одно и то же последствие не ставится дважды */
export function scheduleConsequence(ctx: EngineContext, id: string, inYears: number): void {
  const list = ctx.state.consequences;
  if (list.length >= MAX_CONSEQUENCES || list.some((c) => c.id === id) || !ctx.universe.consequences.some((c) => c.id === id)) return;
  list.push({ id, age: ctx.state.life.age + Math.max(1, inYears), source: ctx.source ?? "" });
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
  ctx.state.consequences = [];
  ctx.state.quest = null;
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
    case "skill":
      return changeSkill(ctx, effect.id, effect.delta);
    case "talent":
      return gainTalent(ctx, effect.id);
    case "awakenTalent":
      return awakenTalent(ctx);
    case "weakness":
      return setWeakness(ctx, effect.id, effect.add);
    case "overcomeWeakness": {
      const first = c.weaknesses[0];
      if (first !== undefined) setWeakness(ctx, first, false);
      return;
    }
    case "npc":
      return meetNpc(ctx, effect.role);
    case "affinity":
      return changeAffinity(ctx, effect.role, effect.delta);
    case "npcRole":
      return changeRole(ctx, effect.from, effect.to);
    case "npcDies": {
      const npc = livingWith(ctx.state, effect.role)[0];
      if (npc) npcDies(ctx, npc.id);
      return;
    }
    case "npcSkill": {
      const npc = livingWith(ctx.state, effect.role)[0];
      if (npc?.skillId) changeSkill(ctx, npc.skillId, effect.delta);
      return;
    }
    case "meter":
      return changeMeter(ctx, effect.id, effect.delta);
    case "faction":
      return changeFaction(ctx, effect.id, effect.delta);
    case "socialClass":
      return setSocialClass(ctx, effect.id);
    case "profession":
      return setProfession(ctx, effect.id);
    case "education":
      return setEducation(ctx, effect.id);
    case "educationTier": {
      const education = ctx.universe.education.find((e) => e.tier === effect.tier);
      if (education) setEducation(ctx, education.id);
      return;
    }
    case "specialization":
      return setSpecialization(ctx, effect.id);
    case "later":
      return scheduleConsequence(ctx, effect.id, effect.inYears);
    case "reveal":
      return reveal(ctx, effect.key);
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

export { AFFINITY_LIMIT };
