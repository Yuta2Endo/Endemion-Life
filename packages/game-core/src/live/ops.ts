// Stage 15: календарь живых окон. Не сюжетный движок: срок — дата UTC, не возраст персонажа.
// Состояние окна живёт в базе. Здесь только правила, их можно проверить без сервера.
import type { UniverseId } from "../types.js";

export const LIVE_STATUSES = ["draft", "scheduled", "active", "completed", "cancelled", "archived"] as const;
export type LiveStatus = (typeof LIVE_STATUSES)[number];

/** Куда можно перейти руками. Срок двигает окно сам, отдельной стрелки у него нет */
const NEXT: Readonly<Record<LiveStatus, readonly LiveStatus[]>> = {
  draft: ["scheduled", "cancelled"],
  scheduled: ["draft", "cancelled"],
  active: ["cancelled"],
  completed: ["archived"],
  cancelled: ["archived"],
  archived: []
};

export function isLiveStatus(value: string): value is LiveStatus {
  return (LIVE_STATUSES as readonly string[]).includes(value);
}

/** Ручной переход. Срок сюда не входит: его применяет dueStatus */
export function canMove(from: LiveStatus, to: LiveStatus): boolean {
  return NEXT[from].includes(to);
}

/**
 * Что сделать со сроком. now, startsAt и endsAt — миллисекунды UTC.
 * Просроченное scheduled открывается, просроченное active закрывается. Остальное не трогается.
 */
export function dueStatus(status: LiveStatus, startsAt: number, endsAt: number, now: number): LiveStatus {
  if (status === "scheduled" && now >= startsAt) return "active";
  if (status === "active" && now >= endsAt) return "completed";
  return status;
}

/** Ключ дня UTC: один шаблон не откроет два окна на одну дату */
export function dayKey(templateId: string, now: number): string {
  return `${templateId}:${new Date(now).toISOString().slice(0, 10)}`;
}

/** Ключ недели UTC. Неделя начинается в понедельник. Год — год этого понедельника */
export function weekKey(templateId: string, now: number): string {
  const date = new Date(now);
  const utc = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
  const day = new Date(utc).getUTCDay();
  const monday = utc - ((day + 6) % 7) * 86_400_000;
  const start = new Date(monday);
  return `${templateId}:${start.getUTCFullYear()}-W${isoWeek(start)}`;
}

function isoWeek(monday: Date): string {
  const yearStart = Date.UTC(monday.getUTCFullYear(), 0, 1);
  const week = Math.floor((monday.getTime() - yearStart) / (7 * 86_400_000)) + 1;
  return String(week).padStart(2, "0");
}

/** Полночь UTC этого дня и полночь следующего */
export function utcDay(now: number): { start: number; end: number } {
  const date = new Date(now);
  const start = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
  return { start, end: start + 86_400_000 };
}

/** Понедельник этой недели UTC и понедельник следующей */
export function utcWeek(now: number): { start: number; end: number } {
  const date = new Date(now);
  const utc = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
  const day = new Date(utc).getUTCDay();
  const start = utc - ((day + 6) % 7) * 86_400_000;
  return { start, end: start + 7 * 86_400_000 };
}

/** Пустой список миров — окно для всех. Иначе только перечисленные */
export function worldFits(worlds: readonly string[], universeId: UniverseId): boolean {
  return worlds.length === 0 || worlds.includes(universeId);
}

export interface LiveRules {
  minAge: number;
  goal: number;
  perLife: number;
  /** У жизни есть неотвеченное событие года */
  pending: boolean;
  alive: boolean;
  age: number;
  universeId: UniverseId;
}

/** Почему жизнь не может вложиться. Пустая строка — может */
export function joinBlock(rules: LiveRules, worlds: readonly string[], already: number): string {
  if (!rules.alive) return "Жизнь уже кончилась";
  if (rules.pending) return "Сначала ответьте на событие";
  if (!worldFits(worlds, rules.universeId)) return "Окно не для этого мира";
  if (rules.age < rules.minAge) return "Персонаж ещё молод";
  if (already >= rules.perLife) return "Эта жизнь уже вложилась";
  return "";
}

/** Награда ещё не выдана, жизнь вкладывалась, окно не снято */
export function canClaim(status: LiveStatus, contributed: boolean, claimed: boolean): boolean {
  if (claimed || !contributed) return false;
  return status === "active" || status === "completed";
}
