import { isTrackReady, maxResources, MAX_LEVEL, nextRankThreshold, xpForLevel } from "../character/derived.js";
import { AFFINITY_LIMIT, canAddRole, createNpc, livingWith, shiftAffinity } from "../character/npcs.js";
import { canParent, chronicle, logNpc, markDeath, returnHome, setMissing } from "../family/events.js";
import { isKin, KinGraph, MIN_PARENT_AGE, selfSpouse } from "../family/kin.js";
import { t, type LocalizedText } from "../i18n.js";
import { addHealthCondition, cureHealthCondition, normalizeHealthState } from "../life/health.js";
import { lineageYear } from "../legacy/chronicle.js";
import type { Effect, NpcRef } from "../narrative/types.js";
import { findEducation, findProfession, findSkill, SKILL_MAX } from "../rpg/skills.js";
import { changeProsperity, changeStrain } from "../economy/region.js";
import { findTalent, findWeakness } from "../rpg/talents.js";
import { changeWorldInfluence, pushWorldActivity, newWorldState, settlementSeeds } from "../world/state.js";
import { findRelic } from "../legacy/stories.js";
import { clamp, KARMA_LIMIT, REPUTATION_LIMIT, STAT_KEYS, STAT_MAX, STAT_MIN, WEALTH_MAX, type ResourceKey, type StatKey } from "../stats.js";
import { SELF_ID, type DeathCauseId, type GameState, type HiddenKey, type NpcRole, type NpcState, type StoryProgress, type StoryScope } from "../types.js";
import type { EngineContext } from "./context.js";
import { record, recordDelta } from "./record.js";

export { record } from "./record.js";

/** Сколько событий может ждать в очереди продолжения сюжета */
const MAX_SCHEDULED = 20;
/** Сколько отложенных последствий может ждать одновременно */
const MAX_CONSEQUENCES = 12;
const FACTION_LIMIT = 100;
export const RENOWN_LIMIT = 100;
const MAX_THREADS = 10;
/** Штраф процветанию одного поселения от вражды рода */
const DYNASTY_FEUD_PENALTY = 5;

/** Нити рода, которые порождают запись об изменении отношения рода к фракции в хронике */
const FACTION_THREADS: readonly string[] = ["old-enemy", "family-feud", "betrayal"];

export function changeStat(ctx: EngineContext, stat: StatKey, delta: number): void {
  const stats = ctx.state.character.stats;
  const before = stats[stat];
  stats[stat] = clamp(before + delta, STAT_MIN, STAT_MAX);
  recordDelta(ctx, "stat", before, stats[stat], stat);
}

