// Родство по id. Хранятся только два вида связей: родители (parents) и супруг (spouseId, formerSpouses).
// Братья, бабушки, внуки, дяди и двоюродные вычисляются здесь из этих связей и нигде не дублируются
import { SELF_ID, type GameState, type NpcState } from "../types.js";

/** Родитель старше ребёнка хотя бы на столько лет */
export const MIN_PARENT_AGE = 12;
export const MIN_MARRIAGE_AGE = 16;
/** Глубина поиска предков: дальше родство не считается и циклы не ищутся бесконечно */
const MAX_DEPTH = 12;

export type KinRelation =
  | "parent"
  | "child"
  | "sibling"
  | "grandparent"
  | "grandchild"
  | "ancestor"
  | "descendant"
  | "pibling"
  | "nibling"
  | "cousin"
  | "blood"
  | "spouse"
  | "former-spouse"
  | "in-law";

/** Кровное родство: из него выбирают наследника, между ним нельзя жениться */
export const BLOOD_RELATIONS: readonly KinRelation[] = ["parent", "child", "sibling", "grandparent", "grandchild", "ancestor", "descendant", "pibling", "nibling", "cousin", "blood"];

interface KinNode {
  id: string;
  bornAt: number;
  parents: readonly string[];
  spouseId: string | null;
  formerSpouses: readonly string[];
}

/** Не родня: эти роли — отношение к персонажу, а не родство */
const NON_KIN_ROLES = new Set(["friend", "rival", "mentor", "teacher", "partner", "ex-partner", "acquaintance"]);

/** Родня персонажа по роли: кровь, супруг или родня по браку */
export function isKin(npc: Pick<NpcState, "role">): boolean {
  return !NON_KIN_ROLES.has(npc.role);
}

/** Жив ли NPC и рядом ли он: пропавший жив, но действовать не может */
export function isPresent(npc: NpcState): boolean {
  return npc.alive && (npc.status === "alive" || npc.status === "retired");
}

/** Нынешний супруг персонажа: живой NPC, у которого spouseId — персонаж */
export function selfSpouse(state: GameState): NpcState | undefined {
  return state.npcs.find((npc) => npc.alive && npc.spouseId === SELF_ID);
}

/** Граф родства одного состояния. Строится за один проход; после изменения связей граф нужно построить заново или дополнить add() */
export class KinGraph {
  private readonly nodes = new Map<string, KinNode>();
  private readonly kids = new Map<string, string[]>();

  constructor(private readonly state: GameState) {
    const spouse = selfSpouse(state);
    this.add({ id: SELF_ID, bornAt: 0, parents: state.lineage.selfParents, spouseId: spouse?.id ?? null, formerSpouses: [] });
    for (const npc of state.npcs) this.add(npc);
  }

  add(node: KinNode): void {
    this.nodes.set(node.id, node);
    for (const parent of node.parents) {
      const list = this.kids.get(parent) ?? [];
      if (!list.includes(node.id)) list.push(node.id);
      this.kids.set(parent, list);
    }
  }

  has(id: string): boolean {
    return this.nodes.has(id);
  }

  bornAt(id: string): number | undefined {
    return this.nodes.get(id)?.bornAt;
  }

  parentsOf(id: string): readonly string[] {
    return this.nodes.get(id)?.parents ?? [];
  }

  /** Дети от старшего к младшему */
  childrenOf(id: string): string[] {
    return [...(this.kids.get(id) ?? [])].sort((a, b) => (this.bornAt(a) ?? 0) - (this.bornAt(b) ?? 0) || compareIds(a, b));
  }

  /** Братья и сёстры: хотя бы один общий родитель */
  siblingsOf(id: string): string[] {
    const result = new Set<string>();
    for (const parent of this.parentsOf(id)) for (const child of this.kids.get(parent) ?? []) if (child !== id) result.add(child);
    return [...result].sort(compareIds);
  }

