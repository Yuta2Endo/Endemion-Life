// Stage 02.3: жильё и собственный дом. Одно состояние на жизнь: бездомность, аренда или
// собственное жильё. Дом берётся из каталога мира; качество, вместимость, аренда,
// содержание и налог считаются по каталогу. Домашние не хранятся вторым списком:
// они выводятся из уже существующих NPC и родства, поэтому не бывает выдуманных людей.
import { npcAge, roleName } from "../character/npcs.js";
import type { EngineContext } from "../engine/context.js";
import { record } from "../engine/record.js";
import { t, type LocalizedText } from "../i18n.js";
import { clamp, WEALTH_MAX } from "../stats.js";
import type { GameState, HouseholdState, NpcState, ResidenceKind, UniverseId } from "../types.js";

/** Сколько лет подряд можно не платить за жильё, прежде чем его отберут */
export const MAX_ARREARS = 2;
/** Насколько портится собственный дом за год */
export const PROPERTY_DECAY = 2;
/** Ремонт возвращает дому столько состояния */
export const REPAIR_AMOUNT = 35;
/** С какого возраста можно снять или купить своё жильё */
export const HOUSEHOLD_AGE = 16;

export const PROPERTY_KINDS = ["home"] as const;
export type PropertyKind = (typeof PROPERTY_KINDS)[number];

export interface PropertyDefinition {
  id: string;
  universeId: UniverseId;
  kind: PropertyKind;
  name: LocalizedText;
  description: LocalizedText;
  /** Цена покупки */
  price: number;
  /** Аренда за год. 0 — не сдаётся */
  rent: number;
  /** Содержание за год при идеальном состоянии */
  upkeep: number;
  /** Налог на имущество за год */
  tax: number;
  /** Качество 1–5 */
  quality: number;
  /** Сколько человек помещается без тесноты */
  capacity: number;
}

function home(
  universeId: UniverseId,
  suffix: string,
  nameRu: string,
  nameEn: string,
  descriptionRu: string,
  descriptionEn: string,
  numbers: { price: number; rent: number; upkeep: number; tax: number; quality: number; capacity: number }
): PropertyDefinition {
  return {
    id: `${universeId === "dark-fantasy" ? "df" : universeId === "isekai" ? "is" : universeId === "murim" ? "mu" : universeId === "xianxia" ? "xx" : universeId === "hunter" ? "hu" : "ac"}-${suffix}`,
    universeId,
    kind: "home",
    name: t(nameRu, nameEn),
    description: t(descriptionRu, descriptionEn),
    ...numbers
  };
}

