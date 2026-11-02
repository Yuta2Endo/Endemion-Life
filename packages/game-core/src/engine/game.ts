// Игровой цикл: новая жизнь и применение действий. Функции чистые: принимают состояние и возвращают новое
import { generateCharacter, type CharacterInput } from "../character/generator.js";
import { deepClone } from "../clone.js";
import { GameRuleError } from "../errors.js";
import { ageText, fillText, t, type LocalizedText } from "../i18n.js";
import { lifespanOf } from "../character/derived.js";
import { ageOneYear } from "../life/aging.js";
import { DEATH_CAUSES } from "../life/death.js";
import { STAGE_INFO, stageForAge } from "../life/stages.js";
import { findEvent, selectEvent } from "../narrative/selection.js";
import type { OutcomeDefinition } from "../narrative/types.js";
import { hashSeed, Rng } from "../rng.js";
import { getUniverse } from "../universes/registry.js";
import {
  MAX_ADVANCE_YEARS,
  type ActionResult,
  type GameAction,
  type GameState,
  type HistoryEntry,
  type HistoryKind
} from "../types.js";
import { checkAll } from "./conditions.js";
import { checkChance } from "./checks.js";
import type { EngineContext } from "./context.js";
import { applyEffects, isFatal, kill } from "./effects.js";

export const SAVE_SCHEMA_VERSION = 1;
export const SEED_MAX_LENGTH = 64;

const YEAR_TEXTS: readonly LocalizedText[] = [
  t("Год прошёл в повседневных заботах.", "The year passed in everyday cares."),
  t("Времена года сменяют друг друга.", "The seasons turn one after another."),
  t("Тихий год. {name} становится чуть старше и чуть опытнее.", "A quiet year. {name} grows a little older and a little wiser."),
  t("Ничего особенного — и это тоже подарок судьбы.", "Nothing special — and that too is a gift of fate."),
  t("Дни похожи один на другой, но {name} не стоит на месте.", "The days are alike, yet {name} does not stand still.")
];

const DEFAULT_FAILURE: OutcomeDefinition = {
  text: t("Не вышло. Иногда судьба просто говорит «нет».", "It didn't work. Sometimes fate simply says no."),
  effects: []
};

export interface NewGameInput extends CharacterInput {
  seed: string;
}

function validateSeed(seed: string): string {
  if (typeof seed !== "string" || seed.length < 1 || seed.length > SEED_MAX_LENGTH) {
    throw new GameRuleError("INVALID_INPUT", `Seed: от 1 до ${SEED_MAX_LENGTH} символов`);
  }
  return seed;
}

function named(ctx: EngineContext, text: LocalizedText): LocalizedText {
  return fillText(text, { name: ctx.state.character.name });
}

function pushEntry(ctx: EngineContext, entries: HistoryEntry[], kind: HistoryKind, fields: Omit<HistoryEntry, "seq" | "age" | "kind" | "changes">): void {
  entries.push({ seq: ctx.state.nextSeq++, age: ctx.state.life.age, kind, ...fields, changes: ctx.changes });
  ctx.changes = [];
}

function deathEntry(ctx: EngineContext, entries: HistoryEntry[]): void {
  const life = ctx.state.life;
  const cause = life.deathCause ?? DEATH_CAUSES.wounds;
  pushEntry(ctx, entries, "death", {
    title: t("Конец пути", "The end of the road"),
    text: named(ctx, t(`${cause.ru}. {name} прожил ${ageText(life.age).ru}.`, `${cause.en}. {name} lived ${ageText(life.age).en}.`))
  });
}

/** Новая жизнь: персонаж, рождение и первая запись истории */
export function newGame(input: NewGameInput): ActionResult {
  const seed = validateSeed(input.seed);
  const rng = Rng.fromSeed(seed, "life");
  const { character, flags } = generateCharacter(input, rng);
  const universe = getUniverse(character.universeId);
  const state: GameState = {
    schemaVersion: SAVE_SCHEMA_VERSION,
    seed,
    rngState: rng.state,
    version: 1,
    character,
    life: { age: 0, stage: stageForAge(0, lifespanOf(character)), alive: true, deathAge: null, deathCause: null },
    flags,
    occurrences: {},
    lastSeen: {},
    pending: null,
    scheduled: [],
    nextSeq: 1
  };
  const ctx: EngineContext = { state, rng, universe, changes: [] };
  const race = universe.races.find((r) => r.id === character.raceId);
  const origin = universe.origins.find((o) => o.id === character.originId);
  const entries: HistoryEntry[] = [];
  pushEntry(ctx, entries, "birth", {
    title: t("Рождение", "Birth"),
    text: named(
      ctx,
      t(
        `В мире «${universe.name.ru}» рождается {name}. Раса: ${race?.name.ru ?? "—"}. Происхождение: ${origin?.name.ru ?? "—"}.`,
        `In ${universe.name.en}, {name} is born. Race: ${race?.name.en ?? "—"}. Origin: ${origin?.name.en ?? "—"}.`
      )
    )
  });
  state.rngState = rng.state;
  return { state, entries };
}