/** changeResource: health можно не переносить в длительное здоровье — так делает пассивный отдых года */
export function changeResource(ctx: EngineContext, resource: ResourceKey, delta: number, trackHealth = true): void {
  const c = ctx.state.character;
  const before = c.resources[resource];
  const max = maxResources(c)[resource];
  c.resources[resource] = clamp(before + delta, 0, max);
  if (resource === "health" && trackHealth && max > 0 && delta !== 0) {
    const health = normalizeHealthState(ctx.state);
    ctx.state.health = health;
    health.value = clamp(health.value + Math.round((delta / max) * 100), 0, 100);
  }
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

/** 75 — порог «самого близкого». Флаг один на жизнь: повтор не даёт вторую репутацию */
export const BOND_AT = 75;
export const BOND_FLAG = "bond";

function noteBond(ctx: EngineContext, npc: NpcState, before: number): void {
  if (before >= BOND_AT || npc.affinity < BOND_AT) return;
  if (!npc.log.some((entry) => entry.kind === "bond")) logNpc(ctx, npc, "bond");
  if (ctx.state.flags.includes(BOND_FLAG)) return;
  setFlag(ctx, BOND_FLAG, true);
  applyEffect(ctx, { type: "reputation", delta: 2 });
}

/** Отношение NPC роли меняется. Для «family» и «parent» — у каждого живого родственника */
export function changeAffinity(ctx: EngineContext, role: NpcRef, delta: number): void {
  const targets = role === "family" || role === "parent" ? livingWith(ctx.state, role) : livingWith(ctx.state, role).slice(0, 1);
  for (const npc of targets) {
    const before = npc.affinity;
    const applied = shiftAffinity(npc, delta);
    if (applied !== 0) record(ctx, { kind: "relation", key: npc.id, delta: applied });
    noteBond(ctx, npc, before);
  }
}

export function changeNpcAffinity(ctx: EngineContext, npcId: string, delta: number): void {
  const npc = ctx.state.npcs.find((n) => n.id === npcId);
  if (!npc?.alive) return;
  const before = npc.affinity;
  const applied = shiftAffinity(npc, delta);
  if (applied !== 0) record(ctx, { kind: "relation", key: npc.id, delta: applied });
  noteBond(ctx, npc, before);
}

/**
 * Новый человек. Супруг сразу связан браком с персонажем, ребёнок — родством с персонажем и его супругом.
 * Связи ставятся, только если они возможны: персонаж жив и свободен, родитель достаточно старше ребёнка
 */
export function meetNpc(ctx: EngineContext, role: NpcRole): void {
  if (!canAddRole(ctx.state, role)) return;
  if (role === "spouse" && selfSpouse(ctx.state)) return;
  const npc = createNpc(ctx, role);
  record(ctx, { kind: "npc", key: npc.id, value: "met" });
  if (role === "spouse") {
    npc.spouseId = SELF_ID;
    chronicle(ctx, "marriage", [SELF_ID, npc.id], {}, ctx.source ?? "event");
  }
  if (role === "child") {
    const spouse = selfSpouse(ctx.state);
    const parents = spouse ? [SELF_ID, spouse.id] : [SELF_ID];
    const graph = new KinGraph(ctx.state);
    if (canParent(ctx, parents, npc.bornAt, graph)) npc.parents = parents;
    else if (canParent(ctx, [SELF_ID], npc.bornAt, graph)) npc.parents = [SELF_ID];
    chronicle(ctx, "birth", [npc.id, ...npc.parents], {}, ctx.source ?? "event");
  }
}

/** Самый близкий живой NPC роли from становится to: возлюбленный — супругом, супруг — бывшим. Брак и развод меняют и связи */
function changeRole(ctx: EngineContext, from: NpcRole, to: NpcRole): void {
  const npc = livingWith(ctx.state, from)[0];
  if (!npc || !canAddRole(ctx.state, to)) return;
  if (to === "spouse" && (selfSpouse(ctx.state) || npc.spouseId !== null)) return;
  npc.role = to;
  record(ctx, { kind: "npc", key: npc.id, value: to });
  if (to === "spouse") {
    npc.spouseId = SELF_ID;
    chronicle(ctx, "marriage", [SELF_ID, npc.id], {}, ctx.source ?? "event");
  }
  if (from === "spouse" && npc.spouseId === SELF_ID) {
    npc.spouseId = null;
    if (!npc.formerSpouses.includes(SELF_ID)) npc.formerSpouses.push(SELF_ID);
    chronicle(ctx, "divorce", [SELF_ID, npc.id], {}, ctx.source ?? "event");
  }
}

export function npcDies(ctx: EngineContext, npcId: string, cause: DeathCauseId = "event"): void {
  const npc = ctx.state.npcs.find((n) => n.id === npcId);
  if (!npc?.alive) return;
  markDeath(ctx, npc, cause);
}

/** Слава рода: от -100 (позор) до 100 */
export function changeRenown(ctx: EngineContext, delta: number): void {
  const lineage = ctx.state.lineage;
  const before = lineage.renown;
  lineage.renown = clamp(before + delta, -RENOWN_LIMIT, RENOWN_LIMIT);
  recordDelta(ctx, "renown", before, lineage.renown);
}

/** Нить рода: долг, враг, тайна. Каждая — одна; нитей не больше MAX_THREADS */
export function setThread(ctx: EngineContext, id: string, add: boolean): void {
  const lineage = ctx.state.lineage;
  const index = lineage.threads.findIndex((thread) => thread.id === id);
  if (add && index === -1 && lineage.threads.length < MAX_THREADS) {
    lineage.threads.push({ id, year: lineageYear(ctx.state), gen: lineage.generation, src: ctx.source ?? "" });
    record(ctx, { kind: "thread", key: id, value: "added" });
    // Негативная нить рода — веха в хронике рода (фиксируется один раз, при добавлении)
    if (FACTION_THREADS.includes(id)) {
      chronicle(ctx, "faction", [SELF_ID], { thread: id }, id);
      // Stage 09: вражда рода ослабляет процветание одного поселения
      const world = ctx.state.world ?? newWorldState(ctx.universe);
      const settlement = world.settlements[0];
      if (!settlement) return;
      const before = settlement.prosperity;
      settlement.prosperity = clamp(settlement.prosperity - DYNASTY_FEUD_PENALTY, 0, 100);
      if (settlement.prosperity !== before) {
        const seeds = settlementSeeds(ctx.universe);
        const name = seeds.find((s) => s.id === settlement.id)?.name ?? { ru: settlement.id, en: settlement.id };
        pushWorldActivity(
          ctx,
          "settlement",
          `dynasty-feud.${settlement.id}`,
          t("Вражда рода ослабляет поселение", "A family feud weakens a settlement"),
          t(`${name.ru} теряет часть достатка из-за вражды рода.`, `${name.en} loses some prosperity due to the family feud.`)
        );
      }
    }
  }
  if (!add && index !== -1) {
    lineage.threads.splice(index, 1);
    record(ctx, { kind: "thread", key: id, value: "closed" });
  }
}

/** Stage 04.5.1: изменение реального состояния поселения из сюжетного выбора. Неизвестное поселение — тихий no-op */
export function changeSettlement(ctx: EngineContext, id: string, prosperity = 0, stability = 0): void {
  const world = ctx.state.world ?? newWorldState(ctx.universe);
  ctx.state.world = world;
  const settlement = world.settlements.find((item) => item.id === id);
  if (!settlement) return;
  const beforeProsperity = settlement.prosperity;
  const beforeStability = settlement.stability;
  settlement.prosperity = clamp(settlement.prosperity + prosperity, 0, 100);
  settlement.stability = clamp(settlement.stability + stability, 0, 100);
  if (settlement.prosperity === beforeProsperity && settlement.stability === beforeStability) return;
  const name = settlementSeeds(ctx.universe).find((item) => item.id === id)?.name ?? t(id, id);
  const improved = settlement.prosperity >= beforeProsperity && settlement.stability >= beforeStability;
  pushWorldActivity(
    ctx,
    "settlement",
    `narrative.${id}`,
    improved ? t("Поселение получает помощь", "A settlement receives aid") : t("Беды ослабляют поселение", "Hardship weakens a settlement"),
    improved
      ? t(`${name.ru} чувствует поддержку рода.`, `${name.en} feels the dynasty's support.`)
      : t(`Дела в ${name.ru} идут хуже.`, `Affairs in ${name.en} grow worse.`)
  );
}

/** Последствие для рода: живёт в роду, а не в жизни персонажа, и не пропадает с его смертью */
export function scheduleLineage(ctx: EngineContext, id: string, inYears: number): void {
  const pending = ctx.state.lineage.pending;
  if (pending.length >= MAX_CONSEQUENCES || pending.some((p) => p.id === id)) return;
  pending.push({ id, year: lineageYear(ctx.state) + Math.max(1, inYears), src: ctx.source ?? "", entry: null });
}

/** Сословие на ступень выше или ниже, если такая ступень есть в мире */
function stepClass(ctx: EngineContext, delta: 1 | -1): void {
  const classes = ctx.universe.socialClasses;
  const standing = classes.find((c) => c.id === ctx.state.character.socialClassId)?.standing ?? 0;
  const next = classes.filter((c) => c.standing === standing + delta)[0];
  if (next) setSocialClass(ctx, next.id);
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
  // Причина смерти дублируется в модели здоровья: панель и итог жизни не расходятся
  const health = normalizeHealthState(ctx.state);
  ctx.state.health = health;
  health.deathCause = cause;
  ctx.state.character.resources.health = 0;
  ctx.state.pending = null;
  ctx.state.scheduled = [];
  ctx.state.consequences = [];
  ctx.state.quest = null;
  // Брака с умершим не бывает: супруг становится вдовцом. Последствия для рода (lineage.pending) остаются
  const spouse = selfSpouse(ctx.state);
  if (spouse) {
    spouse.spouseId = null;
    if (!spouse.formerSpouses.includes(SELF_ID)) spouse.formerSpouses.push(SELF_ID);
    spouse.log.push({ at: life.age, kind: "widowed", value: SELF_ID });
  }
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
      c.wealth = clamp(before + effect.delta, 0, WEALTH_MAX);
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
      if (npc) npcDies(ctx, npc.id, "event");
      return;
    }
    case "npcSkill": {
      const npc = livingWith(ctx.state, effect.role)[0];
      if (npc?.skillId) changeSkill(ctx, npc.skillId, effect.delta);
      return;
    }
    case "meter":
      return changeMeter(ctx, effect.id, effect.delta);
    case "strain":
      changeStrain(ctx.state, effect.delta);
      return;
    case "prosperity":
      changeProsperity(ctx.state, effect.delta);
      return;
    case "settlement":
      changeSettlement(ctx, effect.id, effect.prosperity, effect.stability);
      return;
    case "influence":
      changeWorldInfluence(ctx, effect.kind, effect.id, effect.delta);
      return;
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
    case "renown":
      return changeRenown(ctx, effect.delta);
    case "thread":
      return setThread(ctx, effect.id, effect.add);
    case "lineageLater":
      return scheduleLineage(ctx, effect.id, effect.inYears);
    case "kinReturns": {
      const npc = ctx.state.npcs.find((n) => n.alive && n.status === "missing" && isKin(n));
      if (npc) returnHome(ctx, npc);
      return;
    }
    case "kinMissing": {
      const npc = livingWith(ctx.state, effect.role)[0];
      if (npc) setMissing(ctx, npc);
      return;
    }
    case "classStep":
      return stepClass(ctx, effect.delta);
    case "adopt":
      return adoptChild(ctx);
    case "relic":
      return applyRelic(ctx, effect);
    case "advanceStory":
      return advanceStoryEffect(ctx, effect.id, effect.expectedStage, effect.nextStage, effect.scope);
    case "recordStoryChoice":
      return recordStoryChoiceEffect(ctx, effect.id, effect.eventId, effect.choiceId, effect.scope);
    case "completeStory":
      return completeStoryEffect(ctx, effect.id, effect.scope);
    case "condition":
      return addHealthCondition(ctx, effect.id, { severity: effect.severity, duration: effect.duration });
    case "cure":
      return cureHealthCondition(ctx, effect.id);
  }
}

