// Stage 05: приключения. Состояние живёт в сохранении (state.adventure), исход считает сервер.
// Броски идут из отдельного потока seed::adventure — основной генератор жизни новых чисел не берёт.
// Награда шага выдаётся один раз: шаг записывается до эффектов, закрытое приключение не переигрывается.
import { checkChance } from "../engine/checks.js";
import { checkAll } from "../engine/conditions.js";
import type { EngineContext } from "../engine/context.js";
import { applyEffects } from "../engine/effects.js";
import { GameRuleError } from "../errors.js";
import { fillText, t, type LocalizedText } from "../i18n.js";
import type { Effect } from "../narrative/types.js";
import { findSkill } from "../rpg/skills.js";
import { Rng } from "../rng.js";
import { STAT_INFO } from "../stats.js";
import type { GameState } from "../types.js";
import { getUniverse } from "../universes/registry.js";
import { adventuresOf, findAdventure, findPlace, placesOf } from "./content.js";
import type { AdventureDefinition, AdventureLogEntry, AdventureState, AdventureStep, StepOutcome, VentureChoice } from "./types.js";

/** Журнал приключения в сохранении не длиннее */
export const MAX_ADVENTURE_LOG = 24;
/** Сколько мест может открыться за один год */
const DISCOVER_PER_YEAR = 1;

export function newAdventure(): AdventureState {
  return { discovered: [], active: null, done: [], failed: [], log: [] };
}

function adventureRng(state: GameState): Rng {
  return Rng.fromSeed(state.seed, `adventure::${state.rngState}`);
}

function remember(state: GameState, entry: AdventureLogEntry): void {
  state.adventure.log.push(entry);
  if (state.adventure.log.length > MAX_ADVENTURE_LOG) state.adventure.log.splice(0, state.adventure.log.length - MAX_ADVENTURE_LOG);
}

function knownAdventure(state: GameState, id: string): AdventureDefinition {
  const adventure = findAdventure(state.character.universeId, id);
  if (!adventure) throw new GameRuleError("ADVENTURE_LOCKED", "Такого приключения в этом мире нет");
  return adventure;
}

function stepOf(adventure: AdventureDefinition, stepId: string): AdventureStep {
  const step = adventure.steps.find((item) => item.id === stepId);
  if (!step) throw new GameRuleError("INVALID_SAVE", `Шаг ${stepId} приключения ${adventure.id} не найден`);
  return step;
}

/** Почему приключение нельзя начать прямо сейчас. null — можно */
export function adventureBlock(state: GameState, adventure: AdventureDefinition): "pending" | "active" | "age" | "place" | "requires" | "done" | "failed" | null {
  const a = state.adventure;
  if (state.pending) return "pending";
  if (a.active) return "active";
  if (state.life.age < adventure.minAge) return "age";
  if (!a.discovered.includes(adventure.placeId)) return "place";
  if ((adventure.requires ?? []).some((id) => !a.done.includes(id))) return "requires";
  if (a.done.includes(adventure.id)) return "done";
  if (a.failed.includes(adventure.id)) return "failed";
  return null;
}

/**
 * Год жизни: открывается не больше одного места, если возраст подошёл.
 * Поток отдельный, поэтому основное состояние генератора не меняется
 */
export function discoverYearly(state: GameState): LocalizedText | null {
  const age = state.life.age;
  const closed = placesOf(state.character.universeId).filter((place) => place.minAge <= age && !state.adventure.discovered.includes(place.id));
  if (closed.length === 0) return null;
  const rng = adventureRng(state);
  if (!rng.chance(0.5)) return null;
  const found = rng.pick(closed.slice(0, Math.min(DISCOVER_PER_YEAR, closed.length)));
  state.adventure.discovered.push(found.id);
  remember(state, { adventureId: found.id, age, kind: "discover" });
  return t(`Открыто место: ${found.name.ru}. ${found.text.ru}`, `Discovered: ${found.name.en}. ${found.text.en}`);
}

export interface VentureOutcome {
  title: LocalizedText;
  text: LocalizedText;
  /** Бросок проверки, если она была */
  check?: { chance: number; success: boolean };
}

function finish(state: GameState, adventureId: string, kind: "complete" | "fail" | "abandon"): void {
  state.adventure.active = null;
  const list = kind === "complete" ? state.adventure.done : state.adventure.failed;
  if (!list.includes(adventureId)) list.push(adventureId);
  remember(state, { adventureId, age: state.life.age, kind });
}

