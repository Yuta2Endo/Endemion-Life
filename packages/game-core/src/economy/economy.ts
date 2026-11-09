// Economy Engine (Stage 04): доходы и расходы года. Заработок (ремесло, гильдия, сословие, доход мира),
// мотовство, состояние хозяйства мира, налог мира и стоимость жизни по сословию.
// Золото не уходит ниже нуля (нехватка копится в hardship) и не растёт выше WEALTH_MAX.
// Состояние хозяйства бросается из отдельного потока: основной генератор новых чисел не тянет
import { effectiveStats, meanStat } from "../character/derived.js";
import type { EngineContext } from "../engine/context.js";
import { applyEffect } from "../engine/effects.js";
import { t, type LocalizedText } from "../i18n.js";
import { hashSeed, Rng } from "../rng.js";
import { findProfession } from "../rpg/skills.js";
import { incomeFactor } from "../rpg/talents.js";
import { clamp, type StatKey } from "../stats.js";
import type { EconomyCycle, EconomyLine, EconomyLineId, EconomyState, EconomyYear, GameState } from "../types.js";
import { getUniverse } from "../universes/registry.js";
import { economyOf } from "./worlds.js";

/** С этого возраста персонаж сам платит за жизнь и получает доход сословия */
export const ADULT_AGE = 16;
/** Итогов лет в сохранении не больше стольких */
export const MAX_ECONOMY_YEARS = 10;
/** После стольких лет нехватки подряд бедность бьёт по репутации: −1 в год */
export const HARDSHIP_PENALTY_YEARS = 3;
const MAX_HARDSHIP = 100;
/** Стоимость жизни по ступени сословия 0–5. Ниже дохода сословия той же ступени: сословие само себя кормит */
const LIVING_BY_STANDING = [0, 1, 1, 2, 3, 5] as const;
export const CYCLE_FACTOR: Readonly<Record<EconomyCycle, number>> = { slump: 0.8, normal: 1, boom: 1.2 };
/** Вероятность в год: из обычных лет — в спад или подъём (поровну), из спада или подъёма — назад */
const CYCLE_LEAVE_NORMAL = 0.15;
const CYCLE_RETURN = 0.25;

/** Ремёсла Stage 01 по флагам. Сохранения Stage 01 переводятся в professionId, но флаги остаются (прежде — life/income.ts) */
const JOBS: readonly { flag: string; base: number; stats: StatKey[] }[] = [{ flag: "guild-member", base: 6, stats: ["strength", "agility"] }];

export function newEconomy(age = 0, cycle: EconomyCycle = "normal"): EconomyState {
  return { cycle, cycleSince: age, hardship: 0, last: null, years: [], goods: {} };
}

/** Стоимость жизни в год: с 16 лет, по ступени сословия и миру */
export function livingCost(state: GameState): number {
  if (state.life.age < ADULT_AGE) return 0;
  const universe = getUniverse(state.character.universeId);
  const standing = universe.socialClasses.find((s) => s.id === state.character.socialClassId)?.standing ?? 0;
  return Math.round(LIVING_BY_STANDING[clamp(standing, 0, LIVING_BY_STANDING.length - 1)]! * economyOf(universe.id).livingFactor);
}

/**
 * Статьи года для нынешнего состояния. Заработок до мотовства считается как прежде (life/income.ts Stage 01–03),
 * доход мира (зачистки Врат) мотовство не трогает, как и раньше
 */
export function yearLines(state: GameState): EconomyLine[] {
  const universe = getUniverse(state.character.universeId);
  const world = economyOf(universe.id);
  const c = state.character;
  const stats = effectiveStats(c);
  const lines: EconomyLine[] = [];
  const add = (id: EconomyLineId, amount: number) => {
    if (amount !== 0) lines.push({ id, amount });
  };

  const profession = c.professionId ? findProfession(universe, c.professionId) : undefined;
  const fromProfession = profession ? profession.base + Math.floor(meanStat(stats, profession.stats) / 4) + Math.floor((c.skills[profession.skill] ?? 0) / 10) : 0;
  let fromGuild = 0;
  for (const job of JOBS) if (state.flags.includes(job.flag)) fromGuild += job.base + Math.floor(meanStat(stats, job.stats) / 4);
  // Ремесло без особой специальности тоже приносит немного
  const fromTrade = fromProfession === 0 && fromGuild === 0 && state.flags.includes("profession") ? 2 + Math.floor(meanStat(stats, []) / 6) : 0;
  // Сословие кормит взрослых: рента знати, жалованье, подаяние
  const fromClass = state.life.age >= ADULT_AGE ? (universe.socialClasses.find((s) => s.id === c.socialClassId)?.income ?? 0) : 0;
  const gross = fromProfession + fromGuild + fromTrade + fromClass;
  const afterThrift = Math.max(0, Math.round(gross * incomeFactor(universe, c)));
  add("profession", fromProfession);
  add("guild", fromGuild);
  add("trade", fromTrade);
  add("class", fromClass);
  add("thrift", afterThrift - gross);
  const fromWorld = world.worldIncome?.(state) ?? 0;
  add("world", fromWorld);

  const earned = afterThrift + fromWorld;
  const cycle = earned > 0 ? Math.round(earned * (CYCLE_FACTOR[state.economy.cycle] - 1)) : 0;
  add("cycle", cycle);
  add("tax", -Math.floor((earned + cycle) * world.taxRate));
  add("living", -livingCost(state));
  return lines;
}

