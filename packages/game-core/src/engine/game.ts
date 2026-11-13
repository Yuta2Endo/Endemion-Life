// Игровой цикл: новая жизнь и применение действий. Функции чистые: принимают состояние и возвращают новое
import { bornInto } from "../character/birth.js";
import { generateCharacter, type CharacterInput } from "../character/generator.js";
import { interact } from "../character/interactions.js";
import { npcYearly } from "../character/npc-life.js";
import { newSocialState, normalizeSocialState } from "../character/social.js";
import { deepClone } from "../clone.js";
import { GameRuleError } from "../errors.js";
import { ageText, fillText, t, type LocalizedText } from "../i18n.js";
import { lifespanOf } from "../character/derived.js";
import { ageOneYear } from "../life/aging.js";
import { DEATH_CAUSES } from "../life/death.js";
import { healthConditionNames, healthFatalCause, newHealthState, normalizeHealthState } from "../life/health.js";
import { STAGE_INFO, stageForAge } from "../life/stages.js";
import { milestoneAt, milestoneId } from "../life/milestones.js";
import { abandonAdventure, beginAdventure, discoverYearly, newAdventure, venture } from "../adventure/adventure.js";
import { masteryYearly, newMastery } from "../endgame/mastery.js";
import { newEconomy } from "../economy/economy.js";
import { newEducationState, normalizeEducationState } from "../life/education.js";
import { newCareerState, normalizeCareerState } from "../life/careers.js";
import { newRegion } from "../economy/region.js";
import { trade } from "../economy/market.js";
import { newLineage } from "../legacy/chronicle.js";
import { checkAchievements, finishLife, foundLineage, lineageYearly, recordStory } from "../legacy/lineage.js";
import { findGoal } from "../character/goals.js";
import { consequencesYearly } from "../narrative/consequences.js";
import { findEvent, rememberEvent, selectEvent } from "../narrative/selection.js";
import type { OutcomeDefinition } from "../narrative/types.js";
import { hashSeed, Rng } from "../rng.js";
import { getUniverse } from "../universes/registry.js";
import { questYearly } from "../world/quests.js";
import { worldYearly, type Emit } from "../world/rules.js";
import { emptyWorldInfluence, newWorldState, normalizeWorldState, worldTick } from "../world/state.js";
import {
  INTERACTIONS,
  MAX_ADVANCE_YEARS,
  AUTO_MODES,
  TRADE_SIDES,
  type ActionResult,
  type GameAction,
  type GameState,
  type HistoryEntry,
  type HistoryKind,
  type MemoryEntry
} from "../types.js";
import { checkAll } from "./conditions.js";
import { checkChance } from "./checks.js";
import type { EngineContext } from "./context.js";
import { applyEffects, isFatal, kill } from "./effects.js";

/**
 * 1 — Stage 01; 2 — Stage 02: семья, NPC, таланты, навыки, шкалы мира, последствия;
 * 3 — Stage 03: родство по id, жизнь NPC, род, хроника рода, достижения, наследование (перевод в save.ts);
 * 4 — Stage 04: хозяйство (economy) — цикл мира, нехватка денег, доходы и расходы последних лет;
 * 5 — Stage 04, рынок: запас товаров (economy.goods);
 * 6 — Stage 05: открытые места и приключение (adventure);
 * 7 — Stage 06: край этой жизни (region) — склад товаров, напряжение, благополучие;
 * 8 — Stage 10: освоение мира и мастерство навыков (mastery). Наград не даёт;
 * 9 — Stage 02.1: длительное здоровье, болезни и раны (health);
 * 10 — Stage 02.2: обучение (education) и карьера (career)
 */
export const SAVE_SCHEMA_VERSION = 10;
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
  const sourceEventId = fields.sourceEventId ?? (kind === "consequence" ? ctx.source : undefined);
  entries.push({
    seq: ctx.state.nextSeq++,
    age: ctx.state.life.age,
    kind,
    ...fields,
    ...(sourceEventId ? { sourceEventId } : {}),
    ...(kind === "consequence" && sourceEventId ? { consequenceOf: fields.consequenceOf ?? sourceEventId } : {}),
    changes: ctx.changes
  });
  ctx.changes = [];
}

