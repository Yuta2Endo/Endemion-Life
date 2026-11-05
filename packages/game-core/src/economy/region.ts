// Stage 06: край вокруг персонажа. Это не общий мир всех игроков — у каждой жизни свой.
// Склад товаров, напряжение и благополучие. Год края считает годовой цикл, без бросков:
// одно и то же состояние всегда даёт один и тот же следующий год.
// Склад не уходит ниже нуля и выше предела, поэтому скупка не печатает товары, а простой не копит их бесконечно.
import type { EngineContext } from "../engine/context.js";
import type { LocalizedText } from "../i18n.js";
import { addChronicle } from "../legacy/chronicle.js";
import { SELF_ID } from "../types.js";
import type { GameState } from "../types.js";
import { adventuresOf } from "../adventure/content.js";
import { goodsOf } from "./market.js";

/** Склад одного товара: 0 — пусто, 100 — полон */
export const STOCK_MAX = 100;
/** Склад новой жизни и старых сохранений */
export const STOCK_START = 60;
/** За год без торговли склад восстанавливается на столько */
export const STOCK_REGEN = 8;
/** Покупка одной штуки снимает со склада столько */
export const STOCK_PER_BUY = 4;
/** Продажа одной штуки возвращает на склад столько — меньше, чем снимает покупка */
export const STOCK_PER_SELL = 3;
/**
 * Насколько цена гуляет от склада: пустой ×(1+размах), полный ×(1−размах).
 * Размах обязан быть меньше разницы наценки и скидки лавки (1.25 против 0.8),
 * иначе пустой склад сделал бы продажу выгоднее покупки
 */
export const STOCK_SWING = 0.02;
const STRAIN_MAX = 100;
/** За тихий год напряжение спадает на столько */
const STRAIN_DECAY = 2;
const PROSPERITY_DECAY = 1;
export const MAX_REGION_LOG = 12;

export const REGION_LOG_KINDS = ["strain", "prosper", "shortage", "adventure"] as const;
export type RegionLogKind = (typeof REGION_LOG_KINDS)[number];

export interface RegionLogEntry {
  age: number;
  kind: RegionLogKind;
}

export interface RegionState {
  /** Склад по id товара мира */
  stock: Record<string, number>;
  /** 0–100: край напряжён — дороги хуже, люди злее */
  strain: number;
  /** 0–100: край благополучен */
  prosperity: number;
  /** Приключения, чей след уже учтён. Повторно край не двигают */
  seen: string[];
  log: RegionLogEntry[];
}

/**
 * След приключения на край. Первое число — напряжение, второе — благополучие.
 * Провал даёт противоположное и вдвое слабее (regionYear)
 */
const ADVENTURE_MARK: Readonly<Record<string, readonly [number, number]>> = {
  "df.night-watch": [-6, 4],
  "is.first-contract": [-4, 6],
  "mu.smugglers": [-4, 4],
  "xi.forbidden": [-2, 6],
  "hu.gate-raid": [-8, 2],
  "ac.court-errand": [-2, 4]
};

/** Вторая дорога мира: слабее первой и без своей строки */
const SECOND_MARK: readonly [number, number] = [-3, 3];

function clamp(value: number, max: number): number {
  return Math.max(0, Math.min(max, Math.round(value)));
}

export function newRegion(universeId: GameState["character"]["universeId"]): RegionState {
  const stock: Record<string, number> = {};
  for (const item of goodsOf(universeId)) stock[item.id] = STOCK_START;
  return { stock, strain: 0, prosperity: 0, seen: [], log: [] };
}

function note(state: GameState, kind: RegionLogKind): void {
  const log = state.region.log;
  log.push({ age: state.life.age, kind });
  if (log.length > MAX_REGION_LOG) log.splice(0, log.length - MAX_REGION_LOG);
}

/** Множитель цены от склада. Пустой склад — дороже, полный — дешевле. В пределах 1±STOCK_SWING */
export function stockFactor(stock: number): number {
  const filled = Math.max(0, Math.min(STOCK_MAX, stock)) / STOCK_MAX;
  return 1 + STOCK_SWING - filled * STOCK_SWING * 2;
}

export function regionStock(state: GameState, goodId: string): number {
  return state.region.stock[goodId] ?? STOCK_START;
}

