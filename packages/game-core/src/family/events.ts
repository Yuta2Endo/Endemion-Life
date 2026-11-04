// Что происходит с людьми рода: смерть, брак, развод, рождение, усыновление, исчезновение и возвращение.
// Здесь же роли родни вычисляются из связей родства, а наследство умершего NPC делится по закону мира.
// Эти операции вызывают и события (engine/effects.ts), и собственная жизнь NPC (character/npc-life.ts)
import { recordDelta, record } from "../engine/record.js";
import type { EngineContext } from "../engine/context.js";
import { addChronicle, rememberName } from "../legacy/chronicle.js";
import { lawOf } from "../legacy/laws.js";
import { SELF_ID, type ChronicleKind, type DeathCauseId, type NpcLogKind, type NpcRole, type NpcState } from "../types.js";
import { isKin, isPresent, KinGraph, MIN_PARENT_AGE, type KinRelation } from "./kin.js";

export { isKin };

/** Сколько записей журнала хранит один NPC */
const MAX_LOG = 12;

/** Близкая родня: их рождения, браки и смерти попадают в хронику жизни, а не только в хронику рода */
export const CLOSE_KIN: readonly NpcRole[] = ["father", "mother", "sibling", "grandparent", "spouse", "child", "grandchild"];

export function logNpc(ctx: EngineContext, npc: NpcState, kind: NpcLogKind, value?: string): void {
  npc.log.push(value === undefined ? { at: ctx.state.life.age, kind } : { at: ctx.state.life.age, kind, value });
  if (npc.log.length > MAX_LOG) npc.log.splice(0, npc.log.length - MAX_LOG);
}

/** Имя для хроники: у персонажа — его имя, у NPC — имя из карточки или архива рода */
export function nameOf(ctx: EngineContext, id: string): string {
  if (id === SELF_ID) return ctx.state.character.name;
  return ctx.state.npcs.find((npc) => npc.id === id)?.name ?? ctx.state.lineage.names[id] ?? "?";
}

function genderOf(ctx: EngineContext, id: string): "f" | "m" {
  const gender = id === SELF_ID ? ctx.state.character.gender : ctx.state.npcs.find((npc) => npc.id === id)?.gender;
  return gender === "female" ? "f" : "m";
}

/** Запись хроники рода с именами и полом участников (n0/g0, n1/g1…) */
export function chronicle(ctx: EngineContext, kind: ChronicleKind, who: string[], extra: Record<string, string | number> = {}, src = "npc", link: number | null = null): number {
  const v: Record<string, string | number> = { ...extra };
  who.forEach((id, i) => {
    v[`n${i}`] = nameOf(ctx, id);
    v[`g${i}`] = genderOf(ctx, id);
  });
  return addChronicle(ctx.state, kind, who, v, src, { link });
}

/** Роль NPC по родству с персонажем. null — не родня: роль остаётся прежней (друг, соперник, наставник…) */
export function roleFromRelation(relation: KinRelation | null, npc: NpcState): NpcRole | null {
  switch (relation) {
    case "parent":
      return npc.gender === "female" ? "mother" : "father";
    case "child":
      return "child";
    case "sibling":
      return "sibling";
    case "grandparent":
      return "grandparent";
    case "grandchild":
      return "grandchild";
    case "pibling":
      return "pibling";
    case "nibling":
      return "nibling";
    case "cousin":
      return "cousin";
    case "ancestor":
    case "descendant":
    case "blood":
      return "relative";
    case "spouse":
      return "spouse";
    case "former-spouse":
      return "ex-partner";
    case "in-law":
      return "in-law";
    case null:
      return null;
  }
}

/**
 * Ставит NPC роль по его родству с персонажем. null — не родня: роль остаётся прежней.
 * Роль «отец» или «мать» возможна только у тех, кто записан в selfParents, поэтому родителей не больше двух
 */
export function assignKinRole(graph: KinGraph, npc: NpcState): void {
  const role = roleFromRelation(graph.relation(SELF_ID, npc.id), npc);
  if (role !== null) npc.role = role;
}

/** Делит деньги умершего NPC по закону мира: сбор, доля супруга, остальное детям. Персонаж-наследник получает свою долю золотом */
function distributeEstate(ctx: EngineContext, graph: KinGraph, npc: NpcState): void {
  if (npc.wealth <= 0) return;
  const law = lawOf(ctx.universe.id);
  let rest = npc.wealth - Math.round(npc.wealth * law.levy);
  const spouseId = npc.spouseId;
  const spouse = spouseId && spouseId !== SELF_ID ? ctx.state.npcs.find((n) => n.id === spouseId && n.alive) : undefined;
  const selfSpouse = spouseId === SELF_ID && ctx.state.life.alive;
  const spouseShare = spouse || selfSpouse ? Math.round(rest * law.spouseShare) : 0;
  rest -= spouseShare;
  if (spouse) spouse.wealth += spouseShare;
  const heirs = graph.childrenOf(npc.id).filter((id) => id === SELF_ID ? ctx.state.life.alive : ctx.state.npcs.some((n) => n.id === id && n.alive));
  let selfGets = selfSpouse ? spouseShare : 0;
  if (heirs.length > 0 && rest > 0) {
    // Старший наследник получает долю по закону первородства, остальные — поровну
    const eldest = law.order === "eldest" || law.order === "merit" ? heirs[0]! : null;
    const eldestShare = eldest && heirs.length > 1 ? Math.round(rest * law.heirShare) : 0;
    const per = Math.floor((rest - eldestShare) / heirs.length);
    for (const id of heirs) {
      const amount = per + (id === eldest ? eldestShare : 0);
      if (id === SELF_ID) selfGets += amount;
      else {
        const heir = ctx.state.npcs.find((n) => n.id === id);
        if (heir) heir.wealth += amount;
      }
    }
  }
  npc.wealth = 0;
  if (selfGets > 0) {
    const c = ctx.state.character;
    const before = c.wealth;
    c.wealth += selfGets;
    recordDelta(ctx, "wealth", before, c.wealth);
    chronicle(ctx, "inheritance", [npc.id, SELF_ID], { sum: selfGets, law: law.id });
  }
}