export function applyRelic(ctx: EngineContext, effect: { type: "relic"; id: string }): void {
  const lineage = ctx.state.lineage;
  const relicDef = findRelic(effect.id);
  if (!relicDef) return; // Unknown relic id: do not create malformed state
  if (!lineage.relics) lineage.relics = [];
  if (lineage.relics.some((r) => r.id === effect.id)) return; // Already owned: dedup
  lineage.relics.push({
    id: effect.id,
    name: relicDef.name,
    description: relicDef.description,
    acquiredGen: lineage.generation,
    acquiredAge: ctx.state.life.age,
    source: ctx.source ?? effect.id
  });
  // Apply the relic's configured gameplay effect exactly once at acquisition
  for (const eff of relicDef.effects) applyEffect(ctx, eff);
  chronicle(ctx, "relic", [SELF_ID], { relic: effect.id }, effect.id);
}

/** Прогресс сюжета в области действия: отсутствующий сюжет начинается с этапа 0. */
export function getStoryProgress(state: GameState, id: string, scope: StoryScope): StoryProgress {
  const store = scope === "lineage" ? state.lineage.storyProgress : state.character.storyProgress;
  const current = store?.[id];
  if (current) return current;
  return { stage: 0, completed: false, choices: {} };
}

/** Сохраняет прогресс сюжета в области действия. */
function setStoryProgress(state: GameState, id: string, scope: StoryScope, progress: StoryProgress): void {
  if (scope === "lineage") {
    if (!state.lineage.storyProgress) state.lineage.storyProgress = {};
    state.lineage.storyProgress[id] = progress;
  } else {
    if (!state.character.storyProgress) state.character.storyProgress = {};
    state.character.storyProgress[id] = progress;
  }
}