  /** Супруг: связь хранится у обоих (у персонажа — на стороне NPC, она подставлена в узел SELF_ID) */
  spouseOf(id: string): string | null {
    return this.nodes.get(id)?.spouseId ?? null;
  }

  /** Предки с глубиной: сам человек — 0, родители — 1, бабушки и дедушки — 2 */
  ancestorDepths(id: string): Map<string, number> {
    const depths = new Map<string, number>([[id, 0]]);
    let frontier = [id];
    for (let depth = 1; depth <= MAX_DEPTH && frontier.length > 0; depth++) {
      const next: string[] = [];
      for (const current of frontier) {
        for (const parent of this.parentsOf(current)) {
          if (depths.has(parent)) continue;
          depths.set(parent, depth);
          next.push(parent);
        }
      }
      frontier = next;
    }
    return depths;
  }

  /** Потомки до глубины depth */
  descendants(id: string, depth = MAX_DEPTH): Set<string> {
    const result = new Set<string>();
    let frontier = [id];
    for (let level = 0; level < depth && frontier.length > 0; level++) {
      const next: string[] = [];
      for (const current of frontier) {
        for (const child of this.kids.get(current) ?? []) {
          if (result.has(child) || child === id) continue;
          result.add(child);
          next.push(child);
        }
      }
      frontier = next;
    }
    return result;
  }

  /** Кровное родство: кем to приходится from */
  bloodRelation(from: string, to: string): KinRelation | null {
    if (from === to) return null;
    const up = this.ancestorDepths(from);
    const asAncestor = up.get(to);
    if (asAncestor !== undefined) return asAncestor === 1 ? "parent" : asAncestor === 2 ? "grandparent" : "ancestor";
    const down = this.ancestorDepths(to);
    const asDescendant = down.get(from);
    if (asDescendant !== undefined) return asDescendant === 1 ? "child" : asDescendant === 2 ? "grandchild" : "descendant";
    let best: [number, number] | null = null;
    for (const [id, df] of up) {
      if (df === 0) continue;
      const dt = down.get(id);
      if (dt === undefined || dt === 0) continue;
      if (!best || df + dt < best[0] + best[1]) best = [df, dt];
    }
    if (!best) return null;
    const [df, dt] = best;
    if (df === 1 && dt === 1) return "sibling";
    if (df === 2 && dt === 1) return "pibling";
    if (df === 1 && dt === 2) return "nibling";
    if (df === 2 && dt === 2) return "cousin";
    return "blood";
  }

  /** Кем to приходится from: кровь, супруг, бывший супруг или родня по браку */
  relation(from: string, to: string): KinRelation | null {
    const blood = this.bloodRelation(from, to);
    if (blood) return blood;
    const a = this.nodes.get(from);
    const b = this.nodes.get(to);
    if (!a || !b) return null;
    if (a.spouseId === to || b.spouseId === from) return "spouse";
    if (a.formerSpouses.includes(to) || b.formerSpouses.includes(from)) return "former-spouse";
    const near = (x: string, y: string) => {
      const relation = this.bloodRelation(x, y);
      return relation === "parent" || relation === "child" || relation === "sibling" || relation === "grandparent" || relation === "grandchild";
    };
    const toSpouse = this.spouseOf(to);
    if (toSpouse && toSpouse !== from && near(from, toSpouse)) return "in-law";
    const fromSpouse = this.spouseOf(from);
    if (fromSpouse && fromSpouse !== to && near(fromSpouse, to)) return "in-law";
    return null;
  }

  isBlood(from: string, to: string): boolean {
    return this.bloodRelation(from, to) !== null;
  }

  /** Брак между ними запрещён: кровные родственники до двоюродных включительно */
  tooClose(a: string, b: string): boolean {
    const relation = this.bloodRelation(a, b);
    return relation !== null && relation !== "blood";
  }

