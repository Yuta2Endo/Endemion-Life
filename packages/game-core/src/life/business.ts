// Stage 02.3: своё дело. Один или два sole proprietorship на жизнь: стартовый капитал,
// годовой доход и расходы, рост, убытки, продажа и принудительное закрытие.
// Дело не печатает золото: его доход и расходы идут в общий годовой расчёт хозяйства,
// а капитал — только оборотные средства самого дела, не второе золото.
import type { EngineContext } from "../engine/context.js";
import { record } from "../engine/record.js";
import { t, type LocalizedText } from "../i18n.js";
import { hashSeed, Rng } from "../rng.js";
import { clamp, WEALTH_MAX } from "../stats.js";
import type { BusinessState, BusinessVenture, GameState, UniverseId } from "../types.js";

/** Сколько своих дел можно держать одновременно */
export const MAX_BUSINESSES = 2;
/** После стольких убыточных лет подряд дело закрывается само */
export const MAX_BUSINESS_LOSSES = 10;
/** Годы общей нужды, после которых убыточное дело закрывают за долги */
export const BUSINESS_BANKRUPTCY_HARDSHIP = 3;
/** Рост дохода по ступеням дела */
export const BUSINESS_LEVEL_REVENUE = [1, 1.2, 1.4] as const;
/** Рост расходов по ступеням дела: медленнее дохода */
export const BUSINESS_LEVEL_COSTS = [1, 1.05, 1.1] as const;
/** Через столько прибыльных лет дело поднимается на следующую ступень */
export const BUSINESS_GROWTH_YEARS = 3;
/** Во сколько раз падает выручка в плохой год */
const BAD_YEAR_FACTOR = 0.45;

export interface BusinessDefinition {
  id: string;
  universeId: UniverseId;
  name: LocalizedText;
  description: LocalizedText;
  /** Сколько стоит открыть или купить дело */
  cost: number;
  /** Оборотный капитал при открытии */
  capital: number;
  /** Базовый доход за год до роста, навыка и плохого года */
  revenue: number;
  /** Базовые расходы за год до роста */
  costs: number;
  /** Навык, который повышает доход */
  skill: string;
  /** Вероятность плохого года 0–1 */
  risk: number;
  /** Наибольшая ступень роста */
  maxLevel: number;
}

function venture(
  universeId: UniverseId,
  suffix: string,
  nameRu: string,
  nameEn: string,
  descriptionRu: string,
  descriptionEn: string,
  numbers: { cost: number; capital: number; revenue: number; costs: number; skill: string; risk: number }
): BusinessDefinition {
  return {
    id: `${universeId === "dark-fantasy" ? "df" : universeId === "isekai" ? "is" : universeId === "murim" ? "mu" : universeId === "xianxia" ? "xx" : universeId === "hunter" ? "hu" : "ac"}-${suffix}`,
    universeId,
    name: t(nameRu, nameEn),
    description: t(descriptionRu, descriptionEn),
    ...numbers,
    maxLevel: 2
  };
}