/** Спад, обычные годы, подъём. Поток генератора — от seed и состояния основного генератора года: тот не сдвигается */
function rollCycle(ctx: EngineContext): void {
  const state = ctx.state;
  const economy = state.economy;
  const roll = new Rng(hashSeed(`${state.seed}::economy::${ctx.rng.state}`)).next();
  let next = economy.cycle;
  if (economy.cycle === "normal") {
    if (roll < CYCLE_LEAVE_NORMAL / 2) next = "slump";
    else if (roll < CYCLE_LEAVE_NORMAL) next = "boom";
  } else if (roll < CYCLE_RETURN) next = "normal";
  if (next !== economy.cycle) {
    economy.cycle = next;
    economy.cycleSince = state.life.age;
  }
}

/** Хозяйство за прожитый год: состояние мира, доходы и расходы, нехватка. Вызывается из годового цикла (life/aging.ts) */
export function economyYear(ctx: EngineContext): void {
  const state = ctx.state;
  const economy = state.economy;
  rollCycle(ctx);
  const lines = yearLines(state);
  const net = lines.reduce((sum, line) => sum + line.amount, 0);
  const before = state.character.wealth;
  const shortfall = net < 0 && before + net < 0 ? -(before + net) : 0;
  if (net !== 0) applyEffect(ctx, { type: "wealth", delta: net });
  economy.hardship = shortfall > 0 ? Math.min(MAX_HARDSHIP, economy.hardship + 1) : 0;
  if (economy.hardship >= HARDSHIP_PENALTY_YEARS) applyEffect(ctx, { type: "reputation", delta: -1 });

  const income = lines.filter((l) => l.amount > 0).reduce((sum, l) => sum + l.amount, 0);
  const expenses = lines.filter((l) => l.amount < 0).reduce((sum, l) => sum - l.amount, 0);
  economy.last = { age: state.life.age, lines, shortfall };
  if (income > 0 || expenses > 0) economy.years = [...economy.years, { age: state.life.age, income, expenses, shortfall }].slice(-MAX_ECONOMY_YEARS);
}

// ——— Представление для клиента ———

const LINE_NAMES: Readonly<Record<Exclude<EconomyLineId, "world" | "tax">, LocalizedText>> = {
  profession: t("Ремесло", "Profession"),
  guild: t("Гильдия", "Guild"),
  trade: t("Подработка", "Odd jobs"),
  class: t("Доход сословия", "Class income"),
  thrift: t("Мотовство", "Spendthrift ways"),
  cycle: t("Состояние хозяйства", "State of the economy"),
  living: t("Стоимость жизни", "Cost of living")
};

export interface EconomyLineView {
  id: EconomyLineId;
  name: LocalizedText;
  amount: number;
}

export interface EconomyView {
  cycle: EconomyCycle;
  cycleName: LocalizedText;
  cycleDescription: LocalizedText;
  /** Сколько лет держится нынешнее состояние */
  cycleYears: number;
  hardship: number;
  /** Нехватка уже бьёт по репутации */
  hardshipPenalty: boolean;
  taxName: LocalizedText;
  taxPercent: number;
  /** Стоимость жизни в этом году по нынешнему сословию */
  livingCost: number;
  adultAge: number;
  last: { age: number; lines: EconomyLineView[]; income: number; expenses: number; net: number; shortfall: number } | null;
  years: EconomyYear[];
}

export function presentEconomy(state: GameState): EconomyView {
  const universe = getUniverse(state.character.universeId);
  const world = economyOf(universe.id);
  const economy = state.economy;
  const name = (id: EconomyLineId): LocalizedText => (id === "tax" ? world.taxName : id === "world" ? (world.worldIncomeName ?? t("Доход мира", "World income")) : LINE_NAMES[id]);
  const last = economy.last;
  const lines = last ? last.lines.map((line) => ({ id: line.id, name: name(line.id), amount: line.amount })) : [];
  const income = lines.filter((l) => l.amount > 0).reduce((sum, l) => sum + l.amount, 0);
  const expenses = lines.filter((l) => l.amount < 0).reduce((sum, l) => sum - l.amount, 0);
  return {
    cycle: economy.cycle,
    cycleName: world.cycles[economy.cycle].name,
    cycleDescription: world.cycles[economy.cycle].description,
    cycleYears: Math.max(0, state.life.age - economy.cycleSince),
    hardship: economy.hardship,
    hardshipPenalty: economy.hardship >= HARDSHIP_PENALTY_YEARS,
    taxName: world.taxName,
    taxPercent: Math.round(world.taxRate * 100),
    livingCost: livingCost(state),
    adultAge: ADULT_AGE,
    last: last && lines.length > 0 ? { age: last.age, lines, income, expenses, net: income - expenses, shortfall: last.shortfall } : null,
    years: economy.years
  };
}
