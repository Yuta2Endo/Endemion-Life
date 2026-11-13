// Stage 02.4: текущее поселение жизни, дорога между поселениями и местные поправки экономики.
// Каталог поселений один — settlementSeeds/universe (world/state.ts). Здесь только ссылка, цена дороги
// и представление для клиента; исход считает сервер, генератор случайных чисел дорога не трогает.
import type { EngineContext } from "../engine/context.js";
import { applyEffect } from "../engine/effects.js";
import { record } from "../engine/record.js";
import { GameRuleError } from "../errors.js";
import { t, type LocalizedText } from "../i18n.js";
import { WEALTH_MAX } from "../stats.js";
import type { GameState, LocationMove, LocationState } from "../types.js";
import { getUniverse } from "../universes/registry.js";
import type { UniverseDefinition } from "../universes/types.js";
import {
  findSettlementSeed,
  SETTLEMENT_KIND_NAMES,
  SETTLEMENT_TAG_NAMES,
  settlementHasTag,
  settlementSeeds,
  type SettlementKind,
  type SettlementSeed
} from "./state.js";

/** Сколько последних переездов хранится в жизни */
export const MAX_LOCATION_HISTORY = 24;

/** Новая жизнь начинает в первом поселении мира — том же, что создаёт newWorldState */
export function newLocationState(universe: UniverseDefinition, age = 0, settlementId?: string): LocationState {
  const seeds = settlementSeeds(universe);
  const preferred = settlementId ? findSettlementSeed(universe, settlementId) : undefined;
  return {
    settlementId: preferred?.id ?? seeds[0]?.id ?? "",
    since: Math.max(0, Math.trunc(age)),
    history: []
  };
}

/** Текущее поселение. Старое состояние без location получает первое поселение мира, без изменения сохранения */
export function currentSettlement(state: GameState): SettlementSeed | undefined {
  const universe = getUniverse(state.character.universeId);
  return findSettlementSeed(universe, state.location?.settlementId ?? "") ?? settlementSeeds(universe)[0];
}

export function locationWageFactor(state: GameState): number {
  return currentSettlement(state)?.wageFactor ?? 1;
}

export function locationCostFactor(state: GameState): number {
  return currentSettlement(state)?.costFactor ?? 1;
}

/** Цена дороги: средняя из цен двух поселений, не меньше трёх золотых */
export function travelCostBetween(universe: UniverseDefinition, fromId: string, toId: string): number {
  const from = findSettlementSeed(universe, fromId);
  const to = findSettlementSeed(universe, toId);
  if (!from || !to || from.id === to.id) return 0;
  return Math.max(3, Math.round((from.travelCost + to.travelCost) / 2));
}

export function travelCostTo(state: GameState, settlementId: string): number {
  const current = currentSettlement(state);
  if (!current) return 0;
  return travelCostBetween(getUniverse(state.character.universeId), current.id, settlementId);
}

/** Дорога: цена списывается один раз, возраст не меняется, генератор не трогается */
export interface TravelResult {
  title: LocalizedText;
  text: LocalizedText;
  cost: number;
  from: string;
  to: string;
}

export function travel(ctx: EngineContext, settlementId: string): TravelResult {
  const state = ctx.state;
  if (!state.life.alive) throw new GameRuleError("LIFE_ENDED", "Эта жизнь уже закончилась");
  if (state.pending) throw new GameRuleError("EVENT_PENDING", "Сначала ответьте на событие");
  const universe = getUniverse(state.character.universeId);
  const from = currentSettlement(state);
  if (!from) throw new GameRuleError("INVALID_SAVE", "В этом мире нет поселений");
  const to = findSettlementSeed(universe, settlementId);
  if (!to) throw new GameRuleError("INVALID_INPUT", "Такого поселения в этом мире нет");
  if (to.id === from.id) throw new GameRuleError("INVALID_INPUT", "Вы уже живёте здесь");
  const cost = travelCostBetween(universe, from.id, to.id);
  if (state.character.wealth < cost) throw new GameRuleError("INSUFFICIENT_WEALTH", "Не хватает золота на дорогу");

  // Один единственный раз: золото, история переездов и запись в хронике действия
  applyEffect(ctx, { type: "wealth", delta: -cost });
  const move: LocationMove = { from: from.id, to: to.id, age: state.life.age, cost };
  const history = [...(state.location?.history ?? []), move].slice(-MAX_LOCATION_HISTORY);
  state.location = { settlementId: to.id, since: state.life.age, history };
  record(ctx, { kind: "location", key: to.id, value: to.id });

  return {
    title: t("Дорога", "The road"),
    text: t(
      `Дорога из ${from.name.ru} в ${to.name.ru} стоит ${cost} золота. ${state.character.name} устраивается на новом месте.`,
      `The road from ${from.name.en} to ${to.name.en} costs ${cost} gold. ${state.character.name} settles in a new place.`
    ),
    cost,
    from: from.id,
    to: to.id
  };
}