/** Начать приключение. Клиент называет только id */
export function beginAdventure(ctx: EngineContext, adventureId: string): VentureOutcome {
  const state = ctx.state;
  if (!state.life.alive) throw new GameRuleError("LIFE_ENDED", "Эта жизнь уже закончилась");
  const adventure = knownAdventure(state, adventureId);
  const block = adventureBlock(state, adventure);
  if (block === "pending") throw new GameRuleError("EVENT_PENDING", "Сначала ответьте на событие");
  if (block !== null) throw new GameRuleError("ADVENTURE_LOCKED", "Это приключение сейчас недоступно");
  const first = adventure.steps[0];
  if (!first) throw new GameRuleError("INVALID_SAVE", `У приключения ${adventure.id} нет шагов`);
  state.adventure.active = { id: adventure.id, step: first.id, since: state.life.age };
  remember(state, { adventureId: adventure.id, age: state.life.age, kind: "begin" });
  return { title: adventure.name, text: t(`${adventure.text.ru} ${first.text.ru}`, `${adventure.text.en} ${first.text.en}`) };
}

/** Сдаться. Награды нет, приключение уходит в проваленные и не начинается снова */
export function abandonAdventure(ctx: EngineContext): VentureOutcome {
  const state = ctx.state;
  const active = state.adventure.active;
  if (!active) throw new GameRuleError("ADVENTURE_LOCKED", "Сейчас нет приключения, которое можно бросить");
  if (state.pending) throw new GameRuleError("EVENT_PENDING", "Сначала ответьте на событие");
  const adventure = knownAdventure(state, active.id);
  finish(state, adventure.id, "abandon");
  return {
    title: adventure.name,
    text: t("Вы отступаете. Дорога запомнится, награды не будет.", "You turn back. The road will be remembered; there is no reward.")
  };
}

function resolve(choice: VentureChoice, success: boolean): StepOutcome {
  if (success) return choice.success;
  return (
    choice.failure ?? {
      text: t("Не вышло.", "It didn't work."),
      effects: [],
      fail: true
    }
  );
}

/**
 * Шаг активного приключения. Клиент называет только вариант.
 * Повторно шаг не переигрывается: активный шаг один, и он меняется до выдачи награды
 */
export function venture(ctx: EngineContext, choiceId: string): VentureOutcome {
  const state = ctx.state;
  const active = state.adventure.active;
  if (!active) throw new GameRuleError("ADVENTURE_LOCKED", "Сейчас нет приключения");
  if (state.pending) throw new GameRuleError("EVENT_PENDING", "Сначала ответьте на событие");
  const adventure = knownAdventure(state, active.id);
  const step = stepOf(adventure, active.step);
  const choice = step.choices.find((item) => item.id === choiceId);
  if (!choice) throw new GameRuleError("UNKNOWN_CHOICE", "Такого варианта нет");
  if (!checkAll(state, choice.requires)) throw new GameRuleError("CHOICE_LOCKED", "Этот вариант сейчас недоступен");

  let success = true;
  let check: VentureOutcome["check"];
  if (choice.check) {
    const chance = checkChance(state.character, choice.check, state);
    // Отдельный поток: число уходит из основного генератора только если бы мы читали ctx.rng
    success = adventureRng(state).next() < chance;
    check = { chance, success };
  }
  const outcome = resolve(choice, success);
  // Сначала переход, потом эффекты: повтор того же шага уже не найдёт прежний choice на месте
  if (outcome.complete) finish(state, adventure.id, "complete");
  else if (outcome.fail) finish(state, adventure.id, "fail");
  else if (outcome.next) {
    stepOf(adventure, outcome.next);
    active.step = outcome.next;
    remember(state, { adventureId: adventure.id, age: state.life.age, kind: "step" });
  } else throw new GameRuleError("INVALID_SAVE", `Исход шага ${step.id} никуда не ведёт`);
  ctx.source = adventure.id;
  applyEffects(ctx, outcome.effects);
  ctx.source = undefined;
  return { title: adventure.name, text: fillText(outcome.text, { name: state.character.name }), check };
}

// ——— Представление для клиента ———

export interface RewardView {
  text: LocalizedText;
}