function advance(ctx: EngineContext, entries: HistoryEntry[], years: number): void {
  for (let i = 0; i < years; i++) {
    const summary = ageOneYear(ctx);
    const state = ctx.state;
    const age = state.life.age;
    const text = summary.stageChanged ? STAGE_INFO[state.life.stage].begins : (YEAR_TEXTS[age % YEAR_TEXTS.length] ?? YEAR_TEXTS[0]!);
    pushEntry(ctx, entries, "year", { title: ageText(age), text: named(ctx, text) });

    if (!state.life.alive) {
      deathEntry(ctx, entries);
      return;
    }
    const event = selectEvent(ctx);
    if (event) {
      state.pending = { eventId: event.id, age };
      state.occurrences[event.id] = (state.occurrences[event.id] ?? 0) + 1;
      state.lastSeen[event.id] = age;
      return;
    }
  }
}

function choose(ctx: EngineContext, entries: HistoryEntry[], choiceId: string): void {
  const state = ctx.state;
  const pending = state.pending;
  if (!pending) throw new GameRuleError("NO_PENDING_EVENT", "Сейчас нет события, на которое нужно ответить");
  const event = findEvent(ctx.universe, pending.eventId);
  if (!event) throw new GameRuleError("INVALID_SAVE", `Событие ${pending.eventId} не найдено`);
  const choice = event.choices.find((c) => c.id === choiceId);
  if (!choice) throw new GameRuleError("UNKNOWN_CHOICE", "Такого варианта нет");
  if (!checkAll(state, choice.requires)) throw new GameRuleError("CHOICE_LOCKED", "Этот вариант сейчас недоступен");

  let check: HistoryEntry["check"];
  let outcome = choice.success;
  if (choice.check) {
    const chance = checkChance(state.character, choice.check);
    const success = ctx.rng.next() < chance;
    check = { chance, success };
    if (!success) outcome = choice.failure ?? DEFAULT_FAILURE;
  }

  state.pending = null;
  applyEffects(ctx, outcome.effects);
  if (isFatal(ctx)) kill(ctx, DEATH_CAUSES.wounds);

  const fields: Omit<HistoryEntry, "seq" | "age" | "kind" | "changes"> = {
    title: named(ctx, event.title),
    text: named(ctx, event.text),
    eventId: event.id,
    choiceId: choice.id,
    choice: named(ctx, choice.text),
    outcome: named(ctx, outcome.text)
  };
  if (check) fields.check = check;
  pushEntry(ctx, entries, "event", fields);
  if (!state.life.alive) deathEntry(ctx, entries);
}

/**
 * Откат жизни к сохранённой версии. Номер версии продолжает расти, чтобы старые вкладки не могли записать устаревшее состояние.
 * Генератор случайных чисел получает новое состояние: после отката исход проверок нельзя узнать заранее
 */
export function restoreState(snapshot: GameState, currentVersion: number): ActionResult {
  const state = deepClone(snapshot);
  state.version = currentVersion + 1;
  state.rngState = hashSeed(`${snapshot.seed}::restore::${snapshot.rngState}::${state.version}`);
  const age = ageText(state.life.age);
  const entry: HistoryEntry = {
    seq: state.nextSeq++,
    age: state.life.age,
    kind: "restore",
    title: t("Возврат во времени", "Rewind"),
    text: t(`История возвращается к возрасту ${age.ru}. Всё, что было после, не случилось.`, `The story returns to age ${age.en}. Everything after never happened.`),
    changes: []
  };
  return { state, entries: [entry] };
}

/**
 * Применяет действие игрока. Исходное состояние не меняется: при ошибке правил оно остаётся прежним.
 * Случайность идёт только из сохранённого состояния генератора, поэтому повтор того же действия даёт тот же итог
 */
export function applyAction(current: GameState, action: GameAction): ActionResult {
  if (!current.life.alive) throw new GameRuleError("LIFE_ENDED", "Эта жизнь уже закончилась");
  const state = deepClone(current);
  const rng = new Rng(state.rngState);
  const ctx: EngineContext = { state, rng, universe: getUniverse(state.character.universeId), changes: [] };
  const entries: HistoryEntry[] = [];

  switch (action.type) {
    case "advance": {
      if (state.pending) throw new GameRuleError("EVENT_PENDING", "Сначала ответьте на событие");
      const years = action.years ?? 1;
      if (!Number.isInteger(years) || years < 1 || years > MAX_ADVANCE_YEARS) {
        throw new GameRuleError("INVALID_INPUT", `Можно прожить от 1 до ${MAX_ADVANCE_YEARS} лет за раз`);
      }
      advance(ctx, entries, years);
      break;
    }
    case "choose":
      choose(ctx, entries, action.choiceId);
      break;
    default:
      throw new GameRuleError("INVALID_INPUT", "Неизвестное действие");
  }

  state.rngState = rng.state;
  state.version = current.version + 1;
  return { state, entries };
}