/** Два дома на мир: скромный угол и просторный дом. Оба можно снять или купить */
export const WORLD_PROPERTIES: Readonly<Record<UniverseId, readonly PropertyDefinition[]>> = {
  "dark-fantasy": [
    home("dark-fantasy", "home-small", "Угол у соборной стены", "Room by the cathedral wall", "Кровать за занавеской, общий очаг и запах воска. Не дворец, но крыша держит Мглу.", "A bed behind a curtain, a shared hearth and the smell of wax. No palace, but the roof keeps the Mist out.", { price: 55, rent: 5, upkeep: 1, tax: 1, quality: 1, capacity: 2 }),
    home("dark-fantasy", "home-large", "Дом ремесленника", "Craftsman's house", "Крепкие ставни, своя печь и место для инструмента. Такой дом переживёт пару голодных лет.", "Stout shutters, a stove of your own and room for tools. Such a house survives a few hungry years.", { price: 130, rent: 11, upkeep: 2, tax: 2, quality: 3, capacity: 5 })
  ],
  isekai: [
    home("isekai", "home-small", "Комната над лавкой", "Room above a shop", "Одна комната над шумной лавкой. Постояльцы жалуются на скрип, зато дешево.", "One room above a noisy shop. The lodgers complain about the creaking, but it is cheap.", { price: 60, rent: 6, upkeep: 1, tax: 1, quality: 1, capacity: 2 }),
    home("isekai", "home-large", "Дом у городской стены", "House by the town wall", "Два этажа, каменный фундамент и двор, где можно сушить травы.", "Two floors, a stone foundation and a yard for drying herbs.", { price: 140, rent: 12, upkeep: 2, tax: 2, quality: 3, capacity: 5 })
  ],
  murim: [
    home("murim", "home-small", "Угол на постоялом дворе", "A corner at the inn", "Циновка, сундук и общий чайник. Хозяин знает своё дело и чужие долги.", "A mat, a chest and a shared teapot. The keeper knows his business and everyone's debts.", { price: 50, rent: 4, upkeep: 1, tax: 1, quality: 1, capacity: 2 }),
    home("murim", "home-large", "Флигель при постоялом дворе", "Wing of the inn", "Отдельный флигель с очагом и местом для гостей. Клан смотрит на такой дом иначе.", "A separate wing with a hearth and room for guests. The clan looks differently at such a house.", { price: 120, rent: 10, upkeep: 2, tax: 2, quality: 3, capacity: 5 })
  ],
  xianxia: [
    home("xianxia", "home-small", "Хижина у духовной жилы", "Hut by the spirit vein", "Бамбук, камень и тонкая струя ци у порога. Для смертного — уже роскошь.", "Bamboo, stone and a thin thread of qi at the threshold. For a mortal, already luxury.", { price: 45, rent: 4, upkeep: 1, tax: 1, quality: 1, capacity: 2 }),
    home("xianxia", "home-large", "Дом у подножия пика", "House at the peak's foot", "Двор с каменным столом и видом на облака. Секта берёт за это скромную долю.", "A courtyard with a stone table and a view of clouds. The sect takes a modest share for it.", { price: 110, rent: 9, upkeep: 2, tax: 1, quality: 3, capacity: 5 })
  ],
  hunter: [
    home("hunter", "home-small", "Студия в Нео-Сеуле", "Studio in Neo-Seoul", "Одна комната, тонкие стены и окно на рекламу. Метро в двух шагах.", "One room, thin walls and a window full of ads. The metro is two steps away.", { price: 80, rent: 8, upkeep: 2, tax: 2, quality: 1, capacity: 2 }),
    home("hunter", "home-large", "Квартира в башне", "Tower apartment", "Высокий этаж, охрана и шумоизоляция. Соседи — менеджеры и охотники ранга B.", "A high floor, security and soundproofing. The neighbours are managers and B-rank hunters.", { price: 180, rent: 16, upkeep: 3, tax: 3, quality: 3, capacity: 5 })
  ],
  academy: [
    home("academy", "home-small", "Комната в доходном доме", "Room in a rented house", "Приличный адрес, общая лестница и строгая хозяйка. Для начала — вполне.", "A respectable address, a shared stair and a strict landlady. A decent start.", { price: 90, rent: 9, upkeep: 2, tax: 2, quality: 1, capacity: 2 }),
    home("academy", "home-large", "Городской дом", "Townhouse", "Свой вход, кабинет и салон для гостей. Адрес сам делает половину разговора.", "Your own entrance, a study and a salon for guests. The address does half the talking.", { price: 200, rent: 18, upkeep: 3, tax: 3, quality: 3, capacity: 5 })
  ]
};

export function propertiesOf(universeId: UniverseId): readonly PropertyDefinition[] {
  return WORLD_PROPERTIES[universeId];
}

export function findProperty(universeId: UniverseId, id: string): PropertyDefinition | undefined {
  return propertiesOf(universeId).find((property) => property.id === id);
}

export function newHouseholdState(age = 0): HouseholdState {
  return { residence: "homeless", homeId: null, since: Math.max(0, age), condition: 0, arrears: 0 };
}

/** Защита на границе действия: неизвестный дом или невозможная аренда становятся бездомностью */
export function normalizeHouseholdState(state: GameState): HouseholdState {
  const raw = state.household as HouseholdState | undefined;
  const age = state.life.age;
  if (!raw || typeof raw !== "object") return newHouseholdState(age);
  const residence: ResidenceKind = raw.residence === "rent" || raw.residence === "own" ? raw.residence : "homeless";
  const def = typeof raw.homeId === "string" ? findProperty(state.character.universeId, raw.homeId) : undefined;
  if (residence === "homeless" || !def) return newHouseholdState(age);
  return {
    residence,
    homeId: def.id,
    since: Number.isFinite(raw.since) ? clamp(Math.round(raw.since), 0, age) : age,
    condition: residence === "own" && Number.isFinite(raw.condition) ? clamp(Math.round(raw.condition), 0, 100) : 0,
    arrears: Number.isFinite(raw.arrears) ? clamp(Math.round(raw.arrears), 0, MAX_ARREARS) : 0
  };
}

