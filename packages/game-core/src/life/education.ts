// Stage 02.2: образование. Детерминированное обучение по ступеням мира:
// детство → ремесло или академия → высшая ступень. Игрок выбирает поступление событием,
// годы идут сами, по окончании character.educationId получает пройденную ступень.
// Модуль не знает о хозяйстве и событиях: только состояние, правила и представление.
import { findEducation } from "../rpg/skills.js";
import type { EngineContext } from "../engine/context.js";
import { record } from "../engine/record.js";
import { t, type LocalizedText } from "../i18n.js";
import { clamp } from "../stats.js";
import type { EducationState, GameState, UniverseId } from "../types.js";
import type { EducationDefinition, UniverseDefinition } from "../universes/types.js";

/** Сколько лет может длиться один курс. Больше — уже не обучение, а состояние жизни */
export const MAX_EDUCATION_DURATION = 8;

/** Плата за год обучения по ступеням мира: 0 — грамота, 1 — ремесло/академия, 2 — высшая ступень */
export const EDUCATION_TUITION: Readonly<Record<UniverseId, readonly [number, number, number]>> = {
  "dark-fantasy": [0, 6, 14],
  isekai: [0, 8, 18],
  murim: [0, 6, 12],
  xianxia: [0, 8, 16],
  hunter: [0, 10, 22],
  academy: [0, 12, 26]
};

export function tuitionFor(universeId: UniverseId, tier: number): number {
  return EDUCATION_TUITION[universeId][clamp(tier - 1, 0, 2)] ?? 0;
}

/** Ступени образования мира. У каждого мира ровно три: грамота, ремесло/академия, высшая ступень */
export interface EducationStep {
  tier: number;
  /** С какого возраста можно начать */
  minAge: number;
  /** Сколько лет длится курс */
  duration: number;
  /** Какую ступень нужно уже иметь */
  requiresTier: number;
}

export const EDUCATION_LADDER: readonly EducationStep[] = [
  { tier: 1, minAge: 6, duration: 2, requiresTier: 0 },
  { tier: 2, minAge: 12, duration: 3, requiresTier: 1 },
  { tier: 3, minAge: 17, duration: 4, requiresTier: 2 }
];

export function educationStep(tier: number): EducationStep | undefined {
  return EDUCATION_LADDER.find((step) => step.tier === tier);
}

/** Сколько лет учиться на эту ступень. Неизвестная ступень — 0 */
export function educationDuration(tier: number): number {
  return educationStep(tier)?.duration ?? 0;
}

export function newEducationState(): EducationState {
  return { currentId: null, startedAt: 0, progress: 0, duration: 0 };
}

/** Защита на границе действия: курс не может пропускать ступень, идти дольше предела или быть уже завершённым */
export function normalizeEducationState(state: GameState, universe: UniverseDefinition): EducationState {
  const raw = state.education;
  if (!raw) return newEducationState();
  const current = findEducation(universe, raw.currentId);
  const completedTier = findEducation(universe, state.character.educationId)?.tier ?? 0;
  if (!current || current.tier !== completedTier + 1) return newEducationState();
  const step = educationStep(current.tier);
  if (!step) return newEducationState();
  const duration = Number.isInteger(raw.duration) && raw.duration >= 1 && raw.duration <= MAX_EDUCATION_DURATION ? raw.duration : step.duration;
  const progress = Number.isInteger(raw.progress) ? clamp(raw.progress, 0, Math.max(0, duration - 1)) : 0;
  const startedAt = Number.isInteger(raw.startedAt) ? clamp(raw.startedAt, 0, state.life.age) : state.life.age;
  return { currentId: current.id, startedAt, progress, duration };
}

function completedTier(universe: UniverseDefinition, state: GameState): number {
  return findEducation(universe, state.character.educationId)?.tier ?? 0;
}

/** Обучение можно начать, только если пройдена предыдущая ступень и персонаж достаточно взрослый */
export function canEnrollEducation(universe: UniverseDefinition, state: GameState, id: string): boolean {
  const education = findEducation(universe, id);
  const step = education ? educationStep(education.tier) : undefined;
  if (!education || !step) return false;
  if (state.education.currentId !== null || !state.life.alive) return false;
  if (state.life.age < step.minAge) return false;
  return completedTier(universe, state) === step.requiresTier;
}

