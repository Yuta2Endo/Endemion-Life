// То, что видит игрок: событие с вариантами, шансами и причинами блокировки, итоговые показатели персонажа.
// Клиент получает только это представление и не может вычислить исход сам: шанс показан, бросок делает сервер
import { effectiveStats, lifespanOf, maxResources, nextRankThreshold, xpForLevel } from "../character/derived.js";
import { fillText, type LocalizedText } from "../i18n.js";
import { findEvent } from "../narrative/selection.js";
import { isMilestoneEvent } from "../life/milestones.js";
import type { Resources, Stats } from "../stats.js";
import type { GameState, LifeStage } from "../types.js";
import { getUniverse } from "../universes/registry.js";
import type { Effect } from "../narrative/types.js";
import { checkChance } from "./checks.js";
import { checkCondition, describeCondition } from "./conditions.js";

function touchesOf(effects: readonly Effect[]): ChoiceTouch[] {
  const found = new Set<ChoiceTouch>();
  for (const effect of effects) {
    if (effect.type === "affinity" || effect.type === "npc" || effect.type === "npcRole" || effect.type === "npcDies") found.add("relation");
    else if (effect.type === "wealth") found.add("gold");
    else if (effect.type === "track" || effect.type === "breakthrough" || effect.type === "skill" || effect.type === "specialization") found.add("path");
  }
  return [...found];
}

export type ChoiceTouch = "relation" | "gold" | "path";

export interface ChoiceView {
  id: string;
  text: LocalizedText;
  available: boolean;
  /** Почему вариант недоступен */
  locked: LocalizedText[];
  /** Шанс успеха проверки. null — вариант без проверки */
  chance: number | null;
  /** Что заденет удачный исход, без чисел */
  touches: ChoiceTouch[];
}

export interface EventView {
  eventId: string;
  age: number;
  title: LocalizedText;
  text: LocalizedText;
  choices: ChoiceView[];
  /** Событие пришло только как продолжение цепочки, не как случайный год */
  scheduled: boolean;
  /** Возрастной рубеж: специальная веха жизни, на которой игра останавливается */
  isMilestone: boolean;
}

export interface CharacterSummary {
  stats: Stats;
  baseStats: Stats;
  maxResources: Resources;
  xpToNext: number;
  lifespan: number;
  stage: LifeStage;
  rankName: LocalizedText;
  nextRankThreshold: number | null;
  trackOpen: boolean;
}

export function presentEvent(state: GameState): EventView | null {
  if (!state.pending) return null;
  const universe = getUniverse(state.character.universeId);
  const event = findEvent(universe, state.pending.eventId);
  if (!event) return null;
  const vars = { name: state.character.name };
  return {
    eventId: event.id,
    age: state.pending.age,
    title: fillText(event.title, vars),
    text: fillText(event.text, vars),
    scheduled: event.scheduledOnly === true,
    isMilestone: isMilestoneEvent(event.id),
    choices: event.choices.map((choice) => {
      const failed = (choice.requires ?? []).filter((condition) => !checkCondition(state, condition));
      return {
        id: choice.id,
        text: fillText(choice.text, vars),
        available: failed.length === 0,
        locked: failed.map((condition) => describeCondition(condition, universe)),
        chance: choice.check ? checkChance(state.character, choice.check, state) : null,
        touches: touchesOf(choice.success.effects)
      };
    })
  };
}

export function summarizeCharacter(state: GameState): CharacterSummary {
  const c = state.character;
  const universe = getUniverse(c.universeId);
  const flag = universe.track.requiresFlag;
  return {
    stats: effectiveStats(c),
    baseStats: { ...c.stats },
    maxResources: maxResources(c),
    xpToNext: xpForLevel(c.level),
    lifespan: lifespanOf(c),
    stage: state.life.stage,
    rankName: universe.track.ranks[c.track.rank]?.name ?? universe.track.ranks[0]!.name,
    nextRankThreshold: nextRankThreshold(c),
    trackOpen: flag === undefined || state.flags.includes(flag)
  };
}