/**
 * Смерть NPC: он больше ничего не делает, связи остаются. Супруг становится вдовцом, наследство делится,
 * смерть родни записывается в хронику рода
 */
export function markDeath(ctx: EngineContext, npc: NpcState, cause: DeathCauseId, graph?: KinGraph): void {
  if (!npc.alive) return;
  npc.alive = false;
  npc.status = "deceased";
  npc.cause = cause;
  npc.diedAt = ctx.state.life.age;
  record(ctx, { kind: "npc", key: npc.id, value: "died" });
  const kin = graph ?? new KinGraph(ctx.state);
  if (npc.spouseId && npc.spouseId !== SELF_ID) {
    const spouse = ctx.state.npcs.find((n) => n.id === npc.spouseId);
    if (spouse?.alive && spouse.spouseId === npc.id) {
      spouse.spouseId = null;
      if (!spouse.formerSpouses.includes(npc.id)) spouse.formerSpouses.push(npc.id);
      logNpc(ctx, spouse, "widowed", npc.id);
    }
  }
  if (isKin(npc)) chronicle(ctx, cause === "battle" || cause === "accident" || cause === "world" ? "tragedy" : "death", [npc.id], { cause, role: npc.role, age: ctx.state.life.age - npc.bornAt });
  distributeEstate(ctx, kin, npc);
}

/** Брак между двумя NPC или NPC и персонажем. Проверки (живы, свободны, не кровная родня) — на вызывающей стороне */
export function marry(ctx: EngineContext, a: NpcState, bId: string): void {
  a.spouseId = bId;
  if (bId !== SELF_ID) {
    const b = ctx.state.npcs.find((n) => n.id === bId);
    if (b) {
      b.spouseId = a.id;
      logNpc(ctx, b, "married", a.id);
    }
  }
  logNpc(ctx, a, "married", bId);
  chronicle(ctx, "marriage", [a.id, bId]);
}

export function divorce(ctx: EngineContext, a: NpcState, b: NpcState): void {
  a.spouseId = null;
  b.spouseId = null;
  if (!a.formerSpouses.includes(b.id)) a.formerSpouses.push(b.id);
  if (!b.formerSpouses.includes(a.id)) b.formerSpouses.push(a.id);
  logNpc(ctx, a, "divorced", b.id);
  logNpc(ctx, b, "divorced", a.id);
  if (isKin(a) || isKin(b)) chronicle(ctx, "divorce", [a.id, b.id]);
}

/** Можно ли записать этих людей родителями ребёнка, родившегося в год bornAt */
export function canParent(ctx: EngineContext, parentIds: readonly string[], bornAt: number, graph: KinGraph): boolean {
  return parentIds.every((id) => {
    const born = id === SELF_ID ? 0 : ctx.state.npcs.find((n) => n.id === id)?.bornAt;
    return born !== undefined && bornAt - born >= MIN_PARENT_AGE && graph.has(id);
  });
}

/** Пропал без вести: жив, но больше не появляется. Может вернуться */
export function setMissing(ctx: EngineContext, npc: NpcState): void {
  if (!isPresent(npc)) return;
  npc.status = "missing";
  logNpc(ctx, npc, "missing");
  record(ctx, { kind: "npc", key: npc.id, value: "missing" });
  if (isKin(npc)) chronicle(ctx, "missing", [npc.id], { role: npc.role });
}

export function returnHome(ctx: EngineContext, npc: NpcState): void {
  if (npc.status !== "missing" || !npc.alive) return;
  npc.status = "alive";
  logNpc(ctx, npc, "returned");
  record(ctx, { kind: "npc", key: npc.id, value: "returned" });
  if (isKin(npc)) chronicle(ctx, "return", [npc.id], { role: npc.role });
}

/** Убирает из сохранения умерших, о которых никто не помнит: не предки, не дети, не супруги, не сыгранные жизни */
export function archiveForgotten(ctx: EngineContext, limit: number): void {
  const state = ctx.state;
  if (state.npcs.length <= limit) return;
  const referenced = new Set<string>([...state.lineage.selfParents]);
  for (const npc of state.npcs) {
    for (const parent of npc.parents) referenced.add(parent);
    if (npc.alive && npc.spouseId) referenced.add(npc.spouseId);
    if (npc.alive) for (const former of npc.formerSpouses) referenced.add(former);
  }
  const removable = state.npcs
    .filter((npc) => !npc.alive && npc.lifeGen === null && !referenced.has(npc.id) && npc.status === "deceased")
    .sort((a, b) => (a.diedAt ?? 0) - (b.diedAt ?? 0) || a.id.localeCompare(b.id));
  const remove = new Set(removable.slice(0, state.npcs.length - limit).map((npc) => npc.id));
  for (const npc of state.npcs) if (remove.has(npc.id)) rememberName(state.lineage, npc.id, npc.name);
  state.npcs = state.npcs.filter((npc) => !remove.has(npc.id));
  // Бывшие супруги, ушедшие в архив, остаются только в журнале
  for (const npc of state.npcs) npc.formerSpouses = npc.formerSpouses.filter((id) => !remove.has(id));
  for (const npc of state.npcs) if (npc.spouseId && remove.has(npc.spouseId)) npc.spouseId = null;
}