/** Страховый этап сюжета: продвигается только если не завершён, текущий этап равен ожидаемому и следующий этап позже текущего. */
function advanceStoryEffect(ctx: EngineContext, id: string, expectedStage: number, nextStage: number, scope: StoryScope): void {
  const progress = getStoryProgress(ctx.state, id, scope);
  if (progress.completed) return;
  if (progress.stage !== expectedStage) return;
  if (nextStage <= progress.stage) return;
  progress.stage = nextStage;
  setStoryProgress(ctx.state, id, scope, progress);
  chronicle(ctx, "story", [SELF_ID], { story: id, stage: String(nextStage), scope }, `story.${id}`, null);
}

/** Записывает выбор варианта в событии сюжета. */
function recordStoryChoiceEffect(ctx: EngineContext, id: string, eventId: string, choiceId: string, scope: StoryScope): void {
  const progress = getStoryProgress(ctx.state, id, scope);
  progress.choices[eventId] = choiceId;
  setStoryProgress(ctx.state, id, scope, progress);
  chronicle(ctx, "story", [SELF_ID], { story: id, event: eventId, choice: choiceId, scope }, `story.${id}`, null);
}

/** Завершает сюжет: дальнейшее продвижение невозможно. */
function completeStoryEffect(ctx: EngineContext, id: string, scope: StoryScope): void {
  const progress = getStoryProgress(ctx.state, id, scope);
  progress.completed = true;
  setStoryProgress(ctx.state, id, scope, progress);
  chronicle(ctx, "story", [SELF_ID], { story: id, completed: "1", scope }, `story.${id}`, null);
}