  /** Стал бы parent потомком самого себя, если записать его родителем child */
  wouldCycle(child: string, parent: string): boolean {
    return child === parent || this.ancestorDepths(parent).has(child);
  }

  get people(): readonly string[] {
    return [...this.nodes.keys()];
  }

  /** Состояние, по которому построен граф */
  get source(): GameState {
    return this.state;
  }
}

/** n2 < n10: числовой порядок id, чтобы обработка шла стабильно */
export function compareIds(a: string, b: string): number {
  const na = Number.parseInt(a.slice(1), 10);
  const nb = Number.parseInt(b.slice(1), 10);
  if (Number.isFinite(na) && Number.isFinite(nb) && na !== nb) return na - nb;
  return a.localeCompare(b);
}

/**
 * Что не так с родством в состоянии. null — всё в порядке. Проверяет то, чего не может быть:
 * больше двух родителей, родитель младше ребёнка, циклы, брак с умершим, повторы связей
 */
export function kinProblem(state: GameState): string | null {
  const byId = new Map(state.npcs.map((npc) => [npc.id, npc]));
  const exists = (id: string) => id === SELF_ID || byId.has(id);
  const born = (id: string) => (id === SELF_ID ? 0 : (byId.get(id)?.bornAt ?? 0));

  const people: { id: string; parents: readonly string[] }[] = [{ id: SELF_ID, parents: state.lineage.selfParents }, ...state.npcs];
  for (const person of people) {
    if (person.parents.length > 2) return `${person.id}: больше двух родителей`;
    if (new Set(person.parents).size !== person.parents.length) return `${person.id}: родитель записан дважды`;
    for (const parent of person.parents) {
      if (!exists(parent)) return `${person.id}: нет родителя ${parent}`;
      if (parent === person.id) return `${person.id}: сам себе родитель`;
      if (born(parent) > born(person.id) - MIN_PARENT_AGE) return `${person.id}: родитель ${parent} младше, чем нужно`;
    }
  }

  // Цикл в родословной: обход в глубину по связям «родитель»
  const color = new Map<string, 1 | 2>();
  const parentsOf = (id: string) => (id === SELF_ID ? state.lineage.selfParents : (byId.get(id)?.parents ?? []));
  const visit = (id: string): boolean => {
    const mark = color.get(id);
    if (mark === 1) return true;
    if (mark === 2) return false;
    color.set(id, 1);
    for (const parent of parentsOf(id)) if (visit(parent)) return true;
    color.set(id, 2);
    return false;
  };
  for (const person of people) if (visit(person.id)) return `${person.id}: цикл в родословной`;

  let selfSpouses = 0;
  for (const npc of state.npcs) {
    if (new Set(npc.formerSpouses).size !== npc.formerSpouses.length) return `${npc.id}: бывший супруг записан дважды`;
    for (const former of npc.formerSpouses) if (!exists(former) || former === npc.id) return `${npc.id}: нет бывшего супруга ${former}`;
    if (npc.spouseId === null) continue;
    if (npc.spouseId === npc.id || !exists(npc.spouseId)) return `${npc.id}: нет супруга ${npc.spouseId}`;
    if (npc.formerSpouses.includes(npc.spouseId)) return `${npc.id}: супруг и бывший одновременно`;
    // Умерший помнит, с кем был в браке. Живой не может состоять в браке с умершим
    if (!npc.alive && npc.status !== "missing") continue;
    if (npc.spouseId === SELF_ID) {
      if (!state.life.alive) return `${npc.id}: брак с умершим персонажем`;
      selfSpouses += 1;
      continue;
    }
    const spouse = byId.get(npc.spouseId)!;
    if (!spouse.alive && spouse.status !== "missing") return `${npc.id}: брак с умершим ${spouse.id}`;
    if (spouse.spouseId !== npc.id) return `${npc.id}: брак не взаимный`;
  }
  if (selfSpouses > 1) return "у персонажа больше одного супруга";
  return null;
}