function validMove(value: unknown, universe: UniverseDefinition, age: number): value is LocationMove {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const move = value as Partial<LocationMove>;
  return (
    typeof move.from === "string" &&
    typeof move.to === "string" &&
    move.from !== move.to &&
    findSettlementSeed(universe, move.from) !== undefined &&
    findSettlementSeed(universe, move.to) !== undefined &&
    Number.isInteger(move.age) &&
    (move.age as number) >= 0 &&
    (move.age as number) <= age &&
    Number.isInteger(move.cost) &&
    (move.cost as number) >= 0 &&
    (move.cost as number) <= WEALTH_MAX
  );
}

/** Нормализует location старых сохранений: неизвестное поселение заменяется первым, история проверяется */
export function normalizeLocationState(value: unknown, universe: UniverseDefinition, age: number): LocationState {
  const fallback = newLocationState(universe, age);
  if (!value || typeof value !== "object" || Array.isArray(value)) return fallback;
  const raw = value as Partial<LocationState>;
  const seed = typeof raw.settlementId === "string" ? findSettlementSeed(universe, raw.settlementId) : undefined;
  const since = Number.isInteger(raw.since) && (raw.since as number) >= 0 && (raw.since as number) <= age ? (raw.since as number) : age;
  const history = Array.isArray(raw.history)
    ? raw.history.filter((move): move is LocationMove => validMove(move, universe, age)).slice(-MAX_LOCATION_HISTORY)
    : [];
  return { settlementId: seed?.id ?? fallback.settlementId, since, history };
}

export interface LocationHistoryView {
  from: LocalizedText;
  to: LocalizedText;
  age: number;
  cost: number;
}

export interface TravelDestinationView {
  id: string;
  name: LocalizedText;
  kind: SettlementKind;
  kindName: LocalizedText;
  tags: LocalizedText[];
  /** Цена дороги из нынешнего поселения */
  cost: number;
  /** Хватает ли золота сейчас */
  affordable: boolean;
  current: boolean;
}

export interface LocationView {
  settlementId: string;
  name: LocalizedText;
  kind: SettlementKind;
  kindName: LocalizedText;
  tags: string[];
  tagNames: LocalizedText[];
  since: number;
  /** Местная поправка заработка в процентах: 0 — как в прежние годы */
  wagePercent: number;
  /** Местная поправка стоимости жизни в процентах */
  costPercent: number;
  history: LocationHistoryView[];
  destinations: TravelDestinationView[];
}

function tagNamesOf(seed: SettlementSeed): LocalizedText[] {
  return seed.tags.map((tag) => SETTLEMENT_TAG_NAMES[tag] ?? t(tag, tag));
}

export function presentLocation(state: GameState): LocationView {
  const universe = getUniverse(state.character.universeId);
  const current = currentSettlement(state) ?? settlementSeeds(universe)[0];
  const seeds = settlementSeeds(universe);
  const nameOf = (id: string): LocalizedText => seeds.find((seed) => seed.id === id)?.name ?? t(id, id);
  const currentId = current?.id ?? "";
  return {
    settlementId: currentId,
    name: current?.name ?? t("Неизвестное место", "An unknown place"),
    kind: current?.kind ?? "city",
    kindName: current ? SETTLEMENT_KIND_NAMES[current.kind] : t("Неизвестное место", "An unknown place"),
    tags: current ? [...current.tags] : [],
    tagNames: current ? tagNamesOf(current) : [],
    since: state.location?.since ?? state.life.age,
    wagePercent: current ? Math.round((current.wageFactor - 1) * 100) : 0,
    costPercent: current ? Math.round((current.costFactor - 1) * 100) : 0,
    history: (state.location?.history ?? []).map((move) => ({ from: nameOf(move.from), to: nameOf(move.to), age: move.age, cost: move.cost })),
    destinations: seeds.map((seed) => ({
      id: seed.id,
      name: seed.name,
      kind: seed.kind,
      kindName: SETTLEMENT_KIND_NAMES[seed.kind],
      tags: tagNamesOf(seed),
      cost: travelCostBetween(universe, currentId, seed.id),
      affordable: state.character.wealth >= travelCostBetween(universe, currentId, seed.id),
      current: seed.id === currentId
    }))
  };
}

/** Условие события: нынешнее поселение входит в ids и/или несёт один из tags */
export function locationMatches(state: GameState, condition: { ids?: readonly string[]; tags?: readonly string[] }): boolean {
  const current = currentSettlement(state);
  if (!current) return false;
  if (condition.ids && condition.ids.length > 0 && !condition.ids.includes(current.id)) return false;
  return settlementHasTag(current, condition.tags);
}

/**
 * Вес события с местной привязкой: в родном для тега поселении чаще, в чужом реже.
 * События без locationTags не меняются, поэтому старый контент остаётся как был.
 */
export function eventLocationWeight(state: GameState, tags: readonly string[] | undefined): number {
  if (!tags || tags.length === 0) return 1;
  return settlementHasTag(currentSettlement(state), tags) ? 1.6 : 0.55;
}
