// Люди в жизни персонажа: семья, друзья, соперники, наставники, возлюбленные и дети.
// Каждый NPC создаётся из Rng жизни, поэтому один seed и одни решения дают тех же людей
import { t, type LocalizedText } from "../i18n.js";
import type { Rng } from "../rng.js";
import { DEFAULT_NPC_TITLES, NPC_TRAITS } from "../rpg/common.js";
import { pathSkill } from "../rpg/skills.js";
import { clamp } from "../stats.js";
import { GENDERS, type Gender, type GameState, type NpcRole, type NpcState } from "../types.js";
import type { UniverseDefinition } from "../universes/types.js";
import { NAME_POOLS } from "./names.js";
import { TEMPERAMENTS } from "./temperaments.js";

export const AFFINITY_LIMIT = 100;
/** Больше стольких NPC одной роли не бывает: жизнь не превращается в список имён */
const ROLE_LIMIT: Readonly<Record<NpcRole, number>> = {
  father: 1,
  mother: 1,
  sibling: 4,
  grandparent: 2,
  friend: 3,
  rival: 2,
  mentor: 2,
  teacher: 2,
  partner: 1,
  spouse: 1,
  "ex-partner": 3,
  child: 4
};

/** Семья: эти роли считаются родными в условиях и эффектах с ролью "family" */
export const FAMILY_ROLES: readonly NpcRole[] = ["father", "mother", "sibling", "grandparent", "spouse", "child"];
export const PARENT_ROLES: readonly NpcRole[] = ["father", "mother"];

const BASE_AFFINITY: Readonly<Record<NpcRole, number>> = {
  father: 45,
  mother: 55,
  sibling: 30,
  grandparent: 40,
  friend: 35,
  rival: -25,
  mentor: 15,
  teacher: 10,
  partner: 45,
  spouse: 60,
  "ex-partner": -10,
  child: 60
};

const ROLE_NAMES: Readonly<Record<NpcRole, Record<Gender, LocalizedText>>> = {
  father: { male: t("Отец", "Father"), female: t("Отец", "Father") },
  mother: { male: t("Мать", "Mother"), female: t("Мать", "Mother") },
  sibling: { male: t("Брат", "Brother"), female: t("Сестра", "Sister") },
  grandparent: { male: t("Дедушка", "Grandfather"), female: t("Бабушка", "Grandmother") },
  friend: { male: t("Друг", "Friend"), female: t("Подруга", "Friend") },
  rival: { male: t("Соперник", "Rival"), female: t("Соперница", "Rival") },
  mentor: { male: t("Наставник", "Mentor"), female: t("Наставница", "Mentor") },
  teacher: { male: t("Учитель", "Teacher"), female: t("Учительница", "Teacher") },
  partner: { male: t("Возлюбленный", "Beloved"), female: t("Возлюбленная", "Beloved") },
  spouse: { male: t("Муж", "Husband"), female: t("Жена", "Wife") },
  "ex-partner": { male: t("Бывший возлюбленный", "Former lover"), female: t("Бывшая возлюбленная", "Former lover") },
  child: { male: t("Сын", "Son"), female: t("Дочь", "Daughter") }
};

export function roleName(role: NpcRole, gender: Gender): LocalizedText {
  return ROLE_NAMES[role][gender];
}

export function npcAge(npc: NpcState, characterAge: number): number {
  return (npc.diedAt ?? characterAge) - npc.bornAt;
}

/** Сколько живёт NPC. Сильные люди живут дольше, особенно в мирах культивации */
export function npcLifespan(universe: UniverseDefinition, npc: NpcState): number {
  const strong = npc.power >= 70 ? (universe.id === "xianxia" ? 2 : 0.25) : 0;
  return Math.round(universe.lifespan * (1 + strong));
}

export function isFamily(npc: NpcState): boolean {
  return FAMILY_ROLES.includes(npc.role);
}

/** Подходит ли NPC под роль из условия или эффекта */
export function matchesRole(npc: NpcState, role: NpcRole | "parent" | "family"): boolean {
  if (role === "family") return isFamily(npc);
  if (role === "parent") return PARENT_ROLES.includes(npc.role);
  return npc.role === role;
}

/** Живые NPC роли, самый близкий первым */
export function livingWith(state: GameState, role: NpcRole | "parent" | "family"): NpcState[] {
  return state.npcs.filter((npc) => npc.alive && matchesRole(npc, role)).sort((a, b) => b.affinity - a.affinity || a.id.localeCompare(b.id));
}

export function findNpc(state: GameState, id: string): NpcState | undefined {
  return state.npcs.find((npc) => npc.id === id);
}

export function canAddRole(state: GameState, role: NpcRole): boolean {
  return state.npcs.filter((npc) => npc.alive && npc.role === role).length < ROLE_LIMIT[role];
}

export interface NpcContext {
  state: GameState;
  rng: Rng;
  universe: UniverseDefinition;
}

export interface NpcOptions {
  gender?: Gender;
  /** Возраст NPC в момент знакомства */
  age?: number;
  familyName?: string;
  occupation?: LocalizedText;
  power?: number;
  /** Отношение при знакомстве вместо обычного для роли */
  affinity?: number;
}