/** Два дела на мир: скромная лавка и мастерская. Оба покупаются за золото и живут своим трудом */
export const WORLD_BUSINESSES: Readonly<Record<UniverseId, readonly BusinessDefinition[]>> = {
  "dark-fantasy": [
    venture("dark-fantasy", "business-stall", "Свечная лавка", "Chandler's stall", "Свечи, воск и фитили для тех, кто боится темноты. Покупатели есть всегда.", "Candles, wax and wicks for those afraid of the dark. There are always buyers.", { cost: 28, capital: 10, revenue: 9, costs: 6, skill: "trade", risk: 0.16 }),
    venture("dark-fantasy", "business-workshop", "Мастерская при соборе", "Workshop by the cathedral", "Починка реликвий и церковной утвари. Орден платит вовремя, если не гневается.", "Repairing relics and church vessels. The Order pays on time, unless it is angry.", { cost: 75, capital: 26, revenue: 24, costs: 16, skill: "craft", risk: 0.14 })
  ],
  isekai: [
    venture("isekai", "business-stall", "Лоток у Гильдии", "Guild stall", "Зелья, карты и мелочи для новичков. Гильдия берёт место, но не мешает торговать.", "Potions, maps and trinkets for novices. The Guild takes its cut but does not stop the trade.", { cost: 30, capital: 11, revenue: 10, costs: 6, skill: "trade", risk: 0.15 }),
    venture("isekai", "business-workshop", "Мастерская изобретателя", "Inventor's workshop", "Механизмы, которые здесь ещё не видели. Пока их не запретили.", "Contraptions this world has not seen yet. Until they are banned.", { cost: 85, capital: 30, revenue: 27, costs: 18, skill: "invention", risk: 0.18 })
  ],
  murim: [
    venture("murim", "business-stall", "Чайная у пристани", "Teahouse by the pier", "Чай, лепёшки и слухи. Речные люди платят медью, но каждый день.", "Tea, flatbread and rumours. River folk pay in coppers, but every day.", { cost: 26, capital: 10, revenue: 9, costs: 6, skill: "trade", risk: 0.15 }),
    venture("murim", "business-workshop", "Охранное бюро", "Escort office", "Сопровождение караванов и защита лавок. Клинок должен быть не только острым.", "Guarding caravans and shops. A blade must be more than sharp.", { cost: 80, capital: 28, revenue: 26, costs: 17, skill: "martial-arts", risk: 0.17 })
  ],
  xianxia: [
    venture("xianxia", "business-stall", "Лавка трав", "Herb stall", "Духовные травы, корешки и настои. Смертные покупают, ученики торгуются.", "Spirit herbs, roots and tinctures. Mortals buy, disciples haggle.", { cost: 30, capital: 11, revenue: 10, costs: 6, skill: "alchemy", risk: 0.16 }),
    venture("xianxia", "business-workshop", "Мастерская пилюль", "Pill workshop", "Пилюли для прорыва и лечения. Ошибка в дозировке стоит дорого.", "Pills for breakthroughs and healing. A dosing mistake is costly.", { cost: 90, capital: 32, revenue: 29, costs: 19, skill: "alchemy", risk: 0.2 })
  ],
  hunter: [
    venture("hunter", "business-stall", "Лоток с ядрами", "Core kiosk", "Ядра низких рангов, бинты и энергетики у входа в Врата. Спрос не кончается.", "Low-rank cores, bandages and energy drinks by the Gate entrance. Demand never ends.", { cost: 45, capital: 16, revenue: 15, costs: 10, skill: "trade", risk: 0.16 }),
    venture("hunter", "business-workshop", "Магазин артефактов", "Artifact shop", "Артефакты, лицензии и посредничество. Корпорации рядом, но и покупатели тоже.", "Artifacts, licences and brokerage. The corporations are near, and so are the buyers.", { cost: 120, capital: 40, revenue: 38, costs: 26, skill: "lore", risk: 0.18 })
  ],
  academy: [
    venture("academy", "business-stall", "Салон при дворе", "Court salon", "Разговоры, покровительство и хороший чай. Плата за вход — репутация.", "Conversation, patronage and good tea. The entrance fee is reputation.", { cost: 55, capital: 19, revenue: 18, costs: 12, skill: "etiquette", risk: 0.15 }),
    venture("academy", "business-workshop", "Торговый дом", "Trading house", "Векселя, поставки и доли в чужих караванах. Двор следит за счетами.", "Bills, supplies and shares in other people's caravans. The court watches the books.", { cost: 130, capital: 44, revenue: 41, costs: 28, skill: "trade", risk: 0.17 })
  ]
};

export function businessesOf(universeId: UniverseId): readonly BusinessDefinition[] {
  return WORLD_BUSINESSES[universeId];
}

export function findBusiness(universeId: UniverseId, id: string): BusinessDefinition | undefined {
  return businessesOf(universeId).find((business) => business.id === id);
}

export function newBusinessState(): BusinessState {
  return { ventures: [] };
}

/** Защита на границе действия: неизвестные и лишние дела отбрасываются, числа зажимаются */
export function normalizeBusinessState(state: GameState): BusinessState {
  const raw = state.business as BusinessState | undefined;
  const age = state.life.age;
  if (!raw || !Array.isArray(raw.ventures)) return newBusinessState();
  const seen = new Set<string>();
  const ventures: BusinessVenture[] = [];
  for (const item of raw.ventures) {
    if (!item || typeof item.id !== "string" || seen.has(item.id)) continue;
    const def = findBusiness(state.character.universeId, item.id);
    if (!def) continue;
    seen.add(item.id);
    const foundedAge = clamp(Math.round(Number(item.foundedAge) || 0), 0, age);
    ventures.push({
      id: def.id,
      foundedAge,
      level: clamp(Math.round(Number(item.level) || 0), 0, def.maxLevel),
      capital: clamp(Math.round(Number(item.capital) || 0), 0, WEALTH_MAX),
      years: clamp(Math.round(Number(item.years) || 0), 0, Math.max(0, age - foundedAge)),
      losses: clamp(Math.round(Number(item.losses) || 0), 0, MAX_BUSINESS_LOSSES),
      lastNet: typeof item.lastNet === "number" && Number.isFinite(item.lastNet) ? clamp(Math.round(item.lastNet), -WEALTH_MAX, WEALTH_MAX) : null
    });
    if (ventures.length >= MAX_BUSINESSES) break;
  }
  return { ventures };
}