/** Покупка и продажа двигают склад сразу. Бросков нет, поэтому повтор действия повторим */
export function tradeRegion(state: GameState, goodId: string, side: "buy" | "sell", qty: number): void {
  const region = state.region;
  const stock = region.stock[goodId] ?? STOCK_START;
  if (side === "buy") {
    region.stock[goodId] = clamp(stock - qty * STOCK_PER_BUY, STOCK_MAX);
    region.strain = clamp(region.strain + 1, STRAIN_MAX);
    if (region.stock[goodId] === 0) note(state, "shortage");
  } else {
    region.stock[goodId] = clamp(stock + qty * STOCK_PER_SELL, STOCK_MAX);
    region.prosperity = clamp(region.prosperity + 1, STRAIN_MAX);
  }
}

export function changeStrain(state: GameState, delta: number): void {
  state.region.strain = clamp(state.region.strain + delta, STRAIN_MAX);
}

export function changeProsperity(state: GameState, delta: number): void {
  state.region.prosperity = clamp(state.region.prosperity + delta, STRAIN_MAX);
}

/**
 * Год края. Склад растёт, напряжение и благополучие остывают, завершённое приключение оставляет след один раз.
 * Генератор не читается
 */
export function regionYear(ctx: EngineContext): void {
  const state = ctx.state;
  const region = state.region;
  for (const item of goodsOf(state.character.universeId)) {
    const stock = region.stock[item.id] ?? STOCK_START;
    region.stock[item.id] = clamp(stock + STOCK_REGEN, STOCK_MAX);
  }
  const strainBefore = region.strain;
  region.strain = clamp(region.strain - STRAIN_DECAY, STRAIN_MAX);
  region.prosperity = clamp(region.prosperity - PROSPERITY_DECAY, STRAIN_MAX);
  if (strainBefore >= 60 && region.strain < strainBefore) note(state, "strain");

  const adventure = state.adventure;
  // Любое приключение мира, не только помеченное: след на край есть у помеченных, запись в хронике — у всех
  for (const defined of adventuresOf(state.character.universeId)) {
    const id = defined.id;
    if (region.seen.includes(id)) continue;
    const done = adventure.done.includes(id);
    const failed = adventure.failed.includes(id);
    if (!done && !failed) continue;
    // Первая дорога — своя строка. Вторая (Stage 11) двигает край слабее и одинаково
    const mark = ADVENTURE_MARK[id] ?? (defined.requires?.length ? SECOND_MARK : undefined);
    if (mark) {
      const [strain, prosperity] = done ? mark : [-Math.round(mark[0] / 2), -Math.round(mark[1] / 2)];
      region.strain = clamp(region.strain + strain, STRAIN_MAX);
      region.prosperity = clamp(region.prosperity + prosperity, STRAIN_MAX);
    }
    // Дело пишется до отметки в seen: повтор года его не создаст
    addChronicle(state, "deed", [SELF_ID], { deed: id, outcome: done ? "done" : "failed" }, id);
    region.seen.push(id);
    note(state, "adventure");
  }
}

// ——— Представление ———

export type StockBand = "low" | "enough" | "high";

export function stockBand(stock: number): StockBand {
  if (stock < 30) return "low";
  if (stock > 70) return "high";
  return "enough";
}

export interface RegionGoodView {
  id: string;
  name: LocalizedText;
  stock: number;
  band: StockBand;
}

export interface RegionView {
  strain: number;
  prosperity: number;
  goods: RegionGoodView[];
  /** Край напряжён: от 60 */
  strained: boolean;
  /** Край благополучен: от 50 */
  prospering: boolean;
  log: { age: number; kind: RegionLogKind }[];
}

export function presentRegion(state: GameState): RegionView {
  const region = state.region;
  return {
    strain: region.strain,
    prosperity: region.prosperity,
    strained: region.strain >= 60,
    prospering: region.prosperity >= 50,
    goods: goodsOf(state.character.universeId).map((item) => {
      const stock = region.stock[item.id] ?? STOCK_START;
      return { id: item.id, name: item.name, stock, band: stockBand(stock) };
    }),
    log: region.log.slice(-4).reverse()
  };
}