function deathEntry(ctx: EngineContext, entries: HistoryEntry[]): void {
  const life = ctx.state.life;
  const cause = life.deathCause ?? DEATH_CAUSES.wounds;
  const conditions = healthConditionNames(ctx.state);
  const ailments = conditions.length
    ? t(` Недуги: ${conditions.map((item) => item.ru).join(", ")}.`, ` Ailments: ${conditions.map((item) => item.en).join(", ")}.`)
    : t("", "");
  pushEntry(ctx, entries, "death", {
    title: t("Конец пути", "The end of the road"),
    text: named(ctx, t(`${cause.ru}. {name} прожил ${ageText(life.age).ru}.${ailments.ru}`, `${cause.en}. {name} lived ${ageText(life.age).en}.${ailments.en}`))
  });
}

/** Ключевых решений в итогах жизни не больше стольких: остаются самые значимые */
export const MAX_MEMORY = 12;

function remember(state: GameState, entry: MemoryEntry): void {
  state.memory.push(entry);
  if (state.memory.length <= MAX_MEMORY) return;
  // Убираем наименее значимое решение, при равной значимости — самое раннее
  let weakest = 0;
  state.memory.forEach((item, i) => {
    const current = state.memory[weakest]!;
    if (item.weight < current.weight) weakest = i;
  });
  state.memory.splice(weakest, 1);
}

/** Новая жизнь: персонаж, рождение и первая запись истории */
export function newGame(input: NewGameInput): ActionResult {
  const seed = validateSeed(input.seed);
  const rng = Rng.fromSeed(seed, "life");
  const { character, flags, generatedName } = generateCharacter(input, rng);
  const universe = getUniverse(character.universeId);
  const state: GameState = {
    schemaVersion: SAVE_SCHEMA_VERSION,
    seed,
    rngState: rng.state,
    version: 1,
    character,
    life: { age: 0, stage: stageForAge(0, lifespanOf(character)), alive: true, deathAge: null, deathCause: null },
    health: newHealthState(),
    education: newEducationState(),
    career: newCareerState(),
    flags,
    occurrences: {},
    lastSeen: {},
    pending: null,
    scheduled: [],
    nextSeq: 1,
    background: { familyName: "", birthplace: t("", ""), omen: t("", ""), familyHistory: t("", ""), biography: [] },
    hidden: { potential: 5, destiny: 5, dormantTalents: [], familySecret: null, revealed: [] },
    npcs: [],
    nextNpcId: 1,
    meters: {},
    consequences: [],
    quest: null,
    questsDone: [],
    recentEvents: [],
    lineage: newLineage(""),
    memory: [],
    economy: newEconomy(),
    adventure: newAdventure(),
    region: newRegion(character.universeId),
    mastery: newMastery(),
    autoMode: "manual",
    milestones: { triggered: [] },
    world: newWorldState(universe),
    social: newSocialState()
  };
  // Семья, таланты и тайны — из отдельного потока: броски Stage 01 и дальнейшая жизнь от них не сдвигаются
  state.lineage.selfParents = bornInto({ state, rng: Rng.fromSeed(seed, "birth"), universe }, generatedName);
  state.lineage.name = state.background.familyName || character.name;
  const ctx: EngineContext = { state, rng, universe, changes: [] };
  foundLineage(ctx);
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
    ),
    // Биография рождения целиком: место, знамение, история семьи, родители
    outcome: t(state.background.biography.map((p) => p.ru).join(" "), state.background.biography.map((p) => p.en).join(" "))
  });
  state.rngState = rng.state;
  return { state, entries };
}

function emitter(ctx: EngineContext, entries: HistoryEntry[]): Emit {
  return (kind, title, text, eventId, sourceEventId) =>
    pushEntry(ctx, entries, kind, {
      title: named(ctx, title),
      text: named(ctx, text),
      ...(eventId ? { eventId } : {}),
      ...(sourceEventId ? { sourceEventId } : {})
    });
}

/**
 * Конец жизни: посмертные достижения, итог жизни в роду, фамильные черты. Запись смерти — последняя в хронике жизни,
 * поэтому достижения пишутся до неё
 */
function ending(ctx: EngineContext, entries: HistoryEntry[]): void {
  checkAchievements(ctx, (kind, title, text) => pushEntry(ctx, entries, kind, { title: named(ctx, title), text: named(ctx, text) }));
  finishLife(ctx);
  deathEntry(ctx, entries);
}

/** Раны и истощение после правил года (искажение ци, последствия) могут оказаться смертельными */
function settle(ctx: EngineContext, entries: HistoryEntry[]): boolean {
  if (isFatal(ctx)) kill(ctx, healthFatalCause(ctx.state));
  if (ctx.state.life.alive) return true;
  ending(ctx, entries);
  return false;
}

