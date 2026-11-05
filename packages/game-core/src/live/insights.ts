// Stage 16: имена фактов и пороги заметок. Это не автобаланс и не клиентский трекер.
export const INSIGHT_NAMES = [
  "life.created",
  "life.died",
  "track.rank",
  "level.up",
  "quest.done",
  "quest.failed",
  "adventure.done",
  "adventure.failed",
  "market.trade",
  "live.joined",
  "live.claimed",
  "action.rejected"
] as const;

export type InsightName = (typeof INSIGHT_NAMES)[number];

/** Сколько дней хранить факты. Старше — стираются при чтении сводки */
export const INSIGHT_KEEP_DAYS = 90;
/** Меньше стольких исходов — заметка не звучит как вывод */
export const INSIGHT_MIN_SAMPLE = 8;
/** Доля провалов шага приключения, выше которой шаг помечается трудным */
export const INSIGHT_HARD_RATE = 0.7;

export function isInsightName(value: string): value is InsightName {
  return (INSIGHT_NAMES as readonly string[]).includes(value);
}

export interface InsightFact {
  name: InsightName;
  world: string;
  age: number;
  level: number;
  amount: number;
  ref: string;
}

/** Факт, который можно записать. Пустая строка — нет */
export function factProblem(fact: InsightFact): string {
  if (!isInsightName(fact.name)) return "имя";
  if (fact.ref.length < 8 || fact.ref.length > 80) return "ключ";
  if (fact.world.length > 32) return "мир";
  if (!Number.isInteger(fact.age) || fact.age < 0 || fact.age > 10_000) return "возраст";
  if (!Number.isInteger(fact.level) || fact.level < 0 || fact.level > 10_000) return "уровень";
  if (!Number.isInteger(fact.amount) || fact.amount < -1_000_000_000 || fact.amount > 1_000_000_000) return "число";
  return "";
}

export interface BalanceNote {
  name: InsightName;
  sample: number;
  rate: number;
  /** hard — много провалов, quiet — почти никто не доходит, thin — мало данных */
  kind: "hard" | "quiet" | "thin";
}

/**
 * Заметка по паре успех/провал. Малая выборка не получает вывод «трудно» или «легко».
 * Ничего в игре не меняет
 */
export function balanceNote(name: InsightName, done: number, failed: number): BalanceNote | null {
  const sample = done + failed;
  if (sample === 0) return null;
  if (sample < INSIGHT_MIN_SAMPLE) return { name, sample, rate: failed / sample, kind: "thin" };
  const rate = failed / sample;
  if (done === 0) return { name, sample, rate, kind: "quiet" };
  if (rate >= INSIGHT_HARD_RATE) return { name, sample, rate, kind: "hard" };
  return null;
}
