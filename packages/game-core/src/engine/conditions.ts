import { effectiveStats, isTrackReady } from "../character/derived.js";
import { TEMPERAMENTS } from "../character/temperaments.js";
import { t, type LocalizedText } from "../i18n.js";
import type { Condition } from "../narrative/types.js";
import { STAT_INFO } from "../stats.js";
import type { UniverseDefinition } from "../universes/types.js";
import type { GameState } from "../types.js";

function inRange(value: number, min?: number, max?: number): boolean {
  return (min === undefined || value >= min) && (max === undefined || value <= max);
}

export function checkCondition(state: GameState, condition: Condition): boolean {
  const c = state.character;
  switch (condition.type) {
    case "stat":
      return inRange(effectiveStats(c)[condition.stat], condition.min, condition.max);
    case "flag":
      return state.flags.includes(condition.flag) === condition.has;
    case "karma":
      return inRange(c.karma, condition.min, condition.max);
    case "reputation":
      return inRange(c.reputation, condition.min, condition.max);
    case "wealth":
      return c.wealth >= condition.min;
    case "level":
      return c.level >= condition.min;
    case "rank":
      return inRange(c.track.rank, condition.min, condition.max);
    case "trackReady":
      return isTrackReady(c);
    case "origin":
      return condition.ids.includes(c.originId);
    case "race":
      return condition.ids.includes(c.raceId);
    case "temperament":
      return condition.ids.includes(c.temperamentId);
    case "ability":
      return c.abilities.includes(condition.id) === condition.has;
  }
}

export function checkAll(state: GameState, conditions: readonly Condition[] | undefined): boolean {
  return (conditions ?? []).every((condition) => checkCondition(state, condition));
}

function rangeText(min?: number, max?: number): LocalizedText {
  if (min !== undefined && max !== undefined) return t(`от ${min} до ${max}`, `${min}–${max}`);
  if (min !== undefined) return t(`не меньше ${min}`, `at least ${min}`);
  return t(`не больше ${max ?? 0}`, `at most ${max ?? 0}`);
}

function join(label: LocalizedText, range: LocalizedText): LocalizedText {
  return t(`${label.ru}: ${range.ru}`, `${label.en}: ${range.en}`);
}

/** Понятное игроку описание условия: почему вариант выбора недоступен */
export function describeCondition(condition: Condition, universe: UniverseDefinition): LocalizedText {
  switch (condition.type) {
    case "stat":
      return join(STAT_INFO[condition.stat].name, rangeText(condition.min, condition.max));
    case "karma":
      return join(t("Карма", "Karma"), rangeText(condition.min, condition.max));
    case "reputation":
      return join(t("Репутация", "Reputation"), rangeText(condition.min, condition.max));
    case "wealth":
      return join(t("Золото", "Gold"), rangeText(condition.min));
    case "level":
      return join(t("Уровень", "Level"), rangeText(condition.min));
    case "rank": {
      const min = condition.min !== undefined ? universe.track.ranks[condition.min]?.name : undefined;
      return min ? t(`Ранг: ${min.ru} или выше`, `Rank: ${min.en} or higher`) : t("Ранг пути не подходит", "Wrong path rank");
    }
    case "trackReady":
      return t("Нужно накопить силу для прорыва", "You need enough power for a breakthrough");
    case "flag":
      return condition.has ? t("Нужно особое обстоятельство", "Requires a special circumstance") : t("Путь уже пройден", "Already done");
    case "origin": {
      const names = condition.ids.map((id) => universe.origins.find((o) => o.id === id)?.name).filter((n) => n !== undefined);
      return t(`Происхождение: ${names.map((n) => n.ru).join(", ")}`, `Origin: ${names.map((n) => n.en).join(", ")}`);
    }
    case "race": {
      const names = condition.ids.map((id) => universe.races.find((r) => r.id === id)?.name).filter((n) => n !== undefined);
      return t(`Раса: ${names.map((n) => n.ru).join(", ")}`, `Race: ${names.map((n) => n.en).join(", ")}`);
    }
    case "temperament": {
      const names = condition.ids.map((id) => TEMPERAMENTS.find((x) => x.id === id)?.name).filter((n) => n !== undefined);
      return t(`Характер: ${names.map((n) => n.ru).join(", ")}`, `Temperament: ${names.map((n) => n.en).join(", ")}`);
    }
    case "ability": {
      const ability = universe.abilities.find((a) => a.id === condition.id)?.name;
      if (!ability) return t("Нужна особая способность", "Requires a special ability");
      return condition.has ? t(`Способность: ${ability.ru}`, `Ability: ${ability.en}`) : t(`Без способности ${ability.ru}`, `Without ${ability.en}`);
    }
  }
}