/** Возраст NPC при знакомстве, если он не задан явно */
function defaultAge(rng: Rng, role: NpcRole, characterAge: number): number {
  switch (role) {
    case "father":
      return characterAge + rng.int(20, 38);
    case "mother":
      return characterAge + rng.int(18, 34);
    case "grandparent":
      return characterAge + rng.int(44, 64);
    case "sibling":
      return Math.max(0, characterAge + rng.int(-7, 7));
    case "friend":
    case "rival":
      return Math.max(1, characterAge + rng.int(-2, 2));
    case "partner":
    case "spouse":
    case "ex-partner":
      return Math.max(16, characterAge + rng.int(-4, 5));
    case "mentor":
      return Math.max(characterAge + 15, rng.int(38, 72));
    case "teacher":
      return Math.max(characterAge + 10, rng.int(28, 60));
    case "child":
      return 0;
  }
}

function defaultPower(ctx: NpcContext, role: NpcRole): number {
  const rng = ctx.rng;
  switch (role) {
    case "mentor":
      return rng.int(55, 90);
    case "teacher":
      return rng.int(30, 60);
    case "rival": {
      // Соперник под стать персонажу: чуть сильнее или чуть слабее
      const stats = Object.values(ctx.state.character.stats);
      const mean = stats.reduce((sum, value) => sum + value, 0) / stats.length;
      return clamp(Math.round(mean * 2 + rng.int(-6, 10)), 5, 95);
    }
    case "child":
      return rng.int(3, 10);
    default:
      return rng.int(10, 45);
  }
}

function defaultOccupation(ctx: NpcContext, role: NpcRole, gender: Gender): LocalizedText {
  const titles = ctx.universe.npcTitles[role];
  if (titles && titles.length > 0) return ctx.rng.pick(titles);
  if (role === "father" || role === "mother" || role === "grandparent") {
    const socialClass = ctx.universe.socialClasses.find((c) => c.id === ctx.state.character.socialClassId);
    if (socialClass && socialClass.occupations.length > 0) return ctx.rng.pick(socialClass.occupations);
  }
  const defaults = DEFAULT_NPC_TITLES[role as keyof typeof DEFAULT_NPC_TITLES] as readonly LocalizedText[] | undefined;
  return defaults && defaults.length > 0 ? ctx.rng.pick(defaults) : roleName(role, gender);
}

function skillFor(ctx: NpcContext, role: NpcRole): string | null {
  switch (role) {
    case "mentor":
      return pathSkill(ctx.universe).id;
    case "teacher":
      return ctx.universe.education[0]?.skills[0] ?? "lore";
    case "father":
    case "mother":
    case "grandparent":
    case "friend":
      return ctx.rng.chance(0.5) ? ctx.rng.pick(["craft", "survival", "trade", "medicine", "persuasion", "athletics"]) : null;
    default:
      return null;
  }
}

function given(rng: Rng, ctx: NpcContext, gender: Gender): string {
  const pool = NAME_POOLS[ctx.universe.id];
  return rng.pick(pool[gender]);
}

/** Новый человек в жизни персонажа. Броски всегда в одном порядке: результат зависит только от Rng */
export function createNpc(ctx: NpcContext, role: NpcRole, options: NpcOptions = {}): NpcState {
  const rng = ctx.rng;
  const age = ctx.state.life.age;
  const genderRoll = rng.pick(GENDERS);
  const gender: Gender = options.gender ?? (role === "father" ? "male" : role === "mother" ? "female" : genderRoll);
  const npcAgeNow = options.age ?? defaultAge(rng, role, age);
  const trait = rng.pick(NPC_TRAITS);
  const temperament = rng.pick(TEMPERAMENTS);
  const name = given(rng, ctx, gender);
  const family = options.familyName ?? (FAMILY_ROLES.includes(role) ? ctx.state.background.familyName : rng.pick(NAME_POOLS[ctx.universe.id].family));
  const occupation = options.occupation ?? defaultOccupation(ctx, role, gender);
  const power = options.power ?? defaultPower(ctx, role);
  const affinity = clamp(options.affinity ?? BASE_AFFINITY[role] + trait.affinity + rng.int(-10, 10), -AFFINITY_LIMIT, AFFINITY_LIMIT);
  const skillId = skillFor(ctx, role);
  const npc: NpcState = {
    id: `n${ctx.state.nextNpcId++}`,
    role,
    name: family ? `${name} ${family}` : name,
    gender,
    bornAt: age - npcAgeNow,
    temperamentId: temperament.id,
    traitId: trait.id,
    occupation,
    bio: t(`${occupation.ru}. ${trait.bio.ru} Характер: ${temperament.name.ru.toLowerCase()}.`, `${occupation.en}. ${trait.bio.en} Temperament: ${temperament.name.en.toLowerCase()}.`),
    affinity,
    alive: true,
    diedAt: null,
    metAt: age,
    power,
    skillId,
    interactedAt: null
  };
  ctx.state.npcs.push(npc);
  return npc;
}

/** Отношение NPC к персонажу без записи в историю. Запись делает engine/effects.ts */
export function shiftAffinity(npc: NpcState, delta: number): number {
  const before = npc.affinity;
  npc.affinity = clamp(before + delta, -AFFINITY_LIMIT, AFFINITY_LIMIT);
  return npc.affinity - before;
}

/** Описание отношения для интерфейса */
export function affinityLabel(affinity: number): LocalizedText {
  if (affinity >= 75) return t("Самый близкий человек", "Closest of all");
  if (affinity >= 40) return t("Близкий", "Close");
  if (affinity >= 10) return t("Тёплое", "Warm");
  if (affinity > -10) return t("Ровное", "Neutral");
  if (affinity > -40) return t("Холодное", "Cold");
  if (affinity > -75) return t("Враждебное", "Hostile");
  return t("Заклятый враг", "Sworn enemy");
}