/**
 * Приёмный ребёнок 3–10 лет. Родители — персонаж и его супруг, если по возрасту это возможно.
 * Ребёнок младше персонажа хотя бы на MIN_PARENT_AGE: иначе он остался бы без родителей, то есть вне рода и без права наследовать
 */
function adoptChild(ctx: EngineContext): void {
  if (!canAddRole(ctx.state, "child") || ctx.state.life.age < 20) return;
  const oldest = Math.min(10, ctx.state.life.age - MIN_PARENT_AGE);
  const npc = createNpc(ctx, "child", { age: ctx.rng.int(3, oldest), affinity: ctx.rng.int(35, 55) });
  npc.adopted = true;
  record(ctx, { kind: "npc", key: npc.id, value: "met" });
  const spouse = selfSpouse(ctx.state);
  const graph = new KinGraph(ctx.state);
  const parents = spouse && canParent(ctx, [SELF_ID, spouse.id], npc.bornAt, graph) ? [SELF_ID, spouse.id] : [SELF_ID];
  if (canParent(ctx, parents, npc.bornAt, graph)) npc.parents = parents;
  chronicle(ctx, "adoption", [npc.id, ...npc.parents], {}, ctx.source ?? "event");
}

export function applyEffects(ctx: EngineContext, effects: readonly Effect[]): void {
  for (const effect of effects) {
    if (!ctx.state.life.alive) return;
    applyEffect(ctx, effect);
  }
  clampResources(ctx);
}

/** Умер ли персонаж от ран или истощения после действия */
export function isFatal(ctx: EngineContext): boolean {
  if (!ctx.state.life.alive) return false;
  const health = normalizeHealthState(ctx.state);
  ctx.state.health = health;
  return ctx.state.character.resources.health <= 0 || health.value <= 0;
}

export { AFFINITY_LIMIT };