function advance(ctx: EngineContext, entries: HistoryEntry[], years: number): void {
  for (let i = 0; i < years; i++) {
    const summary = ageOneYear(ctx);
    const state = ctx.state;
    const age = state.life.age;
    // Мир и люди вокруг живут вместе с персонажем. Их тихие изменения входят в итоги года,
    // а заметные (смерть близких, указ двора) — отдельными записями после года
    const deferred: { kind: HistoryKind; title: LocalizedText; text: LocalizedText }[] = [];
    if (state.life.alive) {
      const defer: Emit = (kind, title, text) => deferred.push({ kind, title, text });
      worldYearly(ctx, defer);
      worldTick(ctx);
      npcYearly(ctx, defer);
    }
    const grewSkill = ctx.changes.some((change) => change.kind === "skill");
    const grewPath = ctx.changes.some((change) => change.kind === "track");
    const grewGold = ctx.changes.some((change) => change.kind === "wealth");
    const quiet = grewSkill
      ? t("Тихий год. Ремесло стало увереннее.", "A quiet year. The craft grew surer.")
      : grewPath
        ? t("Тихий год. Путь силы стал крепче.", "A quiet year. The path of power grew firmer.")
        : grewGold
          ? t("Тихий год. Золото в доме изменилось.", "A quiet year. The gold in the house changed.")
          : (YEAR_TEXTS[age % YEAR_TEXTS.length] ?? YEAR_TEXTS[0]!);
    const text = summary.stageChanged ? STAGE_INFO[state.life.stage].begins : quiet;
    pushEntry(ctx, entries, "year", { title: ageText(age), text: named(ctx, text) });
    for (const item of deferred) pushEntry(ctx, entries, item.kind, { title: named(ctx, item.title), text: named(ctx, item.text) });
    if (summary.goalOutcome) {
      const definition = findGoal(summary.goalOutcome.goalId);
      if (definition) {
        const kindRu = summary.goalOutcome.kind === "complete" ? "достигнута" : "провалена";
        const kindEn = summary.goalOutcome.kind === "complete" ? "achieved" : "failed";
        pushEntry(ctx, entries, "event", {
          title: {
            ru: `Цель «${definition.name.ru}» ${kindRu}.`,
            en: `Goal «${definition.name.en}» ${kindEn}.`,
          },
          text: {
            ru: definition.description.ru,
            en: definition.description.en,
          },
          eventId: `goal.${summary.goalOutcome.goalId}`,
          choiceId: summary.goalOutcome.kind,
        });
      }
    }
    if (!settle(ctx, entries)) return;

    const milestone = state.autoMode === "milestones" ? milestoneAt(state) : undefined;
    if (milestone) {
      state.pending = { eventId: milestone.id, age };
      state.milestones.triggered.push(milestoneId(age));
      state.occurrences[milestone.id] = (state.occurrences[milestone.id] ?? 0) + 1;
      state.lastSeen[milestone.id] = age;
      rememberEvent(state, milestone.id);
      return;
    }

    const emit = emitter(ctx, entries);
    questYearly(ctx, emit);
    const discovered = discoverYearly(state);
    if (discovered) pushEntry(ctx, entries, "adventure", { title: t("Новое место", "A new place"), text: discovered });
    consequencesYearly(ctx, emit);
    lineageYearly(ctx, emit);
    masteryYearly(state);
    if (!settle(ctx, entries)) return;

    const event = selectEvent(ctx);
    if (event) {
      state.pending = { eventId: event.id, age };
      state.occurrences[event.id] = (state.occurrences[event.id] ?? 0) + 1;
      state.lastSeen[event.id] = age;
      rememberEvent(state, event.id);
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
    const chance = checkChance(state.character, choice.check, state);
    const success = ctx.rng.next() < chance;
    check = { chance, success };
    if (!success) outcome = choice.failure ?? DEFAULT_FAILURE;
  }

  state.pending = null;
  ctx.source = event.id;
  applyEffects(ctx, outcome.effects);
  if (isFatal(ctx)) kill(ctx, healthFatalCause(ctx.state));
  recordStory(ctx, event, choice.id, check ? check.success : null);
  ctx.source = undefined;
  // Ключевое решение: чем больше оно изменило, тем значимее. Сюжеты рода и выборы с проверкой весят больше
  const weight = ctx.changes.length + (check ? 2 : 0) + (event.kind === "legacy" ? 4 : 0) + (event.kind === "chain" || event.scheduledOnly ? 2 : 0);
  remember(state, { age: state.life.age, eventId: event.id, choiceId: choice.id, success: check ? check.success : null, weight });

  const fields: Omit<HistoryEntry, "seq" | "age" | "kind" | "changes"> = {
    title: named(ctx, event.title),
    text: named(ctx, event.text),
    eventId: event.id,
    sourceEventId: event.id,
    choiceId: choice.id,
    choice: named(ctx, choice.text),
    outcome: named(ctx, outcome.text)
  };
  if (check) fields.check = check;
  pushEntry(ctx, entries, "event", fields);
  if (!state.life.alive) ending(ctx, entries);
}

/** Личное общение с NPC: тратит год общения с этим человеком, но не время жизни */
function interactWith(ctx: EngineContext, entries: HistoryEntry[], npcId: string, interaction: (typeof INTERACTIONS)[number]): void {
  if (ctx.state.pending) throw new GameRuleError("EVENT_PENDING", "Сначала ответьте на событие");
  const result = interact(ctx, npcId, interaction);
  pushEntry(ctx, entries, "people", {
    title: result.title,
    text: result.outcome,
    choice: result.choice,
    outcome: result.outcome,
    check: result.check
  });
  settle(ctx, entries);
}

/**
 * Откат жизни к сохранённой версии. Номер версии продолжает расти, чтобы старые вкладки не могли записать устаревшее состояние.
 * Генератор случайных чисел получает новое состояние: после отката исход проверок нельзя узнать заранее
 */
export function restoreState(snapshot: GameState, currentVersion: number): ActionResult {
  const state = deepClone(snapshot);
  // Снимок мог быть сделан до Stage 02.1: здоровье восстанавливается из прежнего запаса
  state.health = normalizeHealthState(state);
  // Stage 02.2: обучение и карьера нормализуются на границе, как и здоровье
  state.education = normalizeEducationState(state, getUniverse(state.character.universeId));
  state.career = normalizeCareerState(state);
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
  // Сохранения до Stage 01 не содержат новых полей. Нормализуем их на границе
  // действия, чтобы любой следующий snapshot уже был самодостаточным.
  state.autoMode ??= "manual";
  state.milestones ??= { triggered: [] };
  state.character.goal ??= null;
  state.character.goalProgress ??= 0;
  state.character.storyProgress ??= {};
  state.lineage.storyProgress ??= {};
  state.lineage.worldInfluence ??= emptyWorldInfluence();
  state.health = normalizeHealthState(state);
  const universe = getUniverse(state.character.universeId);
  state.education = normalizeEducationState(state, universe);
  state.career = normalizeCareerState(state);
  state.world = normalizeWorldState(state.world, universe);
  normalizeSocialState(state);
  const rng = new Rng(state.rngState);
  const ctx: EngineContext = { state, rng, universe, changes: [] };
  const entries: HistoryEntry[] = [];

  switch (action.type) {
    case "setMode":
      if (!AUTO_MODES.includes(action.mode)) throw new GameRuleError("INVALID_INPUT", "Неизвестный режим жизни");
      state.autoMode = action.mode;
      state.milestones ??= { triggered: [] };
      break;
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
    case "interact":
      if (!INTERACTIONS.includes(action.interaction)) throw new GameRuleError("INVALID_INPUT", "Неизвестное действие");
      interactWith(ctx, entries, action.npcId, action.interaction);
      break;
    case "trade": {
      if (!TRADE_SIDES.includes(action.side)) throw new GameRuleError("INVALID_INPUT", "Неизвестное действие");
      // Сделка — без хода времени и без бросков: цену и остаток считает рынок мира
      const result = trade(ctx, action.goodId, action.side, action.qty);
      pushEntry(ctx, entries, "market", { title: result.title, text: result.text });
      break;
    }
    case "venture": {
      // Шаг приключения не тратит год и не берёт числа из основного генератора
      const result = action.adventureId
        ? beginAdventure(ctx, action.adventureId)
        : action.choiceId
          ? venture(ctx, action.choiceId)
          : abandonAdventure(ctx);
      const fields: Omit<HistoryEntry, "seq" | "age" | "kind" | "changes"> = { title: result.title, text: result.text };
      if (result.check) fields.check = result.check;
      pushEntry(ctx, entries, "adventure", fields);
      settle(ctx, entries);
      break;
    }
    default:
      throw new GameRuleError("INVALID_INPUT", "Неизвестное действие");
  }

  // Достижения проверяются после каждого действия. Если жизнь закончилась, их уже проверил ending()
  if (state.life.alive) checkAchievements(ctx, (kind, title, text) => pushEntry(ctx, entries, kind, { title: named(ctx, title), text: named(ctx, text) }));
  state.rngState = rng.state;
  state.version = current.version + 1;
  return { state, entries };
}