export function homeOf(state: GameState): PropertyDefinition | undefined {
  const household = state.household;
  if (!household || household.residence === "homeless" || household.homeId === null) return undefined;
  return findProperty(state.character.universeId, household.homeId);
}

/** Годовые расходы на жильё. У аренды — только аренда, у своего дома — содержание и налог */
export function housingCosts(state: GameState): { rent: number; upkeep: number; tax: number; total: number } {
  const def = homeOf(state);
  const household = state.household;
  if (!def || !household || household.residence === "homeless") return { rent: 0, upkeep: 0, tax: 0, total: 0 };
  const rent = household.residence === "rent" ? def.rent : 0;
  const condition = Number.isFinite(household.condition) ? clamp(Math.round(household.condition), 0, 100) : 100;
  const upkeep = household.residence === "own" ? Math.max(1, Math.round(def.upkeep * (1 + (100 - condition) / 100))) : 0;
  const tax = household.residence === "own" ? def.tax : 0;
  return { rent, upkeep, tax, total: rent + upkeep + tax };
}

/** Сколько стоит починить дом: доля цены, не меньше трёх золотых */
export function repairCostOf(property: PropertyDefinition): number {
  return Math.max(3, Math.round(property.price * 0.12));
}

export function repairCost(state: GameState): number {
  const def = homeOf(state);
  return def ? repairCostOf(def) : 0;
}

/** Сколько дают за дом: состояние влияет на цену, но продажа всегда дешевле покупки */
export function saleValueOfProperty(property: PropertyDefinition, condition: number): number {
  return clamp(Math.round(property.price * (0.55 + clamp(condition, 0, 100) / 400)), 1, WEALTH_MAX);
}

export function saleValue(state: GameState): number {
  if (state.household.residence !== "own") return 0;
  const def = homeOf(state);
  const condition = Number.isFinite(state.household.condition) ? state.household.condition : 100;
  return def ? saleValueOfProperty(def, condition) : 0;
}

export function rentHome(state: GameState, id: string): boolean {
  const def = findProperty(state.character.universeId, id);
  if (!def || def.rent <= 0 || state.life.age < HOUSEHOLD_AGE) return false;
  // Собственный дом не подменяется арендой: сначала его нужно продать
  if (state.household.residence === "own") return false;
  state.household = { residence: "rent", homeId: def.id, since: state.life.age, condition: 0, arrears: 0 };
  return true;
}

/** Вселение в купленный дом. Саму плату снимает вызывающий эффект: здесь только состояние */
export function ownHome(state: GameState, id: string): boolean {
  const def = findProperty(state.character.universeId, id);
  if (!def || state.life.age < HOUSEHOLD_AGE) return false;
  // Второй дом не появляется поверх первого: старый сначала продаётся
  if (state.household.residence === "own") return false;
  state.household = { residence: "own", homeId: def.id, since: state.life.age, condition: 100, arrears: 0 };
  return true;
}

export function leaveHome(state: GameState): void {
  state.household = newHouseholdState(state.life.age);
}

/** Ремонт без оплаты: деньги списывает эффект события */
export function repairHome(state: GameState): boolean {
  if (state.household.residence !== "own" || !homeOf(state)) return false;
  state.household.condition = clamp(state.household.condition + REPAIR_AMOUNT, 0, 100);
  return true;
}

export function neglectHome(state: GameState, amount: number): boolean {
  if (state.household.residence !== "own" || !homeOf(state)) return false;
  state.household.condition = clamp(state.household.condition - Math.max(0, Math.round(amount)), 0, 100);
  return true;
}

export interface HouseholdMember {
  npc: NpcState;
  /** Ребёнок на иждивении: младше 18 лет */
  dependent: boolean;
}

/**
 * Домашние выводятся из существующих людей: супруг, несовершеннолетние дети,
 * а у ребёнка — родители и братья с сёстрами. Умершие и пропавшие не считаются.
 */