/** Поступление. Возвращает false, если курс недоступен: проверка повторяется и здесь, а не только в событии */
export function enrollEducation(ctx: EngineContext, id: string): boolean {
  const state = ctx.state;
  if (!canEnrollEducation(ctx.universe, state, id)) return false;
  const education = findEducation(ctx.universe, id);
  const step = education ? educationStep(education.tier) : undefined;
  if (!education || !step) return false;
  state.education = {
    currentId: education.id,
    startedAt: state.life.age,
    progress: 0,
    duration: step.duration
  };
  record(ctx, { kind: "education", key: "started", value: education.id });
  return true;
}

/** Обучение прервано: смерть, прямой диплом событием или невозможное состояние */
export function clearEducation(state: GameState): void {
  state.education = newEducationState();
}

/**
 * Год обучения: один год курса. Возвращает id курса, если он закончен, — диплом выдаёт вызывающий код,
 * чтобы навыки и запись истории шли тем же путём, что и у прямого эффекта образования
 */
export function educationYear(ctx: EngineContext): { completedId: string | null } {
  const state = ctx.state;
  const current = findEducation(ctx.universe, state.education.currentId);
  if (!current || !state.life.alive) {
    if (state.education.currentId !== null) clearEducation(state);
    return { completedId: null };
  }
  if (state.education.duration <= 0 || state.education.duration > MAX_EDUCATION_DURATION) {
    clearEducation(state);
    return { completedId: null };
  }
  state.education.progress += 1;
  if (state.education.progress < state.education.duration) return { completedId: null };
  clearEducation(state);
  return { completedId: current.id };
}

export interface EducationCourseView {
  id: string;
  name: LocalizedText;
  description: LocalizedText;
  tier: number;
  /** Пройдено лет */
  progress: number;
  duration: number;
  /** Плата за следующий год обучения */
  tuition: number;
}

export interface EducationView {
  /** Текущий курс. null — сейчас не учится */
  current: EducationCourseView | null;
  /** Последняя пройденная ступень из character.educationId */
  completed: { id: string; name: LocalizedText; tier: number } | null;
  /** Следующая доступная ступень и её требования. null — учиться больше нечему */
  next: { tier: number; minAge: number; duration: number; requiresTier: number; stepName: LocalizedText } | null;
}

const STEP_NAMES: Readonly<Record<number, LocalizedText>> = {
  1: t("Начальная школа", "Schooling"),
  2: t("Ремесло или академия", "Trade or academy"),
  3: t("Высшая ступень", "Higher learning")
};

/** Представление для досье. Плата за обучение берётся из того же справочника, что и годовой расход */
export function presentEducation(state: GameState, universe: UniverseDefinition): EducationView {
  const education = state.education ?? newEducationState();
  const completed = findEducation(universe, state.character.educationId);
  const current = findEducation(universe, education.currentId);
  const next = universe.education
    .filter((item) => item.tier > (completed?.tier ?? 0))
    .sort((a, b) => a.tier - b.tier)[0];
  const step = next ? educationStep(next.tier) : undefined;
  return {
    current: current
      ? {
          id: current.id,
          name: current.name,
          description: current.description,
          tier: current.tier,
          progress: Math.min(education.progress, education.duration),
          duration: education.duration,
          tuition: tuitionFor(universe.id, current.tier)
        }
      : null,
    completed: completed ? { id: completed.id, name: completed.name, tier: completed.tier } : null,
    next: next && step ? { tier: next.tier, minAge: step.minAge, duration: step.duration, requiresTier: step.requiresTier, stepName: STEP_NAMES[next.tier] ?? t("Обучение", "Study") } : null
  };
}

/** Название ступени для событий и подсказок */
export function educationStepName(tier: number): LocalizedText {
  return STEP_NAMES[tier] ?? t("Обучение", "Study");
}

/** Первое образование этой ступени в мире: у каждой вселенной своя школа */
export function educationOfTier(universe: UniverseDefinition, tier: number): EducationDefinition | undefined {
  return universe.education.find((item) => item.tier === tier);
}
