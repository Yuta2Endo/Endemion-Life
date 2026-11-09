// Личные цели игрока: одна активная цель на жизнь, оценивается каждый год.
// Цели не дублируют достижения рода — они личные и сбрасываются при передаче rodu.
// Все цели детерминированы: прогресс и завершение считаются из текущего состояния.
import { applyEffect } from "../engine/effects.js";
import type { EngineContext } from "../engine/context.js";
import { fx } from "../narrative/dsl.js";
import { t, type LocalizedText } from "../i18n.js";
import { getUniverse } from "../universes/registry.js";
import { SELF_ID, type GameState } from "../types.js";

export interface GoalDefinition {
  id: string;
  category: "career" | "family" | "wealth" | "knowledge" | "power";
  name: LocalizedText;
  description: LocalizedText;
  minAge: number;
  /** Возраст, после которого незавершённая цель считается проваленной */
  maxAge: number;
  /** Прогресс 0–100 по текущему состоянию */
  progress: (state: GameState) => number;
  /** Цель достигнута */
  completed: (state: GameState) => boolean;
  /** Награда: применяется через applyEffect, изменения попадают в контекст года */
  reward: (ctx: EngineContext) => void;
}

export interface GoalOutcome {
  goalId: string;
  kind: "complete" | "expire";
}

const clamp01 = (value: number): number => Math.max(0, Math.min(100, Math.round(value)));

function standingOf(state: GameState): number {
  const universe = getUniverse(state.character.universeId);
  return universe.socialClasses.find((c) => c.id === state.character.socialClassId)?.standing ?? 0;
}

function maxSkillOf(state: GameState): number {
  const skills = state.character.skills;
  return Math.max(0, ...Object.values(skills));
}

function hasSpouse(state: GameState): boolean {
  return state.npcs.some((npc) => npc.spouseId === SELF_ID || npc.formerSpouses.includes(SELF_ID));
}

function hasChild(state: GameState): boolean {
  return state.npcs.some((npc) => npc.parents.includes(SELF_ID));
}

export const PLAYER_GOALS: readonly GoalDefinition[] = [
  {
    id: "wealth",
    category: "wealth",
    name: t("Построить состояние", "Build wealth"),
    description: t("Накопить состояние и обеспечить будущее рода.", "Build wealth and secure the family's future."),
    minAge: 18,
    maxAge: 60,
    progress: (state) => clamp01((state.character.wealth / 200) * 100),
    completed: (state) => state.character.wealth >= 200,
    reward: (ctx) => {
      applyEffect(ctx, fx.renown(2));
      applyEffect(ctx, fx.rep(3));
    },
  },
  {
    id: "mastery",
    category: "power",
    name: t("Овладеть путём силы", "Master the path of power"),
    description: t("Достичь высшего ранга пути вселенной.", "Reach the highest rank of the universe's path of power."),
    minAge: 18,
    maxAge: 60,
    progress: (state) => {
      const universe = getUniverse(state.character.universeId);
      const maxRank = universe.track.ranks.length - 1;
      return clamp01((state.character.track.rank / maxRank) * 100);
    },
    completed: (state) => {
      const universe = getUniverse(state.character.universeId);
      return state.character.track.rank >= universe.track.ranks.length - 1;
    },
    reward: (ctx) => {
      applyEffect(ctx, fx.karma(5));
      applyEffect(ctx, fx.xp(50));
    },
  },
  {
    id: "rise",
    category: "career",
    name: t("Возвыситься в сословии", "Rise in station"),
    description: t("Подняться на высшую ступень сословия мира.", "Rise to a high station in the world."),
    minAge: 18,
    maxAge: 60,
    progress: (state) => clamp01((standingOf(state) / 4) * 100),
    completed: (state) => standingOf(state) >= 4,
    reward: (ctx) => {
      applyEffect(ctx, fx.wealth(30));
      applyEffect(ctx, fx.renown(3));
    },
  },
  {
    id: "knowledge",
    category: "career",
    name: t("Овладеть ремеслом", "Master a craft"),
    description: t("Довести любой навык до уровня мастера.", "Bring any skill to mastery level."),
    minAge: 18,
    maxAge: 60,
    progress: (state) => clamp01((maxSkillOf(state) / 60) * 100),
    completed: (state) => maxSkillOf(state) >= 60,
    reward: (ctx) => {
      applyEffect(ctx, fx.stat("wisdom", 1));
      applyEffect(ctx, fx.xp(30));
    },
  },
  {
    id: "family",
    category: "family",
    name: t("Создать семью", "Establish a family"),
    description: t("Жениться/выйти замуж и вырастить ребёнка.", "Marry and raise a child."),
    minAge: 18,
    maxAge: 60,
    progress: (state) => (hasSpouse(state) ? 50 : 0) + (hasChild(state) ? 50 : 0),
    completed: (state) => hasSpouse(state) && hasChild(state),
    reward: (ctx) => {
      applyEffect(ctx, fx.karma(5));
      applyEffect(ctx, fx.renown(2));
    },
  },
];

export function findGoal(id: string): GoalDefinition | undefined {
  return PLAYER_GOALS.find((goal) => goal.id === id);
}

/** Какую цель поставить взрослому персонажу в зависимости от характера (детерминированно). */
export function goalForTemperament(temperamentId: string): string {
  const map: ReadonlyMap<string, string> = new Map([
    ["brave", "rise"],
    ["ambitious", "mastery"],
    ["kind", "family"],
    ["curious", "knowledge"],
    ["calm", "knowledge"],
    ["disciplined", "mastery"],
    ["loyal", "family"],
  ]);
  return map.get(temperamentId) ?? "knowledge";
}

/** Оценить текущую цель персонажа: завершить, проварить по возрасту или оставить активной.
 *  Возвращает результат, если цель изменила статус, иначе null. Меняет состояние персонажа. */
export function evaluateGoal(ctx: EngineContext): GoalOutcome | null {
  const state = ctx.state;
  const character = state.character;
  const goalId = character.goal;
  if (!goalId) return null;
  const definition = findGoal(goalId);
  if (!definition) {
    character.goal = null;
    character.goalProgress = 0;
    return null;
  }
  const progress = clamp01(definition.progress(state));
  character.goalProgress = progress;
  if (definition.completed(state)) {
    definition.reward(ctx);
    character.goal = null;
    character.goalProgress = 0;
    return { goalId, kind: "complete" };
  }
  if (state.life.age >= definition.maxAge) {
    applyEffect(ctx, fx.karma(-1));
    character.goal = null;
    character.goalProgress = 0;
    return { goalId, kind: "expire" };
  }
  return null;
}