export function householdMembers(state: GameState): HouseholdMember[] {
  const age = state.life.age;
  const alive = state.npcs.filter((npc) => npc.alive && npc.status !== "missing");
  const members: HouseholdMember[] = [];
  const add = (npc: NpcState, dependent = false): void => {
    if (members.some((member) => member.npc.id === npc.id)) return;
    members.push({ npc, dependent });
  };
  for (const npc of alive) if (npc.role === "spouse") add(npc);
  for (const npc of alive) if (npc.role === "child" && npcAge(npc, age) < 18) add(npc, true);
  if (age < 18) {
    for (const npc of alive) if (npc.role === "father" || npc.role === "mother") add(npc);
    for (const npc of alive) if (npc.role === "sibling") add(npc);
  }
  return members;
}

export function householdSize(state: GameState): number {
  return 1 + householdMembers(state).length;
}

export function dependentsOf(state: GameState): number {
  return householdMembers(state).filter((member) => member.dependent).length;
}

export function householdCrowded(state: GameState): boolean {
  const def = homeOf(state);
  return def !== undefined && householdSize(state) > def.capacity;
}

/** Год жилья: дом ветшает, долг растёт, при неуплате жильё теряется. Вызывается из economyYear */
export function householdYear(ctx: EngineContext): void {
  const state = ctx.state;
  state.household = normalizeHouseholdState(state);
  if (!state.life.alive) return;
  const def = homeOf(state);
  const household = state.household;
  if (def && household.residence === "own") {
    household.condition = clamp(household.condition - PROPERTY_DECAY, 0, 100);
  }
  const last = state.economy.last;
  const unpaid = last !== null && last.age === state.life.age && last.shortfall > 0;
  if (household.residence !== "homeless" && unpaid) household.arrears = Math.min(MAX_ARREARS, household.arrears + 1);
  else household.arrears = 0;

  if (household.residence === "own" && def && (household.condition <= 0 || household.arrears >= MAX_ARREARS)) {
    record(ctx, { kind: "property", key: def.id, value: "lost" });
    leaveHome(state);
    return;
  }
  if (household.residence === "rent" && def && household.arrears >= MAX_ARREARS) {
    record(ctx, { kind: "housing", key: def.id, value: "evicted" });
    leaveHome(state);
  }
}

export const RESIDENCE_NAMES: Readonly<Record<ResidenceKind, LocalizedText>> = {
  homeless: t("Нет отдельного жилья", "No home of your own"),
  rent: t("Снятое жильё", "Rented home"),
  own: t("Собственный дом", "Own home")
};

export interface HouseholdMemberView {
  id: string;
  name: string;
  role: LocalizedText;
  age: number;
  dependent: boolean;
}

export interface HouseholdHomeView {
  id: string;
  name: LocalizedText;
  description: LocalizedText;
  quality: number;
  capacity: number;
}

export interface HouseholdView {
  residence: ResidenceKind;
  residenceName: LocalizedText;
  home: HouseholdHomeView | null;
  /** Состояние собственного дома 0–100. 0 — дома нет или он не свой */
  condition: number;
  rent: number;
  upkeep: number;
  tax: number;
  annualCost: number;
  arrears: number;
  since: number;
  members: HouseholdMemberView[];
  dependents: number;
  householdSize: number;
  crowded: boolean;
}

/** То, что видит игрок: жильё, расходы, состояние и домашние. Скрытых полей нет */
export function presentHousehold(state: GameState): HouseholdView {
  const household = state.household ?? newHouseholdState(state.life.age);
  const def = homeOf(state);
  const costs = housingCosts(state);
  const members = householdMembers(state).map((member) => ({
    id: member.npc.id,
    name: member.npc.name,
    role: roleName(member.npc.role, member.npc.gender),
    age: npcAge(member.npc, state.life.age),
    dependent: member.dependent
  }));
  return {
    residence: household.residence,
    residenceName: RESIDENCE_NAMES[household.residence],
    home: def ? { id: def.id, name: def.name, description: def.description, quality: def.quality, capacity: def.capacity } : null,
    condition: household.residence === "own" && Number.isFinite(household.condition) ? clamp(Math.round(household.condition), 0, 100) : 0,
    rent: costs.rent,
    upkeep: costs.upkeep,
    tax: costs.tax,
    annualCost: costs.total,
    arrears: household.arrears,
    since: household.since,
    members,
    dependents: members.filter((member) => member.dependent).length,
    householdSize: 1 + members.length,
    crowded: householdCrowded(state)
  };
}