function levelFactor(values: readonly number[], level: number): number {
  return values[clamp(Math.round(level), 0, values.length - 1)] ?? values[0] ?? 1;
}

function skillBonus(state: GameState, def: BusinessDefinition): number {
  return Math.min(6, Math.floor((state.character.skills[def.skill] ?? 0) / 15));
}

function yearRoll(state: GameState, venture: BusinessVenture, salt: string): number {
  return new Rng(hashSeed(`${state.seed}::business::${venture.id}::${venture.foundedAge}::${state.life.age}::${state.rngState}::${salt}`)).next();
}

/** Плохой год: реже в подъёме, чаще в спаде. Бросок отдельный, основной генератор жизни не трогается */
export function businessBadYear(state: GameState, venture: BusinessVenture): boolean {
  const def = findBusiness(state.character.universeId, venture.id);
  if (!def) return false;
  const cycleRisk = state.economy.cycle === "slump" ? 0.05 : state.economy.cycle === "boom" ? -0.03 : 0;
  const risk = clamp(def.risk + cycleRisk, 0.02, 0.6);
  return yearRoll(state, venture, "year") < risk;
}

export interface BusinessYearNumbers {
  revenue: number;
  costs: number;
  net: number;
  badYear: boolean;
}

/** Доход и расходы дела за нынешний год. Одна и та же функция для статей хозяйства и для капитала */
export function businessNumbers(state: GameState, venture: BusinessVenture): BusinessYearNumbers {
  const def = findBusiness(state.character.universeId, venture.id);
  if (!def) return { revenue: 0, costs: 0, net: 0, badYear: false };
  const badYear = businessBadYear(state, venture);
  const baseRevenue = def.revenue * levelFactor(BUSINESS_LEVEL_REVENUE, venture.level) + skillBonus(state, def);
  const revenue = Math.max(0, Math.round(baseRevenue * (badYear ? BAD_YEAR_FACTOR : 1)));
  const costs = Math.max(0, Math.round(def.costs * levelFactor(BUSINESS_LEVEL_COSTS, venture.level)));
  return { revenue, costs, net: revenue - costs, badYear };
}

/** Прогноз без плохого года: для досье. Годовой расчёт использует businessNumbers */
export function businessForecast(state: GameState, venture: BusinessVenture): BusinessYearNumbers {
  const def = findBusiness(state.character.universeId, venture.id);
  if (!def) return { revenue: 0, costs: 0, net: 0, badYear: false };
  const revenue = Math.max(0, Math.round(def.revenue * levelFactor(BUSINESS_LEVEL_REVENUE, venture.level) + skillBonus(state, def)));
  const costs = Math.max(0, Math.round(def.costs * levelFactor(BUSINESS_LEVEL_COSTS, venture.level)));
  return { revenue, costs, net: revenue - costs, badYear: false };
}

export function businessIncome(state: GameState): number {
  return (state.business?.ventures ?? []).reduce((sum, item) => sum + businessNumbers(state, item).revenue, 0);
}

export function businessOperatingCosts(state: GameState): number {
  return (state.business?.ventures ?? []).reduce((sum, item) => sum + businessNumbers(state, item).costs, 0);
}

export function businessNet(state: GameState): number {
  return (state.business?.ventures ?? []).reduce((sum, item) => sum + businessNumbers(state, item).net, 0);
}

/** Сколько дают за продажу дела: половина капитала и малая доля вложенного */
export function businessSaleValue(state: GameState, venture: BusinessVenture): number {
  const def = findBusiness(state.character.universeId, venture.id);
  if (!def) return 0;
  return clamp(Math.round(venture.capital * 0.5 + def.cost * 0.1), 0, WEALTH_MAX);
}

export function addBusiness(state: GameState, id: string): boolean {
  const def = findBusiness(state.character.universeId, id);
  if (!def || state.life.age < 16) return false;
  if (!state.business) state.business = newBusinessState();
  if (state.business.ventures.length >= MAX_BUSINESSES) return false;
  if (state.business.ventures.some((item) => item.id === id)) return false;
  state.business.ventures.push({ id: def.id, foundedAge: state.life.age, level: 0, capital: def.capital, years: 0, losses: 0, lastNet: null });
  return true;
}