function effectText(state: GameState, effect: Effect): LocalizedText | null {
  const universe = getUniverse(state.character.universeId);
  switch (effect.type) {
    case "xp":
      return t(`опыт +${effect.amount}`, `experience +${effect.amount}`);
    case "wealth":
      return t(`золото ${effect.delta > 0 ? "+" : ""}${effect.delta}`, `gold ${effect.delta > 0 ? "+" : ""}${effect.delta}`);
    case "reputation":
      return t(`репутация ${effect.delta > 0 ? "+" : ""}${effect.delta}`, `reputation ${effect.delta > 0 ? "+" : ""}${effect.delta}`);
    case "skill": {
      const skill = findSkill(universe, effect.id);
      return skill ? t(`${skill.name.ru} +${effect.delta}`, `${skill.name.en} +${effect.delta}`) : null;
    }
    case "ability": {
      const ability = universe.abilities.find((item) => item.id === effect.id);
      return ability ? t(`способность «${ability.name.ru}»`, `ability "${ability.name.en}"`) : null;
    }
    case "faction": {
      const faction = universe.factions.find((item) => item.id === effect.id);
      return faction ? t(`${faction.name.ru} ${effect.delta > 0 ? "+" : ""}${effect.delta}`, `${faction.name.en} ${effect.delta > 0 ? "+" : ""}${effect.delta}`) : null;
    }
    case "meter": {
      const meter = universe.meters.find((item) => item.id === effect.id);
      return meter ? t(`${meter.name.ru} ${effect.delta > 0 ? "+" : ""}${effect.delta}`, `${meter.name.en} ${effect.delta > 0 ? "+" : ""}${effect.delta}`) : null;
    }
    case "stat":
      return t(`${STAT_INFO[effect.stat].name.ru} ${effect.delta > 0 ? "+" : ""}${effect.delta}`, `${STAT_INFO[effect.stat].name.en} ${effect.delta > 0 ? "+" : ""}${effect.delta}`);
    default:
      return null;
  }
}

function rewardsOf(state: GameState, outcome: StepOutcome): RewardView[] {
  return outcome.effects.flatMap((effect) => {
    const text = effectText(state, effect);
    return text ? [{ text }] : [];
  });
}

export interface ChoiceView {
  id: string;
  text: LocalizedText;
  available: boolean;
  chance: number | null;
  rewards: RewardView[];
}

export interface StepView {
  text: LocalizedText;
  choices: ChoiceView[];
}

export interface AdventureView {
  id: string;
  name: LocalizedText;
  text: LocalizedText;
  placeId: string;
  minAge: number;
  /** null — можно начать */
  blocked: ReturnType<typeof adventureBlock>;
  /** Награды последнего шага, если приключение ещё не начато: игрок видит, зачем идти */
  rewards: RewardView[];
}

export interface PlaceView {
  id: string;
  discovered: boolean;
  name: LocalizedText | null;
  text: LocalizedText | null;
  minAge: number;
}

export interface AdventureLogView {
  age: number;
  kind: AdventureLogEntry["kind"];
  name: LocalizedText;
}

export interface AdventureBoard {
  places: PlaceView[];
  adventures: AdventureView[];
  /** Текущий шаг. null — приключение не идёт */
  current: (AdventureView & { step: StepView }) | null;
  discovered: number;
  placesTotal: number;
  completed: number;
  log: AdventureLogView[];
}

function choiceView(state: GameState, choice: VentureChoice): ChoiceView {
  const available = checkAll(state, choice.requires);
  return {
    id: choice.id,
    text: choice.text,
    available,
    chance: choice.check && available ? checkChance(state.character, choice.check, state) : null,
    rewards: rewardsOf(state, choice.success)
  };
}

export function presentAdventure(state: GameState): AdventureBoard {
  const universeId = state.character.universeId;
  const adventureState = state.adventure;
  const places = placesOf(universeId).map((place): PlaceView => {
    const discovered = adventureState.discovered.includes(place.id);
    return { id: place.id, discovered, name: discovered ? place.name : null, text: discovered ? place.text : null, minAge: place.minAge };
  });
  const adventures = adventuresOf(universeId).map((adventure): AdventureView => ({
    id: adventure.id,
    name: adventure.name,
    text: adventure.text,
    placeId: adventure.placeId,
    minAge: adventure.minAge,
    blocked: adventureBlock(state, adventure),
    rewards: adventure.steps.at(-1)?.choices[0] ? rewardsOf(state, adventure.steps.at(-1)!.choices[0]!.success) : []
  }));
  const active = adventureState.active;
  const definition = active ? findAdventure(universeId, active.id) : undefined;
  const step = definition?.steps.find((item) => item.id === active?.step);
  const current =
    definition && step && active
      ? {
          id: definition.id,
          name: definition.name,
          text: definition.text,
          placeId: definition.placeId,
          minAge: definition.minAge,
          blocked: null,
          rewards: [],
          step: { text: step.text, choices: step.choices.map((choice) => choiceView(state, choice)) }
        }
      : null;
  return {
    places,
    adventures,
    current,
    discovered: places.filter((place) => place.discovered).length,
    placesTotal: places.length,
    completed: adventureState.done.length,
    log: adventureState.log.slice(-8).reverse().flatMap((entry) => {
      const place = findPlace(universeId, entry.adventureId);
      const adventure = findAdventure(universeId, entry.adventureId);
      const name = place?.name ?? adventure?.name;
      return name ? [{ age: entry.age, kind: entry.kind, name }] : [];
    })
  };
}