export function findVenture(state: GameState, id?: string): BusinessVenture | undefined {
  const list = state.business?.ventures ?? [];
  if (id !== undefined) return list.find((item) => item.id === id);
  return [...list].sort((a, b) => b.losses - a.losses || a.capital - b.capital || a.id.localeCompare(b.id))[0];
}

export function removeBusiness(state: GameState, id?: string): BusinessVenture | undefined {
  const venture = findVenture(state, id);
  if (!venture || !state.business) return undefined;
  state.business.ventures = state.business.ventures.filter((item) => item.id !== venture.id);
  return venture;
}

export function investInBusiness(state: GameState, id: string, amount: number): boolean {
  const venture = findVenture(state, id);
  if (!venture || amount <= 0) return false;
  venture.capital = clamp(venture.capital + Math.round(amount), 0, WEALTH_MAX);
  return true;
}

/** Год дела: капитал растёт или тает, убыточное дело может закрыться. Вызывается из economyYear */
export function businessYear(ctx: EngineContext): void {
  const state = ctx.state;
  state.business = normalizeBusinessState(state);
  if (!state.life.alive) return;
  const remaining: BusinessVenture[] = [];
  for (const venture of state.business.ventures) {
    const def = findBusiness(state.character.universeId, venture.id);
    if (!def) continue;
    const numbers = businessNumbers(state, venture);
    venture.lastNet = numbers.net;
    venture.years = Math.min(Math.max(0, state.life.age - venture.foundedAge), venture.years + 1);
    if (numbers.net < 0) {
      venture.losses = Math.min(MAX_BUSINESS_LOSSES, venture.losses + 1);
      venture.capital = clamp(venture.capital + numbers.net, 0, WEALTH_MAX);
    } else {
      venture.losses = 0;
      venture.capital = clamp(venture.capital + numbers.net, 0, WEALTH_MAX);
    }
    const bankrupt = venture.capital <= 0 || venture.losses >= MAX_BUSINESS_LOSSES || (state.economy.hardship >= BUSINESS_BANKRUPTCY_HARDSHIP && venture.losses >= 1);
    if (bankrupt) {
      record(ctx, { kind: "business", key: venture.id, value: "failed" });
      continue;
    }
    // Рост простой и предсказуемый: каждые BUSINESS_GROWTH_YEARS прибыльных лет без убытков
    if (venture.losses === 0 && numbers.net > 0 && venture.level < def.maxLevel && venture.years > 0 && venture.years % BUSINESS_GROWTH_YEARS === 0) {
      venture.level += 1;
      record(ctx, { kind: "business", key: venture.id, value: "grew" });
    }
    remaining.push(venture);
  }
  state.business.ventures = remaining;
}

export interface BusinessVentureView {
  id: string;
  name: LocalizedText;
  description: LocalizedText;
  level: number;
  maxLevel: number;
  capital: number;
  revenue: number;
  costs: number;
  net: number;
  lastNet: number | null;
  years: number;
  losses: number;
  saleValue: number;
}

export interface BusinessView {
  max: number;
  ventures: BusinessVentureView[];
  totalRevenue: number;
  totalCosts: number;
  totalNet: number;
}

/** То, что видит игрок: дела, капитал, доход, расходы и цена продажи */
export function presentBusiness(state: GameState): BusinessView {
  const business = normalizeBusinessState(state);
  const ventures: BusinessVentureView[] = [];
  for (const item of business.ventures) {
    const def = findBusiness(state.character.universeId, item.id);
    if (!def) continue;
    const forecast = businessForecast(state, item);
    ventures.push({
      id: def.id,
      name: def.name,
      description: def.description,
      level: item.level,
      maxLevel: def.maxLevel,
      capital: item.capital,
      revenue: forecast.revenue,
      costs: forecast.costs,
      net: forecast.net,
      lastNet: item.lastNet,
      years: item.years,
      losses: item.losses,
      saleValue: businessSaleValue(state, item)
    });
  }
  return {
    max: MAX_BUSINESSES,
    ventures,
    totalRevenue: ventures.reduce((sum, item) => sum + item.revenue, 0),
    totalCosts: ventures.reduce((sum, item) => sum + item.costs, 0),
    totalNet: ventures.reduce((sum, item) => sum + item.net, 0)
  };
}
